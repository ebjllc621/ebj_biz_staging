/**
 * Bundles Page - Public Offer Bundles Directory
 *
 * Server Component wrapper with SEO metadata and ErrorBoundary protection.
 * Displays multi-offer bundles that users can claim for combined savings.
 *
 * @component Server Component (NO hooks, NO browser APIs)
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority CLAUDE.md, .cursor/rules/react18-nextjs14-governance.mdc
 */

import type { Metadata } from 'next';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { BundlesPageClient } from './BundlesPageClient';

/**
 * SEO Metadata for Bundles Page
 */
export const metadata: Metadata = {
  title: 'Offer Bundles - Bizconekt',
  description: 'Save more with offer bundles! Claim multiple deals from local businesses in one package. Browse exclusive bundle packages and maximize your savings.',
  keywords: 'offer bundles, deal packages, multi-offer savings, bundle deals, local business bundles, combined offers, discount packages',
  openGraph: {
    title: 'Offer Bundles - Bizconekt',
    description: 'Save more with offer bundles from local businesses.',
    type: 'website',
  },
};

/**
 * Error fallback component for bundles page
 */
function BundlesPageError() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-red-800 mb-4">
          Unable to Load Bundles
        </h2>
        <p className="text-red-700 mb-6">
          We encountered an error while loading the bundles page. Please try refreshing the page.
        </p>
        <a
          href="/bundles"
          className="inline-block px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Refresh Page
        </a>
      </div>
    </div>
  );
}

/**
 * Bundles Page - Server Component
 *
 * Wraps content in ErrorBoundary for error handling.
 */
export default function BundlesPage() {
  return (
    <ErrorBoundary
      fallback={<BundlesPageError />}
      isolate={true}
      componentName="BundlesPage"
    >
      <BundlesPageClient />
    </ErrorBoundary>
  );
}
