/**
 * @component ListingStats
 * @tier SIMPLE - No state, display only
 * @phase Phase 2 - Overview & Description Section
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 *
 * Displays listing statistics: Type, Year Established, Employee Count.
 * Returns null if no stats to show.
 * Horizontal scroll on mobile, grid on desktop.
 *
 * @see docs/pages/layouts/listings/details/phases/PHASE_2_BRAIN_PLAN.md
 */

'use client';

import Link from 'next/link';
import { Building2, Calendar, Users, Settings, BarChart3 } from 'lucide-react';
import type { Listing } from '@core/services/ListingService';

/**
 * Convert type ID to human-readable name (backward compat for existing data)
 * New listings store the name directly, old ones store IDs
 */
const getTypeName = (type: string | null): string => {
  if (!type) return '';
  // If it's already a name (not a number), return as-is
  if (isNaN(Number(type))) return type;
  // Map IDs to names for legacy data
  const typeMap: Record<string, string> = {
    '1': 'Business',
    '2': 'Non-Profit',
    '3': 'Government',
    '4': 'Professional Association',
    '5': 'Other Group',
    '6': 'Creator',
    '14': 'Service Provider',
  };
  return typeMap[type] || type;
};

interface ListingStatsProps {
  listing: Listing;
  isEditMode?: boolean;
}

export function ListingStats({ listing, isEditMode }: ListingStatsProps) {
  // Check if there are any stats to display
  const hasStats =
    listing.type ||
    listing.year_established ||
    listing.employee_count;

  // Show empty state in edit mode when no stats
  if (isEditMode && !hasStats) {
    return (
      <section className="bg-white rounded-lg shadow-sm p-6 border-2 border-dashed border-gray-300">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              Quick Facts
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              No stats yet. Add business type, year established, or employee count.
            </p>
            <Link
              href={`/dashboard/listings/${String(listing.id)}/basic-info` as any}
              className="inline-flex items-center gap-2 px-4 py-2 bg-biz-navy text-white text-sm font-medium rounded-md hover:bg-biz-navy/90 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Configure
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Return null in published mode when no stats
  if (!hasStats) {
    return null;
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">
        Quick Facts
      </h2>

      {/* Mobile: Horizontal scroll, Desktop: Grid */}
      <div className="flex overflow-x-auto lg:grid lg:grid-cols-3 gap-4 pb-2 lg:pb-0">
        {/* Type */}
        {listing.type && (
          <div className="flex items-center gap-3 min-w-[150px]">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Type</p>
              <p className="text-sm font-medium text-gray-900 truncate">
                {getTypeName(listing.type)}
              </p>
            </div>
          </div>
        )}

        {/* Year Established */}
        {listing.year_established && (
          <div className="flex items-center gap-3 min-w-[150px]">
            <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Established</p>
              <p className="text-sm font-medium text-gray-900">
                {listing.year_established}
              </p>
            </div>
          </div>
        )}

        {/* Employee Count */}
        {listing.employee_count && (
          <div className="flex items-center gap-3 min-w-[150px]">
            <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Employees</p>
              <p className="text-sm font-medium text-gray-900">
                {listing.employee_count}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
