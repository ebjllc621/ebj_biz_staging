/**
 * Event Detail Loading Skeleton
 *
 * @component Server Component
 * @tier SIMPLE
 * @phase Phase 1 - Event Detail Page Core
 * @governance Build Map v2.1 ENHANCED
 */

export default function EventDetailLoading() {
  return (
    <div
      className="min-h-screen bg-gray-50"
      role="status"
      aria-busy="true"
      aria-label="Loading event details..."
    >
      <div className="animate-pulse">
        {/* Back Button Skeleton */}
        <div className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-4">
            <div className="h-6 w-20 bg-gray-200 rounded" />
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Hero Skeleton */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Banner image skeleton */}
                <div className="h-48 lg:h-64 bg-gray-200" />
                <div className="p-6 space-y-4">
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                  <div className="h-8 w-3/4 bg-gray-200 rounded" />
                  {/* Details grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="space-y-2">
                        <div className="h-3 w-16 bg-gray-200 rounded" />
                        <div className="h-4 w-24 bg-gray-200 rounded" />
                      </div>
                    ))}
                  </div>
                  {/* Action buttons */}
                  <div className="flex gap-3 pt-2">
                    <div className="h-10 w-32 bg-gray-200 rounded-lg" />
                    <div className="h-10 w-28 bg-gray-200 rounded-lg" />
                    <div className="h-10 w-20 bg-gray-200 rounded-lg" />
                    <div className="h-10 w-28 bg-gray-200 rounded-lg" />
                  </div>
                </div>
              </div>

              {/* Content Skeleton */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                <div className="h-6 w-40 bg-gray-200 rounded" />
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-5/6" />
                  <div className="h-4 bg-gray-200 rounded w-4/6" />
                </div>
              </div>

              {/* Location Skeleton */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                <div className="h-6 w-32 bg-gray-200 rounded" />
                <div className="h-48 bg-gray-200 rounded-lg" />
                <div className="h-4 w-3/4 bg-gray-200 rounded" />
              </div>
            </div>

            {/* Sidebar Skeleton */}
            <div className="hidden lg:block space-y-4">
              {/* Business Header */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="h-24 bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-5 w-40 bg-gray-200 rounded" />
                  <div className="h-4 w-28 bg-gray-200 rounded" />
                </div>
              </div>

              {/* Contact Card */}
              <div className="bg-white rounded-lg shadow-sm p-4 space-y-2">
                <div className="h-4 w-28 bg-gray-200 rounded" />
                <div className="h-10 bg-gray-200 rounded-lg" />
                <div className="h-10 bg-gray-200 rounded-lg" />
              </div>

              {/* Location Card */}
              <div className="bg-white rounded-lg shadow-sm p-4 space-y-2">
                <div className="h-4 w-20 bg-gray-200 rounded" />
                <div className="h-32 bg-gray-200 rounded-lg" />
                <div className="h-4 w-48 bg-gray-200 rounded" />
              </div>

              {/* Hours Card */}
              <div className="bg-white rounded-lg shadow-sm p-4 space-y-2">
                <div className="h-4 w-24 bg-gray-200 rounded" />
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-4 w-16 bg-gray-200 rounded" />
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
