/**
 * EventCheckInQR - Attendee QR code for event check-in
 *
 * Displays a QR code linked to the attendee's check-in verification URL.
 * Used on the user dashboard and in check-in modal.
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4 - Check-In System
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

import { useState } from 'react';
import QRCode from 'react-qr-code';
import { useCheckInData } from '@features/events/hooks/useCheckInData';
import { BizModal } from '@/components/ui/BizModal';
import { Loader2, AlertCircle, Maximize2, QrCode, Calendar, User } from 'lucide-react';

interface EventCheckInQRProps {
  eventId: number;
  size?: number;
  showDetails?: boolean;
}

export function EventCheckInQR({ eventId, size = 180, showDetails = true }: EventCheckInQRProps) {
  const { qrData, isLoading, error, refresh } = useCheckInData(eventId);
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        <span className="ml-2 text-sm text-gray-500">Loading QR code...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-red-600 bg-red-50 rounded-lg">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <div>
          <p>{error}</p>
          <button
            onClick={refresh}
            className="mt-1 text-xs underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!qrData) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-gray-500 bg-gray-50 rounded-lg">
        <QrCode className="w-5 h-5 shrink-0 text-gray-400" />
        <span>No check-in QR code available. Confirm your RSVP first.</span>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        {/* QR Code */}
        <div className="relative bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <QRCode
            value={qrData.verificationUrl}
            size={size}
            level="M"
          />
          <button
            onClick={() => setIsExpanded(true)}
            className="absolute top-2 right-2 p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="Expand QR code"
          >
            <Maximize2 className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>

        {/* Details */}
        {showDetails && (
          <div className="w-full space-y-1.5 text-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <QrCode className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="font-medium truncate">{qrData.eventTitle}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
              <span>{formatDate(qrData.eventDate)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <User className="w-4 h-4 text-gray-400 shrink-0" />
              <span>{qrData.userName}</span>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400 text-center">
          Show this QR code at the event for check-in
        </p>
      </div>

      {/* Full-screen modal */}
      {isExpanded && (
        <BizModal
          isOpen={isExpanded}
          onClose={() => setIsExpanded(false)}
          title="Event Check-In QR Code"
          size="medium"
        >
          <div className="flex flex-col items-center gap-5 py-4">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <QRCode
                value={qrData.verificationUrl}
                size={280}
                level="M"
              />
            </div>

            <div className="text-center space-y-1">
              <p className="font-semibold text-biz-navy">{qrData.eventTitle}</p>
              <p className="text-sm text-gray-500">{formatDate(qrData.eventDate)}</p>
              <p className="text-sm text-gray-500">{qrData.userName}</p>
            </div>

            <p className="text-xs text-gray-400 text-center max-w-xs">
              Present this QR code to the event organizer for check-in. Your code: <code className="font-mono">{qrData.checkInCode.slice(0, 8)}...</code>
            </p>
          </div>
        </BizModal>
      )}
    </>
  );
}
