/**
 * ABTestSetupModal - Modal to create A/B test for offer
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { useState } from 'react';
import { FlaskConical, X, Loader2, AlertTriangle } from 'lucide-react';
import { BizModal } from '@/components/ui/BizModal';
import type { ABTestConfig } from '@features/offers/types';

interface ABTestSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  offerId: number;
  currentTitle: string;
  currentImage?: string;
  onSuccess?: () => void;
}

type VariantType = 'title' | 'image' | 'price';

export function ABTestSetupModal({
  isOpen,
  onClose,
  offerId,
  currentTitle,
  currentImage,
  onSuccess,
}: ABTestSetupModalProps) {
  const [variantType, setVariantType] = useState<VariantType>('title');
  const [variantA, setVariantA] = useState(currentTitle);
  const [variantB, setVariantB] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!variantA.trim() || !variantB.trim()) {
      setError('Both variants are required');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const config: ABTestConfig = {
        variant_type: variantType,
        variant_a_value: variantA.trim(),
        variant_b_value: variantB.trim(),
      };

      const response = await fetch(`/api/offers/${offerId}/ab-test`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create A/B test');
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setCreating(false);
    }
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create A/B Test"
      size="medium"
    >
      <div className="p-6 space-y-6">
        {/* Info */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <FlaskConical className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">A/B Testing</p>
            <p className="mt-1">
              Test two variations to see which performs better. Traffic will be
              split 50/50 between variants.
            </p>
          </div>
        </div>

        {/* Variant Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What do you want to test?
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(['title', 'image', 'price'] as VariantType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setVariantType(type)}
                className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                  variantType === type
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Variant Inputs */}
        <div className="space-y-4">
          <div>
            <label htmlFor="variantA" className="block text-sm font-medium text-gray-700 mb-2">
              Variant A (Current)
            </label>
            <input
              type="text"
              id="variantA"
              value={variantA}
              onChange={(e) => setVariantA(e.target.value)}
              placeholder={`Enter ${variantType} for variant A`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <div>
            <label htmlFor="variantB" className="block text-sm font-medium text-gray-700 mb-2">
              Variant B (New)
            </label>
            <input
              type="text"
              id="variantB"
              value={variantB}
              onChange={(e) => setVariantB(e.target.value)}
              placeholder={`Enter ${variantType} for variant B`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800">
            A/B tests require sufficient traffic to reach statistical significance.
            We recommend running tests for at least 1 week.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
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
            disabled={creating || !variantA.trim() || !variantB.trim()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <FlaskConical className="w-4 h-4" />
                Start Test
              </>
            )}
          </button>
        </div>
      </div>
    </BizModal>
  );
}
