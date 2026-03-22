/**
 * Affiliate Marketer Detail Page - Server Component
 *
 * @component Server Component (NO hooks, NO browser APIs)
 * @tier ADVANCED
 * @phase Tier 3 Creator Profiles - Phase 3A
 * @governance Build Map v2.1 ENHANCED
 *
 * Server Component wrapper with SEO metadata, Person JSON-LD structured data, and ErrorBoundary protection.
 * Wraps AffiliateMarketerDetailClient for client-side interactivity.
 */

import type { Metadata, ResolvingMetadata } from 'next';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { AffiliateMarketerDetailClient } from './AffiliateMarketerDetailClient';
import { AffiliateMarketerService } from '@core/services/AffiliateMarketerService';
import { getDatabaseService } from '@core/services/DatabaseService';
import { ErrorService } from '@core/services/ErrorService';
import type { AffiliateMarketerProfile } from '@core/types/affiliate-marketer';

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Generate dynamic SEO metadata for affiliate marketer detail page
 */
export async function generateMetadata(
  { params }: PageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;

  try {
    const db = getDatabaseService();
    const marketerService = new AffiliateMarketerService(db);
    const marketer = await marketerService.getMarketerBySlug(slug);

    if (!marketer) {
      return {
        title: 'Affiliate Marketer Not Found | Bizconekt',
        description: 'The requested affiliate marketer profile could not be found.',
        robots: { index: false, follow: false }
      };
    }

    const metaDescription = `${marketer.headline || marketer.display_name} — Affiliate marketer${marketer.location ? ' in ' + marketer.location : ''}. ${marketer.bio?.substring(0, 100) || 'View profile, portfolio, and reviews.'}`;

    const canonicalUrl = `https://bizconekt.com/affiliate-marketers/${marketer.slug}`;
    const coverImage = marketer.profile_image || 'https://bizconekt.com/images/default-profile.jpg';

    return {
      title: `${marketer.display_name} - Affiliate Marketer | Bizconekt`,
      description: metaDescription,

      // OpenGraph
      openGraph: {
        type: 'website',
        title: `${marketer.display_name} - Affiliate Marketer`,
        description: metaDescription,
        url: canonicalUrl,
        siteName: 'Bizconekt',
        locale: 'en_US',
        images: [
          {
            url: coverImage,
            width: 1200,
            height: 630,
            alt: `${marketer.display_name} - Affiliate Marketer`
          }
        ]
      },

      // Twitter Card
      twitter: {
        card: 'summary_large_image',
        site: '@bizconekt',
        title: `${marketer.display_name} - Affiliate Marketer`,
        description: metaDescription,
        images: [coverImage]
      },

      // Robots
      robots: {
        index: marketer.status === 'active',
        follow: true,
        nocache: false,
        googleBot: {
          index: marketer.status === 'active',
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
        marketer.display_name,
        ...(marketer.niches || []),
        ...(marketer.specializations || []),
        marketer.location,
        'affiliate marketer',
        'marketing'
      ].filter(Boolean) as string[],

      category: 'Affiliate Marketing'
    };
  } catch (error) {
    ErrorService.capture('Error generating affiliate marketer metadata:', error);
    return {
      title: 'Affiliate Marketer - Bizconekt',
      description: 'View affiliate marketer profile, portfolio, and reviews.'
    };
  }
}

/**
 * Error fallback component for affiliate marketer detail page
 */
function AffiliateMarketerDetailPageError() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-red-800 mb-4">
          Unable to Load Profile
        </h2>
        <p className="text-red-700 mb-6">
          We encountered an error while loading this affiliate marketer profile. Please try refreshing the page.
        </p>
        <a
          href="/affiliate-marketers"
          className="inline-block px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Back to Affiliate Marketers
        </a>
      </div>
    </div>
  );
}

/**
 * Fetch marketer data server-side for optimal LCP
 */
async function getMarketerData(slug: string): Promise<{ marketer: AffiliateMarketerProfile | null }> {
  try {
    const db = getDatabaseService();
    const marketerService = new AffiliateMarketerService(db);
    const marketer = await marketerService.getMarketerBySlug(slug);

    if (!marketer) {
      return { marketer: null };
    }

    // Fire-and-forget view count increment
    marketerService.incrementViewCount(marketer.id).catch(() => {});

    return { marketer };
  } catch (error) {
    ErrorService.capture('Error fetching affiliate marketer data:', error);
    return { marketer: null };
  }
}

/**
 * Generate Person JSON-LD structured data for the marketer
 */
function generateStructuredData(marketer: AffiliateMarketerProfile) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: marketer.display_name,
    jobTitle: marketer.headline || 'Affiliate Marketer',
    description: marketer.bio,
    image: marketer.profile_image,
    url: `https://bizconekt.com/affiliate-marketers/${marketer.slug}`,
    sameAs: Object.values(marketer.social_links || {}).filter(Boolean),
    knowsAbout: [...(marketer.niches || []), ...(marketer.specializations || [])],
    ...(marketer.location
      ? { address: { '@type': 'PostalAddress', addressLocality: marketer.location } }
      : {}),
    ...(marketer.rating_count > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: marketer.rating_average,
            reviewCount: marketer.rating_count,
            bestRating: 5,
            worstRating: 1
          }
        }
      : {})
  };
}

/**
 * Affiliate Marketer Detail Page - Server Component
 */
export default async function AffiliateMarketerDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const { marketer } = await getMarketerData(slug);

  const structuredData = marketer ? generateStructuredData(marketer) : null;

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
        fallback={<AffiliateMarketerDetailPageError />}
        isolate={true}
        componentName="AffiliateMarketerDetailPage"
      >
        <AffiliateMarketerDetailClient
          slug={slug}
          initialMarketer={marketer}
        />
      </ErrorBoundary>
    </>
  );
}
