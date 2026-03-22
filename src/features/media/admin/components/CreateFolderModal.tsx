/**
 * CreateFolderModal - Folder name input modal for creating new directories
 *
 * Uses BizModal with BizModalInput for folder name entry.
 * Validates name (non-empty, valid characters) before submitting.
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

export interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (_name: string) => Promise<void>;
  isCreating?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * CreateFolderModal - Modal for creating a new folder in the current directory
 */
export const CreateFolderModal = memo(function CreateFolderModal({
  isOpen,
  onClose,
  onSubmit,
  isCreating = false,
}: CreateFolderModalProps) {
  const [folderName, setFolderName] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset on open/close
  useEffect(() => {
    if (isOpen) {
      setFolderName('');
      setValidationError(null);
    }
  }, [isOpen]);

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

    try {
      await onSubmit(folderName.trim());
      onClose();
    } catch {
      // Error is surfaced via the hook - modal stays open
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isCreating) {
      void handleSubmit();
    }
  };

  const isValid = !validateFolderName(folderName);

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Folder"
      maxWidth="sm"
      footer={
        <div className="flex justify-end gap-3">
          <BizModalButton
            variant="secondary"
            onClick={onClose}
            disabled={isCreating}
          >
            Cancel
          </BizModalButton>
          <BizModalButton
            variant="primary"
            onClick={() => void handleSubmit()}
            disabled={isCreating || !isValid}
          >
            {isCreating ? 'Creating...' : 'Create Folder'}
          </BizModalButton>
        </div>
      }
    >
      <BizModalInput
        label="Folder Name"
        value={folderName}
        onChange={handleNameChange}
        onKeyDown={handleKeyDown}
        placeholder="my-folder"
        error={validationError ?? undefined}
        disabled={isCreating}
        autoFocus
      />
      <p className="text-xs text-gray-500 -mt-2">
        Use alphanumeric characters, hyphens, underscores, dots, or spaces.
      </p>
    </BizModal>
  );
});

export default CreateFolderModal;
