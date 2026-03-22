/**
 * Podcaster Detail Page - Server Component
 *
 * @component Server Component (NO hooks, NO browser APIs)
 * @tier ADVANCED
 * @phase Tier 3 Creator Profiles - Phase 8C (Podcaster Parity)
 * @governance Build Map v2.1 ENHANCED
 *
 * Server Component wrapper with SEO metadata, Person JSON-LD structured data, and ErrorBoundary protection.
 * Wraps PodcasterDetailClient for client-side interactivity.
 *
 * @see src/app/affiliate-marketers/[slug]/page.tsx - Canonical detail page pattern
 */

import type { Metadata, ResolvingMetadata } from 'next';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { PodcasterDetailClient } from './PodcasterDetailClient';
import { PodcasterService } from '@core/services/PodcasterService';
import { getDatabaseService } from '@core/services/DatabaseService';
import { ErrorService } from '@core/services/ErrorService';
import type { PodcasterProfile } from '@core/types/podcaster';

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Generate dynamic SEO metadata for podcaster detail page
 */
export async function generateMetadata(
  { params }: PageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;

  try {
    const db = getDatabaseService();
    const podcasterService = new PodcasterService(db);
    const podcaster = await podcasterService.getPodcasterBySlug(slug);

    if (!podcaster) {
      return {
        title: 'Podcaster Not Found | Bizconekt',
        description: 'The requested podcaster profile could not be found.',
        robots: { index: false, follow: false }
      };
    }

    const podcastTitle = podcaster.podcast_name || podcaster.display_name;
    const metaDescription = `${podcaster.headline || podcastTitle} — Podcaster${podcaster.location ? ' in ' + podcaster.location : ''}. ${podcaster.bio?.substring(0, 100) || 'View profile, episodes, and reviews.'}`;

    const canonicalUrl = `https://bizconekt.com/podcasters/${podcaster.slug}`;
    const coverImage = podcaster.profile_image || 'https://bizconekt.com/images/default-profile.jpg';

    return {
      title: `${podcastTitle} - Podcaster | Bizconekt`,
      description: metaDescription,

      openGraph: {
        type: 'website',
        title: `${podcastTitle} - Podcaster`,
        description: metaDescription,
        url: canonicalUrl,
        siteName: 'Bizconekt',
        locale: 'en_US',
        images: [
          {
            url: coverImage,
            width: 1200,
            height: 630,
            alt: `${podcastTitle} - Podcaster`
          }
        ]
      },

      twitter: {
        card: 'summary_large_image',
        site: '@bizconekt',
        title: `${podcastTitle} - Podcaster`,
        description: metaDescription,
        images: [coverImage]
      },

      robots: {
        index: podcaster.status === 'active',
        follow: true,
        nocache: false,
        googleBot: {
          index: podcaster.status === 'active',
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1
        }
      },

      alternates: {
        canonical: canonicalUrl,
        languages: {
          'en-US': canonicalUrl
        }
      },

      keywords: [
        podcaster.display_name,
        podcaster.podcast_name,
        ...(podcaster.genres || []),
        podcaster.location,
        'podcaster',
        'podcast'
      ].filter(Boolean) as string[],

      category: 'Podcasting'
    };
  } catch (error) {
    ErrorService.capture('Error generating podcaster metadata:', error);
    return {
      title: 'Podcaster - Bizconekt',
      description: 'View podcaster profile, episodes, and reviews.'
    };
  }
}

function PodcasterDetailPageError() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-red-800 mb-4">
          Unable to Load Profile
        </h2>
        <p className="text-red-700 mb-6">
          We encountered an error while loading this podcaster profile. Please try refreshing the page.
        </p>
        <a
          href="/podcasters"
          className="inline-block px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Back to Podcasters
        </a>
      </div>
    </div>
  );
}

async function getPodcasterData(slug: string): Promise<{ podcaster: PodcasterProfile | null }> {
  try {
    const db = getDatabaseService();
    const podcasterService = new PodcasterService(db);
    const podcaster = await podcasterService.getPodcasterBySlug(slug);

    if (!podcaster) {
      return { podcaster: null };
    }

    // Fire-and-forget view count increment
    podcasterService.incrementViewCount(podcaster.id).catch(() => {});

    return { podcaster };
  } catch (error) {
    ErrorService.capture('Error fetching podcaster data:', error);
    return { podcaster: null };
  }
}

function generateStructuredData(podcaster: PodcasterProfile) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: podcaster.display_name,
    jobTitle: podcaster.headline || 'Podcaster',
    description: podcaster.bio,
    image: podcaster.profile_image,
    url: `https://bizconekt.com/podcasters/${podcaster.slug}`,
    sameAs: Object.values(podcaster.social_links || {}).filter(Boolean),
    knowsAbout: [...(podcaster.genres || [])],
    ...(podcaster.location
      ? { address: { '@type': 'PostalAddress', addressLocality: podcaster.location } }
      : {}),
    ...(podcaster.rating_count > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: podcaster.rating_average,
            reviewCount: podcaster.rating_count,
            bestRating: 5,
            worstRating: 1
          }
        }
      : {})
  };
}

export default async function PodcasterDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const { podcaster } = await getPodcasterData(slug);

  const structuredData = podcaster ? generateStructuredData(podcaster) : null;

  return (
    <>
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}

      <ErrorBoundary
        fallback={<PodcasterDetailPageError />}
        isolate={true}
        componentName="PodcasterDetailPage"
      >
        <PodcasterDetailClient
          slug={slug}
          initialPodcaster={podcaster}
        />
      </ErrorBoundary>
    </>
  );
}
