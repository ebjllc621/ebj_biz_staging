/**
 * Internet Personalities List Page - Server Component Wrapper
 *
 * @component Server Component (NO hooks, NO browser APIs)
 * @tier SIMPLE
 * @phase Tier 3 Creator Profiles - Phase 4
 * @governance Build Map v2.1 ENHANCED
 *
 * @see src/app/affiliate-marketers/page.tsx - Mirror pattern
 * @see src/app/content/articles/page.tsx - Canonical server page pattern
 */

import type { Metadata } from 'next';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { InternetPersonalitiesListClient } from './InternetPersonalitiesListClient';

export const metadata: Metadata = {
  title: 'Internet Personalities & Content Creators - Bizconekt',
  description: 'Discover and connect with internet personalities and content creators across every platform and category. Find creators for collaborations and brand partnerships.',
  keywords: 'internet personalities, content creators, influencers, collaborations, YouTube, TikTok, Instagram, streaming',
  openGraph: {
    title: 'Internet Personalities & Content Creators - Bizconekt',
    description: 'Discover and connect with internet personalities and content creators across every platform.',
    type: 'website',
  },
};

function InternetPersonalitiesPageError() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-red-800 mb-4">
          Unable to Load Internet Personalities
        </h2>
        <p className="text-red-700 mb-6">
          We encountered an error while loading internet personalities. Please try refreshing the page.
        </p>
        <a
          href="/internet-personalities"
          className="inline-block px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Refresh Page
        </a>
      </div>
    </div>
  );
}

export default function InternetPersonalitiesPage() {
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
              { '@type': 'ListItem', position: 2, name: 'Internet Personalities', item: 'https://bizconekt.com/internet-personalities' },
            ],
          }),
        }}
      />
      <ErrorBoundary
        fallback={<InternetPersonalitiesPageError />}
        isolate={true}
        componentName="InternetPersonalitiesPage"
      >
        <InternetPersonalitiesListClient />
      </ErrorBoundary>
    </>
  );
}
