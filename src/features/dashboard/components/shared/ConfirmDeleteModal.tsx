/**
 * ConfirmDeleteModal - Delete Confirmation Modal
 *
 * @description Reusable confirmation modal for delete operations
 * @component Client Component
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Phase 8 - Features Section Pages
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_8_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use BizModal (MANDATORY)
 * - Orange theme for delete button (#ed6437)
 * - Clear warning message
 */
'use client';

import React from 'react';
import BizModal from '@/components/BizModal/BizModal';
import { AlertTriangle } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface ConfirmDeleteModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close modal callback */
  onClose: () => void;
  /** Confirm delete callback */
  onConfirm: () => void;
  /** Item type (e.g., "event", "offer", "team member") */
  itemType: string;
  /** Item name (e.g., "Summer Sale") */
  itemName?: string;
  /** Whether delete is in progress */
  isDeleting: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * ConfirmDeleteModal - Delete confirmation dialog
 *
 * Provides consistent UI for delete confirmations with clear warnings.
 *
 * @param isOpen - Whether modal is open
 * @param onClose - Close modal callback
 * @param onConfirm - Confirm delete callback
 * @param itemType - Item type (e.g., "event")
 * @param itemName - Item name (optional)
 * @param isDeleting - Whether delete is in progress
 * @returns Delete confirmation modal
 *
 * @example
 * ```tsx
 * <ConfirmDeleteModal
 *   isOpen={showConfirm}
 *   onClose={() => setShowConfirm(false)}
 *   onConfirm={handleDelete}
 *   itemType="event"
 *   itemName="Summer Sale"
 *   isDeleting={isDeleting}
 * />
 * ```
 */
export function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  itemType,
  itemName,
  isDeleting
}: ConfirmDeleteModalProps) {
  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Delete"
      maxWidth="md"
    >
      <div className="space-y-6">
        {/* Warning Icon */}
        <div className="flex justify-center">
          <div className="bg-red-100 rounded-full p-3">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        {/* Warning Message */}
        <div className="text-center">
          <p className="text-gray-900 font-medium mb-2">
            Are you sure you want to delete this {itemType}?
          </p>
          {itemName && (
            <p className="text-gray-700 text-lg font-semibold mb-3">
              "{itemName}"
            </p>
          )}
          <p className="text-gray-600 text-sm">
            This action cannot be undone.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-medium"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </BizModal>
  );
}

export default ConfirmDeleteModal;
