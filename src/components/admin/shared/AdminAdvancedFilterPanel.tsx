/**
 * AdminAdvancedFilterPanel - Collapsible advanced filter panel
 *
 * @authority docs/components/admin/ADMIN_TABLE_CANONICAL_STANDARD.md
 * @tier STANDARD
 *
 * Features:
 * - Collapsible panel with toggle button
 * - Active filter count badge
 * - AND/OR match mode toggle
 * - Clear all button
 * - Customizable filter fields
 */

'use client';

import { memo, ReactNode } from 'react';
import { Filter, ChevronUp, ChevronDown } from 'lucide-react';

export type MatchMode = 'all' | 'any';

export interface FilterField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select';
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** For select type: whether to include "All" option automatically */
  includeAll?: boolean;
}

export interface AdminAdvancedFilterPanelProps<T extends Record<string, string>> {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Current filter values */
  filters: T;
  /** Called when filters change */
  onChange: (filters: T) => void;
  /** Called when "Clear All" is clicked */
  onClear: () => void;
  /** Called when toggle button is clicked */
  onToggle: () => void;
  /** Number of active filters (for badge) */
  activeFilterCount: number;
  /** Filter field definitions */
  fields: FilterField[];
  /** Match mode (AND/OR) */
  matchMode?: MatchMode;
  /** Called when match mode changes */
  onMatchModeChange?: (mode: MatchMode) => void;
  /** Whether to show match mode toggle (default: true) */
  showMatchMode?: boolean;
  /** Number of columns in filter grid (default: 3) */
  columns?: 1 | 2 | 3 | 4;
}

const columnClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
};

function FilterFieldComponent<T extends Record<string, string>>({
  field,
  value,
  onChange
}: {
  field: FilterField;
  value: string;
  onChange: (key: string, value: string) => void;
}) {
  const { key, label, type, placeholder, options, includeAll = true } = field;

  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}
        {type === 'number' && <span className="text-gray-400"> (exact match)</span>}
        {type === 'text' && <span className="text-gray-400"> (partial match)</span>}
      </label>

      {type === 'select' ? (
        <select
          value={value}
          onChange={(e) => onChange(key, e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          {includeAll && <option value="">All {label}s</option>}
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(key, e.target.value)}
          placeholder={placeholder || `e.g., ${label}`}
          autoComplete="off"
          data-lpignore="true"
          data-1p-ignore="true"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      )}
    </div>
  );
}

export const AdminAdvancedFilterPanel = memo(function AdminAdvancedFilterPanel<
  T extends Record<string, string>
>({
  isOpen,
  filters,
  onChange,
  onClear,
  onToggle,
  activeFilterCount,
  fields,
  matchMode = 'all',
  onMatchModeChange,
  showMatchMode = true,
  columns = 3
}: AdminAdvancedFilterPanelProps<T>) {
  const handleFieldChange = (key: string, value: string) => {
    onChange({ ...filters, [key]: value } as T);
  };

  return (
    <div>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="flex items-center gap-2 min-h-[44px] px-4 py-2 bg-gray-100 hover:bg-gray-200 active:scale-95 rounded-md transition-all text-sm font-medium"
      >
        <Filter className="w-4 h-4" />
        <span>Advanced Filters</span>
        {activeFilterCount > 0 && (
          <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
            {activeFilterCount}
          </span>
        )}
        {isOpen ? (
          <ChevronUp className="w-4 h-4 ml-auto" />
        ) : (
          <ChevronDown className="w-4 h-4 ml-auto" />
        )}
      </button>

      {/* Filter Panel */}
      {isOpen && (
        <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-md space-y-3">
          <div className={`grid ${columnClasses[columns]} gap-3`}>
            {fields.map((field) => (
              <FilterFieldComponent
                key={field.key}
                field={field}
                value={filters[field.key] || ''}
                onChange={handleFieldChange}
              />
            ))}

            {/* Match Mode */}
            {showMatchMode && onMatchModeChange && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Match Mode
                </label>
                <select
                  value={matchMode}
                  onChange={(e) => onMatchModeChange(e.target.value as MatchMode)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">Match All (AND)</option>
                  <option value="any">Match Any (OR)</option>
                </select>
              </div>
            )}
          </div>

          {/* Clear All Button */}
          <div className="flex justify-end pt-2 border-t border-gray-200">
            <button
              onClick={onClear}
              className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}) as <T extends Record<string, string>>(
  props: AdminAdvancedFilterPanelProps<T>
) => React.ReactElement;

/**
 * Common filter field presets for reuse
 */
export const commonFilterFields = {
  tier: {
    key: 'tier',
    label: 'Tier',
    type: 'select' as const,
    options: [
      { value: 'essentials', label: 'Essentials' },
      { value: 'plus', label: 'Plus' },
      { value: 'preferred', label: 'Preferred' },
      { value: 'premium', label: 'Premium' }
    ]
  },
  status: {
    key: 'status',
    label: 'Status',
    type: 'select' as const,
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'pending', label: 'Pending' },
      { value: 'suspended', label: 'Suspended' }
    ]
  },
  approved: {
    key: 'approved',
    label: 'Approval Status',
    type: 'select' as const,
    options: [
      { value: 'pending', label: 'Pending Review' },
      { value: 'approved', label: 'Approved' },
      { value: 'rejected', label: 'Rejected' }
    ]
  },
  id: {
    key: 'id',
    label: 'ID',
    type: 'number' as const,
    placeholder: 'e.g., 123'
  },
  name: {
    key: 'name',
    label: 'Name',
    type: 'text' as const
  },
  owner: {
    key: 'owner',
    label: 'Owner',
    type: 'text' as const,
    placeholder: 'e.g., john@example.com'
  }
};

export default AdminAdvancedFilterPanel;
