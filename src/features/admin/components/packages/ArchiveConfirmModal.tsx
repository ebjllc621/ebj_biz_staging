/**
 * ArchiveConfirmModal - Confirm Archive Operation
 *
 * @authority docs/packages/phases/PHASE_2_BRAIN_PLAN.md
 * @tier STANDARD
 *
 * Features:
 * - Confirmation dialog for archiving packages/addons
 * - Clear warning message about consequences
 * - Handles API call to archive endpoint
 * - Loading state during operation
 */

'use client';

import { useState, useCallback } from 'react';
import { BizModal, BizModalButton } from '@/components/ui/BizModal';
import { fetchWithCsrf } from '@core/utils/csrf';
import { AlertTriangle } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ArchiveConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemType: 'package' | 'addon';
  itemId: number;
  itemName: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ArchiveConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  itemType,
  itemId,
  itemName,
}: ArchiveConfirmModalProps) {
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  // Handle archive action
  const handleArchive = useCallback(async () => {
    setIsArchiving(true);
    setArchiveError(null);

    try {
      const endpoint = itemType === 'package'
        ? `/api/admin/packages/${itemId}`
        : `/api/admin/addons/${itemId}`;

      const response = await fetchWithCsrf(endpoint, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Failed to archive ${itemType}`);
      }

      onConfirm();
      onClose();
    } catch (error) {
      console.error('Error archiving:', error);
      setArchiveError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsArchiving(false);
    }
  }, [itemType, itemId, onConfirm, onClose]);

  // Reset error when modal closes
  const handleClose = useCallback(() => {
    setArchiveError(null);
    onClose();
  }, [onClose]);

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Archive ${itemType === 'package' ? 'Package' : 'Add-On'}`}
      maxWidth="md"
      footer={
        <div className="flex justify-end gap-3">
          <BizModalButton variant="secondary" onClick={handleClose} disabled={isArchiving}>
            Cancel
          </BizModalButton>
          <BizModalButton
            variant="danger"
            onClick={handleArchive}
            disabled={isArchiving}
          >
            {isArchiving ? 'Archiving...' : 'Archive'}
          </BizModalButton>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Warning Icon and Message */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 p-2 bg-amber-100 rounded-full">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Are you sure you want to archive this {itemType}?
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              You are about to archive <strong>&quot;{itemName}&quot;</strong>.
            </p>
          </div>
        </div>

        {/* Consequences Section */}
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            What happens when you archive:
          </h4>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>The {itemType} will no longer be available for new subscriptions</li>
            <li>Existing subscribers will keep their current {itemType} (grandfathered)</li>
            <li>The {itemType} can be viewed but not edited</li>
            <li>This action cannot be easily undone</li>
          </ul>
        </div>

        {/* Error Alert */}
        {archiveError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {archiveError}
          </div>
        )}
      </div>
    </BizModal>
  );
}
