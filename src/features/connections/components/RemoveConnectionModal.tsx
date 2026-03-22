/**
 * RemoveConnectionModal - Confirmation modal for removing a connection
 *
 * @tier SIMPLE
 * @generated DNA v11.4.0
 * @authority docs/pages/layouts/home/user/phases/troubleshooting/connect/CONNECTIONS_USABILITY_BRAIN_PLAN.md
 * @governance BizModal MANDATORY - Uses branded BizModal from @/components/BizModal
 *
 * Confirms connection removal with user details display.
 */

'use client';

import { useState } from 'react';
import BizModal from '@/components/BizModal';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { UserConnection } from '../types';

export interface RemoveConnectionModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Connection to remove */
  connection: UserConnection;
  /** Callback on successful removal */
  onSuccess: () => void;
}

/**
 * RemoveConnectionModal - Handles connection removal with confirmation
 */
export function RemoveConnectionModal({
  isOpen,
  onClose,
  connection,
  onSuccess
}: RemoveConnectionModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = connection.display_name || connection.username;

  const handleConfirm = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(`/api/users/connections/${connection.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        // API returns error as { code, message, details } object
        const errorMessage = data.error?.message || data.message || 'Failed to remove connection';
        throw new Error(errorMessage);
      }

      onClose();
      onSuccess();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to remove connection');
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setError(null);
      onClose();
    }
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Remove Connection"
      subtitle={`Disconnect from ${displayName}`}
      maxWidth="md"
      footer={
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-md font-medium transition-colors bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="px-4 py-2 rounded-md font-medium transition-colors bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Removing...' : 'Remove Connection'}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Connection User Display */}
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex-shrink-0">
            {connection.avatar_url ? (
              <img
                src={connection.avatar_url}
                alt={displayName}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-biz-navy to-biz-orange flex items-center justify-center">
                <span className="text-2xl font-semibold text-white">
                  {connection.username.substring(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {displayName}
            </h3>
            <p className="text-sm text-gray-500">
              @{connection.username}
            </p>
            {connection.connection_type && (
              <span className="inline-block mt-1 text-xs font-medium uppercase text-biz-orange bg-orange-50 px-2 py-0.5 rounded">
                {connection.connection_type}
              </span>
            )}
          </div>
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">
                This action cannot be undone
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                You will no longer be connected with {displayName}. To reconnect, you will need to send a new connection request.
              </p>
            </div>
          </div>
        </div>

        {/* Confirmation Question */}
        <p className="text-center text-gray-700">
          Are you sure you want to remove <strong>{displayName}</strong> from your connections?
        </p>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </BizModal>
  );
}

export default RemoveConnectionModal;
