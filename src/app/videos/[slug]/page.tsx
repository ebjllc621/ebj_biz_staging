/**
 * @component Server Component
 * @tier STANDARD
 * @phase Phase 1C - Video Detail Page
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Server Component wrapper with SEO metadata, JSON-LD VideoObject structured data,
 * og:video tag, and ErrorBoundary protection.
 * Wraps VideoDetailClient for client-side interactivity.
 */

import type { Metadata, ResolvingMetadata } from 'next';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { VideoDetailClient } from './VideoDetailClient';
import { getDatabaseService } from '@core/services/DatabaseService';
import { ContentService, ContentStatus } from '@core/services/ContentService';
import { getListingService } from '@core/services/ServiceRegistry';
import { ErrorService } from '@core/services/ErrorService';

interface VideoDetailPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Generate dynamic SEO metadata for video detail page
 */
export async function generateMetadata(
  { params }: VideoDetailPageProps,
  _parent: ResolvingMetadata // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<Metadata> {
  const { slug } = await params;

  try {
    const db = getDatabaseService();
    const contentService = new ContentService(db);
    const video = await contentService.getVideoBySlug(slug);

    if (!video) {
      return {
        title: 'Video Not Found | Bizconekt',
        description: 'The requested video could not be found.',
        robots: { index: false, follow: false }
      };
    }

    const description =
      video.description?.substring(0, 160) ||
      'Watch this video on Bizconekt';
    const canonicalUrl = `https://bizconekt.com/videos/${video.slug}`;
    const ogImage =
      video.thumbnail || 'https://bizconekt.com/images/default-video.jpg';

    return {
      title: `${video.title} | Bizconekt Videos`,
      description,

      // OpenGraph
      openGraph: {
        type: 'video.other',
        title: video.title,
        description,
        url: canonicalUrl,
        siteName: 'Bizconekt',
        locale: 'en_US',
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: video.title
          }
        ],
        videos: [{ url: video.video_url, type: 'text/html' }]
      } as Metadata['openGraph'],

      // Twitter Card
      twitter: {
        card: 'player',
        site: '@bizconekt',
        title: video.title,
        description,
        images: [ogImage]
      },

      // Robots & Crawlers
      robots: {
        index: video.status === ContentStatus.PUBLISHED,
        follow: true,
        nocache: false,
        googleBot: {
          index: video.status === ContentStatus.PUBLISHED,
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
      keywords: [video.title, ...(video.tags || []), 'video', video.video_type, 'bizconekt'].filter(
        Boolean
      ) as string[],

      category: 'Videos'
    };
  } catch (error) {
    ErrorService.capture('Error generating video metadata:', error);
    return {
      title: 'Video Details - Bizconekt',
      description: 'Watch videos and business insights on Bizconekt.'
    };
  }
}

/**
 * Error fallback component for video details page
 */
function VideoDetailPageError() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-red-800 mb-4">Unable to Load Video</h2>
        <p className="text-red-700 mb-6">
          We encountered an error while loading this video. Please try refreshing the page.
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
 * Fetch video and listing data server-side for optimal LCP
 */
async function getVideoData(slug: string) {
  try {
    const db = getDatabaseService();
    const contentService = new ContentService(db);
    const video = await contentService.getVideoBySlug(slug);

    if (!video) {
      return { video: null, listing: null };
    }

    // Fetch full listing data for sidebar components
    let listing = null;
    if (video.listing_id) {
      const listingService = getListingService();
      listing = await listingService.getById(video.listing_id);
    }

    return { video, listing };
  } catch (error) {
    ErrorService.capture('Error fetching video data:', error);
    return { video: null, listing: null };
  }
}

/**
 * Generate embed URL from video URL for VideoObject JSON-LD schema
 */
function generateEmbedUrl(videoUrl: string): string | undefined {
  // YouTube
  const youtubeMatch = videoUrl.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (youtubeMatch && youtubeMatch[1]) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }

  // Vimeo
  const vimeoMatch = videoUrl.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return undefined;
}

/**
 * Generate Schema.org VideoObject structured data
 */
function generateStructuredData(
  video: Awaited<ReturnType<typeof getVideoData>>['video']
) {
  if (!video || video.status !== ContentStatus.PUBLISHED) return null;

  const durationIso = video.duration
    ? `PT${Math.floor(video.duration / 60)}M${video.duration % 60}S`
    : undefined;

  const embedUrl = generateEmbedUrl(video.video_url);

  const structuredData: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.title,
    description: video.description || undefined,
    thumbnailUrl: video.thumbnail || undefined,
    uploadDate: video.published_at?.toISOString(),
    duration: durationIso,
    contentUrl: video.video_url,
    embedUrl,
    url: `https://bizconekt.com/videos/${video.slug}`,
    interactionStatistic: {
      '@type': 'InteractionCounter',
      interactionType: 'https://schema.org/WatchAction',
      userInteractionCount: video.view_count
    },
    publisher: {
      '@type': 'Organization',
      name: 'Bizconekt',
      url: 'https://bizconekt.com'
    }
  };

  return structuredData;
}

/**
 * Video Detail Page - Server Component
 */
export default async function VideoDetailPage({ params }: VideoDetailPageProps) {
  const { slug } = await params;

  // Fetch data server-side for optimal LCP
  const { video, listing } = await getVideoData(slug);

  // Generate structured data for SEO
  const structuredData = generateStructuredData(video);

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
        fallback={<VideoDetailPageError />}
        isolate={true}
        componentName="VideoDetailPage"
      >
        <VideoDetailClient
          slug={slug}
          initialVideo={video}
          initialListing={listing}
        />
      </ErrorBoundary>
    </>
  );
}
