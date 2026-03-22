/**
 * @component Server Component
 * @tier STANDARD
 * @phase Phase 1A - Article Detail Page
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Server Component wrapper with SEO metadata, JSON-LD structured data, and ErrorBoundary protection.
 * Wraps ArticleDetailClient for client-side interactivity.
 */

import type { Metadata, ResolvingMetadata } from 'next';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ArticleDetailClient } from './ArticleDetailClient';
import { getDatabaseService } from '@core/services/DatabaseService';
import { ContentService, ContentStatus } from '@core/services/ContentService';
import { getListingService } from '@core/services/ServiceRegistry';
import { ErrorService } from '@core/services/ErrorService';

interface ArticleDetailPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Generate dynamic SEO metadata for article detail page
 */
export async function generateMetadata(
  { params }: ArticleDetailPageProps,
  _parent: ResolvingMetadata // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<Metadata> {
  const { slug } = await params;

  try {
    const db = getDatabaseService();
    const contentService = new ContentService(db);
    const article = await contentService.getArticleBySlug(slug);

    if (!article) {
      return {
        title: 'Article Not Found | Bizconekt',
        description: 'The requested article could not be found.',
        robots: { index: false, follow: false }
      };
    }

    const description =
      article.excerpt ||
      article.content?.substring(0, 160) ||
      'Read this article on Bizconekt';
    const canonicalUrl = `https://bizconekt.com/articles/${article.slug}`;
    const ogImage =
      article.featured_image || 'https://bizconekt.com/images/default-article.jpg';

    return {
      title: `${article.title} | Bizconekt Articles`,
      description,

      // OpenGraph
      openGraph: {
        type: 'article',
        title: article.title,
        description,
        url: canonicalUrl,
        siteName: 'Bizconekt',
        locale: 'en_US',
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: article.title
          }
        ]
      },

      // Twitter Card
      twitter: {
        card: 'summary_large_image',
        site: '@bizconekt',
        title: article.title,
        description,
        images: [ogImage]
      },

      // Robots & Crawlers
      robots: {
        index: article.status === ContentStatus.PUBLISHED,
        follow: true,
        nocache: false,
        googleBot: {
          index: article.status === ContentStatus.PUBLISHED,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1
        }
      },

      // Canonical URL
      alternates: {
        canonical: canonicalUrl,
        languages: {
          'en-US': canonicalUrl
        }
      },

      // Keywords
      keywords: [article.title, ...article.tags, 'articles', 'bizconekt'].filter(
        Boolean
      ) as string[],

      category: 'Articles'
    };
  } catch (error) {
    ErrorService.capture('Error generating article metadata:', error);
    return {
      title: 'Article Details - Bizconekt',
      description: 'Read articles and business insights on Bizconekt.'
    };
  }
}

/**
 * Error fallback component for article details page
 */
function ArticleDetailPageError() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-red-800 mb-4">Unable to Load Article</h2>
        <p className="text-red-700 mb-6">
          We encountered an error while loading this article. Please try refreshing the page.
        </p>
        <a
          href="/content"
          className="inline-block px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Back to Content
        </a>
      </div>
    </div>
  );
}

/**
 * Fetch article and listing data server-side for optimal LCP
 */
async function getArticleData(slug: string) {
  try {
    const db = getDatabaseService();
    const contentService = new ContentService(db);
    const article = await contentService.getArticleBySlug(slug);

    if (!article) {
      return { article: null, listing: null };
    }

    // Fetch full listing data for sidebar components
    let listing = null;
    if (article.listing_id) {
      const listingService = getListingService();
      listing = await listingService.getById(article.listing_id);
    }

    return { article, listing };
  } catch (error) {
    ErrorService.capture('Error fetching article data:', error);
    return { article: null, listing: null };
  }
}

/**
 * Generate Schema.org Article structured data
 */
function generateStructuredData(
  article: Awaited<ReturnType<typeof getArticleData>>['article']
) {
  if (!article || article.status !== ContentStatus.PUBLISHED) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt || article.content?.substring(0, 200) || undefined,
    image: article.featured_image || undefined,
    datePublished: article.published_at?.toISOString(),
    dateModified: article.updated_at.toISOString(),
    wordCount: article.reading_time * 200,
    articleSection: 'Business',
    author: {
      '@type': 'Organization',
      name: 'Bizconekt'
    },
    publisher: {
      '@type': 'Organization',
      name: 'Bizconekt',
      url: 'https://bizconekt.com'
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://bizconekt.com/articles/${article.slug}`
    }
  };
}

/**
 * Article Detail Page - Server Component
 */
export default async function ArticleDetailPage({ params }: ArticleDetailPageProps) {
  const { slug } = await params;

  // Fetch data server-side for optimal LCP
  const { article, listing } = await getArticleData(slug);

  // Generate structured data for SEO
  const structuredData = generateStructuredData(article);

  return (
    <>
      {/* Schema.org JSON-LD Structured Data */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}

      <ErrorBoundary
        fallback={<ArticleDetailPageError />}
        isolate={true}
        componentName="ArticleDetailPage"
      >
        <ArticleDetailClient
          slug={slug}
          initialArticle={article}
          initialListing={listing}
        />
      </ErrorBoundary>
    </>
  );
}
