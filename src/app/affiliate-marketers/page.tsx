/**
 * Affiliate Marketers List Page - Server Component Wrapper
 *
 * @component Server Component (NO hooks, NO browser APIs)
 * @tier SIMPLE
 * @phase Tier 3 Creator Profiles - Phase 4
 * @governance Build Map v2.1 ENHANCED
 *
 * @see src/app/content/articles/page.tsx - Canonical server page pattern
 */

import type { Metadata } from 'next';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { AffiliateMarketersListClient } from './AffiliateMarketersListClient';

export const metadata: Metadata = {
  title: 'Affiliate Marketers - Bizconekt',
  description: 'Browse and connect with affiliate marketers across every niche and platform. Find verified affiliate marketers for your campaigns.',
  keywords: 'affiliate marketers, affiliate marketing, influencers, campaigns, niches, platforms',
  openGraph: {
    title: 'Affiliate Marketers - Bizconekt',
    description: 'Browse and connect with affiliate marketers across every niche and platform.',
    type: 'website',
  },
};

function AffiliateMarketersPageError() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-red-800 mb-4">
          Unable to Load Affiliate Marketers
        </h2>
        <p className="text-red-700 mb-6">
          We encountered an error while loading affiliate marketers. Please try refreshing the page.
        </p>
        <a
          href="/affiliate-marketers"
          className="inline-block px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Refresh Page
        </a>
      </div>
    </div>
  );
}

export default function AffiliateMarketersPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://bizconekt.com/' },
              { '@type': 'ListItem', position: 2, name: 'Affiliate Marketers', item: 'https://bizconekt.com/affiliate-marketers' },
            ],
          }),
        }}
      />
      <ErrorBoundary
        fallback={<AffiliateMarketersPageError />}
        isolate={true}
        componentName="AffiliateMarketersPage"
      >
        <AffiliateMarketersListClient />
      </ErrorBoundary>
    </>
  );
}
