/**
 * EventQRScanner - QR code scanner for event check-in
 *
 * Uses html5-qrcode to scan attendee QR codes and check them in.
 * Parses the scanned URL to extract code and rsvp params.
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4 - QR Check-In System
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';
import { QrCode, CheckCircle, XCircle, Loader2, Camera } from 'lucide-react';

interface EventQRScannerProps {
  eventId: number;
  onCheckIn: (result: CheckInResult) => void;
  onError: (error: string) => void;
}

interface CheckInResult {
  checkIn: {
    id: number;
    checkInMethod: string;
    checkedInAt: string;
  };
  userName?: string;
}

type ScanState = 'idle' | 'scanning' | 'success' | 'error';

export function EventQRScanner({ eventId, onCheckIn, onError }: EventQRScannerProps) {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [message, setMessage] = useState<string>('');
  const [manualCode, setManualCode] = useState('');
  const [manualRsvpId, setManualRsvpId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scannerRef = useRef<unknown>(null);
  const scannerDivId = 'event-qr-scanner-region';

  const parseScannedUrl = (text: string): { code: string; rsvpId: number } | null => {
    try {
      const url = new URL(text);
      const code = url.searchParams.get('code');
      const rsvpStr = url.searchParams.get('rsvp');
      if (!code || !rsvpStr) return null;
      const rsvpId = parseInt(rsvpStr);
      if (isNaN(rsvpId)) return null;
      return { code, rsvpId };
    } catch {
      return null;
    }
  };

  const handleCheckIn = async (rsvpId: number, checkInCode: string, method: 'qr_scan' | 'self') => {
    setIsSubmitting(true);
    try {
      const res = await fetchWithCsrf(`/api/events/${eventId}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rsvpId, method, checkInCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errMsg = data?.error || 'Check-in failed';
        setScanState('error');
        setMessage(errMsg);
        onError(errMsg);
        return;
      }

      setScanState('success');
      setMessage('Attendee checked in successfully!');
      onCheckIn(data?.data);

      // Reset after 3 seconds
      setTimeout(() => {
        setScanState('idle');
        setMessage('');
      }, 3000);
    } catch {
      const errMsg = 'Network error. Please try again.';
      setScanState('error');
      setMessage(errMsg);
      onError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startScanner = async () => {
    setScanState('scanning');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const html5QrcodeScanner = new Html5Qrcode(scannerDivId);
      scannerRef.current = html5QrcodeScanner;

      await html5QrcodeScanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText: string) => {
          const parsed = parseScannedUrl(decodedText);
          if (!parsed) {
            setScanState('error');
            setMessage('Invalid QR code format.');
            onError('Invalid QR code format.');
            return;
          }

          // Stop scanning once we have a result
          try {
            await html5QrcodeScanner.stop();
            scannerRef.current = null;
          } catch {
            // ignore stop errors
          }

          await handleCheckIn(parsed.rsvpId, parsed.code, 'qr_scan');
        },
        () => {
          // QR not detected yet — ignore
        }
      );
    } catch (err) {
      setScanState('error');
      const msg = err instanceof Error ? err.message : 'Failed to start camera.';
      setMessage(msg);
      onError(msg);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const scanner = scannerRef.current as { stop: () => Promise<void> };
        await scanner.stop();
        scannerRef.current = null;
      } catch {
        // ignore
      }
    }
    setScanState('idle');
    setMessage('');
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rsvpId = parseInt(manualRsvpId);
    if (!manualCode.trim() || isNaN(rsvpId)) {
      setMessage('Please enter both a check-in code and RSVP ID.');
      setScanState('error');
      return;
    }
    await handleCheckIn(rsvpId, manualCode.trim(), 'self');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        const scanner = scannerRef.current as { stop: () => Promise<void> };
        scanner.stop().catch(() => null);
      }
    };
  }, []);

  return (
    <div className="space-y-5">
      {/* Scanner area */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <QrCode className="w-5 h-5 text-biz-orange" />
          <h3 className="font-semibold text-biz-navy text-sm">QR Code Scanner</h3>
        </div>

        {/* Scanner viewport */}
        <div
          id={scannerDivId}
          className="w-full max-w-xs mx-auto rounded-lg overflow-hidden bg-black"
          style={{ minHeight: scanState === 'scanning' ? '300px' : '0' }}
        />

        {/* State feedback */}
        {scanState === 'success' && (
          <div className="flex items-center gap-2 mt-3 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">{message}</span>
          </div>
        )}

        {scanState === 'error' && (
          <div className="flex items-center gap-2 mt-3 text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <XCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm">{message}</span>
          </div>
        )}

        {/* Controls */}
        <div className="mt-4 flex gap-3 justify-center">
          {scanState !== 'scanning' ? (
            <button
              onClick={startScanner}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-biz-orange text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              Start Scanner
            </button>
          ) : (
            <button
              onClick={stopScanner}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              Stop Scanner
            </button>
          )}
        </div>
      </div>

      {/* Manual code entry fallback */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-biz-navy text-sm mb-3">Manual Code Entry</h3>
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Check-in Code</label>
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Enter UUID check-in code"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-biz-orange"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">RSVP ID</label>
            <input
              type="number"
              value={manualRsvpId}
              onChange={(e) => setManualRsvpId(e.target.value)}
              placeholder="Enter RSVP ID number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-biz-orange"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-2.5 bg-biz-navy text-white text-sm font-medium rounded-lg hover:bg-navy-800 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Checking in...' : 'Check In'}
          </button>
        </form>
      </div>
    </div>
  );
}
