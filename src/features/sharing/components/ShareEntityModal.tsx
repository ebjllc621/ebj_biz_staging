/**
 * ShareEntityModal - Modal for recommending entities to connections
 *
 * Desktop modal for creating recommendations with entity preview and recipient selection.
 * Integrates with SharingService API and handles offline queueing.
 *
 * @tier STANDARD
 * @phase Phase 1 - Core Recommendation Flow
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/userrecommendations/phases/PHASE_1_BRAIN_PLAN.md
 * @reference src/components/BizModal/BizModal.tsx - Modal wrapper (MANDATORY)
 *
 * @example
 * ```tsx
 * import { ShareEntityModal } from '@features/sharing/components';
 *
 * function ListingPage() {
 *   const [isShareOpen, setIsShareOpen] = useState(false);
 *
 *   return (
 *     <>
 *       <Button onClick={() => setIsShareOpen(true)}>Recommend</Button>
 *       <ShareEntityModal
 *         isOpen={isShareOpen}
 *         onClose={() => setIsShareOpen(false)}
 *         entityType="listing"
 *         entityId="123"
 *         onShareSuccess={() => {
 *           toast.success('Recommendation sent!');
 *           setIsShareOpen(false);
 *         }}
 *       />
 *     </>
 *   );
 * }
 * ```
 */

'use client';

import React, { useState, useEffect } from 'react';
import { BadgeCheck, CheckCircle } from 'lucide-react';
import BizModal from '@/components/BizModal/BizModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { EntityType, EntityPreview } from '@features/contacts/types/sharing';
import { EntityPreviewCard } from './EntityPreviewCard';
import { RecommendationRecipientSelector, RecipientUser } from './RecommendationRecipientSelector';

interface ShareEntityModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Type of entity being shared */
  entityType: EntityType;
  /** ID of entity being shared */
  entityId: string;
  /** Optional pre-loaded entity preview */
  entityPreview?: EntityPreview | null;
  /** Optional callback after successful share */
  onShareSuccess?: () => void;
}

function ShareEntityModalInner({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityPreview: initialPreview = null,
  onShareSuccess
}: ShareEntityModalProps) {
  const [preview, setPreview] = useState<EntityPreview | null>(initialPreview);
  const [selectedRecipient, setSelectedRecipient] = useState<RecipientUser | null>(null);
  const [message, setMessage] = useState('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);

  const MAX_MESSAGE_LENGTH = 200;

  // Fetch entity preview if not provided
  useEffect(() => {
    if (isOpen && !preview) {
      fetchEntityPreview();
    }
  }, [isOpen, entityType, entityId]);

  const fetchEntityPreview = async () => {
    setIsLoadingPreview(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(
        `/api/sharing/entity-preview?type=${entityType}&id=${entityId}`,
        {
          method: 'GET',
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load entity preview');
      }

      const data = await response.json();
      setPreview(data.preview || data.data?.preview);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load entity preview');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedRecipient) {
      setError('Please select a recipient');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetchWithCsrf('/api/sharing/recommendations', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: entityId,
          recipient_user_id: selectedRecipient.id,
          message: message.trim() || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send recommendation');
      }

      const data = await response.json();
      setPointsEarned(data.points_earned || data.data?.points_earned || 0);
      setSuccess(true);

      // Call success callback after short delay
      setTimeout(() => {
        onShareSuccess?.();
        handleClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send recommendation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset state
    setSelectedRecipient(null);
    setMessage('');
    setError(null);
    setSuccess(false);
    setPointsEarned(0);
    onClose();
  };

  const canSubmit = selectedRecipient && !isSubmitting && !isLoadingPreview && !success;

  return (
    <BizModal isOpen={isOpen} onClose={handleClose} title="Recommend" size="medium">
      <div className="space-y-4">
        {/* Entity Preview */}
        {isLoadingPreview && (
          <div className="text-center py-8 text-gray-500">
            Loading preview...
          </div>
        )}

        {error && !success && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {preview && !success && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                You&apos;re recommending
              </label>
              <EntityPreviewCard preview={preview} />
            </div>

            {/* Recipient Selector */}
            <RecommendationRecipientSelector
              selectedRecipient={selectedRecipient}
              onSelectRecipient={setSelectedRecipient}
              disabled={isSubmitting}
            />

            {/* Optional Message */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                Message (optional)
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                placeholder="Add a personal message..."
                rows={3}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 resize-none"
              />
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-500">
                  {message.length} / {MAX_MESSAGE_LENGTH}
                </span>
                {message.length >= MAX_MESSAGE_LENGTH && (
                  <span className="text-xs text-amber-600">
                    Maximum length reached
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 font-medium flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>Sending...</>
                ) : (
                  <>
                    <BadgeCheck className="w-4 h-4" />
                    Send Recommendation
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {/* Success State */}
        {success && (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Recommendation Sent!
            </h3>
            <p className="text-gray-600 mb-4">
              Your recommendation has been sent to {selectedRecipient?.display_name || selectedRecipient?.username}
            </p>
            {pointsEarned > 0 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 font-medium">
                +{pointsEarned} points earned
              </div>
            )}
          </div>
        )}
      </div>
    </BizModal>
  );
}

/**
 * ShareEntityModal with ErrorBoundary (STANDARD tier requirement)
 */
export function ShareEntityModal(props: ShareEntityModalProps) {
  return (
    <ErrorBoundary>
      <ShareEntityModalInner {...props} />
    </ErrorBoundary>
  );
}
