/**
 * FlashOfferToggle - Toggle for flash offer mode in offer form
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { Zap } from 'lucide-react';

interface FlashOfferToggleProps {
  isFlash: boolean;
  onChange: (isFlash: boolean) => void;
  disabled?: boolean;
}

export function FlashOfferToggle({ isFlash, onChange, disabled }: FlashOfferToggleProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
          <Zap className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <p className="font-medium text-gray-900">Flash Offer</p>
          <p className="text-sm text-gray-500">
            Limited-time deal with urgency countdown
          </p>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={isFlash}
        onClick={() => onChange(!isFlash)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
          isFlash ? 'bg-orange-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            isFlash ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
