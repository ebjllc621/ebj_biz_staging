/**
 * Content Page - Server Component Wrapper
 *
 * Server Component wrapper with SEO metadata and ErrorBoundary protection.
 * Implements the Content page for articles, videos, and podcasts.
 *
 * @component Server Component (NO hooks, NO browser APIs)
 * @tier SIMPLE
 * @generated DNA v11.4.0
 * @phase Phase 5 - Page Implementation
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/react18-nextjs14-governance.mdc
 *
 * FEATURES:
 * - SEO metadata export (title, description, keywords, OpenGraph)
 * - ErrorBoundary wrapper for error handling
 * - Server Component pattern (no client-side hooks)
 *
 * @see docs/pages/layouts/content/phases/PHASE_5_PAGE_IMPLEMENTATION.md
 */

import type { Metadata } from 'next';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ContentPageClient } from './ContentPageClient';

/**
 * SEO Metadata for Content Page
 */
export const metadata: Metadata = {
  title: 'Content - Bizconekt',
  description: 'Discover articles, videos, and podcasts from local businesses and experts. Explore tutorials, guides, and educational content.',
  keywords: 'content, articles, videos, podcasts, business content, tutorials, guides, educational content',
  openGraph: {
    title: 'Content - Bizconekt',
    description: 'Discover articles, videos, and podcasts from local businesses and experts.',
    type: 'website',
  },
};

/**
 * Error fallback component for content page
 */
function ContentPageError() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-red-800 mb-4">
          Unable to Load Content
        </h2>
        <p className="text-red-700 mb-6">
          We encountered an error while loading the content page. Please try refreshing the page.
        </p>
        <a
          href="/content"
          className="inline-block px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Refresh Page
        </a>
      </div>
    </div>
  );
}

/**
 * Content Page - Server Component
 *
 * Wraps ContentPageClient in ErrorBoundary for error handling.
 */
export default function ContentPage() {
  return (
    <ErrorBoundary
      fallback={<ContentPageError />}
      isolate={true}
      componentName="ContentPage"
    >
      <ContentPageClient />
    </ErrorBoundary>
  );
}
