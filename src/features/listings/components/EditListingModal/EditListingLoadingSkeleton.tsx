/**
 * EditListingLoadingSkeleton Component
 *
 * @authority Phase 7 Brain Plan
 * @tier ENTERPRISE
 * @purpose Loading skeleton matching 7-section layout
 *
 * FEATURES:
 * - Tailwind skeleton animations
 * - 7-section accordion layout match
 * - Accessible (aria-hidden, role="status")
 * - Mobile-responsive
 */

'use client';

// ============================================================================
// COMPONENT
// ============================================================================

export function EditListingLoadingSkeleton() {
  return (
    <div role="status" aria-label="Loading listing data" className="space-y-4 p-4">
      {/* Header skeleton */}
      <div className="h-8 bg-gray-200 rounded animate-pulse w-3/4" />

      {/* Section skeletons (7 sections) */}
      {[1, 2, 3, 4, 5, 6, 7].map((sectionNumber) => (
        <div
          key={sectionNumber}
          className="border border-gray-200 rounded-lg p-4"
          aria-hidden="true"
        >
          {/* Section header */}
          <div className="flex items-center justify-between mb-3">
            <div className="h-6 bg-gray-200 rounded animate-pulse w-1/2" />
            <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
          </div>

          {/* Section content lines */}
          <div className="space-y-2">
            <div className="h-4 bg-gray-100 rounded animate-pulse w-full" />
            <div className="h-4 bg-gray-100 rounded animate-pulse w-5/6" />
            <div className="h-4 bg-gray-100 rounded animate-pulse w-4/6" />
          </div>
        </div>
      ))}

      {/* Screen reader announcement */}
      <span className="sr-only">Loading listing data, please wait...</span>
    </div>
  );
}
