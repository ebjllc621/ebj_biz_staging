/**
 * ContactDeleteConfirmModal - Confirmation dialog for deleting manual/imported contacts
 *
 * @tier SIMPLE
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 *
 * GOVERNANCE COMPLIANCE:
 * - BizModal wrapper (MANDATORY)
 * - Client component
 * - Path aliases
 */

'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import BizModal from '@/components/BizModal/BizModal';
import { fetchCsrfToken } from '@core/utils/csrf';

export interface ContactDeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactId: number;
  contactName: string;
  onSuccess: () => void;
}

export default function ContactDeleteConfirmModal({
  isOpen,
  onClose,
  contactId,
  contactName,
  onSuccess
}: ContactDeleteConfirmModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const csrfToken = await fetchCsrfToken();
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': csrfToken || ''
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const data = await response.json();
        const errorMessage = data.error?.message || 'Failed to delete contact';
        throw new Error(errorMessage);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete contact');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setError(null);
      onClose();
    }
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Remove Contact"
      maxWidth="sm"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-gray-900">
              Are you sure you want to remove <strong>{contactName}</strong> from your contacts?
            </p>
            <p className="text-sm text-gray-600 mt-1">
              This action cannot be undone.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Removing...' : 'Remove Contact'}
          </button>
        </div>
      </div>
    </BizModal>
  );
}
