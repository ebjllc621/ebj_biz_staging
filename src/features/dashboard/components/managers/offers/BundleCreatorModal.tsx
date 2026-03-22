/**
 * BundleCreatorModal - Modal to create offer bundles
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { useState } from 'react';
import { Package, Loader2, Trash2 } from 'lucide-react';
import { BizModal } from '@/components/ui/BizModal';
import type { Offer } from '@features/offers/types';

type BundleType = 'themed' | 'seasonal' | 'loyalty' | 'custom';

interface BundleCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: number;
  availableOffers: Offer[];
  onSuccess?: () => void;
}

const BUNDLE_TYPES: { value: BundleType; label: string; description: string }[] = [
  { value: 'themed', label: 'Themed Bundle', description: 'Group related offers by theme or category' },
  { value: 'seasonal', label: 'Seasonal Bundle', description: 'Limited-time seasonal promotion' },
  { value: 'loyalty', label: 'Loyalty Bundle', description: 'Exclusive bundle for loyal customers' },
  { value: 'custom', label: 'Custom Bundle', description: 'Create your own bundle type' },
];

export function BundleCreatorModal({
  isOpen,
  onClose,
  listingId,
  availableOffers,
  onSuccess,
}: BundleCreatorModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [bundleType, setBundleType] = useState<BundleType>('themed');
  const [selectedOfferIds, setSelectedOfferIds] = useState<number[]>([]);
  const [expiresAt, setExpiresAt] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Bundle name is required');
      return;
    }
    if (selectedOfferIds.length < 2) {
      setError('Select at least 2 offers for a bundle');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const response = await fetch(`/api/listings/${listingId}/bundles`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          bundle_type: bundleType,
          offer_ids: selectedOfferIds,
          expires_at: expiresAt || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create bundle');
      }

      onSuccess?.();
      onClose();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setBundleType('themed');
    setSelectedOfferIds([]);
    setExpiresAt('');
    setError(null);
  };

  const toggleOffer = (offerId: number) => {
    setSelectedOfferIds((prev) =>
      prev.includes(offerId)
        ? prev.filter((id) => id !== offerId)
        : [...prev, offerId]
    );
  };

  const selectedOffers = availableOffers.filter((o) =>
    selectedOfferIds.includes(o.id)
  );

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Offer Bundle"
      size="large"
    >
      <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
        {/* Bundle Name */}
        <div>
          <label htmlFor="bundleName" className="block text-sm font-medium text-gray-700 mb-2">
            Bundle Name
          </label>
          <input
            type="text"
            id="bundleName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Summer Savings Bundle"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="bundleDescription" className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            id="bundleDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your bundle..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        {/* Bundle Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bundle Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            {BUNDLE_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setBundleType(type.value)}
                className={`p-3 rounded-lg border-2 text-left transition-colors ${
                  bundleType === type.value
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-medium text-gray-900">{type.label}</p>
                <p className="text-xs text-gray-500 mt-1">{type.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Select Offers */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Offers ({selectedOfferIds.length} selected)
          </label>
          <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
            {availableOffers.length === 0 ? (
              <p className="p-4 text-center text-gray-500">No offers available</p>
            ) : (
              availableOffers.map((offer) => (
                <label
                  key={offer.id}
                  className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                    selectedOfferIds.includes(offer.id) ? 'bg-purple-50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedOfferIds.includes(offer.id)}
                    onChange={() => toggleOffer(offer.id)}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{offer.title}</p>
                    {offer.discount_percentage && (
                      <p className="text-sm text-purple-600">
                        {offer.discount_percentage}% off
                      </p>
                    )}
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Selected Offers Preview */}
        {selectedOffers.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bundle Preview
            </label>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              {selectedOffers.map((offer) => (
                <div
                  key={offer.id}
                  className="flex items-center justify-between bg-white rounded-lg p-2"
                >
                  <span className="text-sm text-gray-900">{offer.title}</span>
                  <button
                    type="button"
                    onClick={() => toggleOffer(offer.id)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expiration */}
        <div>
          <label htmlFor="bundleExpires" className="block text-sm font-medium text-gray-700 mb-2">
            Expires At (Optional)
          </label>
          <input
            type="datetime-local"
            id="bundleExpires"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !name.trim() || selectedOfferIds.length < 2}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Package className="w-4 h-4" />
                Create Bundle
              </>
            )}
          </button>
        </div>
      </div>
    </BizModal>
  );
}
