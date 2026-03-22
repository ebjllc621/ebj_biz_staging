/**
 * EditListingErrorState Component
 *
 * @authority Phase 7 Brain Plan
 * @tier ENTERPRISE
 * @purpose Error display with retry button
 *
 * FEATURES:
 * - BizModalButton for retry
 * - Accessible (role="alert")
 * - Mobile-responsive
 * - Error icon with message
 */

'use client';

import { BizModalButton } from '@/components/BizModal';
import { AlertCircle } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface EditListingErrorStateProps {
  /** Error message to display */
  error: string;
  /** Retry handler */
  onRetry: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EditListingErrorState({ error, onRetry }: EditListingErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center p-8 text-center min-h-[400px]"
    >
      {/* Error icon */}
      <AlertCircle className="w-12 h-12 text-red-500 mb-4" aria-hidden="true" />

      {/* Error heading */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Unable to Load Listing
      </h3>

      {/* Error message */}
      <p className="text-gray-600 mb-6 max-w-md">
        {error}
      </p>

      {/* Retry button */}
      <BizModalButton variant="primary" onClick={onRetry}>
        Try Again
      </BizModalButton>
    </div>
  );
}
