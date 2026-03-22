/**
 * AdminPageHeader - Standard page header for admin manager pages
 *
 * @authority docs/components/admin/ADMIN_TABLE_CANONICAL_STANDARD.md
 * @tier SIMPLE
 *
 * Features:
 * - Title with consistent styling
 * - "+ New" button with canonical colors
 * - "Import / Export" button
 * - Customizable additional actions
 */

'use client';

import { ReactNode } from 'react';

export interface AdminPageHeaderProps {
  /** Page title (e.g., "Listings Manager", "Jobs Manager") */
  title: string;
  /** Handler for "+ New" button */
  onCreateNew?: () => void;
  /** Label for create button (default: "+ New") */
  createLabel?: string;
  /** Handler for "Import / Export" button */
  onImportExport?: () => void;
  /** Whether to show Import/Export button (default: true if handler provided) */
  showImportExport?: boolean;
  /** Additional action buttons */
  additionalActions?: ReactNode;
}

export function AdminPageHeader({
  title,
  onCreateNew,
  createLabel = '+ New',
  onImportExport,
  showImportExport = true,
  additionalActions
}: AdminPageHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <div className="flex gap-3 items-center flex-wrap">
        {onCreateNew && (
          <button
            onClick={onCreateNew}
            className="px-4 py-2 bg-[#ed6437] text-white rounded hover:bg-[#d55a31] transition-colors"
          >
            {createLabel}
          </button>
        )}
        {showImportExport && onImportExport && (
          <button
            onClick={onImportExport}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Import / Export
          </button>
        )}
        {additionalActions}
      </div>
    </div>
  );
}

export default AdminPageHeader;
