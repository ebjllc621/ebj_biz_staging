/**
 * @component Server Component
 * @tier STANDARD
 * @phase Phase G3 - Guide Detail Page
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Server Component wrapper with SEO metadata, JSON-LD structured data, and ErrorBoundary protection.
 * Wraps GuideDetailClient for client-side interactivity.
 */

import type { Metadata, ResolvingMetadata } from 'next';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { GuideDetailClient } from './GuideDetailClient';
import { getDatabaseService } from '@core/services/DatabaseService';
import { GuideService } from '@core/services/GuideService';
import { GuideStatus } from '@core/types/guide';
import { getListingService } from '@core/services/ServiceRegistry';
import { ErrorService } from '@core/services/ErrorService';

interface GuideDetailPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Generate dynamic SEO metadata for guide detail page
 */
export async function generateMetadata(
  { params }: GuideDetailPageProps,
  _parent: ResolvingMetadata // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<Metadata> {
  const { slug } = await params;

  try {
    const db = getDatabaseService();
    const guideService = new GuideService(db);
    const guide = await guideService.getGuideBySlug(slug);

    if (!guide) {
      return {
        title: 'Guide Not Found | Bizconekt',
        description: 'The requested guide could not be found.',
        robots: { index: false, follow: false }
      };
    }

    const description =
      guide.excerpt ||
      guide.overview?.substring(0, 160) ||
      'Read this guide on Bizconekt';
    const canonicalUrl = `https://bizconekt.com/guides/${guide.slug || slug}`;
    const ogImage =
      guide.featured_image || 'https://bizconekt.com/images/default-guide.jpg';

    const isIndexable =
      guide.status === GuideStatus.PUBLISHED ||
      guide.status === GuideStatus.ARCHIVED;

    return {
      title: `${guide.title} | Bizconekt Guides`,
      description,

      // OpenGraph
      openGraph: {
        type: 'article',
        title: guide.title,
        description,
        url: canonicalUrl,
        siteName: 'Bizconekt',
        locale: 'en_US',
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: guide.title
          }
        ]
      },

      // Twitter Card
      twitter: {
        card: 'summary_large_image',
        site: '@bizconekt',
        title: guide.title,
        description,
        images: [ogImage]
      },

      // Robots & Crawlers
      robots: {
        index: isIndexable,
        follow: true,
        nocache: false,
        googleBot: {
          index: isIndexable,
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
      keywords: [
        guide.title,
        ...guide.tags,
        guide.difficulty_level,
        'guides',
        'bizconekt'
      ].filter(Boolean) as string[],

      category: 'Guides'
    };
  } catch (error) {
    ErrorService.capture('Error generating guide metadata:', error);
    return {
      title: 'Guide Details - Bizconekt',
      description: 'Read guides and tutorials on Bizconekt.'
    };
  }
}

/**
 * Error fallback component for guide details page
 */
function GuideDetailPageError() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-red-800 mb-4">Unable to Load Guide</h2>
        <p className="text-red-700 mb-6">
          We encountered an error while loading this guide. Please try refreshing the page.
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
 * Fetch guide and listing data server-side for optimal LCP
 */
async function getGuideData(slug: string) {
  try {
    const db = getDatabaseService();
    const guideService = new GuideService(db);
    const guide = await guideService.getGuideBySlug(slug);

    if (!guide) {
      return { guide: null, listing: null };
    }

    // Fetch full listing data for sidebar components
    let listing = null;
    if (guide.listing_id) {
      const listingService = getListingService();
      listing = await listingService.getById(guide.listing_id);
    }

    return { guide, listing };
  } catch (error) {
    ErrorService.capture('Error fetching guide data:', error);
    return { guide: null, listing: null };
  }
}

/**
 * Generate Schema.org HowTo or Article structured data based on guide structure
 */
function generateStructuredData(
  guide: Awaited<ReturnType<typeof getGuideData>>['guide']
) {
  if (!guide || guide.status !== GuideStatus.PUBLISHED) return null;

  // If guide has sections, use HowTo schema (step-by-step)
  if (guide.sections && guide.sections.length > 0) {
    return {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: guide.title,
      description: guide.excerpt || guide.overview?.substring(0, 200) || undefined,
      image: guide.featured_image || undefined,
      totalTime: guide.estimated_time ? `PT${guide.estimated_time}M` : undefined,
      step: guide.sections.map((section, index) => ({
        '@type': 'HowToStep',
        position: index + 1,
        name: section.title,
        text: section.content?.substring(0, 500) || section.title,
        url: `https://bizconekt.com/guides/${guide.slug || ''}#section-${section.section_number}`
      })),
      author: {
        '@type': 'Organization',
        name: 'Bizconekt'
      },
      publisher: {
        '@type': 'Organization',
        name: 'Bizconekt',
        url: 'https://bizconekt.com'
      },
      datePublished: guide.published_at?.toISOString(),
      dateModified: guide.updated_at?.toISOString() ?? guide.created_at.toISOString()
    };
  }

  // Fallback: Article schema for guides without sections
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.excerpt || guide.overview?.substring(0, 200) || undefined,
    image: guide.featured_image || undefined,
    datePublished: guide.published_at?.toISOString(),
    dateModified: guide.updated_at?.toISOString() ?? guide.created_at.toISOString(),
    wordCount: guide.word_count || undefined,
    educationalLevel: guide.difficulty_level || undefined,
    articleSection: 'Guides',
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
      '@id': `https://bizconekt.com/guides/${guide.slug || ''}`
    }
  };
}

/**
 * Generate BreadcrumbList structured data
 */
function generateBreadcrumbData(
  guide: Awaited<ReturnType<typeof getGuideData>>['guide']
) {
  if (!guide) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://bizconekt.com'
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Guides',
        item: 'https://bizconekt.com/guides'
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: guide.title,
        item: `https://bizconekt.com/guides/${guide.slug || ''}`
      }
    ]
  };
}

/**
 * Guide Detail Page - Server Component
 */
export default async function GuideDetailPage({ params }: GuideDetailPageProps) {
  const { slug } = await params;

  // Fetch data server-side for optimal LCP
  const { guide, listing } = await getGuideData(slug);

  // Generate structured data for SEO
  const structuredData = generateStructuredData(guide);
  const breadcrumbData = generateBreadcrumbData(guide);

  return (
    <>
      {/* Schema.org JSON-LD Structured Data */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}

      {/* BreadcrumbList JSON-LD */}
      {breadcrumbData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
        />
      )}

      <ErrorBoundary
        fallback={<GuideDetailPageError />}
        isolate={true}
        componentName="GuideDetailPage"
      >
        <GuideDetailClient
          slug={slug}
          initialGuide={guide}
          initialListing={listing}
        />
      </ErrorBoundary>
    </>
  );
}
