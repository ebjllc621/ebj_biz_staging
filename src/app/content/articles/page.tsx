/**
 * Articles List Page - Server Component Wrapper
 *
 * @component Server Component (NO hooks, NO browser APIs)
 * @tier SIMPLE
 * @phase Phase 2 - Content List Pages
 * @governance Build Map v2.1 ENHANCED
 */

import type { Metadata } from 'next';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ArticlesListClient } from './ArticlesListClient';

export const metadata: Metadata = {
  title: 'Articles - Bizconekt',
  description: 'Browse articles from local businesses and experts. Discover guides, tutorials, and insights.',
  keywords: 'articles, business articles, guides, tutorials, insights, educational content',
  openGraph: {
    title: 'Articles - Bizconekt',
    description: 'Browse articles from local businesses and experts.',
    type: 'website',
  },
};

function ArticlesPageError() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-red-800 mb-4">
          Unable to Load Articles
        </h2>
        <p className="text-red-700 mb-6">
          We encountered an error while loading articles. Please try refreshing the page.
        </p>
        <a
          href="/content/articles"
          className="inline-block px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Refresh Page
        </a>
      </div>
    </div>
  );
}

export default function ArticlesPage() {
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
              { '@type': 'ListItem', position: 3, name: 'Articles', item: 'https://bizconekt.com/content/articles' },
            ],
          }),
        }}
      />
      <ErrorBoundary
        fallback={<ArticlesPageError />}
        isolate={true}
        componentName="ArticlesPage"
      >
        <ArticlesListClient />
      </ErrorBoundary>
    </>
  );
}
