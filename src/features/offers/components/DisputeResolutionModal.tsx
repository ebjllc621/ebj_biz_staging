/**
 * DisputeResolutionModal - Admin modal for resolving an offer dispute
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 6 - Dispute Resolution
 * @governance Build Map v2.1 ENHANCED
 *
 * Uses BizModal wrapper (mandatory per governance).
 * Admin-only — requires user.role === 'admin'.
 * Sends PATCH to /api/offers/[offerId]/dispute with CSRF protection.
 */
'use client';

import { useState } from 'react';
import BizModal from '@/components/BizModal';
import { fetchWithCsrf } from '@core/utils/csrf';

interface DisputeResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  disputeId: number;
  offerId: number;
  offerTitle: string;
  currentStatus: string;
  onSuccess: () => void;
}

type ResolutionStatus = 'investigating' | 'resolved' | 'closed';

const RESOLUTION_STATUSES: { value: ResolutionStatus; label: string }[] = [
  { value: 'investigating', label: 'Investigating' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export function DisputeResolutionModal({
  isOpen,
  onClose,
  disputeId,
  offerId,
  offerTitle,
  currentStatus,
  onSuccess,
}: DisputeResolutionModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<ResolutionStatus>('resolved');
  const [resolution, setResolution] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setSelectedStatus('resolved');
    setResolution('');
    setError(null);
    setIsSubmitting(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!resolution.trim()) {
      setError('Please provide resolution details.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(`/api/offers/${offerId}/dispute`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disputeId,
          status: selectedStatus,
          resolution: resolution.trim(),
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to resolve dispute');
      }

      onSuccess();
      handleClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to resolve dispute. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Resolve Dispute"
      maxWidth="sm"
    >
      <div className="py-4 space-y-4">
        <div>
          <p className="text-sm text-gray-600">
            Resolving dispute for offer:{' '}
            <span className="font-medium text-gray-900">&quot;{offerTitle}&quot;</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Current status:{' '}
            <span className="font-medium">{currentStatus}</span>
          </p>
        </div>

        {/* Status dropdown */}
        <div>
          <label
            htmlFor="dispute-resolution-status"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            New Status
          </label>
          <select
            id="dispute-resolution-status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as ResolutionStatus)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
          >
            {RESOLUTION_STATUSES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Resolution textarea */}
        <div>
          <label
            htmlFor="dispute-resolution-text"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Resolution Details{' '}
            <span className="text-red-500">*</span>
          </label>
          <textarea
            id="dispute-resolution-text"
            value={resolution}
            onChange={(e) => setResolution(e.target.value.slice(0, 1000))}
            maxLength={1000}
            rows={4}
            placeholder="Describe how this dispute was resolved..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent resize-none"
          />
          <p className="text-xs text-gray-400 text-right mt-1">
            {resolution.length}/1000
          </p>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !resolution.trim()}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#ed6437] hover:bg-orange-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Resolution'}
          </button>
        </div>
      </div>
    </BizModal>
  );
}

export default DisputeResolutionModal;
