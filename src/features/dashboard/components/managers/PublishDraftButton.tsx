/**
 * PublishDraftButton - Publish a draft listing with confirmation and validation feedback
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 4A - Listing Lifecycle (Pause/Resume, Draft, Duplicate, Publish)
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import React, { useState } from 'react';
import { Send, AlertTriangle, CheckCircle } from 'lucide-react';
import BizModal, { BizModalButton } from '@/components/BizModal';
import { fetchWithCsrf } from '@core/utils/csrf';

interface PublishDraftButtonProps {
  listingId: number;
  onStatusChange: (_status: string) => void;
}

export function PublishDraftButton({
  listingId,
  onStatusChange,
}: PublishDraftButtonProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);

  const handlePublish = async () => {
    setIsLoading(true);
    setError(null);
    setWarnings([]);

    try {
      const response = await fetchWithCsrf(`/api/listings/${listingId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error?.userMessage || data?.error?.message || 'Failed to publish listing');
      }

      // Show warnings if any
      if (data?.data?.warnings?.length > 0) {
        setWarnings(data.data.warnings);
      }

      setIsSuccess(true);
      onStatusChange('active');

      // Close modal after brief success display
      setTimeout(() => {
        setIsConfirmOpen(false);
        setIsSuccess(false);
        setWarnings([]);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish listing');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { setIsConfirmOpen(true); setError(null); setIsSuccess(false); setWarnings([]); }}
        className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-100 hover:text-green-50 rounded-lg text-sm font-medium transition-colors"
        aria-label="Publish draft listing"
      >
        <Send className="w-4 h-4" />
        <span>Publish Listing</span>
      </button>

      <BizModal
        isOpen={isConfirmOpen}
        onClose={() => { if (!isLoading) { setIsConfirmOpen(false); setError(null); setIsSuccess(false); setWarnings([]); } }}
        title={isSuccess ? 'Published!' : 'Publish Draft Listing?'}
        maxWidth="sm"
        closeOnBackdropClick={!isLoading}
        footer={
          isSuccess ? undefined : (
            <div className="flex justify-end gap-3">
              <BizModalButton
                variant="secondary"
                onClick={() => { setIsConfirmOpen(false); setError(null); }}
                disabled={isLoading}
              >
                Cancel
              </BizModalButton>
              <BizModalButton
                variant="primary"
                onClick={handlePublish}
                disabled={isLoading}
              >
                {isLoading ? 'Publishing...' : 'Yes, Publish'}
              </BizModalButton>
            </div>
          )
        }
      >
        {isSuccess ? (
          <div className="flex items-center gap-3 text-green-700">
            <CheckCircle className="w-6 h-6 flex-shrink-0" />
            <div>
              <p className="font-medium">Your listing is now live!</p>
              {warnings.length > 0 && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800 mb-1">Recommendations:</p>
                  <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
                    {warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <p className="text-gray-600">
              Publishing will make this listing visible to the public. It will be submitted
              for review and appear in search results once approved.
            </p>
            <p className="mt-3 text-gray-600">
              Make sure you&apos;ve completed all the details you want — you can still
              edit the listing after publishing.
            </p>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </>
        )}
      </BizModal>
    </>
  );
}

export default PublishDraftButton;
