/**
 * DraftSaveButton - Save listing form as draft (incomplete forms allowed)
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 4A - Listing Lifecycle (Pause/Resume, Draft, Duplicate)
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/listings/features/phases/PHASE_4A_BRAIN_PLAN.md
 *
 * Reuses transformFormDataToApi with status: 'draft' override.
 * Skips full validation — allows incomplete forms.
 */
'use client';

import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { fetchWithCsrf } from '@core/utils/csrf';
import { transformFormDataToApi } from '@features/listings/components/NewListingModal/hooks/useListingSubmit';
import type { ListingFormData, TierLimits } from '../types/listing-form.types';

interface DraftSaveButtonProps {
  formData: ListingFormData;
  tierLimits: TierLimits;
  editMode: boolean;
  listingId?: number;
  disabled?: boolean;
  onDraftSaved: (_savedId: number, _savedSlug: string) => void;
}

export function DraftSaveButton({
  formData,
  editMode,
  listingId,
  disabled,
  onDraftSaved,
}: DraftSaveButtonProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveAsDraft = async () => {
    // Require at minimum a name to save as draft
    if (!formData.name?.trim()) {
      setError('Please enter a listing name before saving as draft');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const apiPayload = transformFormDataToApi(formData, 'draft');

      let response: Response;

      if (editMode && listingId) {
        // Edit mode: PUT to update existing listing as draft
        response = await fetchWithCsrf(`/api/listings/${listingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiPayload),
        });
      } else {
        // Create mode: POST new listing as draft
        response = await fetchWithCsrf('/api/listings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiPayload),
        });
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error?.message || data?.message || 'Failed to save draft');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to save draft');
      }

      const savedId = result.data?.id || result.id || listingId;
      const savedSlug = result.data?.slug || result.slug || '';

      if (!savedId) {
        throw new Error('Invalid response from server — missing listing ID');
      }

      onDraftSaved(savedId, savedSlug);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleSaveAsDraft}
        disabled={disabled || isSaving}
        className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Save className="w-4 h-4" />
        {isSaving ? 'Saving draft...' : 'Save as Draft'}
      </button>
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}

export default DraftSaveButton;
