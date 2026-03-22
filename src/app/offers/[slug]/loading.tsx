/**
 * Offer Detail Loading Skeleton
 *
 * @component Server Component
 * @tier STANDARD
 * @phase Offers Phase 1 - Core CRUD & Display
 * @generated DNA v11.4.0
 *
 * Loading state shown while offer detail page fetches data.
 * Matches OfferDetailClient layout structure.
 */

export default function OfferDetailLoading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      {/* Hero Section Skeleton */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-8">
          {/* Cover Image Skeleton */}
          <div className="w-full h-64 md:h-96 bg-gray-300 rounded-lg mb-6" />

          {/* Title & Badges Skeleton */}
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2 mb-4">
              <div className="w-20 h-6 bg-red-200 rounded" />
              <div className="w-24 h-6 bg-blue-200 rounded" />
            </div>
            <div className="h-8 bg-gray-300 rounded w-3/4 mb-4" />
            <div className="h-6 bg-gray-200 rounded w-1/2 mb-4" />

            {/* Price Skeleton */}
            <div className="flex items-center gap-4 mb-4">
              <div className="h-8 bg-gray-300 rounded w-32" />
              <div className="h-6 bg-gray-200 rounded w-24" />
            </div>

            {/* Claim Button Skeleton */}
            <div className="h-12 bg-blue-300 rounded-lg w-full md:w-64" />
          </div>
        </div>
      </div>

      {/* Content Section Skeleton */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-6 bg-gray-300 rounded w-1/4 mb-4" />
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-6 bg-gray-300 rounded w-1/3 mb-4" />
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-5/6" />
              </div>
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gray-300 rounded-full" />
                <div className="flex-1">
                  <div className="h-5 bg-gray-300 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>

              <div className="h-48 bg-gray-200 rounded mb-4" />

              <div className="space-y-2">
                <div className="h-10 bg-blue-200 rounded" />
                <div className="h-10 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
