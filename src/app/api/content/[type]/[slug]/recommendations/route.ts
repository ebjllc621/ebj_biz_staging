/**
 * GET /api/content/[type]/[id]/recommendations
 * Get recommendations for a specific content item
 *
 * @tier SIMPLE
 * @phase Phase 8 - Content Types
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseService } from '@core/services/DatabaseService';
import { SharingService } from '@features/contacts/services/SharingService';
import { BizError } from '@core/errors/BizError';
import { isContentEntityType } from '@features/contacts/config/entity-registry';
import type { ContentEntityType } from '@features/contacts/types/sharing';

interface RouteParams {
  type: string;
  id: string;
}

/**
 * GET /api/content/[type]/[id]/recommendations
 * Returns recommendations for a content item (article, podcast, video, newsletter)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
): Promise<NextResponse> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const { type, id } = params;
    const { searchParams } = new URL(request.url);

    // Validate content type
    if (!isContentEntityType(type)) {
      return NextResponse.json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Invalid content type' },
        meta: { requestId, timestamp: new Date(), version: '5.0.0' }
      }, { status: 400 });
    }

    // Parse pagination
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    if (isNaN(page) || page < 1) {
      return NextResponse.json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Invalid page parameter' },
        meta: { requestId, timestamp: new Date(), version: '5.0.0' }
      }, { status: 400 });
    }
    if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
      return NextResponse.json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Invalid pageSize parameter' },
        meta: { requestId, timestamp: new Date(), version: '5.0.0' }
      }, { status: 400 });
    }

    const db = getDatabaseService();
    const sharingService = new SharingService(db);

    const result = await sharingService.getContentRecommendations(
      type as ContentEntityType,
      id,
      { page, pageSize }
    );

    return NextResponse.json({
      success: true,
      data: result,
      meta: { requestId, timestamp: new Date(), version: '5.0.0' }
    });
  } catch (error) {
    if (error instanceof BizError) {
      const status = error.code === 'BAD_REQUEST' || error.code === 'VALIDATION_ERROR' ? 400 :
                     error.code === 'NOT_FOUND' ? 404 :
                     error.code === 'UNAUTHORIZED' ? 401 :
                     error.code === 'FORBIDDEN' ? 403 : 500;
      return NextResponse.json({
        success: false,
        error: { code: error.code, message: error.message },
        meta: { requestId, timestamp: new Date(), version: '5.0.0' }
      }, { status });
    }
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch recommendations' },
      meta: { requestId, timestamp: new Date(), version: '5.0.0' }
    }, { status: 500 });
  }
}
