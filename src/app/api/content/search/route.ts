/**
 * Content Search API Route
 * GET /api/content/search - Unified content search
 *
 * @authority PHASE_3_API_ROUTES.md
 * @tier STANDARD
 * @pattern Public GET (Pattern A - no auth)
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { ContentService, ContentStatus, type SortOption } from '@core/services/ContentService';
import { NewsletterService } from '@core/services/NewsletterService';
import { NewsletterStatus } from '@core/types/newsletter';
import type { NewsletterSortOption } from '@core/types/newsletter';
import { GuideService } from '@core/services/GuideService';
import { GuideStatus } from '@core/types/guide';
import type { GuideSortOption } from '@core/types/guide';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/content/search
 * Search all content types with filters, pagination, and sorting
 *
 * @public No authentication required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;
  const { searchParams } = new URL(request.url);

  // Parse query parameters
  const type = searchParams.get('type') || 'all';
  const pageParam = searchParams.get('page');
  const pageSizeParam = searchParams.get('pageSize');
  const sort = searchParams.get('sort') as SortOption || 'category_featured';
  const categoryParam = searchParams.get('category');
  const searchQuery = searchParams.get('q');
  const featuredParam = searchParams.get('featured');

  // Validate type parameter
  const validTypes = ['all', 'article', 'video', 'podcast', 'newsletter', 'guide'];
  if (!validTypes.includes(type)) {
    throw BizError.badRequest('Invalid type parameter', { type, validTypes });
  }

  // Validate sort parameter
  const validSorts: SortOption[] = ['category_featured', 'recent', 'popular', 'alphabetical'];
  if (sort && !validSorts.includes(sort)) {
    throw BizError.badRequest('Invalid sort parameter', { sort, validSorts });
  }

  // Parse pagination
  const page = pageParam ? parseInt(pageParam) : 1;
  const pageSize = pageSizeParam ? parseInt(pageSizeParam) : 20;

  if (isNaN(page) || page < 1) {
    throw BizError.badRequest('Invalid page parameter', { page: pageParam });
  }
  if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
    throw BizError.badRequest('Invalid pageSize parameter (must be 1-100)', { pageSize: pageSizeParam });
  }

  // Parse optional filters
  const categoryId = categoryParam ? parseInt(categoryParam) : undefined;
  if (categoryParam && isNaN(categoryId!)) {
    throw BizError.badRequest('Invalid category parameter', { category: categoryParam });
  }

  const isFeatured = featuredParam === 'true' ? true : undefined;

  // Initialize services
  const db = getDatabaseService();
  const contentService = new ContentService(db);
  const newsletterService = new NewsletterService(db);
  const guideService = new GuideService(db);

  // Map newsletter sort: 'category_featured' is not supported by NewsletterService
  const newsletterSort: NewsletterSortOption =
    sort === 'category_featured' ? 'recent' :
    sort === 'popular' ? 'popular' :
    sort === 'alphabetical' ? 'alphabetical' :
    'recent';

  // Map guide sort: 'category_featured' is not supported by GuideService
  const guideSort: GuideSortOption =
    sort === 'category_featured' ? 'recent' :
    sort === 'popular' ? 'popular' :
    sort === 'alphabetical' ? 'alphabetical' :
    'recent';

  if (type === 'newsletter') {
    // Newsletter-only query
    const newsletterResult = await newsletterService.getNewsletters(
      {
        category_id: categoryId,
        searchQuery: searchQuery || undefined,
        is_featured: isFeatured,
        status: NewsletterStatus.PUBLISHED
      },
      { page, pageSize },
      newsletterSort
    );

    const newsletterItems = newsletterResult.data.map(n => ({ ...n, type: 'newsletter' as const }));

    const responseData = {
      items: newsletterItems,
      page: newsletterResult.pagination.page,
      pageSize: newsletterResult.pagination.pageSize,
      total: newsletterResult.pagination.total,
      hasNext: newsletterResult.pagination.hasNext,
      hasPrev: newsletterResult.pagination.hasPrev
    };

    return createSuccessResponse(responseData, context.requestId);
  }

  if (type === 'guide') {
    const guideResult = await guideService.getGuides(
      {
        category_id: categoryId,
        searchQuery: searchQuery || undefined,
        is_featured: isFeatured,
        status: GuideStatus.PUBLISHED
      },
      { page, pageSize },
      guideSort
    );

    const guideItems = guideResult.data.map(g => ({ ...g, type: 'guide' as const }));

    const responseData = {
      items: guideItems,
      page: guideResult.pagination.page,
      pageSize: guideResult.pagination.pageSize,
      total: guideResult.pagination.total,
      hasNext: guideResult.pagination.hasNext,
      hasPrev: guideResult.pagination.hasPrev
    };

    return createSuccessResponse(responseData, context.requestId);
  }

  if (type === 'all') {
    // Query both content service and newsletters, merge and sort by published_at desc
    const [contentResult, newsletterResult, guideResult] = await Promise.all([
      contentService.searchContent(
        {
          type: 'all',
          categoryId,
          searchQuery: searchQuery || undefined,
          isFeatured,
          status: ContentStatus.PUBLISHED
        },
        { page: 1, pageSize: pageSize * 2 },
        sort
      ),
      newsletterService.getNewsletters(
        {
          category_id: categoryId,
          searchQuery: searchQuery || undefined,
          is_featured: isFeatured,
          status: NewsletterStatus.PUBLISHED
        },
        { page: 1, pageSize: pageSize },
        newsletterSort
      ),
      guideService.getGuides(
        {
          category_id: categoryId,
          searchQuery: searchQuery || undefined,
          is_featured: isFeatured,
          status: GuideStatus.PUBLISHED
        },
        { page: 1, pageSize: pageSize },
        guideSort
      )
    ]);

    const contentItems = contentResult.all.map(item => {
      if ('reading_time' in item) {
        return Object.assign({}, item, { type: 'article' as const });
      }
      if ('video_url' in item) {
        return Object.assign({}, item, { type: 'video' as const });
      }
      if ('audio_url' in item) {
        return Object.assign({}, item, { type: 'podcast' as const });
      }
      return Object.assign({}, item, { type: 'article' as const });
    });

    const newsletterItems = newsletterResult.data.map(n => ({ ...n, type: 'newsletter' as const }));
    const guideItems = guideResult.data.map(g => ({ ...g, type: 'guide' as const }));

    // Merge and sort by published_at descending, then trim to pageSize
    const merged = [...contentItems, ...newsletterItems, ...guideItems].sort((a, b) => {
      const aDate = a.published_at ? new Date(a.published_at as string | Date).getTime() : 0;
      const bDate = b.published_at ? new Date(b.published_at as string | Date).getTime() : 0;
      return bDate - aDate;
    });

    const offset = (page - 1) * pageSize;
    const paginatedItems = merged.slice(offset, offset + pageSize);

    const totalCount = contentResult.pagination.total + newsletterResult.pagination.total + guideResult.pagination.total;

    const responseData = {
      items: paginatedItems,
      page,
      pageSize,
      total: totalCount,
      hasNext: offset + pageSize < merged.length || page * pageSize < totalCount,
      hasPrev: page > 1
    };

    return createSuccessResponse(responseData, context.requestId);
  }

  // Original behavior: articles, videos, podcasts only
  const result = await contentService.searchContent(
    {
      type: type as 'article' | 'video' | 'podcast',
      categoryId,
      searchQuery: searchQuery || undefined,
      isFeatured,
      status: ContentStatus.PUBLISHED
    },
    { page, pageSize },
    sort
  );

  // Transform to canonical API response format
  // Add type discriminator for mixed content rendering
  // @fix CONT-001 - Match listings search canonical format
  const typedItems = result.all.map(item => {
    if ('reading_time' in item) {
      return Object.assign({}, item, { type: 'article' as const });
    }
    if ('video_url' in item) {
      return Object.assign({}, item, { type: 'video' as const });
    }
    if ('audio_url' in item) {
      return Object.assign({}, item, { type: 'podcast' as const });
    }
    return Object.assign({}, item, { type: 'article' as const });
  });

  // Flatten to canonical structure matching listings search
  // @see src/app/api/listings/search/route.ts - Canonical pattern
  const responseData = {
    items: typedItems,
    page: result.pagination.page,
    pageSize: result.pagination.pageSize,
    total: result.pagination.total,
    hasNext: result.pagination.hasNext,
    hasPrev: result.pagination.hasPrev
  };

  return createSuccessResponse(responseData, context.requestId);
}, {
  allowedMethods: ['GET']
});
