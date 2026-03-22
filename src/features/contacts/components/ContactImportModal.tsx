/**
 * ContactImportModal - Multi-step CSV/VCF Import Workflow
 *
 * @tier ADVANCED
 * @authority Phase D Brain Plan
 *
 * Features:
 * - Multi-step wizard: Upload → Map Columns (CSV only) → Preview → Import
 * - CSV and VCF (vCard) file drag-and-drop upload
 * - Column mapping with auto-detection (CSV only)
 * - VCF files skip column mapping (fixed field structure)
 * - Duplicate detection display
 * - Progress indicator during import
 * - Error summary display
 * - BizModal with step navigation
 * - ErrorBoundary required (ADVANCED tier)
 *
 * GOVERNANCE COMPLIANCE:
 * - 'use client' directive for client component
 * - BizModal: MANDATORY for all modals
 * - fetchCsrfToken: MANDATORY for POST
 * - credentials: 'include' for authenticated requests
 * - Import paths: Uses @core/, @features/, @/ aliases
 * - ErrorBoundary: MANDATORY wrapper for ADVANCED tier
 *
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @brain-plan docs/pages/layouts/home/user/user_dash/contacts/phases/PHASE_D_IMPORT_EXPORT_BRAIN_PLAN.md
 */

'use client';

import { useState, useRef } from 'react';
import { Upload, FileText } from 'lucide-react';
import { fetchCsrfToken } from '@core/utils/csrf';
import BizModal, { BizModalSectionHeader } from '@/components/BizModal/BizModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import ImportColumnMapper from './ImportColumnMapper';
import ImportPreviewTable from './ImportPreviewTable';
import type { ColumnMapping, ImportPreview, ImportResult, ImportMatchResult } from '../types';
import { fetchCsrfToken as fetchCsrf } from '@core/utils/csrf';

interface ContactImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (_result: ImportResult) => void;
}

type ImportStep = 'upload' | 'mapping' | 'preview' | 'import';

function ContactImportModalContent({
  isOpen,
  onClose,
  onImportComplete
}: ContactImportModalProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'csv' | 'vcf' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [sampleData, setSampleData] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    name: null,
    email: null,
    phone: null,
    company: null,
    notes: null,
    tags: null,
    category: null
  });
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [previewPage, setPreviewPage] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Phase 5: Match notification state
  const [notifyMatches, setNotifyMatches] = useState(false);
  const [notificationSent, setNotificationSent] = useState(false);
  const [notificationSending, setNotificationSending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Detect file type from filename
   */
  const detectFileType = (filename: string): 'csv' | 'vcf' | null => {
    const lowerName = filename.toLowerCase();
    if (lowerName.endsWith('.vcf')) return 'vcf';
    if (lowerName.endsWith('.csv')) return 'csv';
    return null;
  };

  const resetState = () => {
    setStep('upload');
    setFile(null);
    setFileType(null);
    setHeaders([]);
    setSampleData([]);
    setMapping({
      name: null,
      email: null,
      phone: null,
      company: null,
      notes: null,
      tags: null,
      category: null
    });
    setPreview(null);
    setSelectedRows([]);
    setPreviewPage(1);
    setError(null);
    setImportResult(null);
    // Phase 5: Reset notification state
    setNotifyMatches(false);
    setNotificationSent(false);
    setNotificationSending(false);
  };

  /**
   * Phase 5: Send notifications for matched contacts
   */
  const handleNotifyMatches = async () => {
    if (!importResult?.matchResults?.matches) return;

    setNotificationSending(true);

    try {
      const csrfToken = await fetchCsrf();

      const response = await fetch('/api/contacts/import/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || ''
        },
        credentials: 'include',
        body: JSON.stringify({
          matches: importResult.matchResults.matches
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send notifications');
      }

      setNotificationSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send notifications');
    } finally {
      setNotificationSending(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      resetState();
      onClose();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const detectedType = detectFileType(droppedFile.name);
      if (detectedType) {
        setFile(droppedFile);
        setFileType(detectedType);
        setError(null);
      } else {
        setError('Please upload a CSV or VCF file');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const detectedType = detectFileType(selectedFile.name);
      if (detectedType) {
        setFile(selectedFile);
        setFileType(detectedType);
        setError(null);
      } else {
        setError('Please upload a CSV or VCF file');
      }
    }
  };

  const handleNextFromUpload = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const csrfToken = await fetchCsrfToken();
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/contacts/import/preview', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': csrfToken || ''
        },
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to parse file');
      }

      const result = await response.json();
      const data = result.data || result;

      // Update file type from server response (authoritative)
      const serverFileType = data.fileType as 'csv' | 'vcf' | undefined;
      if (serverFileType) {
        setFileType(serverFileType);
      }

      setHeaders(data.headers || []);
      interface PreviewRow {
        data: {
          name?: string;
          email?: string;
          phone?: string;
          company?: string;
          notes?: string;
          tags?: string;
          category?: string;
        };
      }
      setSampleData(data.preview?.rows?.slice(0, 3).map((r: PreviewRow) => [
        r.data.name || '',
        r.data.email || '',
        r.data.phone || '',
        r.data.company || '',
        r.data.notes || '',
        r.data.tags || '',
        r.data.category || ''
      ]) || []);
      setMapping(data.detectedMapping || mapping);

      // VCF files skip column mapping (fixed structure) and go directly to preview
      if (serverFileType === 'vcf' || fileType === 'vcf') {
        // Set preview data for VCF
        interface PreviewResultRow {
          status: 'valid' | 'invalid' | 'duplicate';
          rowNumber: number;
        }
        setPreview(data.preview);
        setSelectedRows(data.preview.rows
          .filter((r: PreviewResultRow) => r.status === 'valid')
          .map((r: PreviewResultRow) => r.rowNumber)
        );
        setStep('preview');
      } else {
        // CSV files need column mapping step
        setStep('mapping');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNextFromMapping = async () => {
    if (mapping.name === null) {
      setError('Name column is required');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const csrfToken = await fetchCsrfToken();
      const formData = new FormData();
      formData.append('file', file!);
      formData.append('columnMapping', JSON.stringify(mapping));

      const response = await fetch('/api/contacts/import/preview', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': csrfToken || ''
        },
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to generate preview');
      }

      const result = await response.json();
      const data = result.data || result;

      interface PreviewResultRow {
        status: 'valid' | 'invalid' | 'duplicate';
        rowNumber: number;
      }
      setPreview(data.preview);
      // Select all valid rows by default
      setSelectedRows(data.preview.rows
        .filter((r: PreviewResultRow) => r.status === 'valid')
        .map((r: PreviewResultRow) => r.rowNumber)
      );
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate preview');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!preview || selectedRows.length === 0) {
      setError('Please select at least one contact to import');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const csrfToken = await fetchCsrfToken();

      // Filter rows to import
      const rowsToImport = preview.rows
        .filter(r => selectedRows.includes(r.rowNumber))
        .map(r => r.data);

      const response = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || ''
        },
        credentials: 'include',
        body: JSON.stringify({
          rows: rowsToImport,
          skipDuplicates: false,
          sourceDetails: `${fileType === 'vcf' ? 'VCF' : 'CSV'} Import: ${file?.name || 'Unknown'}`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to import contacts');
      }

      const result = await response.json();
      const data = result.data || result;

      setImportResult(data.result);
      setStep('import');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import contacts');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinish = () => {
    if (importResult) {
      onImportComplete(importResult);
    }
    handleClose();
  };

  // For VCF files, we skip step 2 (mapping), so steps are 1, 2, 3 instead of 1, 2, 3, 4
  const totalSteps = fileType === 'vcf' ? 3 : 4;

  const getStepNumber = () => {
    if (fileType === 'vcf') {
      // VCF: Upload(1) → Preview(2) → Complete(3)
      switch (step) {
        case 'upload': return 1;
        case 'preview': return 2;
        case 'import': return 3;
        default: return 1;
      }
    }
    // CSV: Upload(1) → Mapping(2) → Preview(3) → Complete(4)
    switch (step) {
      case 'upload': return 1;
      case 'mapping': return 2;
      case 'preview': return 3;
      case 'import': return 4;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'upload': return 'Upload File';
      case 'mapping': return 'Map Columns';
      case 'preview': return 'Preview & Validate';
      case 'import': return 'Import Complete';
    }
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Contacts"
      subtitle={`Step ${getStepNumber()} of ${totalSteps}: ${getStepTitle()}`}
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div>
            <BizModalSectionHeader step={1} title="Choose File" />
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-[#ed6437] bg-orange-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.vcf"
                onChange={handleFileSelect}
                className="hidden"
              />
              {file ? (
                <div className="space-y-2">
                  <FileText className="w-12 h-12 text-green-600 mx-auto" />
                  <div className="font-medium text-gray-900">{file.name}</div>
                  <div className="text-sm text-gray-500">
                    {(file.size / 1024).toFixed(2)} KB
                    {fileType && (
                      <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded text-xs uppercase">
                        {fileType}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setFileType(null);
                    }}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-12 h-12 text-gray-600 mx-auto" />
                  <div className="font-medium text-gray-700">
                    Drag & drop CSV or VCF file here
                  </div>
                  <div className="text-sm text-gray-500">or click to browse</div>
                </div>
              )}
            </div>
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              <strong>Tips:</strong> Supports CSV and VCF (vCard) formats. CSV must have a header row. Maximum 500 contacts per import. File size limit: 5MB.
            </div>
          </div>
        )}

        {/* Step 2: Mapping */}
        {step === 'mapping' && (
          <div>
            <BizModalSectionHeader step={2} title="Map Columns to Fields" />
            <ImportColumnMapper
              headers={headers}
              sampleData={sampleData.map((row: string[]) => row)}
              mapping={mapping}
              onMappingChange={setMapping}
              disabled={isProcessing}
            />
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && preview && (
          <div>
            <BizModalSectionHeader step={3} title="Review Import Data" />
            <ImportPreviewTable
              preview={preview}
              selectedRows={selectedRows}
              onSelectionChange={setSelectedRows}
              page={previewPage}
              onPageChange={setPreviewPage}
            />
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 'import' && importResult && (
          <div>
            <BizModalSectionHeader step={4} title="Import Complete" />
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-800">{importResult.imported}</div>
                  <div className="text-sm text-green-600">Imported</div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-yellow-800">{importResult.duplicates}</div>
                  <div className="text-sm text-yellow-600">Duplicates</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-red-800">{importResult.skipped}</div>
                  <div className="text-sm text-red-600">Skipped</div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Errors:</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {importResult.errors.map((err, i) => (
                      <div key={i} className="text-sm text-red-600">
                        Row {err.rowNumber}: {err.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Phase 5: Match Results Display */}
              {importResult.matchResults && importResult.matchResults.totalMatched > 0 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-800 flex items-center gap-2">
                    <span className="text-lg">🎉</span>
                    {importResult.matchResults.totalMatched} contact(s) found on Bizconekt!
                  </h4>
                  <p className="text-sm text-green-600 mt-1">
                    {importResult.matchResults.highConfidence > 0 && (
                      <span>{importResult.matchResults.highConfidence} exact match(es)</span>
                    )}
                    {importResult.matchResults.highConfidence > 0 && importResult.matchResults.mediumConfidence > 0 && ', '}
                    {importResult.matchResults.mediumConfidence > 0 && (
                      <span>{importResult.matchResults.mediumConfidence} possible match(es)</span>
                    )}
                  </p>

                  {/* Match List */}
                  <ul className="mt-3 space-y-2 max-h-32 overflow-y-auto">
                    {importResult.matchResults.matches.slice(0, 5).map((match: ImportMatchResult) => (
                      <li key={match.contactId} className="flex items-center gap-3 text-sm">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-green-800 font-medium text-xs">
                          {match.matchedUser.display_name?.[0] || match.matchedUser.username[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {match.contactName}
                          </div>
                          <div className="text-xs text-gray-500">
                            matches @{match.matchedUser.username}
                            {match.isAlreadyConnected && ' (already connected)'}
                            {match.hasPendingRequest && ' (pending request)'}
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          match.confidence === 'high'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {match.matchType === 'email' ? 'Email' : match.matchType === 'phone' ? 'Phone' : 'Name'}
                        </span>
                      </li>
                    ))}
                    {importResult.matchResults.matches.length > 5 && (
                      <li className="text-sm text-gray-500 italic">
                        +{importResult.matchResults.matches.length - 5} more matches
                      </li>
                    )}
                  </ul>

                  {/* Optional Notification Toggle */}
                  <div className="mt-4 pt-3 border-t border-green-200">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifyMatches}
                        onChange={(e) => setNotifyMatches(e.target.checked)}
                        disabled={notificationSent || notificationSending}
                        className="rounded border-green-400 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-green-800">
                        Add reminders to connect with these members
                      </span>
                    </label>

                    {notifyMatches && !notificationSent && (
                      <button
                        type="button"
                        onClick={handleNotifyMatches}
                        disabled={notificationSending}
                        className="mt-2 px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {notificationSending ? 'Sending...' : 'Send Reminders'}
                      </button>
                    )}

                    {notificationSent && (
                      <p className="mt-2 text-sm text-green-700 flex items-center gap-1">
                        <span>✓</span> Reminders sent! Check your notifications.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Footer */}
      <div className="mt-6 flex justify-between pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={() => {
            if (step === 'upload') {
              handleClose();
            } else if (step === 'mapping') {
              setStep('upload');
            } else if (step === 'preview') {
              // VCF files skip mapping, go back to upload
              // CSV files go back to mapping
              setStep(fileType === 'vcf' ? 'upload' : 'mapping');
            }
          }}
          disabled={isProcessing || step === 'import'}
          className="px-6 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {step === 'upload' ? 'Cancel' : 'Back'}
        </button>

        {step === 'upload' && (
          <button
            type="button"
            onClick={handleNextFromUpload}
            disabled={!file || isProcessing}
            className="px-6 py-2.5 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55730] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Next'}
          </button>
        )}

        {step === 'mapping' && (
          <button
            type="button"
            onClick={handleNextFromMapping}
            disabled={mapping.name === null || isProcessing}
            className="px-6 py-2.5 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55730] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Generating Preview...' : 'Next'}
          </button>
        )}

        {step === 'preview' && (
          <button
            type="button"
            onClick={handleExecuteImport}
            disabled={selectedRows.length === 0 || isProcessing}
            className="px-6 py-2.5 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55730] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Importing...' : `Import ${selectedRows.length} Contacts`}
          </button>
        )}

        {step === 'import' && (
          <button
            type="button"
            onClick={handleFinish}
            className="px-6 py-2.5 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55730] font-medium transition-colors"
          >
            Done
          </button>
        )}
      </div>
    </BizModal>
  );
}

// Export with ErrorBoundary wrapper (ADVANCED tier requirement)
export function ContactImportModal(props: ContactImportModalProps) {
  return (
    <ErrorBoundary componentName="ContactImportModal">
      <ContactImportModalContent {...props} />
    </ErrorBoundary>
  );
}

export default ContactImportModal;
