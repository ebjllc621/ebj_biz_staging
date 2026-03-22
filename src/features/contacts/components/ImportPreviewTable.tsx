/**
 * ImportPreviewTable - Import Preview and Validation Display
 *
 * @tier STANDARD
 * @authority Phase D Brain Plan
 *
 * Features:
 * - Paginated table of import preview rows
 * - Status badges: Valid (green), Invalid (red), Duplicate (yellow)
 * - Error details tooltip
 * - Row selection for selective import
 * - Summary stats header
 *
 * GOVERNANCE COMPLIANCE:
 * - 'use client' directive for client component
 * - Import paths: Uses @features/ aliases
 *
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @brain-plan docs/pages/layouts/home/user/user_dash/contacts/phases/PHASE_D_IMPORT_EXPORT_BRAIN_PLAN.md
 */

'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import type { ImportPreview } from '../types';

interface ImportPreviewTableProps {
  preview: ImportPreview;
  selectedRows: number[];
  onSelectionChange: (_rowNumbers: number[]) => void;
  page: number;
  onPageChange: (_page: number) => void;
}

const ROWS_PER_PAGE = 10;

export function ImportPreviewTable({
  preview,
  selectedRows,
  onSelectionChange,
  page,
  onPageChange
}: ImportPreviewTableProps) {
  const [showOnlyValid, setShowOnlyValid] = useState(false);

  const filteredRows = showOnlyValid
    ? preview.rows.filter(r => r.status === 'valid')
    : preview.rows;

  const totalPages = Math.ceil(filteredRows.length / ROWS_PER_PAGE);
  const startIndex = (page - 1) * ROWS_PER_PAGE;
  const endIndex = startIndex + ROWS_PER_PAGE;
  const pageRows = filteredRows.slice(startIndex, endIndex);

  const allPageRowsSelected = pageRows.every(r => selectedRows.includes(r.rowNumber));
  const somePageRowsSelected = pageRows.some(r => selectedRows.includes(r.rowNumber));

  const handleSelectAll = () => {
    if (allPageRowsSelected) {
      // Deselect all on page
      onSelectionChange(selectedRows.filter(n => !pageRows.some(r => r.rowNumber === n)));
    } else {
      // Select all on page
      const newSelection = [...selectedRows];
      pageRows.forEach(r => {
        if (!newSelection.includes(r.rowNumber)) {
          newSelection.push(r.rowNumber);
        }
      });
      onSelectionChange(newSelection);
    }
  };

  const handleRowToggle = (rowNumber: number) => {
    if (selectedRows.includes(rowNumber)) {
      onSelectionChange(selectedRows.filter(n => n !== rowNumber));
    } else {
      onSelectionChange([...selectedRows, rowNumber]);
    }
  };

  const getStatusBadge = (status: 'valid' | 'invalid' | 'duplicate') => {
    switch (status) {
      case 'valid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
            <CheckCircle2 className="w-3 h-3" />
            Valid
          </span>
        );
      case 'invalid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
            <XCircle className="w-3 h-3" />
            Invalid
          </span>
        );
      case 'duplicate':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
            <AlertCircle className="w-3 h-3" />
            Duplicate
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-600">Total Rows</div>
          <div className="text-2xl font-bold text-gray-900">{preview.totalRows}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-xs text-green-600">Valid</div>
          <div className="text-2xl font-bold text-green-800">{preview.validRows}</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="text-xs text-red-600">Invalid</div>
          <div className="text-2xl font-bold text-red-800">{preview.invalidRows}</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="text-xs text-yellow-600">Duplicates</div>
          <div className="text-2xl font-bold text-yellow-800">{preview.duplicates}</div>
        </div>
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={showOnlyValid}
            onChange={(e) => {
              setShowOnlyValid(e.target.checked);
              onPageChange(1);
            }}
            className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
          />
          Show only valid rows
        </label>
        <div className="text-sm text-gray-600">
          {selectedRows.length} of {filteredRows.length} selected
        </div>
      </div>

      {/* Preview Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">
                <input
                  type="checkbox"
                  checked={allPageRowsSelected}
                  ref={input => {
                    if (input) {
                      input.indeterminate = somePageRowsSelected && !allPageRowsSelected;
                    }
                  }}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                />
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">#</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Name</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Email</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Phone</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {pageRows.map(row => (
              <tr key={row.rowNumber} className="hover:bg-gray-50">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedRows.includes(row.rowNumber)}
                    onChange={() => handleRowToggle(row.rowNumber)}
                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                  />
                </td>
                <td className="px-3 py-2 text-gray-600">{row.rowNumber}</td>
                <td className="px-3 py-2 text-gray-900 font-medium">{row.data.name}</td>
                <td className="px-3 py-2 text-gray-600">{row.data.email || '-'}</td>
                <td className="px-3 py-2 text-gray-600">{row.data.phone || '-'}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-col gap-1">
                    {getStatusBadge(row.status)}
                    {row.errors.length > 0 && (
                      <div className="text-xs text-red-600">
                        {row.errors.join(', ')}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredRows.length)} of {filteredRows.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImportPreviewTable;
