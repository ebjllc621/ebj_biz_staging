/**
 * AdminTableTemplate - Advanced admin table component
 *
 * @tier ADVANCED
 * @complexity 4.8
 * @dependencies useMemo, useCallback, React.memo (performance optimizations)
 * @osi_layers 7, 6, 5, 4, 3
 * @buildmap v2.1
 *
 * GOVERNANCE: React 18 patterns (Client Component)
 * GOVERNANCE: Generic type support for data rows
 * GOVERNANCE: Sorting, filtering, pagination support
 * GOVERNANCE: Phase R4.1 - React.memo optimization for row rendering
 * AUTHORITY: docs/buildSpecs/incorporationV_old/phases/PHASE_2.2_BRAIN_PLAN.md
 */

'use client';

import React, { useState, useMemo, memo, useCallback } from 'react';
import { ChevronsLeft, ChevronsRight, EyeOff, X, RotateCcw } from 'lucide-react';
import { useColumnVisibility } from '@core/hooks/useColumnVisibility';

export interface TableColumn<T> {
  key: string;
  header: string | React.ReactNode;
  accessor: (row: T) => React.ReactNode;
  /** Optional: Returns raw value for sorting. If not provided, uses row[key] */
  sortValue?: (row: T) => string | number | Date | null | undefined;
  sortable?: boolean;
  width?: string;
}

export interface TableAction<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: T) => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'warning';
  /** When true, render icon-only button (categories style) */
  iconOnly?: boolean;
  /** When true (or returns true), hide this action for the row */
  isHidden?: boolean | ((row: T) => boolean);
}

export interface BulkAction<T> {
  label: string;
  onClick: (selectedRows: T[]) => void;
}

export interface AdminTableTemplateProps<T> {
  title: string;
  data: T[];
  columns: TableColumn<T>[];
  rowKey: (row: T) => string | number;
  actions?: TableAction<T>[];
  bulkActions?: BulkAction<T>[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  loading?: boolean;
  searchable?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  /**
   * Server-side sorting callback - when provided, sorting is delegated to parent
   * and internal client-side sorting is disabled.
   * @param column - The column key to sort by
   * @param direction - Sort direction ('asc' or 'desc')
   */
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  /**
   * External sort state - used to display sort indicators when onSort is provided
   */
  sortState?: {
    column: string;
    direction: 'asc' | 'desc';
  };
  /**
   * Unique ID for localStorage persistence of column visibility (e.g., 'admin-listings')
   * When provided, enables column visibility toggle feature
   */
  tableId?: string;
  /**
   * Column keys to hide by default (only used when tableId is provided)
   */
  defaultHiddenColumns?: string[];
  /**
   * Explicitly enable/disable column visibility feature
   * Default: true when tableId is provided
   */
  enableColumnVisibility?: boolean;
}

/**
 * TableRow - Memoized table row component (R4.1 optimization)
 * Prevents re-renders when other rows change
 */
interface TableRowProps<T> {
  row: T;
  rowKey: (row: T) => string | number;
  columns: TableColumn<T>[];
  actions?: TableAction<T>[];
  bulkActions?: BulkAction<T>[];
  isSelected: boolean;
  onRowClick?: (row: T) => void;
  onRowSelect: (key: string | number) => void;
}

const TableRow = memo(function TableRow<T>({
  row,
  rowKey,
  columns,
  actions,
  bulkActions,
  isSelected,
  onRowClick,
  onRowSelect
}: TableRowProps<T>) {
  const key = rowKey(row);

  return (
    <tr
      className={`${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''} ${
        isSelected ? 'bg-orange-50' : ''
      }`}
      onClick={() => onRowClick && onRowClick(row)}
    >
      {bulkActions && (
        <td className="px-6 py-4 w-12">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onRowSelect(key)}
            onClick={(e) => e.stopPropagation()}
            className="rounded border-gray-300"
            aria-label={`Select row ${key}`}
          />
        </td>
      )}
      {columns.map((column) => (
        <td key={column.key} className="px-6 py-4 text-sm text-gray-900">
          {column.accessor(row)}
        </td>
      ))}
      {actions && (
        <td className="px-6 py-4 text-right text-sm font-medium min-w-[160px]">
          <div className="flex items-center justify-end space-x-1 flex-shrink-0">
            {actions.map((action, index) => {
              // Check if action should be hidden for this row
              const isHidden = typeof action.isHidden === 'function'
                ? action.isHidden(row)
                : action.isHidden;

              if (isHidden) {
                return null;
              }

              // Icon-only button styling (categories style)
              if (action.iconOnly && action.icon) {
                let iconClass = 'p-2 rounded active:scale-95 transition-all flex-shrink-0 ';
                if (action.variant === 'danger') {
                  iconClass += 'text-red-600 hover:bg-red-50';
                } else if (action.variant === 'warning') {
                  iconClass += 'text-yellow-600 hover:bg-yellow-50';
                } else {
                  iconClass += 'text-[#1e3a5f] hover:bg-[#1e3a5f]/10';
                }
                return (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      action.onClick(row);
                    }}
                    className={iconClass}
                    aria-label={action.label}
                    title={action.label}
                  >
                    {action.icon}
                  </button>
                );
              }

              // Standard button with label
              return (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick(row);
                  }}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    action.variant === 'danger'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : action.variant === 'warning'
                      ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {action.icon && <span className="mr-1">{action.icon}</span>}
                  {action.label}
                </button>
              );
            })}
          </div>
        </td>
      )}
    </tr>
  );
}) as <T>(props: TableRowProps<T>) => React.ReactElement;

/**
 * AdminTableTemplate - Standard admin data table
 * GOVERNANCE: Use for admin pages with data tables (users, listings, etc.)
 * GOVERNANCE: Supports sorting, filtering, pagination, bulk actions
 * GOVERNANCE: Phase R4.1 - React.memo + useCallback optimizations
 * AUTHORITY: Phase 2.2 Core Pattern - Admin Table Template
 *
 * Features:
 * - Generic type support for data rows
 * - Column definitions with custom accessors
 * - Sortable columns (click header to sort)
 * - Row selection (checkbox) with select all
 * - Bulk actions (on selected rows)
 * - Per-row actions (edit, delete, etc.)
 * - Pagination support
 * - Search/filter support
 * - Empty state handling
 * - Loading state rendering
 * - Performance optimized with React.memo and useCallback
 *
 * @example
 * ```tsx
 * interface User {
 *   id: number;
 *   name: string;
 *   email: string;
 * }
 *
 * <AdminTableTemplate<User>
 *   title="Users"
 *   data={users}
 *   columns={[
 *     { key: 'name', header: 'Name', accessor: (row) => row.name, sortable: true },
 *     { key: 'email', header: 'Email', accessor: (row) => row.email }
 *   ]}
 *   rowKey={(row) => row.id}
 *   actions={[
 *     { label: 'Edit', onClick: (row) => handleEdit(row.id) }
 *   ]}
 * />
 * ```
 */
export function AdminTableTemplate<T>({
  title,
  data,
  columns,
  rowKey,
  actions,
  bulkActions,
  onRowClick,
  emptyMessage = 'No data available',
  loading = false,
  searchable = false,
  pagination,
  onSort,
  sortState,
  tableId,
  defaultHiddenColumns = [],
  enableColumnVisibility
}: AdminTableTemplateProps<T>) {
  const [selectedRows, setSelectedRows] = useState<Set<string | number>>(new Set());
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');

  // Column visibility feature - enabled when tableId is provided
  const isColumnVisibilityEnabled = enableColumnVisibility ?? Boolean(tableId);
  const allColumnKeys = useMemo(() => columns.map(c => c.key), [columns]);

  // GOVERNANCE FIX: Stabilize defaultHiddenColumns to prevent infinite re-renders
  // The default parameter `= []` creates a new array reference each render,
  // causing useColumnVisibility's useMemo to recompute and trigger useEffect loops
  const stableDefaultHidden = useMemo(
    () => defaultHiddenColumns,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only recompute when length/content changes
    [defaultHiddenColumns.length, ...defaultHiddenColumns]
  );

  const {
    visibility,
    hiddenColumns,
    hideColumn,
    showColumn,
    resetToDefaults,
    hasHiddenColumns
  } = useColumnVisibility({
    tableId: tableId || 'default-table',
    allColumnKeys,
    defaultHidden: stableDefaultHidden
  });

  // Filter columns based on visibility
  const visibleColumns = useMemo(() => {
    if (!isColumnVisibilityEnabled) return columns;
    return columns.filter(col => visibility[col.key] !== false);
  }, [columns, visibility, isColumnVisibilityEnabled]);

  /**
   * Handle sort (R4.1 - useCallback optimization)
   * When onSort is provided (server-side sorting), delegates to parent.
   * Otherwise uses 3-state toggle: ascending → descending → default (no sort)
   */
  const handleSort = useCallback((columnKey: string) => {
    if (onSort) {
      // Server-side sorting: delegate to parent, use sortState for current state
      const currentColumn = sortState?.column;
      const currentDirection = sortState?.direction || 'asc';

      if (currentColumn === columnKey) {
        // Toggle direction
        onSort(columnKey, currentDirection === 'asc' ? 'desc' : 'asc');
      } else {
        // New column, start with ascending
        onSort(columnKey, 'asc');
      }
    } else {
      // Client-side sorting (original behavior)
      if (sortColumn === columnKey) {
        if (sortDirection === 'asc') {
          // Ascending → Descending
          setSortDirection('desc');
        } else {
          // Descending → Default (no sort)
          setSortColumn(null);
          setSortDirection('asc');
        }
      } else {
        // New column, start with ascending
        setSortColumn(columnKey);
        setSortDirection('asc');
      }
    }
  }, [sortColumn, sortDirection, onSort, sortState]);

  /**
   * Sorted data
   * When onSort is provided, data comes pre-sorted from server - skip client sorting.
   * Uses sortValue function if provided, otherwise falls back to row[key]
   */
  const sortedData = useMemo(() => {
    // Server-side sorting: data is already sorted, return as-is
    if (onSort) return data;

    if (!sortColumn) return data;

    const column = columns.find(col => col.key === sortColumn);
    if (!column) return data;

    return [...data].sort((a, b) => {
      // Get raw sortable values (not JSX)
      let aVal: string | number | Date | null | undefined;
      let bVal: string | number | Date | null | undefined;

      if (column.sortValue) {
        // Use explicit sortValue function if provided
        aVal = column.sortValue(a);
        bVal = column.sortValue(b);
      } else {
        // Fall back to accessing row property by column key
        aVal = (a as Record<string, unknown>)[sortColumn] as string | number | Date | null | undefined;
        bVal = (b as Record<string, unknown>)[sortColumn] as string | number | Date | null | undefined;
      }

      // Handle null/undefined values (sort to end)
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Compare based on type
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      if (aVal instanceof Date && bVal instanceof Date) {
        return sortDirection === 'asc'
          ? aVal.getTime() - bVal.getTime()
          : bVal.getTime() - aVal.getTime();
      }

      // Default to string comparison
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();

      if (sortDirection === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
  }, [data, sortColumn, sortDirection, columns]);

  /**
   * Handle row selection (R4.1 - useCallback optimization)
   */
  const handleRowSelect = useCallback((key: string | number) => {
    setSelectedRows(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(key)) {
        newSelected.delete(key);
      } else {
        newSelected.add(key);
      }
      return newSelected;
    });
  }, []);

  /**
   * Handle select all (R4.1 - useCallback optimization)
   */
  const handleSelectAll = useCallback(() => {
    setSelectedRows(prev => {
      if (prev.size === data.length) {
        return new Set();
      } else {
        return new Set(data.map(row => rowKey(row)));
      }
    });
  }, [data, rowKey]);

  /**
   * Get selected row data (R4.1 - useMemo optimization)
   */
  const getSelectedRowData = useMemo((): T[] => {
    return data.filter(row => selectedRows.has(rowKey(row)));
  }, [data, selectedRows, rowKey]);

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>

            {/* Hidden Columns Badges */}
            {isColumnVisibilityEnabled && hasHiddenColumns && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Hidden:</span>
                <div className="flex flex-wrap gap-1">
                  {hiddenColumns.map(key => {
                    const col = columns.find(c => c.key === key);
                    const headerText = typeof col?.header === 'string' ? col.header : key;
                    return (
                      <button
                        key={key}
                        onClick={() => showColumn(key)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                        title={`Show ${headerText} column`}
                      >
                        {headerText}
                        <X className="w-3 h-3" />
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={resetToDefaults}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded transition-colors"
                  title="Reset column visibility to defaults"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              </div>
            )}
          </div>

          {/* Bulk Actions */}
          {bulkActions && selectedRows.size > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {selectedRows.size} selected
              </span>
              {bulkActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => action.onClick(getSelectedRowData)}
                  className="px-3 py-1 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search */}
        {searchable && (
          <div className="mt-4">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {bulkActions && (
                <th className="px-6 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === data.length && data.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {visibleColumns.map((column) => (
                <th
                  key={column.key}
                  className={`group px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <span>{column.header}</span>
                      {column.sortable && (
                        <span className={
                          (onSort ? sortState?.column === column.key : sortColumn === column.key)
                            ? 'text-orange-600'
                            : 'text-gray-300'
                        }>
                          {(onSort ? sortState?.column === column.key : sortColumn === column.key)
                            ? ((onSort ? sortState?.direction : sortDirection) === 'asc' ? '↑' : '↓')
                            : '↕'}
                        </span>
                      )}
                    </div>
                    {/* Column visibility toggle */}
                    {isColumnVisibilityEnabled && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          hideColumn(column.key);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 transition-opacity ml-2"
                        title={`Hide ${typeof column.header === 'string' ? column.header : column.key} column`}
                        aria-label={`Hide ${typeof column.header === 'string' ? column.header : column.key} column`}
                      >
                        <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              {actions && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[160px]">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={visibleColumns.length + (bulkActions ? 1 : 0) + (actions ? 1 : 0)} className="px-6 py-4 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + (bulkActions ? 1 : 0) + (actions ? 1 : 0)} className="px-6 py-4 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row) => {
                const key = rowKey(row);
                const isSelected = selectedRows.has(key);

                return (
                  <TableRow<T>
                    key={key}
                    row={row}
                    rowKey={rowKey}
                    columns={visibleColumns}
                    actions={actions}
                    bulkActions={bulkActions}
                    isSelected={isSelected}
                    onRowClick={onRowClick}
                    onRowSelect={handleRowSelect}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total} results
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="p-1.5 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              title="Previous page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600">
              Page {pagination.page} of {Math.ceil(pagination.total / pagination.pageSize)}
            </span>
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
              className="p-1.5 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              title="Next page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
