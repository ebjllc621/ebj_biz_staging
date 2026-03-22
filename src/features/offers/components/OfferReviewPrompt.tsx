/**
 * OfferReviewPrompt - Post-redemption review prompt
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { useState, useEffect } from 'react';
import { Star, X, MessageSquare } from 'lucide-react';
import { OfferReviewForm } from './OfferReviewForm';

interface OfferReviewPromptProps {
  claimId: number;
  offerId: number;
  offerTitle: string;
  onDismiss?: () => void;
  onSubmit?: () => void;
}

export function OfferReviewPrompt({
  claimId,
  offerId,
  offerTitle,
  onDismiss,
  onSubmit,
}: OfferReviewPromptProps) {
  const [canReview, setCanReview] = useState<boolean | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkEligibility = async () => {
      try {
        const response = await fetch(`/api/claims/${claimId}/can-review`, {
          credentials: 'include',
        });
        const data = await response.json();
        setCanReview(data.canReview);
      } catch {
        setCanReview(false);
      }
    };

    checkEligibility();
  }, [claimId]);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const handleSuccess = () => {
    setDismissed(true);
    onSubmit?.();
  };

  if (canReview === null || !canReview || dismissed) {
    return null;
  }

  if (showForm) {
    return (
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-purple-600" />
            <h3 className="font-medium text-gray-900">Review: {offerTitle}</h3>
          </div>
          <button
            onClick={() => setShowForm(false)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <OfferReviewForm
          claimId={claimId}
          offerId={offerId}
          onSuccess={handleSuccess}
          onCancel={() => setShowForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
          <Star className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <p className="font-medium text-gray-900">How was your experience?</p>
          <p className="text-sm text-gray-600">Share your thoughts about this offer</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleDismiss}
          className="px-4 py-2 text-gray-600 hover:bg-purple-100 rounded-lg text-sm"
        >
          Not now
        </button>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
        >
          Leave Review
        </button>
      </div>
    </div>
  );
}
