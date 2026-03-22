/**
 * ProfileStatsSection - Profile Statistics Display Grid
 *
 * @tier SIMPLE
 * @generated DNA v11.4.0
 * @dna-version 11.4.0
 * @authority docs/pages/layouts/home/user/phases/PHASE_4_BRAIN_PLAN.md
 *
 * GOVERNANCE COMPLIANCE:
 * - Client component ('use client' directive)
 * - Path aliases (@features/, @components/)
 * - Lucide React icons only
 */

'use client';

import { ProfileStats } from '../types';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ProfileStatsSectionProps {
  /** Profile statistics */
  stats: ProfileStats;
  /** Loading state */
  isLoading?: boolean;
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function StatsSkeleton() {
  return (
    <div className="bg-gray-50 rounded-lg p-4 animate-pulse">
      <div className="grid grid-cols-3 gap-4 text-center">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <div className="h-8 w-12 bg-gray-200 rounded mx-auto mb-1" />
            <div className="h-4 w-20 bg-gray-200 rounded mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// PROFILESTATSSECTION COMPONENT
// ============================================================================

/**
 * ProfileStatsSection - Display profile statistics in a grid
 *
 * @example
 * ```tsx
 * <ProfileStatsSection
 *   stats={{ profile_views: 24, connections: 12, recommendations: 5 }}
 *   isLoading={false}
 * />
 * ```
 */
export function ProfileStatsSection({ stats, isLoading = false }: ProfileStatsSectionProps) {
  if (isLoading) {
    return <StatsSkeleton />;
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-[#022641]">
            {stats.profile_views.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Profile Views</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-[#022641]">
            {stats.connections.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Connections</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-[#022641]">
            {stats.recommendations.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Recommendations</div>
        </div>
      </div>
    </div>
  );
}

export default ProfileStatsSection;
