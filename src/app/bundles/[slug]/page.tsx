/**
 * Bundle Detail Page - Public Bundle View
 *
 * Server Component wrapper with SEO metadata and ErrorBoundary protection.
 * Displays bundle details with included offers and claim functionality.
 *
 * @component Server Component (NO hooks, NO browser APIs)
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority CLAUDE.md, .cursor/rules/react18-nextjs14-governance.mdc
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { BundleDetailClient } from './BundleDetailClient';
import { getOfferService } from '@core/services/ServiceRegistry';

interface BundleDetailPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Generate SEO metadata dynamically based on bundle
 */
export async function generateMetadata({ params }: BundleDetailPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const offerService = getOfferService();
    const bundle = await offerService.getBundleBySlug(slug);

    if (!bundle) {
      return {
        title: 'Bundle Not Found - Bizconekt',
        description: 'The requested bundle could not be found.',
      };
    }

    const savings = bundle.total_value && bundle.bundle_price
      ? Math.round(((bundle.total_value - bundle.bundle_price) / bundle.total_value) * 100)
      : 0;

    return {
      title: `${bundle.name} - Save ${savings}% | Bizconekt Bundles`,
      description: bundle.description || `Claim ${bundle.offers?.length || 0} offers in one bundle and save ${savings}%!`,
      openGraph: {
        title: bundle.name,
        description: bundle.description || 'Multi-offer bundle package',
        type: 'website',
      },
    };
  } catch {
    return {
      title: 'Bundle - Bizconekt',
      description: 'View bundle details and claim multiple offers.',
    };
  }
}

/**
 * Error fallback component for bundle detail page
 */
function BundleDetailError() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-red-800 mb-4">
          Unable to Load Bundle
        </h2>
        <p className="text-red-700 mb-6">
          We encountered an error while loading this bundle. Please try refreshing the page.
        </p>
        <a
          href="/bundles"
          className="inline-block px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Back to Bundles
        </a>
      </div>
    </div>
  );
}

/**
 * Bundle Detail Page - Server Component
 */
export default async function BundleDetailPage({ params }: BundleDetailPageProps) {
  const { slug } = await params;

  // Fetch initial bundle data server-side
  let initialBundle = null;
  try {
    const offerService = getOfferService();
    initialBundle = await offerService.getBundleBySlug(slug);
  } catch {
    // Client will refetch and handle errors
  }

  if (!initialBundle) {
    notFound();
  }

  return (
    <ErrorBoundary
      fallback={<BundleDetailError />}
      isolate={true}
      componentName="BundleDetailPage"
    >
      <BundleDetailClient slug={slug} initialBundle={initialBundle} />
    </ErrorBoundary>
  );
}
