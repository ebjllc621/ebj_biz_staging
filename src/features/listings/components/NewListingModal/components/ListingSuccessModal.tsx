'use client';

/**
 * ListingSuccessModal Component
 * Success feedback modal after listing creation
 * Authority: PHASE_6_BRAIN_PLAN.md
 * Tier: ENTERPRISE
 *
 * Phase 1B: Added "Share Your Listing" button that opens ListingShareModal
 * with context="post-publish" after successful listing creation.
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import BizModal from '@/components/BizModal';

// Dynamic import: ListingShareModal uses browser APIs (clipboard, window.open)
const ListingShareModal = dynamic(
  () => import('@features/listings/components/ListingShareModal').then(
    (mod) => mod.ListingShareModal
  ),
  { ssr: false }
);

interface ListingSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: number;
  listingSlug: string;
  listingName: string;
  requiresApproval: boolean;
}

export function ListingSuccessModal({
  isOpen,
  onClose,
  listingId,
  listingSlug,
  listingName,
  requiresApproval,
}: ListingSuccessModalProps) {
  const router = useRouter();
  const [showShareModal, setShowShareModal] = useState(false);

  const handleViewDashboard = () => {
    onClose();
    router.push('/dashboard');
  };

  const handleViewListing = () => {
    onClose();
    router.push(`/listings/${listingSlug}` as never);
  };

  const handleShareListing = () => {
    setShowShareModal(true);
  };

  return (
    <>
      <BizModal
        isOpen={isOpen}
        onClose={onClose}
        title="Success!"
        maxWidth="md"
      >
        <div className="text-center py-6">
          {/* Success Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <svg
              className="h-10 w-10 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              role="img"
              aria-label="Success"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          {/* Congratulations Heading */}
          <h2 className="text-2xl font-bold text-navy-900 mb-3">
            Congratulations!
          </h2>

          {/* Success Message */}
          <p className="text-gray-700 mb-6">
            Your listing <span className="font-semibold">{listingName}</span> has
            been created successfully!
          </p>

          {/* Approval Info Box (conditional) */}
          {requiresApproval && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-blue-900 font-medium">
                    Your listing has been submitted for review.
                  </p>
                  <p className="text-sm text-blue-800 mt-1">
                    You'll receive an email notification when it's approved and live
                    on the platform.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleViewDashboard}
              className="px-6 py-2.5 border-2 border-navy-900 text-navy-900 rounded-md font-medium hover:bg-navy-50 transition-colors"
            >
              View Dashboard
            </button>
            <button
              onClick={handleShareListing}
              className="px-6 py-2.5 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 transition-colors"
            >
              Share Your Listing
            </button>
            <button
              onClick={handleViewListing}
              className="px-6 py-2.5 bg-orange-500 text-white rounded-md font-medium hover:bg-orange-600 transition-colors"
            >
              View Listing
            </button>
          </div>

          {/* Additional Info */}
          <p className="text-xs text-gray-500 mt-6">
            You can always edit your listing details from your dashboard.
          </p>
        </div>
      </BizModal>

      {/* Post-publish share modal */}
      <ListingShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        listing={{
          id: listingId,
          slug: listingSlug,
          name: listingName,
        }}
        context="post-publish"
      />
    </>
  );
}
