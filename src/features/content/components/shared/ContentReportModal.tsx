/**
 * ContentReportModal - Modal for reporting content items to moderators
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Content Phase 3A
 * @reference src/features/events/components/EventReportModal.tsx — CANONICAL pattern
 * @governance Build Map v2.1 ENHANCED
 *
 * Adapts EventReportModal for parameterized content types (article/podcast/video).
 * Uses BizModal wrapper (mandatory per governance).
 * Requires authentication — shows sign-in prompt if unauthenticated.
 * Posts to /api/content/${contentType}/${contentId}/report with CSRF protection.
 */
'use client';

import { useState } from 'react';
import BizModal from '@/components/BizModal';
import { fetchWithCsrf } from '@core/utils/csrf';
import { useAuth } from '@core/hooks/useAuth';

interface ContentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: 'article' | 'podcast' | 'video' | 'newsletter' | 'guide';
  contentId: number;
  contentTitle: string;
}

type ReportReason = 'spam' | 'inappropriate' | 'misleading' | 'safety' | 'other';

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam or misleading' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'misleading', label: 'Misleading information' },
  { value: 'safety', label: 'Safety concern' },
  { value: 'other', label: 'Other' },
];

function getContentLabel(contentType: 'article' | 'podcast' | 'video' | 'newsletter' | 'guide'): string {
  const labels: Record<'article' | 'podcast' | 'video' | 'newsletter' | 'guide', string> = {
    article: 'Article',
    podcast: 'Podcast',
    video: 'Video',
    newsletter: 'Newsletter',
    guide: 'Guide',
  };
  return labels[contentType];
}

export function ContentReportModal({
  isOpen,
  onClose,
  contentType,
  contentId,
  contentTitle,
}: ContentReportModalProps) {
  const { user } = useAuth();
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const contentLabel = getContentLabel(contentType);

  const handleClose = () => {
    // Reset state on close
    setSelectedReason(null);
    setDetails('');
    setError(null);
    setIsSuccess(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      setError('Please select a reason for your report.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const body: { reason: string; details?: string } = { reason: selectedReason };
      if (details.trim()) {
        body.details = details.trim();
      }

      await fetchWithCsrf(`/api/content/${contentType}/${contentId}/report`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      setIsSuccess(true);
      // Auto-close after 2 seconds
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to submit report. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BizModal isOpen={isOpen} onClose={handleClose} title={`Report ${contentLabel}`} maxWidth="sm">
      {/* Unauthenticated state */}
      {!user ? (
        <div className="py-6 text-center text-gray-600">
          <p className="mb-2 font-medium">Sign in to report this {contentLabel.toLowerCase()}</p>
          <p className="text-sm text-gray-500">
            You must be signed in to report content.
          </p>
        </div>
      ) : isSuccess ? (
        /* Success state */
        <div className="py-6 text-center">
          <p className="text-green-700 font-semibold text-lg mb-1">
            Thank you for your report
          </p>
          <p className="text-sm text-gray-500">
            Our moderation team will review &quot;{contentTitle}&quot;.
          </p>
        </div>
      ) : (
        /* Report form */
        <div className="py-4 space-y-4">
          <p className="text-sm text-gray-600">
            Why are you reporting &quot;{contentTitle}&quot;?
          </p>

          {/* Reason radio buttons */}
          <fieldset className="space-y-2">
            <legend className="sr-only">Report reason</legend>
            {REPORT_REASONS.map(({ value, label }) => (
              <label
                key={value}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <input
                  type="radio"
                  name="report-reason"
                  value={value}
                  checked={selectedReason === value}
                  onChange={() => setSelectedReason(value)}
                  className="h-4 w-4 text-biz-orange border-gray-300 focus:ring-biz-orange"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">
                  {label}
                </span>
              </label>
            ))}
          </fieldset>

          {/* Additional details textarea */}
          <div>
            <label
              htmlFor="report-details"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Additional details{' '}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 500))}
              maxLength={500}
              rows={3}
              placeholder="Provide any additional context..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-biz-orange focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-400 text-right mt-1">
              {details.length}/500
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
              disabled={isSubmitting || !selectedReason}
              className="px-4 py-2 text-sm font-semibold text-white bg-biz-orange hover:bg-orange-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </div>
      )}
    </BizModal>
  );
}

export default ContentReportModal;
