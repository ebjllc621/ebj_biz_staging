/**
 * ClaimQRCodeCard Component
 *
 * Card displaying claim with mini QR code preview
 *
 * @tier STANDARD
 * @phase Phase 3 - QR Code Infrastructure
 * @phase TD-P3-004 - Self-Redemption UI Flow
 * @authority Phase 3 Brain Plan
 */

'use client';

import { useState } from 'react';
import { Claim } from '@features/offers/types';
import QRCode from 'react-qr-code';
import { QRCodeDisplayModal } from './QRCodeDisplayModal';

interface ClaimQRCodeCardProps {
  claim: Claim;
  onSelfRedeem?: (claimId: number) => void;
}

/**
 * Display claim card with QR code preview
 *
 * Features:
 * - Mini QR code preview
 * - "Show Code" button
 * - Promo code text
 * - Expiration countdown
 * - Redemption status badge
 *
 * @example
 * ```tsx
 * <ClaimQRCodeCard claim={claim} />
 * ```
 */
export function ClaimQRCodeCard({ claim, onSelfRedeem }: ClaimQRCodeCardProps) {
  const [showFullQR, setShowFullQR] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  const isExpired = new Date(claim.end_date) < new Date();
  const isRedeemed = claim.status === 'redeemed';

  // Handle self-redemption (TD-P3-004)
  const handleSelfRedeem = async () => {
    setIsRedeeming(true);
    setRedeemError(null);

    try {
      const response = await fetch(`/api/offers/${claim.offer_id}/self-redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ claimId: claim.id })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mark as redeemed');
      }

      // Success - callback to parent if provided
      if (onSelfRedeem) {
        onSelfRedeem(claim.id);
      } else {
        // Reload page to reflect changes
        window.location.reload();
      }
    } catch (err) {
      setRedeemError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsRedeeming(false);
    }
  };

  // Calculate days until expiration
  const daysUntilExpiration = Math.ceil(
    (new Date(claim.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex space-x-4">
          {/* QR Code Preview */}
          <div className="flex-shrink-0">
            {isRedeemed || isExpired ? (
              <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-400 text-xs">
                  {isRedeemed ? (
                    <svg className="w-8 h-8 mx-auto mb-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <span className="block">{isRedeemed ? 'Redeemed' : 'Expired'}</span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowFullQR(true)}
                className="block w-24 h-24 bg-white border-2 border-blue-200 rounded-lg p-1 hover:border-blue-400 transition-colors"
                aria-label="Show QR code"
              >
                <QRCode
                  value={`${process.env.NEXT_PUBLIC_BASE_URL}/api/offers/verify?code=${claim.promo_code}&claim=${claim.id}`}
                  size={88}
                  level="H"
                />
              </button>
            )}
          </div>

          {/* Claim Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{claim.offer_title}</h3>
                <p className="text-sm text-gray-600">{claim.business_name}</p>
              </div>

              {/* Status Badge */}
              {isRedeemed ? (
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                  Redeemed
                </span>
              ) : isExpired ? (
                <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                  Expired
                </span>
              ) : (
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                  Active
                </span>
              )}
            </div>

            {/* Promo Code */}
            <div className="bg-gray-50 px-3 py-2 rounded-lg mb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Promo Code:</span>
                <span className="font-mono font-bold text-sm">{claim.promo_code}</span>
              </div>
            </div>

            {/* Expiration Info */}
            <div className="flex items-center justify-between text-sm">
              {isExpired ? (
                <span className="text-red-600">Expired {new Date(claim.end_date).toLocaleDateString()}</span>
              ) : isRedeemed ? (
                <span className="text-green-600">
                  Redeemed {claim.redeemed_at ? new Date(claim.redeemed_at).toLocaleDateString() : ''}
                </span>
              ) : (
                <>
                  <span className="text-gray-600">
                    {daysUntilExpiration === 0
                      ? 'Expires today'
                      : daysUntilExpiration === 1
                      ? 'Expires tomorrow'
                      : `Expires in ${daysUntilExpiration} days`}
                  </span>
                  <button
                    onClick={() => setShowFullQR(true)}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Show Code
                  </button>
                </>
              )}
            </div>

            {/* Self-Redemption Button (TD-P3-004) */}
            {!isExpired && !isRedeemed && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={handleSelfRedeem}
                  disabled={isRedeeming}
                  className="w-full px-3 py-2 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isRedeeming ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Mark as Redeemed
                    </>
                  )}
                </button>
                {redeemError && (
                  <p className="mt-1 text-xs text-red-600">{redeemError}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full-screen QR Modal */}
      <QRCodeDisplayModal
        isOpen={showFullQR}
        onClose={() => setShowFullQR(false)}
        claimId={claim.id}
      />
    </>
  );
}
