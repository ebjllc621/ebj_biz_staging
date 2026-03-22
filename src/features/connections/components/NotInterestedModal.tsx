'use client';

import React, { useState } from 'react';
import BizModal from '@/components/BizModal/BizModal';

interface NotInterestedModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  onSubmit: (reason: string, otherReason?: string) => Promise<void>;
  isSubmitting?: boolean;
}

/**
 * NotInterestedModal
 *
 * Modal for collecting feedback when user selects "Not Interested"
 * on a connection recommendation.
 *
 * GOVERNANCE: Reason values MUST match DB enum - enum('dont_know','not_relevant','spam','already_contacted','other')
 * - dont_know
 * - not_relevant
 * - spam
 * - already_contacted
 * - other (requires text input)
 *
 * @phase ConnectP2 Phase 2
 */
export function NotInterestedModal({
  isOpen,
  onClose,
  userName,
  onSubmit,
  isSubmitting = false
}: NotInterestedModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [otherReason, setOtherReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // GOVERNANCE: Values MUST match DB enum - enum('dont_know','not_relevant','spam','already_contacted','other')
  const reasons = [
    { value: 'dont_know', label: "I don't know this person" },
    { value: 'not_relevant', label: 'Not relevant to my professional interests' },
    { value: 'spam', label: 'Seems like spam or inappropriate' },
    { value: 'already_contacted', label: "I've already contacted this person" },
    { value: 'other', label: 'Other reason' }
  ];

  const handleSubmit = async () => {
    // Validate selection
    if (!selectedReason) {
      setError('Please select a reason');
      return;
    }

    // Validate other reason if selected
    if (selectedReason === 'other' && !otherReason.trim()) {
      setError('Please provide a reason');
      return;
    }

    setError(null);

    try {
      await onSubmit(
        selectedReason,
        selectedReason === 'other' ? otherReason.trim() : undefined
      );

      // Reset form and close
      setSelectedReason('');
      setOtherReason('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedReason('');
      setOtherReason('');
      setError(null);
      onClose();
    }
  };

  const footer = (
    <div className="flex gap-3 justify-end">
      <button
        onClick={handleClose}
        disabled={isSubmitting}
        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Cancel
      </button>
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || !selectedReason}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </div>
  );

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Why are you not interested?"
      maxWidth="md"
      footer={footer}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Help us improve your recommendations by telling us why you're not interested in connecting with <strong>{userName}</strong>.
        </p>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Reason selection */}
        <div className="space-y-2">
          {reasons.map((reason) => (
            <label
              key={reason.value}
              className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <input
                type="radio"
                name="reason"
                value={reason.value}
                checked={selectedReason === reason.value}
                onChange={(e) => setSelectedReason(e.target.value)}
                disabled={isSubmitting}
                className="mt-0.5 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 flex-1">
                {reason.label}
              </span>
            </label>
          ))}
        </div>

        {/* Other reason text input */}
        {selectedReason === 'other' && (
          <div className="mt-3">
            <label htmlFor="other-reason" className="block text-sm font-medium text-gray-700 mb-1">
              Please specify
            </label>
            <textarea
              id="other-reason"
              value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
              disabled={isSubmitting}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Tell us more about why you're not interested..."
            />
          </div>
        )}
      </div>
    </BizModal>
  );
}
