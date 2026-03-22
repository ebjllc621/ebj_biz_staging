/**
 * JobReferralModal Component
 *
 * BizModal wrapper for refer-a-friend job sharing with gamification points
 *
 * GOVERNANCE COMPLIANCE:
 * - 'use client' directive for client component
 * - BizModal wrapper: MANDATORY for all modals
 * - Import aliases: @core/, @features/, @components/
 * - fetchWithCsrf for mutations
 *
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 * @tier STANDARD
 * @phase Jobs Phase 4 - Platform Growth & Future Features
 * @reference src/features/contacts/services/ReferralService.ts - Referral pattern
 */

'use client';

import { useState } from 'react';
import { BizModal } from '@/components/ui/BizModal';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { Job } from '@features/jobs/types';

interface JobReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job;
  onSuccess?: () => void;
}

export function JobReferralModal({
  isOpen,
  onClose,
  job,
  onSuccess
}: JobReferralModalProps) {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);

    try {
      const response = await fetchWithCsrf('/api/jobs/refer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: job.id,
          recipient_email: recipientEmail,
          personal_message: personalMessage || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send referral');
      }

      setSuccess(true);
      setRecipientEmail('');
      setPersonalMessage('');

      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) {
      setRecipientEmail('');
      setPersonalMessage('');
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  return (
    <BizModal isOpen={isOpen} onClose={handleClose} title="Refer a Friend">
      {success ? (
        <div className="text-center py-8">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Referral Sent!</h3>
          <p className="text-sm text-gray-600">
            Your referral has been sent. You'll earn points when they view, apply, or get hired!
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Job Info */}
          <div className="bg-gray-50 p-4 rounded-md">
            <h4 className="font-semibold text-gray-900">{job.title}</h4>
            <p className="text-sm text-gray-600 mt-1">
              {job.employment_type.replace('_', ' ')} • {job.city}, {job.state}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Recipient Email */}
          <div>
            <label htmlFor="recipientEmail" className="block text-sm font-medium text-gray-700 mb-1">
              Recipient Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="recipientEmail"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              required
              placeholder="friend@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            />
          </div>

          {/* Personal Message */}
          <div>
            <label htmlFor="personalMessage" className="block text-sm font-medium text-gray-700 mb-1">
              Personal Message (Optional)
            </label>
            <textarea
              id="personalMessage"
              value={personalMessage}
              onChange={(e) => setPersonalMessage(e.target.value)}
              placeholder="Add a personal note to your referral..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {personalMessage.length}/500 characters
            </p>
          </div>

          {/* Points Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h5 className="text-sm font-semibold text-blue-900 mb-2">Earn Rewards!</h5>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 5 points when you send this referral</li>
              <li>• 2 points when they view the job</li>
              <li>• 25 points when they apply</li>
              <li>• 100 points if they get hired!</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={sending}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending || !recipientEmail}
              className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? 'Sending...' : 'Send Referral'}
            </button>
          </div>
        </form>
      )}
    </BizModal>
  );
}
