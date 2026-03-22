/**
 * Videos List Page - Server Component Wrapper
 *
 * @component Server Component (NO hooks, NO browser APIs)
 * @tier SIMPLE
 * @phase Phase 2 - Content List Pages
 * @governance Build Map v2.1 ENHANCED
 */

import type { Metadata } from 'next';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { VideosListClient } from './VideosListClient';

export const metadata: Metadata = {
  title: 'Videos - Bizconekt',
  description: 'Browse videos from local businesses and experts. Watch tutorials, interviews, and presentations.',
  keywords: 'videos, business videos, tutorials, interviews, presentations, video content',
  openGraph: {
    title: 'Videos - Bizconekt',
    description: 'Browse videos from local businesses and experts.',
    type: 'website',
  },
};

function VideosPageError() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-red-800 mb-4">
          Unable to Load Videos
        </h2>
        <p className="text-red-700 mb-6">
          We encountered an error while loading videos. Please try refreshing the page.
        </p>
        <a
          href="/content/videos"
          className="inline-block px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Refresh Page
        </a>
      </div>
    </div>
  );
}

export default function VideosPage() {
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
              { '@type': 'ListItem', position: 3, name: 'Videos', item: 'https://bizconekt.com/content/videos' },
            ],
          }),
        }}
      />
      <ErrorBoundary
        fallback={<VideosPageError />}
        isolate={true}
        componentName="VideosPage"
      >
        <VideosListClient />
      </ErrorBoundary>
    </>
  );
}
