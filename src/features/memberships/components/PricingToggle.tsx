/**
 * PricingToggle - Monthly/Annual billing period toggle
 *
 * @tier SIMPLE
 * @phase Phase 3 - Public Memberships Page
 */
'use client';

import { useState, useEffect } from 'react';

interface PricingToggleProps {
  value: 'monthly' | 'annual';
  onChange: (value: 'monthly' | 'annual') => void;
  savingsText?: string;
}

export function PricingToggle({
  value,
  onChange,
  savingsText = 'Save 17%'
}: PricingToggleProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-3 mb-8">
      <button
        onClick={() => onChange('monthly')}
        className={`px-6 py-2 rounded-lg font-medium transition-all ${
          value === 'monthly'
            ? 'bg-[#022641] text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        Monthly
      </button>

      <button
        onClick={() => onChange('annual')}
        className={`px-6 py-2 rounded-lg font-medium transition-all relative ${
          value === 'annual'
            ? 'bg-[#022641] text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        Annual
        {savingsText && (
          <span className="absolute -top-2 -right-2 bg-[#ed6437] text-white text-xs px-2 py-0.5 rounded-full">
            {savingsText}
          </span>
        )}
      </button>
    </div>
  );
}
