/**
 * ImportColumnMapper - CSV Column Mapping Component
 *
 * @tier STANDARD
 * @authority Phase D Brain Plan
 *
 * Features:
 * - Display CSV headers with dropdown mapping
 * - Required field indicator (Name)
 * - Preview first 3 rows with mapping
 * - Auto-detect LinkedIn format
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

import type { ColumnMapping } from '../types';

interface ImportColumnMapperProps {
  headers: string[];
  sampleData: string[][];
  mapping: ColumnMapping;
  onMappingChange: (_mapping: ColumnMapping) => void;
  disabled?: boolean;
}

const FIELD_OPTIONS = [
  { value: 'name', label: 'Name', required: true },
  { value: 'email', label: 'Email', required: false },
  { value: 'phone', label: 'Phone', required: false },
  { value: 'company', label: 'Company', required: false },
  { value: 'notes', label: 'Notes', required: false },
  { value: 'tags', label: 'Tags', required: false },
  { value: 'category', label: 'Category', required: false }
];

export function ImportColumnMapper({
  headers,
  sampleData,
  mapping,
  onMappingChange,
  disabled = false
}: ImportColumnMapperProps) {
  const handleMappingChange = (field: keyof ColumnMapping, columnIndex: number | null) => {
    onMappingChange({
      ...mapping,
      [field]: columnIndex
    });
  };

  return (
    <div className="space-y-4">
      {/* Mapping Controls */}
      <div className="space-y-3">
        {FIELD_OPTIONS.map(field => (
          <div key={field.value} className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              value={mapping[field.value as keyof ColumnMapping] ?? ''}
              onChange={(e) => {
                const value = e.target.value === '' ? null : parseInt(e.target.value, 10);
                handleMappingChange(field.value as keyof ColumnMapping, value);
              }}
              disabled={disabled}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200 transition disabled:bg-gray-100"
            >
              <option value="">-- Not mapped --</option>
              {headers.map((header, index) => (
                <option key={index} value={index}>
                  {header}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Preview with Mapping */}
      {sampleData.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Preview (first 3 rows)</h4>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {FIELD_OPTIONS.map(field => (
                    <th key={field.value} className="px-3 py-2 text-left font-medium text-gray-700">
                      {field.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sampleData.slice(0, 3).map((row, rowIndex) => (
                  <tr key={rowIndex} className="bg-white hover:bg-gray-50">
                    {FIELD_OPTIONS.map(field => {
                      const columnIndex = mapping[field.value as keyof ColumnMapping];
                      const value = columnIndex !== null && columnIndex !== undefined ? row[columnIndex] : '';
                      return (
                        <td key={field.value} className="px-3 py-2 text-gray-900">
                          {value || <span className="text-gray-600 italic">empty</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Validation Messages */}
      {mapping.name === null && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          Name column is required for import
        </div>
      )}
    </div>
  );
}

export default ImportColumnMapper;
