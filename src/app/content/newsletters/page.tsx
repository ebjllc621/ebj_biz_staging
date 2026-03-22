import type { Metadata } from 'next';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { NewslettersListClient } from './NewslettersListClient';

export const metadata: Metadata = {
  title: 'Newsletters - Bizconekt',
  description: 'Browse newsletters from local businesses and experts. Stay informed with curated content, business updates, and industry insights.',
  keywords: 'newsletters, business newsletters, local business updates, industry insights, curated content',
  openGraph: {
    title: 'Newsletters - Bizconekt',
    description: 'Browse newsletters from local businesses and experts.',
    type: 'website',
  },
};

function NewslettersPageError() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-red-800 mb-4">Unable to Load Newsletters</h2>
        <p className="text-red-700 mb-6">We encountered an error while loading newsletters. Please try refreshing the page.</p>
        <a href="/content/newsletters" className="inline-block px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">Refresh Page</a>
      </div>
    </div>
  );
}

export default function NewslettersPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://bizconekt.com/' },
          { '@type': 'ListItem', position: 2, name: 'Content', item: 'https://bizconekt.com/content' },
          { '@type': 'ListItem', position: 3, name: 'Newsletters', item: 'https://bizconekt.com/content/newsletters' },
        ],
      }) }} />
      <ErrorBoundary fallback={<NewslettersPageError />} isolate={true} componentName="NewslettersPage">
        <NewslettersListClient />
      </ErrorBoundary>
    </>
  );
}
