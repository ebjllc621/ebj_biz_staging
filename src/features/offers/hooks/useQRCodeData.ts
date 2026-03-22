/**
 * useQRCodeData Hook
 *
 * Fetches QR code data for a specific claim
 *
 * @tier ADVANCED
 * @phase Phase 3 - QR Code Infrastructure
 * @authority Phase 3 Brain Plan
 */

'use client';

import { useState, useEffect } from 'react';
import { QRCodeData } from '@features/offers/types';

interface UseQRCodeDataReturn {
  qrData: QRCodeData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Fetch QR code data for a claim
 *
 * @param claimId - Claim ID
 * @returns QR code data state
 *
 * @example
 * ```tsx
 * const { qrData, isLoading, error, refresh } = useQRCodeData(123);
 *
 * if (isLoading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error}</div>;
 *
 * return <QRCode value={qrData.verificationUrl} />;
 * ```
 */
export function useQRCodeData(claimId: number): UseQRCodeDataReturn {
  const [qrData, setQrData] = useState<QRCodeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQRData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/offers/qr-code/${claimId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load QR code data');
      }

      const result = await response.json();
      setQrData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (claimId) {
      fetchQRData();
    }
  }, [claimId]);

  return {
    qrData,
    isLoading,
    error,
    refresh: fetchQRData
  };
}
