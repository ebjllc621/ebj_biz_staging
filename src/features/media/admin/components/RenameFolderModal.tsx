/**
 * RenameFolderModal - Folder rename input modal
 *
 * Uses BizModal with BizModalInput pre-filled with the current folder name.
 * Validates name before submitting.
 *
 * @tier SIMPLE
 * @phase Phase 4A - Admin Media Manager Core
 */

'use client';

import { memo, useState, useEffect } from 'react';
import BizModal, { BizModalButton, BizModalInput } from '@/components/BizModal/BizModal';
import { validateFolderName } from '../utils/folderNameValidation';

// ============================================================================
// TYPES
// ============================================================================

export interface RenameFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (_newName: string) => Promise<void>;
  currentName: string;
  isRenaming?: boolean;
  /** Optional title override (e.g. "Rename File" when used for files) */
  title?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * RenameFolderModal - Modal for renaming an existing folder
 */
export const RenameFolderModal = memo(function RenameFolderModal({
  isOpen,
  onClose,
  onSubmit,
  currentName,
  isRenaming = false,
  title = 'Rename Folder',
}: RenameFolderModalProps) {
  const [folderName, setFolderName] = useState(currentName);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync with currentName when modal opens
  useEffect(() => {
    if (isOpen) {
      setFolderName(currentName);
      setValidationError(null);
    }
  }, [isOpen, currentName]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFolderName(value);
    if (validationError) {
      setValidationError(validateFolderName(value));
    }
  };

  const handleSubmit = async () => {
    const error = validateFolderName(folderName);
    if (error) {
      setValidationError(error);
      return;
    }

    if (folderName.trim() === currentName) {
      // No change - just close
      onClose();
      return;
    }

    try {
      await onSubmit(folderName.trim());
      onClose();
    } catch {
      // Error surfaced via the hook - modal stays open
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isRenaming) {
      void handleSubmit();
    }
  };

  const isValid = !validateFolderName(folderName);

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
            disabled={isRenaming}
          >
            Cancel
          </BizModalButton>
          <BizModalButton
            variant="primary"
            onClick={() => void handleSubmit()}
            disabled={isRenaming || !isValid}
          >
            {isRenaming ? 'Renaming...' : title}
          </BizModalButton>
        </div>
      }
    >
      <BizModalInput
        label={title === 'Rename File' ? 'File Name' : 'Folder Name'}
        value={folderName}
        onChange={handleNameChange}
        onKeyDown={handleKeyDown}
        placeholder="folder-name"
        error={validationError ?? undefined}
        disabled={isRenaming}
        autoFocus
      />
    </BizModal>
  );
});

export default RenameFolderModal;
