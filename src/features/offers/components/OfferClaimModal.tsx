/**
 * OfferClaimModal - Modal for confirming offer claim and displaying promo code
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Offers Phase 1 - Core CRUD & Display
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/offers/build/phases/PHASE_1_CORE_CRUD_BRAIN_PLAN.md
 * @reference src/components/BizModal/BizModal.tsx - Modal wrapper (MANDATORY)
 */
'use client';

import { useState, useCallback } from 'react';
import { Check, Copy, AlertCircle, Gift, Loader2 } from 'lucide-react';
import { BizModal } from '@/components/ui/BizModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import type { OfferWithListing, ClaimResult } from '@features/offers/types';

interface OfferClaimModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Offer being claimed */
  offer: OfferWithListing;
  /** Callback to execute claim */
  onConfirmClaim: () => Promise<ClaimResult | null>;
  /** Claim result (after successful claim) */
  claimResult?: ClaimResult | null;
  /** Whether claim is in progress */
  isLoading?: boolean;
  /** Error message from claim attempt */
  error?: string | null;
  /** Callback after successful claim (opens share modal) */
  onClaimSuccess?: (result: ClaimResult) => void;
}

function OfferClaimModalInner({
  isOpen,
  onClose,
  offer,
  onConfirmClaim,
  claimResult,
  isLoading = false,
  error,
  onClaimSuccess
}: OfferClaimModalProps) {
  const [copied, setCopied] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [internalResult, setInternalResult] = useState<ClaimResult | null>(null);

  // Use internal state if not controlled externally
  const loading = isLoading || internalLoading;
  const displayError = error || internalError;
  const result = claimResult || internalResult;

  const handleConfirm = useCallback(async () => {
    setInternalLoading(true);
    setInternalError(null);

    try {
      const claimRes = await onConfirmClaim();
      if (claimRes) {
        setInternalResult(claimRes);
        onClaimSuccess?.(claimRes);
      }
    } catch (err) {
      setInternalError(err instanceof Error ? err.message : 'Failed to claim offer');
    } finally {
      setInternalLoading(false);
    }
  }, [onConfirmClaim, onClaimSuccess]);

  const handleCopyCode = useCallback(() => {
    if (result?.promoCode) {
      navigator.clipboard.writeText(result.promoCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [result?.promoCode]);

  const handleClose = useCallback(() => {
    // Reset internal state
    setInternalResult(null);
    setInternalError(null);
    setCopied(false);
    onClose();
  }, [onClose]);

  // Calculate savings display
  const savingsDisplay = offer.discount_percentage
    ? `${offer.discount_percentage}% OFF`
    : offer.original_price && offer.sale_price
    ? `Save $${(Number(offer.original_price) - Number(offer.sale_price)).toFixed(2)}`
    : 'Special Offer';

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title={result ? 'Offer Claimed!' : 'Claim This Offer'}
      size="medium"
    >
      <div className="space-y-6">
        {/* Error State */}
        {displayError && !result && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Unable to claim offer</p>
              <p className="text-sm text-red-600 mt-1">{displayError}</p>
            </div>
          </div>
        )}

        {/* Success State - Show Promo Code */}
        {result && (
          <>
            {/* Success Banner */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                You&apos;ve claimed this offer!
              </h3>
              <p className="text-sm text-gray-600">
                Use the promo code below to redeem your savings
              </p>
            </div>

            {/* Promo Code Display */}
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Your Promo Code
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl font-mono font-bold text-gray-900 tracking-wider">
                  {result.promoCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-green-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-3">
                Expires: {new Date(result.expiresAt).toLocaleDateString()}
              </p>
            </div>

            {/* Redemption Instructions */}
            {result.redemptionInstructions && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-800 mb-2">
                  How to Redeem
                </h4>
                <p className="text-sm text-blue-700">
                  {result.redemptionInstructions}
                </p>
              </div>
            )}

            {/* Access Info */}
            <div className="text-center text-sm text-gray-500">
              <p>
                You can view all your claimed offers in{' '}
                <a
                  href="/dashboard/my-offers"
                  className="text-[#ed6437] hover:underline font-medium"
                >
                  My Offers
                </a>
              </p>
            </div>
          </>
        )}

        {/* Confirmation State - Before Claim */}
        {!result && (
          <>
            {/* Offer Preview */}
            <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
              {offer.image ? (
                <img
                  src={offer.image}
                  alt={offer.title}
                  className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <Gift className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{offer.title}</h3>
                <p className="text-sm text-gray-600">{offer.listing_name}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-flex px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                    {savingsDisplay}
                  </span>
                  {offer.original_price && offer.sale_price && (
                    <span className="text-sm">
                      <span className="text-gray-500 line-through">
                        ${Number(offer.original_price).toFixed(2)}
                      </span>
                      {' '}
                      <span className="font-semibold text-gray-900">
                        ${Number(offer.sale_price).toFixed(2)}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Confirmation Message */}
            <div className="text-center">
              <p className="text-gray-700">
                By claiming this offer, you&apos;ll receive a unique promo code to use at{' '}
                <span className="font-medium">{offer.listing_name}</span>.
              </p>
              {offer.max_per_user > 1 && (
                <p className="text-sm text-gray-500 mt-2">
                  You can claim this offer up to {offer.max_per_user} time(s).
                </p>
              )}
            </div>

            {/* Terms & Conditions Summary */}
            {offer.terms_conditions && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  <span className="font-medium">Note:</span> {offer.terms_conditions}
                </p>
              </div>
            )}
          </>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2 border-t border-gray-200">
          {result ? (
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-3 bg-[#ed6437] text-white rounded-lg font-medium hover:bg-[#d55a31] transition-colors"
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={handleClose}
                disabled={loading}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-[#ed6437] text-white rounded-lg font-medium hover:bg-[#d55a31] disabled:bg-gray-300 disabled:text-gray-500 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Claiming...</span>
                  </>
                ) : (
                  <>
                    <Gift className="w-5 h-5" />
                    <span>Claim Offer</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </BizModal>
  );
}

/**
 * OfferClaimModal with ErrorBoundary (STANDARD tier requirement)
 */
export function OfferClaimModal(props: OfferClaimModalProps) {
  return (
    <ErrorBoundary componentName="OfferClaimModal">
      <OfferClaimModalInner {...props} />
    </ErrorBoundary>
  );
}

export default OfferClaimModal;
