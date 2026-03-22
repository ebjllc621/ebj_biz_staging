/**
 * MoveItemModal - Directory tree picker for move/copy destination
 *
 * Reuses DirectoryTree component for folder selection.
 * User clicks a folder in the tree to set the destination.
 *
 * @tier ADVANCED
 * @phase Phase 4B - Batch Operations + SEO + Context Menus
 */

'use client';

import { useState, useCallback } from 'react';
import { BizModal, BizModalButton } from '@/components/ui/BizModal';
import { DirectoryTree } from './DirectoryTree';
import { FolderInput } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface MoveItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (_destinationPath: string) => void;
  operation: 'move' | 'copy';
  itemCount: number;
  isProcessing?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MoveItemModal({
  isOpen,
  onClose,
  onConfirm,
  operation,
  itemCount,
  isProcessing = false,
}: MoveItemModalProps) {
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);

  const handleNavigate = useCallback((path: string) => {
    setSelectedDestination(path);
  }, []);

  const handleConfirm = useCallback(() => {
    if (selectedDestination !== null) {
      onConfirm(selectedDestination);
    }
  }, [onConfirm, selectedDestination]);

  const handleClose = useCallback(() => {
    if (!isProcessing) {
      setSelectedDestination(null);
      onClose();
    }
  }, [isProcessing, onClose]);

  const title =
    operation === 'move'
      ? `Move ${itemCount} ${itemCount === 1 ? 'file' : 'files'}`
      : `Copy ${itemCount} ${itemCount === 1 ? 'file' : 'files'}`;

  const confirmLabel = operation === 'move' ? 'Move Here' : 'Copy Here';

  const hasDestination = selectedDestination !== null;

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      maxWidth="md"
      footer={
        <div className="flex justify-end gap-3">
          <BizModalButton
            variant="secondary"
            onClick={handleClose}
            disabled={isProcessing}
          >
            Cancel
          </BizModalButton>
          <BizModalButton
            variant="primary"
            onClick={handleConfirm}
            disabled={!hasDestination || isProcessing}
          >
            {isProcessing ? 'Processing...' : confirmLabel}
          </BizModalButton>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Select a destination folder for the {operation} operation.
        </p>

        {/* Directory tree for selection */}
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white max-h-[300px] overflow-y-auto">
          <DirectoryTree
            activePath={selectedDestination ?? ''}
            onNavigate={handleNavigate}
          />
        </div>

        {/* Selected destination indicator */}
        {hasDestination && (
          <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
            <FolderInput className="w-4 h-4 text-orange-600 flex-shrink-0" />
            <span className="text-sm text-orange-700">
              <span className="font-medium">Destination:</span>{' '}
              {selectedDestination === '' ? 'Media Root' : `/${selectedDestination}`}
            </span>
          </div>
        )}

        {!hasDestination && (
          <p className="text-xs text-gray-400 text-center">
            Click a folder in the tree above to select the destination
          </p>
        )}
      </div>
    </BizModal>
  );
}

export default MoveItemModal;
