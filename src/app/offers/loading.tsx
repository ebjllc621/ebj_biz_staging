/**
 * Offers Page Loading Skeleton
 *
 * Suspense fallback displayed while page content loads.
 * Provides accessible loading state with skeleton UI.
 *
 * @component Loading Component (automatic Suspense integration)
 * @tier SIMPLE
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * @see docs/pages/layouts/offers/phases/PHASE_1_BRAIN_PLAN.md
 */

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Offers</h1>
      <div className="space-y-4" aria-busy="true" role="status" aria-live="polite">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
        <p className="text-gray-600 mt-4">Loading offers...</p>
      </div>
    </div>
  );
}
