/**
 * MobileRecommendSheet - Bottom sheet modal for mobile recommendations
 *
 * Full-screen bottom sheet with slide-up animation, offline queue integration,
 * and haptic feedback. Optimized for mobile with 44px touch targets.
 *
 * @tier STANDARD
 * @phase Phase 12 - Recommend Button Deployment
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 *
 * @example
 * ```tsx
 * import { MobileRecommendSheet } from '@features/sharing/components';
 *
 * function MobileListingPage({ listing }) {
 *   const [showRecommend, setShowRecommend] = useState(false);
 *
 *   return (
 *     <>
 *       <Button onClick={() => setShowRecommend(true)}>Recommend</Button>
 *       <MobileRecommendSheet
 *         isOpen={showRecommend}
 *         onClose={() => setShowRecommend(false)}
 *         entityType="listing"
 *         entityId={listing.id}
 *         onShareSuccess={() => {
 *           toast.success('Recommendation sent!');
 *           setShowRecommend(false);
 *         }}
 *       />
 *     </>
 *   );
 * }
 * ```
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, BadgeCheck, CheckCircle, WifiOff } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { EntityType, EntityPreview } from '@features/contacts/types/sharing';
import { EntityPreviewCard } from './EntityPreviewCard';
import { RecommendationRecipientSelector, RecipientUser } from './RecommendationRecipientSelector';
import { useOfflineRecommendationQueue } from '@features/sharing/hooks/useOfflineRecommendationQueue';

interface MobileRecommendSheetProps {
  /** Whether the sheet is open */
  isOpen: boolean;
  /** Callback to close the sheet */
  onClose: () => void;
  /** Type of entity being recommended */
  entityType: EntityType;
  /** ID of entity being recommended */
  entityId: string;
  /** Optional pre-loaded entity preview */
  entityPreview?: EntityPreview | null;
  /** Optional callback after successful recommendation */
  onShareSuccess?: () => void;
}

function MobileRecommendSheetInner({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityPreview: initialPreview = null,
  onShareSuccess
}: MobileRecommendSheetProps) {
  const [preview, setPreview] = useState<EntityPreview | null>(initialPreview);
  const [selectedRecipient, setSelectedRecipient] = useState<RecipientUser | null>(null);
  const [message, setMessage] = useState('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const startY = useRef(0);

  const { status: queueStatus, queueRecommendation } = useOfflineRecommendationQueue();

  const MAX_MESSAGE_LENGTH = 200;
  const DISMISS_THRESHOLD = 150;

  // Fetch entity preview if not provided
  useEffect(() => {
    if (isOpen && !preview) {
      fetchEntityPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const triggerHaptic = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  const handleSubmit = async () => {
    if (!selectedRecipient) {
      setError('Please select a recipient');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Skip platform_invite type (legacy referrals)
      if (entityType === 'platform_invite') {
        setError('Cannot recommend platform invites');
        setIsSubmitting(false);
        return;
      }

      const recommendationInput = {
        entity_type: entityType as Exclude<EntityType, 'platform_invite'>,
        entity_id: entityId,
        recipient_user_id: selectedRecipient.id,
        message: message.trim() || undefined
      };

      // If offline, queue the recommendation
      if (!queueStatus.is_online) {
        await queueRecommendation(recommendationInput);
        triggerHaptic();
        setSuccess(true);
        setPointsEarned(0); // No points until synced

        setTimeout(() => {
          onShareSuccess?.();
          handleClose();
        }, 2000);
        return;
      }

      // Online - send immediately
      const response = await fetchWithCsrf('/api/sharing/recommendations', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(recommendationInput)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send recommendation');
      }

      const data = await response.json();
      setPointsEarned(data.points_earned || data.data?.points_earned || 0);
      triggerHaptic();
      setSuccess(true);

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
    setSelectedRecipient(null);
    setMessage('');
    setError(null);
    setSuccess(false);
    setPointsEarned(0);
    setDragOffset(0);
    onClose();
  };

  // Drag to dismiss handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (success || isSubmitting) return;
    const touch = e.touches[0];
    if (!touch) return;
    startY.current = touch.clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    if (!touch) return;

    const deltaY = touch.clientY - startY.current;
    // Only allow dragging down
    if (deltaY > 0) {
      setDragOffset(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (dragOffset > DISMISS_THRESHOLD) {
      triggerHaptic();
      handleClose();
    } else {
      setDragOffset(0);
    }
  };

  const canSubmit = selectedRecipient && !isSubmitting && !isLoadingPreview && !success;

  // Sheet transform based on drag
  const sheetStyle = {
    transform: `translateY(${dragOffset}px)`,
    transition: isDragging ? 'none' : 'transform 0.3s ease-out'
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity"
        style={{ opacity: Math.max(0, 1 - dragOffset / 300) }}
        onClick={handleClose}
      />

      {/* Bottom Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl z-50 max-h-[90vh] flex flex-col"
        style={sheetStyle}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recommend</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Offline Indicator */}
        {!queueStatus.is_online && (
          <div className="mx-4 mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-sm text-amber-700">
            <WifiOff className="w-4 h-4 flex-shrink-0" />
            <span>Offline - recommendation will be sent when connected</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
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

              {/* Simplified Message Input */}
              <div>
                <label htmlFor="mobile-message" className="block text-sm font-medium text-gray-700 mb-1">
                  Add a message (optional)
                </label>
                <textarea
                  id="mobile-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                  placeholder="Why are you recommending this?"
                  rows={3}
                  disabled={isSubmitting}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 text-base resize-none"
                  style={{ fontSize: '16px' }} // Prevents zoom on iOS
                />
                <div className="text-xs text-gray-500 mt-1">
                  {message.length} / {MAX_MESSAGE_LENGTH}
                </div>
              </div>
            </>
          )}

          {/* Success State */}
          {success && (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {queueStatus.is_online ? 'Recommendation Sent!' : 'Queued for Sending'}
              </h3>
              <p className="text-gray-600 mb-4">
                {queueStatus.is_online
                  ? `Sent to ${selectedRecipient?.display_name || selectedRecipient?.username}`
                  : 'Will be sent automatically when you\'re back online'}
              </p>
              {pointsEarned > 0 && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 font-medium">
                  +{pointsEarned} points earned
                </div>
              )}
            </div>
          )}
        </div>

        {/* Large Action Buttons */}
        {!success && preview && (
          <div className="px-4 py-4 border-t border-gray-200 bg-white space-y-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full min-h-[52px] px-6 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 font-semibold flex items-center justify-center gap-2 text-base active:scale-98 transition-transform"
            >
              {isSubmitting ? (
                <>Sending...</>
              ) : (
                <>
                  <BadgeCheck className="w-5 h-5" />
                  {queueStatus.is_online ? 'Send Recommendation' : 'Queue for Later'}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="w-full min-h-[52px] px-6 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-50 font-semibold text-base active:scale-98 transition-transform"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/**
 * MobileRecommendSheet with ErrorBoundary (STANDARD tier requirement)
 */
export function MobileRecommendSheet(props: MobileRecommendSheetProps) {
  return (
    <ErrorBoundary>
      <MobileRecommendSheetInner {...props} />
    </ErrorBoundary>
  );
}

/**
 * @deprecated Use MobileRecommendSheet instead. This alias exists for backward compatibility.
 */
export const MobileShareSheet = MobileRecommendSheet;
