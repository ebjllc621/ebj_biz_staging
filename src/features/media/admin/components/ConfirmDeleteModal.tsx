/**
 * ConfirmDeleteModal - Delete confirmation dialog for files and folders
 *
 * Uses BizModal with warning message and confirm/cancel buttons.
 * Folders show additional warning about recursive deletion.
 *
 * @tier STANDARD
 * @phase Phase 4A - Admin Media Manager Core
 */

'use client';

import { memo } from 'react';
import BizModal, { BizModalButton } from '@/components/BizModal/BizModal';
import { AlertTriangle } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType: 'file' | 'folder';
  isDeleting?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * ConfirmDeleteModal - Destructive operation confirmation dialog
 */
export const ConfirmDeleteModal = memo(function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType,
  isDeleting = false,
}: ConfirmDeleteModalProps) {
  const title = `Delete ${itemType === 'folder' ? 'Folder' : 'File'}`;

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="sm"
      footer={
        <div className="flex justify-end gap-3">
          <BizModalButton
            variant="secondary"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </BizModalButton>
          <BizModalButton
            variant="danger"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : `Delete ${itemType === 'folder' ? 'Folder' : 'File'}`}
          </BizModalButton>
        </div>
      }
    >
      <div className="flex gap-3">
        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="space-y-2">
          <p className="text-sm text-gray-700">
            Are you sure you want to delete{' '}
            <strong className="font-semibold text-gray-900">&ldquo;{itemName}&rdquo;</strong>?
          </p>
          {itemType === 'folder' && (
            <p className="text-sm text-red-600">
              This will permanently delete the folder and all its contents. This action cannot be undone.
            </p>
          )}
          {itemType === 'file' && (
            <p className="text-sm text-gray-500">
              This file will be permanently deleted and cannot be recovered.
            </p>
          )}
        </div>
      </div>
    </BizModal>
  );
});

export default ConfirmDeleteModal;
