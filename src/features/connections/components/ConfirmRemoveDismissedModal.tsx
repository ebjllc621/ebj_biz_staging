/**
 * ConfirmRemoveDismissedModal
 *
 * @tier SIMPLE
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @brain-plan DismissedConnectionsTab
 *
 * Modal for confirming permanent removal of a dismissed connection
 */
'use client';

import { useState } from 'react';
import BizModal from '@/components/BizModal/BizModal';
import { fetchWithCsrf } from '@core/utils/csrf';
import { DismissedConnection } from '../types';

interface ConfirmRemoveDismissedModalProps {
  isOpen: boolean;
  onClose: () => void;
  dismissed: DismissedConnection;
  onSuccess: () => void;
}

export function ConfirmRemoveDismissedModal({
  isOpen,
  onClose,
  dismissed,
  onSuccess
}: ConfirmRemoveDismissedModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      setError(null);

      const response = await fetchWithCsrf('/api/users/connections/dismissed', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dismissed_user_id: dismissed.user_id,
          source: dismissed.source
        })
      });

      if (!response.ok) {
        // Handle non-JSON error responses (e.g., server error pages)
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          throw new Error(data.error?.message || 'Failed to remove');
        } else {
          throw new Error(`Server error: ${response.status}`);
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove dismissed connection');
    } finally {
      setIsDeleting(false);
    }
  };

  const displayName = dismissed.display_name || dismissed.username;

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Remove from Dismissed List"
      maxWidth="sm"
    >
      <div className="space-y-4">
        <p className="text-gray-600">
          Are you sure you want to permanently remove{' '}
          <span className="font-semibold text-gray-900">{displayName}</span>{' '}
          from your dismissed list?
        </p>

        {dismissed.source === 'pymk_dismissed' && (
          <p className="text-sm text-gray-500">
            This user may appear in your People You May Know suggestions again.
          </p>
        )}

        {dismissed.source === 'request_declined' && (
          <p className="text-sm text-gray-500">
            This will remove the record of their declined connection request.
            They will be able to send you a new connection request.
          </p>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? 'Removing...' : 'Remove Permanently'}
          </button>
        </div>
      </div>
    </BizModal>
  );
}
