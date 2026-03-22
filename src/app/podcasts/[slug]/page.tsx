/**
 * @component Server Component
 * @tier STANDARD
 * @phase Phase 1B - Podcast Detail Page
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Server Component wrapper with SEO metadata, JSON-LD structured data, and ErrorBoundary protection.
 * Wraps PodcastDetailClient for client-side interactivity.
 */

import type { Metadata, ResolvingMetadata } from 'next';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { PodcastDetailClient } from './PodcastDetailClient';
import { getDatabaseService } from '@core/services/DatabaseService';
import { ContentService, ContentStatus } from '@core/services/ContentService';
import { getListingService } from '@core/services/ServiceRegistry';
import { ErrorService } from '@core/services/ErrorService';

interface PodcastDetailPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Generate dynamic SEO metadata for podcast detail page
 */
export async function generateMetadata(
  { params }: PodcastDetailPageProps,
  _parent: ResolvingMetadata // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<Metadata> {
  const { slug } = await params;

  try {
    const db = getDatabaseService();
    const contentService = new ContentService(db);
    const podcast = await contentService.getPodcastBySlug(slug);

    if (!podcast) {
      return {
        title: 'Podcast Not Found | Bizconekt',
        description: 'The requested podcast episode could not be found.',
        robots: { index: false, follow: false }
      };
    }

    const description =
      podcast.description?.substring(0, 160) ||
      'Listen to this podcast episode on Bizconekt';
    const canonicalUrl = `https://bizconekt.com/podcasts/${podcast.slug}`;
    const ogImage =
      podcast.thumbnail || 'https://bizconekt.com/images/default-podcast.jpg';

    return {
      title: `${podcast.title} | Bizconekt Podcasts`,
      description,

      // OpenGraph
      openGraph: {
        type: 'website',
        title: podcast.title,
        description,
        url: canonicalUrl,
        siteName: 'Bizconekt',
        locale: 'en_US',
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: podcast.title
          }
        ],
        audio: podcast.audio_url
      } as Metadata['openGraph'],

      // Twitter Card
      twitter: {
        card: 'summary_large_image',
        site: '@bizconekt',
        title: podcast.title,
        description,
        images: [ogImage]
      },

      // Robots & Crawlers
      robots: {
        index: podcast.status === ContentStatus.PUBLISHED,
        follow: true,
        nocache: false,
        googleBot: {
          index: podcast.status === ContentStatus.PUBLISHED,
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
      keywords: [podcast.title, ...podcast.tags, 'podcasts', 'bizconekt'].filter(
        Boolean
      ) as string[],

      category: 'Podcasts'
    };
  } catch (error) {
    ErrorService.capture('Error generating podcast metadata:', error);
    return {
      title: 'Podcast Details - Bizconekt',
      description: 'Listen to podcasts and business insights on Bizconekt.'
    };
  }
}

/**
 * Error fallback component for podcast details page
 */
function PodcastDetailPageError() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-red-800 mb-4">Unable to Load Podcast</h2>
        <p className="text-red-700 mb-6">
          We encountered an error while loading this podcast. Please try refreshing the page.
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
 * Fetch podcast and listing data server-side for optimal LCP
 */
async function getPodcastData(slug: string) {
  try {
    const db = getDatabaseService();
    const contentService = new ContentService(db);
    const podcast = await contentService.getPodcastBySlug(slug);

    if (!podcast) {
      return { podcast: null, listing: null };
    }

    // Fetch full listing data for sidebar components
    let listing = null;
    if (podcast.listing_id) {
      const listingService = getListingService();
      listing = await listingService.getById(podcast.listing_id);
    }

    return { podcast, listing };
  } catch (error) {
    ErrorService.capture('Error fetching podcast data:', error);
    return { podcast: null, listing: null };
  }
}

/**
 * Generate Schema.org PodcastEpisode structured data
 */
function generateStructuredData(
  podcast: Awaited<ReturnType<typeof getPodcastData>>['podcast']
) {
  if (!podcast || podcast.status !== ContentStatus.PUBLISHED) return null;

  const structuredData: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'PodcastEpisode',
    name: podcast.title,
    description: podcast.description || undefined,
    datePublished: podcast.published_at?.toISOString(),
    url: `https://bizconekt.com/podcasts/${podcast.slug}`,
    timeRequired: `PT${podcast.duration || 0}S`,
    episodeNumber: podcast.episode_number || undefined,
    associatedMedia: {
      '@type': 'MediaObject',
      contentUrl: podcast.audio_url,
      encodingFormat: 'audio/mpeg'
    },
    partOfSeries: {
      '@type': 'PodcastSeries',
      name: 'Bizconekt Podcasts'
    },
    image: podcast.thumbnail || undefined,
    publisher: {
      '@type': 'Organization',
      name: 'Bizconekt',
      url: 'https://bizconekt.com'
    }
  };

  if (podcast.season_number) {
    structuredData.partOfSeason = {
      '@type': 'PodcastSeason',
      seasonNumber: podcast.season_number
    };
  }

  return structuredData;
}

/**
 * Podcast Detail Page - Server Component
 */
export default async function PodcastDetailPage({ params }: PodcastDetailPageProps) {
  const { slug } = await params;

  // Fetch data server-side for optimal LCP
  const { podcast, listing } = await getPodcastData(slug);

  // Generate structured data for SEO
  const structuredData = generateStructuredData(podcast);

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
        fallback={<PodcastDetailPageError />}
        isolate={true}
        componentName="PodcastDetailPage"
      >
        <PodcastDetailClient
          slug={slug}
          initialPodcast={podcast}
          initialListing={listing}
        />
      </ErrorBoundary>
    </>
  );
}
