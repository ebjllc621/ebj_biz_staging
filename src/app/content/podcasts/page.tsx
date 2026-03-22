/**
 * Podcasts List Page - Server Component Wrapper
 *
 * @component Server Component (NO hooks, NO browser APIs)
 * @tier SIMPLE
 * @phase Phase 2 - Content List Pages
 * @governance Build Map v2.1 ENHANCED
 */

import type { Metadata } from 'next';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { PodcastsListClient } from './PodcastsListClient';

export const metadata: Metadata = {
  title: 'Podcasts - Bizconekt',
  description: 'Browse podcasts from local businesses and experts. Discover episodes, interviews, and discussions.',
  keywords: 'podcasts, business podcasts, episodes, interviews, discussions, audio content',
  openGraph: {
    title: 'Podcasts - Bizconekt',
    description: 'Browse podcasts from local businesses and experts.',
    type: 'website',
  },
};

function PodcastsPageError() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-red-800 mb-4">
          Unable to Load Podcasts
        </h2>
        <p className="text-red-700 mb-6">
          We encountered an error while loading podcasts. Please try refreshing the page.
        </p>
        <a
          href="/content/podcasts"
          className="inline-block px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Refresh Page
        </a>
      </div>
    </div>
  );
}

export default function PodcastsPage() {
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
              { '@type': 'ListItem', position: 2, name: 'Content', item: 'https://bizconekt.com/content' },
              { '@type': 'ListItem', position: 3, name: 'Podcasts', item: 'https://bizconekt.com/content/podcasts' },
            ],
          }),
        }}
      />
      <ErrorBoundary
        fallback={<PodcastsPageError />}
        isolate={true}
        componentName="PodcastsPage"
      >
        <PodcastsListClient />
      </ErrorBoundary>
    </>
  );
}
