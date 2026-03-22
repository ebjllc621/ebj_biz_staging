/**
 * BatchProgressModal - Progress indicator during batch operations
 *
 * Shows spinner during processing, then success/error summary after completion.
 * Not closeable during processing (closeOnBackdropClick={false}).
 *
 * @tier STANDARD
 * @phase Phase 4B - Batch Operations + SEO + Context Menus
 */

'use client';

import { memo } from 'react';
import { BizModal, BizModalButton } from '@/components/ui/BizModal';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import type { BatchOperationResult } from '@features/media/directory/types/directory-types';

// ============================================================================
// TYPES
// ============================================================================

export interface BatchProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  operation: 'delete' | 'move' | 'copy' | 'seo-update';
  result: BatchOperationResult | null;
  isProcessing: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function getOperationLabel(operation: 'delete' | 'move' | 'copy' | 'seo-update'): string {
  switch (operation) {
    case 'delete': return 'delete';
    case 'move': return 'move';
    case 'copy': return 'copy';
    case 'seo-update': return 'SEO update';
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export const BatchProgressModal = memo(function BatchProgressModal({
  isOpen,
  onClose,
  operation,
  result,
  isProcessing,
}: BatchProgressModalProps) {
  const operationLabel = getOperationLabel(operation);
  const isPartialFailure = result !== null && result.failed > 0 && result.succeeded > 0;
  const isFullFailure = result !== null && result.failed > 0 && result.succeeded === 0;
  const isSuccess = result !== null && result.failed === 0;

  return (
    <BizModal
      isOpen={isOpen}
      onClose={isProcessing ? () => void 0 : onClose}
      title="Batch Operation"
      maxWidth="sm"
      closeOnBackdropClick={!isProcessing}
      closeOnEscape={!isProcessing}
      showCloseButton={!isProcessing}
      footer={
        !isProcessing && result !== null ? (
          <div className="flex justify-end">
            <BizModalButton variant="primary" onClick={onClose}>
              Close
            </BizModalButton>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-4 py-2">
        {/* Processing state */}
        {isProcessing && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-200 border-t-orange-500" />
            <p className="text-sm text-gray-600 font-medium">
              Processing {operationLabel}...
            </p>
            <p className="text-xs text-gray-400">Please wait while the operation completes</p>
          </div>
        )}

        {/* Completed state */}
        {!isProcessing && result !== null && (
          <div className="space-y-4">
            {/* Status icon + summary */}
            <div className="flex flex-col items-center gap-3 py-4">
              {(isSuccess || isPartialFailure) && (
                <CheckCircle
                  className={`w-12 h-12 ${isSuccess ? 'text-green-500' : 'text-yellow-500'}`}
                />
              )}
              {isFullFailure && (
                <AlertTriangle className="w-12 h-12 text-red-500" />
              )}

              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800">
                  {result.succeeded} of {result.total}{' '}
                  {result.total === 1 ? 'file' : 'files'} processed successfully
                </p>
                {result.failed > 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    {result.failed} {result.failed === 1 ? 'file' : 'files'} failed
                  </p>
                )}
              </div>
            </div>

            {/* Error details */}
            {result.errors.length > 0 && (
              <div className="border border-red-200 rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-red-50 border-b border-red-200">
                  <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">
                    Errors
                  </p>
                </div>
                <div className="max-h-[160px] overflow-y-auto divide-y divide-gray-100">
                  {result.errors.map((err) => (
                    <div key={err.fileId} className="px-3 py-2">
                      <p className="text-xs text-gray-600">
                        <span className="font-medium text-gray-800">File #{err.fileId}:</span>{' '}
                        {err.error}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </BizModal>
  );
});

export default BatchProgressModal;
