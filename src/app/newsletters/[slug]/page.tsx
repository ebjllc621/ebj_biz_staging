/**
 * @component Server Component
 * @tier STANDARD
 * @phase Phase N3 - Newsletter Detail Page
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Server Component wrapper with SEO metadata, JSON-LD structured data, and ErrorBoundary protection.
 * Wraps NewsletterDetailClient for client-side interactivity.
 */

import type { Metadata, ResolvingMetadata } from 'next';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { NewsletterDetailClient } from './NewsletterDetailClient';
import { getDatabaseService } from '@core/services/DatabaseService';
import { NewsletterService } from '@core/services/NewsletterService';
import { NewsletterStatus } from '@core/types/newsletter';
import { getListingService } from '@core/services/ServiceRegistry';
import { ErrorService } from '@core/services/ErrorService';

interface NewsletterDetailPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Generate dynamic SEO metadata for newsletter detail page
 */
export async function generateMetadata(
  { params }: NewsletterDetailPageProps,
  _parent: ResolvingMetadata // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<Metadata> {
  const { slug } = await params;

  try {
    const db = getDatabaseService();
    const newsletterService = new NewsletterService(db);
    const newsletter = await newsletterService.getNewsletterBySlug(slug);

    if (!newsletter) {
      return {
        title: 'Newsletter Not Found | Bizconekt',
        description: 'The requested newsletter could not be found.',
        robots: { index: false, follow: false }
      };
    }

    const issueText = newsletter.issue_number ? ` — Issue #${newsletter.issue_number}` : '';
    const description =
      newsletter.excerpt ||
      newsletter.web_content?.substring(0, 160) ||
      'Read this newsletter on Bizconekt';
    const canonicalUrl = `https://bizconekt.com/newsletters/${newsletter.slug || slug}`;
    const ogImage =
      newsletter.featured_image || 'https://bizconekt.com/images/default-newsletter.jpg';

    const isIndexable =
      newsletter.status === NewsletterStatus.PUBLISHED ||
      newsletter.status === NewsletterStatus.ARCHIVED;

    return {
      title: `${newsletter.title}${issueText} | Bizconekt Newsletters`,
      description,

      // OpenGraph
      openGraph: {
        type: 'article',
        title: newsletter.title,
        description,
        url: canonicalUrl,
        siteName: 'Bizconekt',
        locale: 'en_US',
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: newsletter.title
          }
        ]
      },

      // Twitter Card
      twitter: {
        card: 'summary_large_image',
        site: '@bizconekt',
        title: newsletter.title,
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
      keywords: [newsletter.title, ...newsletter.tags, 'newsletters', 'bizconekt'].filter(
        Boolean
      ) as string[],

      category: 'Newsletters'
    };
  } catch (error) {
    ErrorService.capture('Error generating newsletter metadata:', error);
    return {
      title: 'Newsletter Details - Bizconekt',
      description: 'Read newsletters and business updates on Bizconekt.'
    };
  }
}

/**
 * Error fallback component for newsletter details page
 */
function NewsletterDetailPageError() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-red-800 mb-4">Unable to Load Newsletter</h2>
        <p className="text-red-700 mb-6">
          We encountered an error while loading this newsletter. Please try refreshing the page.
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
 * Fetch newsletter and listing data server-side for optimal LCP
 */
async function getNewsletterData(slug: string) {
  try {
    const db = getDatabaseService();
    const newsletterService = new NewsletterService(db);
    const newsletter = await newsletterService.getNewsletterBySlug(slug);

    if (!newsletter) {
      return { newsletter: null, listing: null };
    }

    // Fetch full listing data for sidebar components
    let listing = null;
    if (newsletter.listing_id) {
      const listingService = getListingService();
      listing = await listingService.getById(newsletter.listing_id);
    }

    return { newsletter, listing };
  } catch (error) {
    ErrorService.capture('Error fetching newsletter data:', error);
    return { newsletter: null, listing: null };
  }
}

/**
 * Generate Schema.org NewsArticle structured data
 */
function generateStructuredData(
  newsletter: Awaited<ReturnType<typeof getNewsletterData>>['newsletter']
) {
  if (!newsletter || newsletter.status !== NewsletterStatus.PUBLISHED) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: newsletter.title,
    description:
      newsletter.excerpt || newsletter.web_content?.substring(0, 200) || undefined,
    image: newsletter.featured_image || undefined,
    datePublished: newsletter.published_at?.toISOString(),
    dateModified: newsletter.updated_at?.toISOString() ?? newsletter.created_at.toISOString(),
    wordCount: newsletter.reading_time ? newsletter.reading_time * 200 : undefined,
    articleSection: 'Newsletters',
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
      '@id': `https://bizconekt.com/newsletters/${newsletter.slug || ''}`
    }
  };
}

/**
 * Newsletter Detail Page - Server Component
 */
export default async function NewsletterDetailPage({ params }: NewsletterDetailPageProps) {
  const { slug } = await params;

  // Fetch data server-side for optimal LCP
  const { newsletter, listing } = await getNewsletterData(slug);

  // Generate structured data for SEO
  const structuredData = generateStructuredData(newsletter);

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
        fallback={<NewsletterDetailPageError />}
        isolate={true}
        componentName="NewsletterDetailPage"
      >
        <NewsletterDetailClient
          slug={slug}
          initialNewsletter={newsletter}
          initialListing={listing}
        />
      </ErrorBoundary>
    </>
  );
}
