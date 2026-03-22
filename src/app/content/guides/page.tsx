import type { Metadata } from 'next';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { GuidesListClient } from './GuidesListClient';

export const metadata: Metadata = {
  title: 'Guides - Bizconekt',
  description: 'Browse step-by-step guides from local businesses and experts. Learn new skills with structured, multi-section educational content.',
  keywords: 'guides, tutorials, how-to, step-by-step, business guides, educational content, learning',
  openGraph: {
    title: 'Guides - Bizconekt',
    description: 'Browse step-by-step guides from local businesses and experts.',
    type: 'website',
  },
};

function GuidesPageError() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-red-800 mb-4">Unable to Load Guides</h2>
        <p className="text-red-700 mb-6">We encountered an error while loading guides. Please try refreshing the page.</p>
        <a href="/content/guides" className="inline-block px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">Refresh Page</a>
      </div>
    </div>
  );
}

export default function GuidesPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://bizconekt.com/' },
          { '@type': 'ListItem', position: 2, name: 'Content', item: 'https://bizconekt.com/content' },
          { '@type': 'ListItem', position: 3, name: 'Guides', item: 'https://bizconekt.com/content/guides' },
        ],
      }) }} />
      <ErrorBoundary fallback={<GuidesPageError />} isolate={true} componentName="GuidesPage">
        <GuidesListClient />
      </ErrorBoundary>
    </>
  );
}
