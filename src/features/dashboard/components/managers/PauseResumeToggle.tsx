/**
 * PauseResumeToggle - Toggle listing visibility between active and paused states
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 4A - Listing Lifecycle (Pause/Resume, Draft, Duplicate)
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/listings/features/phases/PHASE_4A_BRAIN_PLAN.md
 */
'use client';

import React, { useState } from 'react';
import { Pause, Play } from 'lucide-react';
import BizModal, { BizModalButton } from '@/components/BizModal';
import { fetchWithCsrf } from '@core/utils/csrf';

interface PauseResumeToggleProps {
  listingId: number;
  currentStatus: string;
  onStatusChange: (_status: string) => void;
}

export function PauseResumeToggle({
  listingId,
  currentStatus,
  onStatusChange,
}: PauseResumeToggleProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPaused = currentStatus === 'paused';

  // Resume: no confirmation needed
  const handleResume = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchWithCsrf(`/api/listings/${listingId}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error?.message || 'Failed to resume listing');
      }
      onStatusChange('active');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume listing');
    } finally {
      setIsLoading(false);
    }
  };

  // Pause: open confirmation modal first
  const handlePauseConfirm = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchWithCsrf(`/api/listings/${listingId}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error?.message || 'Failed to pause listing');
      }
      setIsConfirmOpen(false);
      onStatusChange('paused');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause listing');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {isPaused ? (
        // Paused state: show "Resume" button
        <button
          type="button"
          onClick={handleResume}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-500/20 hover:bg-green-500/20 text-gray-100 hover:text-green-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Resume listing"
        >
          <Play className="w-4 h-4" />
          <span>{isLoading ? 'Resuming...' : 'Resume Listing'}</span>
        </button>
      ) : (
        // Active state: show "Pause" button (opens confirmation)
        <button
          type="button"
          onClick={() => setIsConfirmOpen(true)}
          disabled={isLoading || currentStatus !== 'active'}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-yellow-500/20 text-white/80 hover:text-yellow-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Pause listing"
        >
          <Pause className="w-4 h-4" />
          <span>Pause Listing</span>
        </button>
      )}

      {/* Error display */}
      {error && (
        <p className="text-xs text-red-300 mt-1">{error}</p>
      )}

      {/* Pause confirmation modal */}
      <BizModal
        isOpen={isConfirmOpen}
        onClose={() => { setIsConfirmOpen(false); setError(null); }}
        title="Pause Listing?"
        maxWidth="sm"
        footer={
          <div className="flex justify-end gap-3">
            {error && (
              <p className="text-sm text-red-600 flex-1">{error}</p>
            )}
            <BizModalButton
              variant="secondary"
              onClick={() => { setIsConfirmOpen(false); setError(null); }}
              disabled={isLoading}
            >
              Cancel
            </BizModalButton>
            <BizModalButton
              variant="primary"
              onClick={handlePauseConfirm}
              disabled={isLoading}
            >
              {isLoading ? 'Pausing...' : 'Yes, Pause Listing'}
            </BizModalButton>
          </div>
        }
      >
        <p className="text-gray-600">
          Pausing will hide your listing from search results. Visitors who have a direct link
          can still view it. You can resume at any time.
        </p>
        <p className="mt-3 text-gray-600">
          Are you sure you want to pause this listing?
        </p>
      </BizModal>
    </>
  );
}

export default PauseResumeToggle;
