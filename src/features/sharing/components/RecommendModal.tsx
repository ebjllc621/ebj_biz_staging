/**
 * RecommendModal - Modal for recommending entities to connections or connection groups
 *
 * Desktop modal for creating recommendations with entity preview and recipient selection.
 * Supports both individual contact recommendations and connection group recommendations.
 * Integrates with SharingService API and handles offline queueing.
 *
 * @tier STANDARD
 * @phase Phase 12 - Recommend Button Deployment + Connection Groups Integration
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/userrecommendations/phases/PHASE_12_RECOMMEND_BUTTON_BRAIN_PLAN.md
 * @reference src/components/BizModal/BizModal.tsx - Modal wrapper (MANDATORY)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { BadgeCheck, CheckCircle, Users } from 'lucide-react';
import BizModal from '@/components/BizModal/BizModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { EntityType, EntityPreview } from '@features/contacts/types/sharing';
import { EntityPreviewCard } from './EntityPreviewCard';
import { RecommendationRecipientSelector, RecipientUser } from './RecommendationRecipientSelector';

interface ConnectionGroupOption {
  id: number;
  name: string;
  color: string;
  memberCount: number;
}

interface RecommendModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
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

function RecommendModalInner({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityPreview: initialPreview = null,
  onShareSuccess
}: RecommendModalProps) {
  const [mode, setMode] = useState<'individual' | 'group'>('individual');
  const [preview, setPreview] = useState<EntityPreview | null>(initialPreview);
  const [selectedRecipient, setSelectedRecipient] = useState<RecipientUser | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ConnectionGroupOption | null>(null);
  const [groups, setGroups] = useState<ConnectionGroupOption[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
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

  // Load groups when switching to group mode
  useEffect(() => {
    if (mode === 'group' && groups.length === 0 && isOpen) {
      setIsLoadingGroups(true);
      fetch('/api/users/connections/groups', { credentials: 'include' })
        .then(r => r.json())
        .then(result => {
          if (result.success && result.data) {
            setGroups(result.data.groups || []);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoadingGroups(false));
    }
  }, [mode, isOpen, groups.length]);

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
    if (mode === 'group' && selectedGroup) {
      // Group recommendation
      setIsSubmitting(true);
      setError(null);

      try {
        const response = await fetchWithCsrf(
          `/api/users/connections/groups/${selectedGroup.id}/recommendations`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              listingId: parseInt(entityId, 10),
              message: message.trim() || undefined
            })
          }
        );

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error?.message || 'Failed to send group recommendation');
        }

        setPointsEarned(result.data?.points_earned || 0);
        setSuccess(true);

        setTimeout(() => {
          onShareSuccess?.();
          handleClose();
        }, 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send group recommendation');
      } finally {
        setIsSubmitting(false);
      }
    } else if (mode === 'individual' && selectedRecipient) {
      // Individual recommendation (existing flow)
      setIsSubmitting(true);
      setError(null);

      try {
        const response = await fetchWithCsrf('/api/sharing/recommendations', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
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

        setTimeout(() => {
          onShareSuccess?.();
          handleClose();
        }, 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send recommendation');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setError(mode === 'group' ? 'Please select a group' : 'Please select a recipient');
    }
  };

  const handleClose = () => {
    setMode('individual');
    setSelectedRecipient(null);
    setSelectedGroup(null);
    setMessage('');
    setError(null);
    setSuccess(false);
    setPointsEarned(0);
    onClose();
  };

  const hasRecipient = mode === 'individual' ? !!selectedRecipient : !!selectedGroup;
  const canSubmit = hasRecipient && !isSubmitting && !isLoadingPreview && !success;

  const successRecipientName = mode === 'group'
    ? selectedGroup?.name
    : (selectedRecipient?.display_name || selectedRecipient?.username);

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

            {/* Mode Toggle: Individual vs Group */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => { setMode('individual'); setSelectedGroup(null); }}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  mode === 'individual'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Individual
              </button>
              <button
                type="button"
                onClick={() => { setMode('group'); setSelectedRecipient(null); }}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  mode === 'group'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Users className="w-4 h-4" />
                Connection Group
              </button>
            </div>

            {/* Individual Recipient Selector */}
            {mode === 'individual' && (
              <RecommendationRecipientSelector
                selectedRecipient={selectedRecipient}
                onSelectRecipient={setSelectedRecipient}
                disabled={isSubmitting}
              />
            )}

            {/* Group Selector */}
            {mode === 'group' && !selectedGroup && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Select a Group
                </label>
                {isLoadingGroups ? (
                  <div className="text-center py-6 text-gray-500">Loading groups...</div>
                ) : groups.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                    <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No connection groups yet</p>
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {groups.map((group) => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => setSelectedGroup(group)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: group.color + '20' }}
                        >
                          <Users className="w-5 h-5" style={{ color: group.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{group.name}</p>
                          <p className="text-xs text-gray-500">{group.memberCount} members</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Selected Group Display */}
            {mode === 'group' && selectedGroup && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">To</label>
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: selectedGroup.color + '20' }}
                    >
                      <Users className="w-5 h-5" style={{ color: selectedGroup.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{selectedGroup.name}</p>
                      <p className="text-xs text-gray-500">{selectedGroup.memberCount} members</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedGroup(null)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}

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
                    {mode === 'group' ? 'Send to Group' : 'Send Recommendation'}
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
              Your recommendation has been sent to {successRecipientName}
              {mode === 'group' && selectedGroup && (
                <span className="text-gray-500"> ({selectedGroup.memberCount} members)</span>
              )}
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
 * RecommendModal with ErrorBoundary (STANDARD tier requirement)
 */
export function RecommendModal(props: RecommendModalProps) {
  return (
    <ErrorBoundary>
      <RecommendModalInner {...props} />
    </ErrorBoundary>
  );
}

/**
 * @deprecated Use RecommendModal instead. This alias exists for backward compatibility.
 */
export const ShareEntityModal = RecommendModal;
