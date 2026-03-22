/**
 * OfferQRCode Component
 *
 * Displays QR code for claimed offer using react-qr-code
 *
 * @tier ADVANCED
 * @phase Phase 3 - QR Code Infrastructure
 * @authority Phase 3 Brain Plan
 */

'use client';

import QRCode from 'react-qr-code';
import { useQRCodeData } from '@features/offers/hooks/useQRCodeData';

interface OfferQRCodeProps {
  claimId: number;
  size?: number;
  showDetails?: boolean;
  onShowFullScreen?: () => void;
}

/**
 * Display QR code for claimed offer
 *
 * @param claimId - Claim ID
 * @param size - QR code size in pixels (default: 256)
 * @param showDetails - Show offer details below QR code (default: true)
 * @param onShowFullScreen - Callback for full-screen view
 *
 * @example
 * ```tsx
 * <OfferQRCode claimId={123} size={300} />
 * ```
 */
export function OfferQRCode({
  claimId,
  size = 256,
  showDetails = true,
  onShowFullScreen
}: OfferQRCodeProps) {
  const { qrData, isLoading, error } = useQRCodeData(claimId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !qrData) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">{error || 'Failed to load QR code'}</p>
      </div>
    );
  }

  const isExpired = new Date(qrData.expiresAt) < new Date();

  return (
    <div className="space-y-4">
      {/* QR Code Container */}
      <div className="flex flex-col items-center justify-center p-6 bg-white border-2 border-gray-200 rounded-lg">
        {isExpired ? (
          <div className="text-center">
            <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-gray-400">
                <svg className="w-16 h-16 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="font-medium">Code Expired</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="bg-white p-4">
              <QRCode
                value={qrData.verificationUrl}
                size={size}
                level="H"
              />
            </div>
            {onShowFullScreen && (
              <button
                onClick={onShowFullScreen}
                className="absolute -bottom-3 -right-3 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
                aria-label="View full screen"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Details Section */}
      {showDetails && (
        <div className="space-y-2">
          <div className="text-center">
            <h3 className="font-semibold text-lg">{qrData.offerTitle}</h3>
            <p className="text-sm text-gray-600">{qrData.businessName}</p>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Promo Code:</span>
              <span className="font-mono font-bold text-lg">{qrData.promoCode}</span>
            </div>
          </div>

          <div className="text-center text-sm">
            {isExpired ? (
              <p className="text-red-600 font-medium">Expired</p>
            ) : (
              <p className="text-gray-600">
                Expires: {new Date(qrData.expiresAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
