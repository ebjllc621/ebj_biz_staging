/**
 * BlockUserModal
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @brain-plan docs/dna/brain-plans/BLACKLIST_TAB_BRAIN_PLAN.md
 *
 * Modal for blocking a user with granular area controls.
 * User can select which areas to block: Messages, Connections, PYMK.
 * Optionally provide a reason for blocking.
 */
'use client';

import { useState } from 'react';
import BizModal from '@/components/BizModal/BizModal';
import { fetchWithCsrf } from '@core/utils/csrf';

interface BlockUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** User being blocked */
  targetUser: {
    user_id: number;
    username: string;
    display_name: string | null;
  };
  /** Called when block is successful */
  onSuccess: () => void;
}

/**
 * BlockUserModal - Confirmation modal with checkbox selection for block areas
 *
 * Features:
 * - Checkboxes for Messages, Connections, PYMK
 * - All areas selected by default
 * - Optional reason text input
 * - Validation requires at least one area selected
 */
export function BlockUserModal({
  isOpen,
  onClose,
  targetUser,
  onSuccess
}: BlockUserModalProps) {
  const [blockMessages, setBlockMessages] = useState(true);
  const [blockConnections, setBlockConnections] = useState(true);
  const [blockPymk, setBlockPymk] = useState(true);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = targetUser.display_name || targetUser.username;

  const handleSubmit = async () => {
    // Validate at least one area selected
    if (!blockMessages && !blockConnections && !blockPymk) {
      setError('Please select at least one area to block');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetchWithCsrf('/api/users/connections/blocked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocked_user_id: targetUser.user_id,
          block_messages: blockMessages,
          block_connections: blockConnections,
          block_pymk: blockPymk,
          block_reason: reason.trim() || undefined
        })
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          throw new Error(data.error?.message || 'Failed to block user');
        } else {
          throw new Error(`Server error: ${response.status}`);
        }
      }

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to block user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      // Reset form state
      setBlockMessages(true);
      setBlockConnections(true);
      setBlockPymk(true);
      setReason('');
      setError(null);
      onClose();
    }
  };

  const blockAreas = [
    {
      id: 'messages',
      label: 'Messages',
      description: 'Prevent this user from sending you messages',
      checked: blockMessages,
      onChange: setBlockMessages
    },
    {
      id: 'connections',
      label: 'Connections',
      description: 'Prevent connection requests and remove existing connection',
      checked: blockConnections,
      onChange: setBlockConnections
    },
    {
      id: 'pymk',
      label: 'People You May Know',
      description: 'Hide this user from your recommendations',
      checked: blockPymk,
      onChange: setBlockPymk
    }
  ];

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
        disabled={isSubmitting || (!blockMessages && !blockConnections && !blockPymk)}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? 'Blocking...' : 'Block User'}
      </button>
    </div>
  );

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Block User"
      maxWidth="md"
      footer={footer}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Select the areas where you want to block{' '}
          <span className="font-semibold text-gray-900">{displayName}</span>.
          This action can be undone from your Blacklist.
        </p>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Block area checkboxes */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Block in these areas:</p>
          {blockAreas.map((area) => (
            <label
              key={area.id}
              className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={area.checked}
                onChange={(e) => area.onChange(e.target.checked)}
                disabled={isSubmitting}
                className="mt-0.5 h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">{area.label}</span>
                <p className="text-xs text-gray-500 mt-0.5">{area.description}</p>
              </div>
            </label>
          ))}
        </div>

        {/* Optional reason */}
        <div>
          <label htmlFor="block-reason" className="block text-sm font-medium text-gray-700 mb-1">
            Reason (optional)
          </label>
          <textarea
            id="block-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isSubmitting}
            rows={2}
            maxLength={255}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
            placeholder="Why are you blocking this user? (for your records only)"
          />
          <p className="text-xs text-gray-600 mt-1">{reason.length}/255 characters</p>
        </div>

        {/* Warning message */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> If you block connections, any existing connection with this user will be removed.
          </p>
        </div>
      </div>
    </BizModal>
  );
}
