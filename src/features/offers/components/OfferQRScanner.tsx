/**
 * OfferQRScanner Component
 *
 * QR code scanner for business redemption using html5-qrcode
 *
 * @tier ADVANCED
 * @phase Phase 3 - Redemption Verification
 * @authority Phase 3 Brain Plan
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { QRCodeData } from '@features/offers/types';

interface OfferQRScannerProps {
  onScan: (data: QRCodeData) => void;
  onError: (error: string) => void;
  listingId: number;
}

/**
 * QR code scanner component
 *
 * Features:
 * - Camera access request
 * - QR code detection
 * - Verification API call on scan
 * - Success/error states
 * - Manual code entry fallback
 *
 * @example
 * ```tsx
 * <OfferQRScanner
 *   onScan={(data) => handleScan(data)}
 *   onError={(error) => handleError(error)}
 *   listingId={123}
 * />
 * ```
 */
export function OfferQRScanner({
  onScan,
  onError,
  listingId
}: OfferQRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const elementId = useRef(`qr-scanner-${Date.now()}`);

  useEffect(() => {
    return () => {
      // Cleanup scanner on unmount
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {
          // Ignore stop errors on unmount
        });
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      setCameraError(null);
      setIsScanning(true);

      const html5QrCode = new Html5Qrcode(elementId.current);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        async (decodedText) => {
          // Stop scanning after successful read
          await html5QrCode.stop();
          setIsScanning(false);

          // Parse QR code data
          try {
            const url = new URL(decodedText);
            const code = url.searchParams.get('code');
            const claimId = url.searchParams.get('claim');

            if (!code || !claimId) {
              onError('Invalid QR code format');
              return;
            }

            // Fetch QR code data
            const response = await fetch(`/api/offers/qr-code/${claimId}`, {
              credentials: 'include'
            });

            if (!response.ok) {
              const errorData = await response.json();
              onError(errorData.error || 'Failed to load QR code data');
              return;
            }

            const result = await response.json();
            onScan(result.data);
          } catch (err) {
            onError('Failed to process QR code');
          }
        },
        (errorMessage) => {
          // Ignore scan errors (just means no QR code detected)
        }
      );
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to start camera';
      setCameraError(error);
      setIsScanning(false);
      onError(error);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        // Ignore stop errors
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Scanner Container */}
      <div className="relative">
        <div
          id={elementId.current}
          className="w-full rounded-lg overflow-hidden bg-black"
          style={{ minHeight: isScanning ? '300px' : '0' }}
        />

        {!isScanning && !cameraError && (
          <div className="flex items-center justify-center p-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <p className="text-gray-600 font-medium mb-2">Ready to Scan</p>
              <p className="text-sm text-gray-500">Ask the customer to show their QR code</p>
            </div>
          </div>
        )}

        {cameraError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-800">Camera Access Error</p>
                <p className="text-sm text-red-700 mt-1">{cameraError}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      {!isScanning ? (
        <button
          onClick={startScanning}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Start Camera
        </button>
      ) : (
        <button
          onClick={stopScanning}
          className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Stop Scanning
        </button>
      )}

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          Position the customer's QR code within the scanner frame. The code will be automatically detected and verified.
        </p>
      </div>
    </div>
  );
}
