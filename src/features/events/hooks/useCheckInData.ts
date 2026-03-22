/**
 * useCheckInData Hook
 *
 * Fetches QR code data for an event check-in
 *
 * @tier STANDARD
 * @phase Phase 4 - Check-In System
 * @authority Phase 4 Brain Plan
 */

'use client';

import { useState, useEffect } from 'react';

interface CheckInQRData {
  checkInCode: string;
  verificationUrl: string;
  eventTitle: string;
  eventDate: string;
  userName: string;
  rsvpId: number;
}

interface UseCheckInDataReturn {
  qrData: CheckInQRData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Fetch QR code data for an event check-in
 *
 * @param eventId - Event ID
 * @returns QR check-in data state
 *
 * @example
 * ```tsx
 * const { qrData, isLoading, error, refresh } = useCheckInData(123);
 *
 * if (isLoading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error}</div>;
 *
 * return <QRCode value={qrData.verificationUrl} />;
 * ```
 */
export function useCheckInData(eventId: number): UseCheckInDataReturn {
  const [qrData, setQrData] = useState<CheckInQRData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQRData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/events/${eventId}/check-in/qr`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load check-in QR data');
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
    if (eventId) {
      fetchQRData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  return {
    qrData,
    isLoading,
    error,
    refresh: fetchQRData,
  };
}
