/**
 * DuplicateListingModal - Modal for duplicating a listing as a draft copy
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 4A - Listing Lifecycle (Pause/Resume, Draft, Duplicate)
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/listings/features/phases/PHASE_4A_BRAIN_PLAN.md
 *
 * Pre-fills name and slug from source listing. Both fields are editable.
 * Submit creates a draft copy via POST /api/listings/[id]/duplicate.
 */
'use client';

import React, { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import BizModal, { BizModalButton } from '@/components/BizModal';
import { fetchWithCsrf } from '@core/utils/csrf';

interface DuplicateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceListingId: number;
  sourceListingName: string;
  sourceListingSlug: string;
  onSuccess: (_id: number, _slug: string) => void;
}

export function DuplicateListingModal({
  isOpen,
  onClose,
  sourceListingId,
  sourceListingName,
  sourceListingSlug,
  onSuccess,
}: DuplicateListingModalProps) {
  const [name, setName] = useState(`${sourceListingName} (Copy)`);
  const [slug, setSlug] = useState(`${sourceListingSlug}-copy`);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset fields when modal opens with new source data
  useEffect(() => {
    if (isOpen) {
      setName(`${sourceListingName} (Copy)`);
      setSlug(`${sourceListingSlug}-copy`);
      setError(null);
    }
  }, [isOpen, sourceListingName, sourceListingSlug]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Listing name is required');
      return;
    }
    if (!slug.trim()) {
      setError('URL slug is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(`/api/listings/${sourceListingId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim() }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error?.message || data?.message || 'Failed to duplicate listing');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to duplicate listing');
      }

      const newId: number = result.data?.id;
      const newSlug: string = result.data?.slug;

      if (!newId) {
        throw new Error('Invalid response from server — missing listing ID');
      }

      onSuccess(newId, newSlug);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setError(null);
      onClose();
    }
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Duplicate Listing"
      maxWidth="md"
      closeOnBackdropClick={!isSubmitting}
      footer={
        <div className="flex justify-end gap-3">
          <BizModalButton
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </BizModalButton>
          <BizModalButton
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Duplicating...' : 'Create Draft Copy'}
          </BizModalButton>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Info notice */}
        <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            This will create a draft copy of your listing with all the same details.
            The copy will be saved as a draft — you can review and publish it when ready.
          </p>
        </div>

        {/* Name field */}
        <div>
          <label htmlFor="duplicate-name" className="block text-sm font-medium text-gray-700 mb-1">
            Listing Name
          </label>
          <input
            id="duplicate-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50"
            placeholder="Enter listing name"
          />
        </div>

        {/* Slug field */}
        <div>
          <label htmlFor="duplicate-slug" className="block text-sm font-medium text-gray-700 mb-1">
            URL Slug
          </label>
          <input
            id="duplicate-slug"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50 font-mono"
            placeholder="url-slug"
          />
          <p className="text-xs text-gray-500 mt-1">
            The URL will be: /listings/{slug || '...'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>
    </BizModal>
  );
}

export default DuplicateListingModal;
