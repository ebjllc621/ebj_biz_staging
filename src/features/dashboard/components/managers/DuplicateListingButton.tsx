/**
 * DuplicateListingButton - Trigger for duplicating a listing as a draft
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 4A - Listing Lifecycle (Pause/Resume, Draft, Duplicate)
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/listings/features/phases/PHASE_4A_BRAIN_PLAN.md
 */
'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Copy } from 'lucide-react';

// Dynamic import: DuplicateListingModal uses fetchWithCsrf and browser state
const DuplicateListingModal = dynamic(
  () => import('./DuplicateListingModal').then((m) => ({ default: m.DuplicateListingModal })),
  { ssr: false }
);

interface DuplicateListingButtonProps {
  listingId: number;
  listingName: string;
  listingSlug: string;
  onSuccess?: (_id: number, _slug: string) => void;
}

export function DuplicateListingButton({
  listingId,
  listingName,
  listingSlug,
  onSuccess,
}: DuplicateListingButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-blue-500/20 text-white/80 hover:text-blue-100 rounded-lg text-sm font-medium transition-colors"
        aria-label="Duplicate listing"
      >
        <Copy className="w-4 h-4" />
        <span>Duplicate Listing</span>
      </button>

      <DuplicateListingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sourceListingId={listingId}
        sourceListingName={listingName}
        sourceListingSlug={listingSlug}
        onSuccess={(id, slug) => {
          setIsModalOpen(false);
          onSuccess?.(id, slug);
        }}
      />
    </>
  );
}

export default DuplicateListingButton;
