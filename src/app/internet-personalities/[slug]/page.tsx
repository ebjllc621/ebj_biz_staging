/**
 * Internet Personality Detail Page - Server Component
 *
 * @component Server Component (NO hooks, NO browser APIs)
 * @tier ADVANCED
 * @phase Tier 3 Creator Profiles - Phase 3A
 * @governance Build Map v2.1 ENHANCED
 *
 * Server Component wrapper with SEO metadata, Person JSON-LD structured data, and ErrorBoundary protection.
 * Wraps InternetPersonalityDetailClient for client-side interactivity.
 */

import type { Metadata, ResolvingMetadata } from 'next';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { InternetPersonalityDetailClient } from './InternetPersonalityDetailClient';
import { InternetPersonalityService } from '@core/services/InternetPersonalityService';
import { getDatabaseService } from '@core/services/DatabaseService';
import { ErrorService } from '@core/services/ErrorService';
import type { InternetPersonalityProfile } from '@core/types/internet-personality';

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Generate dynamic SEO metadata for internet personality detail page
 */
export async function generateMetadata(
  { params }: PageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;

  try {
    const db = getDatabaseService();
    const personalityService = new InternetPersonalityService(db);
    const personality = await personalityService.getPersonalityBySlug(slug);

    if (!personality) {
      return {
        title: 'Content Creator Not Found | Bizconekt',
        description: 'The requested content creator profile could not be found.',
        robots: { index: false, follow: false }
      };
    }

    const metaDescription = `${personality.headline || personality.display_name} — Content creator${personality.location ? ' in ' + personality.location : ''}. ${personality.bio?.substring(0, 100) || 'View profile, collaborations, and reviews.'}`;

    const canonicalUrl = `https://bizconekt.com/internet-personalities/${personality.slug}`;
    const coverImage = personality.profile_image || 'https://bizconekt.com/images/default-profile.jpg';

    return {
      title: `${personality.display_name} - Content Creator | Bizconekt`,
      description: metaDescription,

      // OpenGraph
      openGraph: {
        type: 'website',
        title: `${personality.display_name} - Content Creator`,
        description: metaDescription,
        url: canonicalUrl,
        siteName: 'Bizconekt',
        locale: 'en_US',
        images: [
          {
            url: coverImage,
            width: 1200,
            height: 630,
            alt: `${personality.display_name} - Content Creator`
          }
        ]
      },

      // Twitter Card
      twitter: {
        card: 'summary_large_image',
        site: '@bizconekt',
        title: `${personality.display_name} - Content Creator`,
        description: metaDescription,
        images: [coverImage]
      },

      // Robots
      robots: {
        index: personality.status === 'active',
        follow: true,
        nocache: false,
        googleBot: {
          index: personality.status === 'active',
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
        personality.display_name,
        ...(personality.content_categories || []),
        personality.location,
        'content creator',
        'influencer',
        'internet personality'
      ].filter(Boolean) as string[],

      category: 'Content Creators'
    };
  } catch (error) {
    ErrorService.capture('Error generating internet personality metadata:', error);
    return {
      title: 'Content Creator - Bizconekt',
      description: 'View content creator profile, collaborations, and reviews.'
    };
  }
}

/**
 * Error fallback component for internet personality detail page
 */
function InternetPersonalityDetailPageError() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-red-800 mb-4">
          Unable to Load Profile
        </h2>
        <p className="text-red-700 mb-6">
          We encountered an error while loading this content creator profile. Please try refreshing the page.
        </p>
        <a
          href="/internet-personalities"
          className="inline-block px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Back to Content Creators
        </a>
      </div>
    </div>
  );
}

/**
 * Fetch personality data server-side for optimal LCP
 */
async function getPersonalityData(slug: string): Promise<{
  personality: InternetPersonalityProfile | null;
  connectedPlatforms: string[];
}> {
  try {
    const db = getDatabaseService();
    const personalityService = new InternetPersonalityService(db);
    const personality = await personalityService.getPersonalityBySlug(slug);

    if (!personality) {
      return { personality: null, connectedPlatforms: [] };
    }

    // Fire-and-forget view count increment
    personalityService.incrementViewCount(personality.id).catch(() => {});

    // Fetch connected platforms (public info — non-critical, degrade gracefully)
    let connectedPlatforms: string[] = [];
    try {
      const connections = await personalityService.getConnectedPlatforms(personality.id);
      connectedPlatforms = connections
        .filter(c => c.is_active)
        .map(c => c.platform);
    } catch {
      // Non-critical — verified badges simply won't show
    }

    return { personality, connectedPlatforms };
  } catch (error) {
    ErrorService.capture('Error fetching internet personality data:', error);
    return { personality: null, connectedPlatforms: [] };
  }
}

/**
 * Generate Person JSON-LD structured data for the personality
 */
function generateStructuredData(personality: InternetPersonalityProfile) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: personality.display_name,
    jobTitle: personality.headline || 'Content Creator',
    description: personality.bio,
    image: personality.profile_image,
    url: `https://bizconekt.com/internet-personalities/${personality.slug}`,
    sameAs: [
      ...Object.values(personality.social_links || {}).filter(Boolean)
    ],
    knowsAbout: personality.content_categories || [],
    ...(personality.location
      ? { address: { '@type': 'PostalAddress', addressLocality: personality.location } }
      : {}),
    ...(personality.rating_count > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: personality.rating_average,
            reviewCount: personality.rating_count,
            bestRating: 5,
            worstRating: 1
          }
        }
      : {})
  };
}

/**
 * Internet Personality Detail Page - Server Component
 */
export default async function InternetPersonalityDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const { personality, connectedPlatforms } = await getPersonalityData(slug);

  const structuredData = personality ? generateStructuredData(personality) : null;

  return (
    <>
      {/* Schema.org Person JSON-LD */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}

      <ErrorBoundary
        fallback={<InternetPersonalityDetailPageError />}
        isolate={true}
        componentName="InternetPersonalityDetailPage"
      >
        <InternetPersonalityDetailClient
          slug={slug}
          initialPersonality={personality}
          connectedPlatforms={connectedPlatforms}
        />
      </ErrorBoundary>
    </>
  );
}
