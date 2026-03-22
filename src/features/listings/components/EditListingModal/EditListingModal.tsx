/**
 * EditListingModal Component
 *
 * @authority Phase 7 Brain Plan
 * @tier ENTERPRISE
 * @purpose Wrapper around NewListingModal for editing listings
 *
 * FEATURES:
 * - Data fetching via useListingData
 * - Data transformation (API → ListingFormData)
 * - Loading skeleton during fetch
 * - Error handling with retry
 * - Success handling with toast
 * - Wraps NewListingModal with editMode={true}
 */

'use client';

import { useEffect, useState } from 'react';
import BizModal from '@/components/BizModal';
import NewListingModal from '../NewListingModal/NewListingModal';
import { useListingData } from './useListingData';
import { useListingUpdate } from './useListingUpdate';
import { EditListingLoadingSkeleton } from './EditListingLoadingSkeleton';
import { EditListingErrorState } from './EditListingErrorState';

// ============================================================================
// TYPES
// ============================================================================

export interface EditListingModalProps {
  /** Modal visibility */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Success callback */
  onSuccess: (listingId: number) => void;
  /** Listing ID to edit (REQUIRED) */
  listingId: number;
  /** User's account type (affects permissions) */
  userRole?: 'visitor' | 'general' | 'listing_member' | 'admin';
  /** Initial listing data (optional, will fetch if not provided) */
  initialListing?: any;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function EditListingModal({
  isOpen,
  onClose,
  onSuccess,
  listingId,
  userRole = 'general',
  initialListing,
}: EditListingModalProps) {
  const [showNewListingModal, setShowNewListingModal] = useState(false);

  // Fetch listing data
  const {
    listingData,
    userRoleForListing,
    isLoading,
    error,
    refetch,
  } = useListingData(isOpen ? listingId : null);

  // Update handler
  const { handleUpdate, isUpdating, updateError } = useListingUpdate(
    listingId,
    (id) => {
      // Success callback
      onSuccess(id);
    }
  );

  // Show NewListingModal once data is loaded
  useEffect(() => {
    if (listingData && !isLoading && !error) {
      setShowNewListingModal(true);
    } else {
      setShowNewListingModal(false);
    }
  }, [listingData, isLoading, error]);

  // If data is loaded, render NewListingModal
  if (showNewListingModal && listingData) {
    return (
      <NewListingModal
        isOpen={isOpen}
        onClose={onClose}
        onSuccess={onSuccess}
        editMode={true}
        listingId={listingId}
        initialData={listingData}
        userRole={userRole}
        onEditSubmit={handleUpdate}
      />
    );
  }

  // Otherwise, show loading/error modal
  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Business Listing"
      maxWidth="4xl"
      fullScreenMobile={true}
      closeOnBackdropClick={false}
    >
      {/* Loading state */}
      {isLoading && <EditListingLoadingSkeleton />}

      {/* Error state */}
      {error && <EditListingErrorState error={error} onRetry={refetch} />}

      {/* Update error (if any) */}
      {updateError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {updateError}
        </div>
      )}
    </BizModal>
  );
}
