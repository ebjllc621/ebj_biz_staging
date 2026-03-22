/**
 * QRCodeDisplayModal Component
 *
 * Full-screen QR code display modal for in-store redemption
 *
 * @tier ADVANCED
 * @phase Phase 3 - QR Code Infrastructure
 * @authority Phase 3 Brain Plan
 */

'use client';

import { useState } from 'react';
import BizModal from '@/components/BizModal/BizModal';
import { OfferQRCode } from './OfferQRCode';

interface QRCodeDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  claimId: number;
}

/**
 * Full-screen QR code display modal
 *
 * Features:
 * - Large QR code display
 * - Brightness slider for scanning
 * - Instructions for cashier
 * - Print-friendly layout
 *
 * @example
 * ```tsx
 * <QRCodeDisplayModal
 *   isOpen={showQR}
 *   onClose={() => setShowQR(false)}
 *   claimId={123}
 * />
 * ```
 */
export function QRCodeDisplayModal({
  isOpen,
  onClose,
  claimId
}: QRCodeDisplayModalProps) {
  const [brightness, setBrightness] = useState(100);

  const handlePrint = () => {
    window.print();
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Show Code to Cashier"
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 print:hidden">
          <p className="text-blue-800 font-medium text-center">
            Show this code to the cashier to redeem your offer
          </p>
        </div>

        {/* QR Code with brightness control */}
        <div
          style={{ filter: `brightness(${brightness}%)` }}
          className="transition-all duration-200"
        >
          <OfferQRCode claimId={claimId} size={384} showDetails={true} />
        </div>

        {/* Brightness Control */}
        <div className="print:hidden">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Adjust Brightness for Scanning
          </label>
          <div className="flex items-center space-x-4">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <input
              type="range"
              min="50"
              max="150"
              value={brightness}
              onChange={(e) => setBrightness(parseInt(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm font-medium text-gray-700 w-12 text-right">
              {brightness}%
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Code
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Done
          </button>
        </div>

        {/* Print-only footer */}
        <div className="hidden print:block text-center text-sm text-gray-600 mt-6">
          <p>Scan or enter code to redeem offer</p>
        </div>
      </div>
    </BizModal>
  );
}
