/**
 * HireReportModal - Modal to report successful hires
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Jobs Analytics - Report Hire Feature
 * @authority docs/dna/jobs-analytics-canon.md
 *
 * GOVERNANCE RULES:
 * - MUST use BizModal
 * - MUST use fetchWithCsrf for POST
 * - Orange theme (#ed6437)
 */
'use client';

import { useState } from 'react';
import { BizModal } from '@/components/ui/BizModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { fetchWithCsrf } from '@core/utils/csrf';
import { UserPlus, Loader2 } from 'lucide-react';

// Hire source options matching database ENUM
const HIRE_SOURCES = [
  { value: 'native_application', label: 'Through Bizconekt application' },
  { value: 'external', label: 'Applied externally (other site)' },
  { value: 'direct', label: 'Direct contact' },
  { value: 'referral', label: 'Referral' }
] as const;

type HireSource = typeof HIRE_SOURCES[number]['value'];

interface HireReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: number;
  jobTitle: string;
  onSuccess: () => void;
}

function HireReportModalContent({
  jobId,
  jobTitle,
  onClose,
  onSuccess
}: Omit<HireReportModalProps, 'isOpen'>) {
  const [hireSource, setHireSource] = useState<HireSource>('native_application');
  const [hireDate, setHireDate] = useState(new Date().toISOString().split('T')[0] || '');
  const [salaryOrRate, setSalaryOrRate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!hireDate) {
      setError('Hire date is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        hire_source: hireSource,
        hire_date: hireDate
      };

      if (salaryOrRate) {
        payload.salary_or_rate = parseFloat(salaryOrRate);
      }

      if (notes.trim()) {
        payload.notes = notes.trim();
      }

      const response = await fetchWithCsrf(`/api/jobs/${jobId}/hire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to report hire');
      }

      // Success - call callback and close
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to report hire');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Header info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#ed6437]/10 rounded-full flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-[#ed6437]" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Reporting hire for</p>
            <p className="font-medium text-gray-900">{jobTitle}</p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Hire Source */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          How was this person hired? <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          {HIRE_SOURCES.map((source) => (
            <label
              key={source.value}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <input
                type="radio"
                name="hire_source"
                value={source.value}
                checked={hireSource === source.value}
                onChange={(e) => setHireSource(e.target.value as HireSource)}
                className="w-4 h-4 text-[#ed6437] focus:ring-[#ed6437]"
              />
              <span className="text-sm text-gray-700">{source.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Hire Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Hire Date <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={hireDate}
          onChange={(e) => setHireDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-[#ed6437]"
          required
        />
      </div>

      {/* Salary/Rate (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Salary/Rate <span className="text-gray-400">(optional)</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
          <input
            type="number"
            value={salaryOrRate}
            onChange={(e) => setSalaryOrRate(e.target.value)}
            className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-[#ed6437]"
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Annual salary or hourly rate (for internal tracking only)
        </p>
      </div>

      {/* Notes (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-[#ed6437]"
          rows={3}
          placeholder="Any additional notes about this hire..."
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              Report Hire
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export function HireReportModal({
  isOpen,
  onClose,
  jobId,
  jobTitle,
  onSuccess
}: HireReportModalProps) {
  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Report a Hire"
      size="medium"
    >
      <ErrorBoundary componentName="HireReportModal">
        <HireReportModalContent
          jobId={jobId}
          jobTitle={jobTitle}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      </ErrorBoundary>
    </BizModal>
  );
}

export default HireReportModal;
