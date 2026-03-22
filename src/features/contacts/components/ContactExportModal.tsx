/**
 * ContactExportModal - Export contacts to CSV or vCard
 *
 * @tier STANDARD
 * @authority Phase D Brain Plan
 *
 * Features:
 * - Format selection (CSV / vCard)
 * - Field selection checkboxes (CSV only)
 * - Export scope: All, Filtered, Selected
 * - Download button with progress
 * - BizModal layout
 *
 * GOVERNANCE COMPLIANCE:
 * - 'use client' directive for client component
 * - BizModal: MANDATORY for all modals
 * - credentials: 'include' for authenticated requests
 * - Import paths: Uses @features/, @/ aliases
 *
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @brain-plan docs/pages/layouts/home/user/user_dash/contacts/phases/PHASE_D_IMPORT_EXPORT_BRAIN_PLAN.md
 */

'use client';

import { useState, useCallback } from 'react';
import { Download } from 'lucide-react';
import BizModal, { BizModalSectionHeader } from '@/components/BizModal/BizModal';
import type { ContactFilters, ExportField } from '../types';

interface ContactExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters?: ContactFilters;
  selectedContactIds?: number[];
  totalContacts: number;
}

type ExportScope = 'all' | 'filtered' | 'selected';
type ExportFormat = 'csv' | 'vcf';

const EXPORT_FIELDS: { value: ExportField; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'company', label: 'Company' },
  { value: 'notes', label: 'Notes' },
  { value: 'tags', label: 'Tags' },
  { value: 'category', label: 'Category' },
  { value: 'priority', label: 'Priority' },
  { value: 'follow_up_date', label: 'Follow-up Date' },
  { value: 'follow_up_note', label: 'Follow-up Note' },
  { value: 'source', label: 'Source' },
  { value: 'source_details', label: 'Source Details' },
  { value: 'is_starred', label: 'Starred' },
  { value: 'connected_since', label: 'Added Date' }
];

export function ContactExportModal({
  isOpen,
  onClose,
  filters,
  selectedContactIds = [],
  totalContacts
}: ContactExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [scope, setScope] = useState<ExportScope>('all');
  const [selectedFields, setSelectedFields] = useState<ExportField[]>([
    'name', 'email', 'phone', 'company', 'notes', 'tags', 'category', 'connected_since'
  ]);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasFilters = filters && (filters.category || filters.isStarred || filters.source);
  const hasSelection = selectedContactIds.length > 0;

  const handleFieldToggle = (field: ExportField) => {
    setSelectedFields(prev =>
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setError(null);

    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('format', format);

      if (format === 'csv') {
        params.append('fields', selectedFields.join(','));
      }

      // Add scope parameters
      if (scope === 'filtered' && hasFilters) {
        if (filters?.category) params.append('category', filters.category);
        if (filters?.isStarred) params.append('starred', 'true');
        if (filters?.source) params.append('source', filters.source);
      } else if (scope === 'selected' && hasSelection) {
        params.append('contactIds', selectedContactIds.join(','));
      }

      // Fetch export
      const response = await fetch(`/api/contacts/export?${params.toString()}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = (filenameMatch && filenameMatch[1]) || `contacts-export.${format === 'vcf' ? 'vcf' : 'csv'}`;

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export contacts');
    } finally {
      setIsExporting(false);
    }
  }, [format, scope, selectedFields, filters, selectedContactIds, hasFilters, hasSelection, onClose]);

  const handleClose = () => {
    if (!isExporting) {
      setError(null);
      onClose();
    }
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Export Contacts"
      subtitle="Download your contacts for backup or use in other systems"
      maxWidth="md"
    >
      <div className="space-y-6">
        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Section 1: Export Format */}
        <div>
          <BizModalSectionHeader step={1} title="Export Format" />
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setFormat('csv')}
              disabled={isExporting}
              className={`p-4 border-2 rounded-lg text-left transition-colors ${
                format === 'csv'
                  ? 'border-[#ed6437] bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="font-medium text-gray-900">CSV</div>
              <div className="text-xs text-gray-500 mt-1">For spreadsheets (Excel, Google Sheets)</div>
            </button>
            <button
              onClick={() => setFormat('vcf')}
              disabled={isExporting}
              className={`p-4 border-2 rounded-lg text-left transition-colors ${
                format === 'vcf'
                  ? 'border-[#ed6437] bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="font-medium text-gray-900">vCard (.vcf)</div>
              <div className="text-xs text-gray-500 mt-1">For mobile phones and email clients</div>
            </button>
          </div>
        </div>

        {/* Section 2: Export Scope */}
        <div>
          <BizModalSectionHeader step={2} title="Export Scope" />
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="scope"
                value="all"
                checked={scope === 'all'}
                onChange={(e) => setScope(e.target.value as ExportScope)}
                disabled={isExporting}
                className="w-4 h-4 text-orange-600 focus:ring-orange-500"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">
                  All contacts ({totalContacts})
                </div>
              </div>
            </label>

            {hasFilters && (
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="scope"
                  value="filtered"
                  checked={scope === 'filtered'}
                  onChange={(e) => setScope(e.target.value as ExportScope)}
                  disabled={isExporting}
                  className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">Filtered results</div>
                  <div className="text-xs text-gray-500">Based on current filter settings</div>
                </div>
              </label>
            )}

            {hasSelection && (
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="scope"
                  value="selected"
                  checked={scope === 'selected'}
                  onChange={(e) => setScope(e.target.value as ExportScope)}
                  disabled={isExporting}
                  className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    Selected contacts ({selectedContactIds.length})
                  </div>
                </div>
              </label>
            )}
          </div>
        </div>

        {/* Section 3: Field Selection (CSV only) */}
        {format === 'csv' && (
          <div>
            <BizModalSectionHeader step={3} title="Include Fields" />
            <div className="grid grid-cols-2 gap-3">
              {EXPORT_FIELDS.map(field => (
                <label
                  key={field.value}
                  className="flex items-center gap-2 text-sm cursor-pointer hover:text-gray-900 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedFields.includes(field.value)}
                    onChange={() => handleFieldToggle(field.value)}
                    disabled={isExporting}
                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-gray-700">{field.label}</span>
                </label>
              ))}
            </div>
            {selectedFields.length === 0 && (
              <p className="mt-2 text-xs text-red-600">Select at least one field to export</p>
            )}
          </div>
        )}
      </div>

      {/* Modal Footer */}
      <div className="mt-6 flex justify-end gap-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={handleClose}
          disabled={isExporting}
          className="px-6 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting || (format === 'csv' && selectedFields.length === 0)}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55730] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          {isExporting ? 'Exporting...' : 'Download Export'}
        </button>
      </div>
    </BizModal>
  );
}

export default ContactExportModal;
