/**
 * PackageStatistics - Statistics display for packages and add-ons
 *
 * GOVERNANCE COMPLIANCE:
 * - Follows UserStatistics pattern from admin/users page
 * - Horizontal 3-column layout
 * - Responsive grid design
 * - TIER: STANDARD
 *
 * @authority docs/packages/phases/PHASE_2_BRAIN_PLAN.md - Section 2.2
 * @component
 */

'use client';

import { Plus } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface PackageStatisticsProps {
  totalPackages: number;
  activePackages: number;
  totalAddons: number;
  activeAddons: number;
  onAddPackage?: () => void;
  onAddAddon?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PackageStatistics({
  totalPackages,
  activePackages,
  totalAddons,
  activeAddons,
  onAddPackage,
  onAddAddon
}: PackageStatisticsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Total Packages */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Total Packages</h3>
        <p className="text-3xl font-bold text-gray-900">{totalPackages}</p>
        <p className="text-sm text-green-600 mt-2">
          {activePackages} active
        </p>
        {onAddPackage && (
          <button
            onClick={onAddPackage}
            className="w-[70%] mx-auto mt-4 px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a2f] transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            Add Package
          </button>
        )}
      </div>

      {/* Total Add-Ons */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Total Add-Ons</h3>
        <p className="text-3xl font-bold text-gray-900">{totalAddons}</p>
        <p className="text-sm text-green-600 mt-2">
          {activeAddons} active
        </p>
        {onAddAddon && (
          <button
            onClick={onAddAddon}
            className="w-[70%] mx-auto mt-4 px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a2f] transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            Add Add-On
          </button>
        )}
      </div>

      {/* Status Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Status Summary</h3>
        <div className="space-y-3 mt-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Active Packages</span>
            <span className="text-sm font-medium text-green-600">{activePackages}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Active Add-Ons</span>
            <span className="text-sm font-medium text-green-600">{activeAddons}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <span className="text-sm font-medium text-gray-700">Total Active</span>
            <span className="text-sm font-bold text-[#ed6437]">
              {activePackages + activeAddons}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
