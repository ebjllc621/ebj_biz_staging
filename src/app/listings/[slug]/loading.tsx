/**
 * Listing Details Loading Skeleton - Server Component
 *
 * @component Server Component
 * @tier STANDARD
 * @phase Phase 1 - Hero & Action Bar
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Loading skeleton shown while listing details page is being rendered.
 * Displays animated placeholder for hero, action bar, and content.
 *
 * @see docs/pages/layouts/listings/details/phases/PHASE_1_BRAIN_PLAN.md
 */

export default function ListingDetailsLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="animate-pulse">
        {/* Hero Skeleton */}
        <div className="relative w-full h-64 md:h-96 bg-gray-200" />

        {/* Action Bar Skeleton */}
        <div className="border-b border-gray-200 bg-white">
          <div className="container mx-auto px-4 py-4">
            <div className="flex gap-4 justify-center flex-wrap">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-24 h-10 bg-gray-200 rounded-md" />
              ))}
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content Skeleton */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
                <div className="h-8 bg-gray-200 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </div>
            </div>

            {/* Sidebar Skeleton */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
                <div className="h-6 bg-gray-200 rounded w-2/3" />
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
