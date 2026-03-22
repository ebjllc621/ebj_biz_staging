/**
 * UnblockModal
 *
 * @tier SIMPLE
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @brain-plan docs/dna/brain-plans/BLACKLIST_TAB_BRAIN_PLAN.md
 *
 * Modal for confirming unblock of a user from the blacklist.
 * Shows which areas the user was blocked in before confirming removal.
 */
'use client';

import { useState } from 'react';
import BizModal from '@/components/BizModal/BizModal';
import { fetchWithCsrf } from '@core/utils/csrf';
import { BlockedUser } from '../types';

interface UnblockModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Blocked user record to unblock */
  blockedUser: BlockedUser;
  /** Called when unblock is successful */
  onSuccess: () => void;
}

/**
 * UnblockModal - Confirmation modal for removing user from blacklist
 *
 * Features:
 * - Shows blocked areas as badges
 * - Shows block reason if provided
 * - Confirms unblock action
 */
export function UnblockModal({
  isOpen,
  onClose,
  blockedUser,
  onSuccess
}: UnblockModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = blockedUser.display_name || blockedUser.username;

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetchWithCsrf('/api/users/connections/blocked', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocked_user_id: blockedUser.blocked_user_id
        })
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          throw new Error(data.error?.message || 'Failed to unblock user');
        } else {
          throw new Error(`Server error: ${response.status}`);
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unblock user');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Build list of blocked areas
  const blockedAreas: string[] = [];
  if (blockedUser.block_messages) blockedAreas.push('Messages');
  if (blockedUser.block_connections) blockedAreas.push('Connections');
  if (blockedUser.block_pymk) blockedAreas.push('PYMK');

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Unblock User"
      maxWidth="sm"
    >
      <div className="space-y-4">
        <p className="text-gray-600">
          Are you sure you want to unblock{' '}
          <span className="font-semibold text-gray-900">{displayName}</span>?
        </p>

        {/* Currently blocked areas */}
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">Currently blocked in:</p>
          <div className="flex flex-wrap gap-2">
            {blockedAreas.map((area) => (
              <span
                key={area}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
              >
                {area}
              </span>
            ))}
          </div>
        </div>

        {/* Block reason if exists */}
        {blockedUser.block_reason && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-1">Reason:</p>
            <p className="text-sm text-gray-600">{blockedUser.block_reason}</p>
          </div>
        )}

        {/* Info message */}
        <p className="text-sm text-gray-500">
          Unblocking will restore this user&apos;s ability to interact with you in all previously blocked areas.
        </p>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Unblocking...' : 'Unblock User'}
          </button>
        </div>
      </div>
    </BizModal>
  );
}
