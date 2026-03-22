/**
 * ConnectionsSearchBar - Search controls for Connections page
 *
 * @component Client Component
 * @tier SIMPLE
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 *
 * Provides:
 * - Search input with real-time filtering
 * - Results counter
 *
 * @reference src/features/contacts/components/ContactsSearchBar.tsx
 */
'use client';

import { Search } from 'lucide-react';

interface ConnectionsSearchBarProps {
  /** Current search query */
  searchQuery: string;
  /** Callback when search changes */
  onSearchChange: (query: string) => void;
  /** Total number of items in current tab */
  totalCount: number;
  /** Number of filtered items */
  filteredCount: number;
  /** Label for the item type (e.g., "connections", "requests") */
  itemLabel?: string;
}

/**
 * ConnectionsSearchBar component
 */
export function ConnectionsSearchBar({
  searchQuery,
  onSearchChange,
  totalCount,
  filteredCount,
  itemLabel = 'items'
}: ConnectionsSearchBarProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 mb-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
        <input
          type="text"
          placeholder={`Search ${itemLabel}...`}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-8 sm:pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-biz-orange focus:border-biz-orange transition-all"
        />
      </div>

      {/* Results Counter */}
      {searchQuery.trim() && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Showing{' '}
            <span className="font-semibold text-biz-navy">{filteredCount}</span>
            {filteredCount !== totalCount && (
              <>
                {' '}of <span className="font-semibold text-biz-navy">{totalCount}</span>
              </>
            )}
            {' '}{itemLabel}
          </p>
        </div>
      )}
    </div>
  );
}

export default ConnectionsSearchBar;
