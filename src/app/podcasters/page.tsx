/**
 * Podcasters List Page - Server Component Wrapper
 *
 * @component Server Component (NO hooks, NO browser APIs)
 * @tier SIMPLE
 * @phase Tier 3 Creator Profiles - Phase 8C (Podcaster Parity)
 * @governance Build Map v2.1 ENHANCED
 *
 * @see src/app/affiliate-marketers/page.tsx - Canonical server page pattern
 */

import type { Metadata } from 'next';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { PodcastersListClient } from './PodcastersListClient';

export const metadata: Metadata = {
  title: 'Podcasters - Bizconekt',
  description: 'Browse and connect with podcasters across every genre and platform. Find verified podcasters for sponsorships and guest bookings.',
  keywords: 'podcasters, podcasts, sponsorship, guest booking, genres, platforms',
  openGraph: {
    title: 'Podcasters - Bizconekt',
    description: 'Browse and connect with podcasters across every genre and platform.',
    type: 'website',
  },
};

function PodcastersPageError() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-red-800 mb-4">
          Unable to Load Podcasters
        </h2>
        <p className="text-red-700 mb-6">
          We encountered an error while loading podcasters. Please try refreshing the page.
        </p>
        <a
          href="/podcasters"
          className="inline-block px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Refresh Page
        </a>
      </div>
    </div>
  );
}

export default function PodcastersPage() {
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
              { '@type': 'ListItem', position: 2, name: 'Podcasters', item: 'https://bizconekt.com/podcasters' },
            ],
          }),
        }}
      />
      <ErrorBoundary
        fallback={<PodcastersPageError />}
        isolate={true}
        componentName="PodcastersPage"
      >
        <PodcastersListClient />
      </ErrorBoundary>
    </>
  );
}
