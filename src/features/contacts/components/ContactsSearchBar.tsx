/**
 * ContactsSearchBar - Search, sort, and view controls for Contacts page
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Contacts Phase A (Enhanced Phase E)
 * @generated ComponentBuilder v3.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 *
 * Provides:
 * - Search input with real-time filtering
 * - Sort dropdown (Name, Connected Date, Last Interaction)
 * - View mode toggle (Grid/List)
 * - Smart List selector dropdown (Phase E enhancement)
 * - Results counter
 *
 * @see docs/pages/layouts/home/user/user_dash/contacts/phases/PHASE_A_CORE_CONTACTS_DISPLAY_BRAIN_PLAN.md
 * @see docs/pages/layouts/home/user/user_dash/contacts/SMART_LIST_UI_REFACTOR.md
 */
'use client';

import { Search, Grid3x3, List, ChevronDown } from 'lucide-react';
import type { ContactSortOption, SmartList } from '../types';
import SmartListSelector from './SmartListSelector';
import { ContactsPagination, type PageSize } from './ContactsPagination';

interface ContactsSearchBarProps {
  /** Current search query */
  searchQuery: string;
  /** Callback when search changes */
  onSearchChange: (_query: string) => void;
  /** Current sort option */
  sortBy: ContactSortOption;
  /** Callback when sort changes */
  onSortChange: (_sort: ContactSortOption) => void;
  /** Current view mode */
  viewMode: 'grid' | 'list';
  /** Callback when view mode changes */
  onViewModeChange: (_mode: 'grid' | 'list') => void;
  /** Total number of contacts */
  totalCount: number;
  /** Number of filtered contacts */
  filteredCount: number;
  /** Currently selected smart list (Phase E) */
  selectedSmartList?: SmartList | null;
  /** Callback when smart list is selected (Phase E) */
  onSelectSmartList?: (list: SmartList | null) => void;
  /** Callback to open create smart list modal (Phase E) */
  onCreateSmartList?: () => void;
  /** Current page (1-indexed) */
  currentPage?: number;
  /** Items per page */
  pageSize?: PageSize;
  /** Callback when page changes */
  onPageChange?: (page: number) => void;
  /** Callback when page size changes */
  onPageSizeChange?: (size: PageSize) => void;
}

/**
 * Sort option labels for dropdown
 */
const SORT_OPTIONS: readonly { readonly value: ContactSortOption; readonly label: string }[] = [
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
  { value: 'connected_date_newest', label: 'Recently Connected' },
  { value: 'connected_date_oldest', label: 'Oldest Connections' },
  { value: 'last_interaction', label: 'Recent Interaction' }
] as const;

/**
 * ContactsSearchBar component
 */
export function ContactsSearchBar({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  totalCount,
  filteredCount,
  selectedSmartList,
  onSelectSmartList,
  onCreateSmartList,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange
}: ContactsSearchBarProps) {
  const hasPagination = currentPage !== undefined && pageSize !== undefined && onPageChange && onPageSizeChange;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
      {/* Row 1: Smart List + Search (most important on mobile) */}
      <div className="flex gap-2 sm:gap-3">
        {/* Smart List Selector (Phase E) */}
        {onSelectSmartList && onCreateSmartList && (
          <SmartListSelector
            selectedList={selectedSmartList || null}
            onSelectList={onSelectSmartList}
            onCreateList={onCreateSmartList}
          />
        )}

        {/* Search Input */}
        <div className="flex-1 relative min-w-0">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 sm:pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-biz-orange focus:border-biz-orange transition-all"
          />
        </div>
      </div>

      {/* Row 2: Sort + View Toggle (secondary controls) */}
      <div className="flex items-center justify-between gap-2 mt-2 sm:mt-3">
        {/* Sort Dropdown */}
        <div className="relative flex-1 sm:flex-none">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as ContactSortOption)}
            className="w-full sm:w-auto appearance-none pl-3 pr-8 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-biz-orange focus:border-biz-orange transition-all bg-white text-gray-700 font-medium cursor-pointer hover:border-gray-400"
          >
            {SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-1.5 rounded-md transition-all ${
              viewMode === 'grid'
                ? 'bg-white text-biz-orange shadow-sm'
                : 'text-gray-600 hover:text-biz-navy'
            }`}
            aria-label="Grid view"
            title="Grid view"
          >
            <Grid3x3 className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-1.5 rounded-md transition-all ${
              viewMode === 'list'
                ? 'bg-white text-biz-orange shadow-sm'
                : 'text-gray-600 hover:text-biz-navy'
            }`}
            aria-label="List view"
            title="List view"
          >
            <List className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Results Counter with Pagination Controls */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        {hasPagination ? (
          <ContactsPagination
            totalCount={filteredCount}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            position="top"
          />
        ) : (
          <p className="text-sm text-gray-600">
            Showing{' '}
            <span className="font-semibold text-biz-navy">{filteredCount}</span>
            {filteredCount !== totalCount && (
              <>
                {' '}of <span className="font-semibold text-biz-navy">{totalCount}</span>
              </>
            )}
            {' '}contact{filteredCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}

export default ContactsSearchBar;