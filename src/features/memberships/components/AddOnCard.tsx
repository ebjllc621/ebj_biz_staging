/**
 * AddOnCard - Individual add-on suite card
 *
 * @tier SIMPLE
 * @phase Phase 3 - Public Memberships Page
 */
'use client';

import { Check } from 'lucide-react';
import type { AddonData } from '../types';

interface AddOnCardProps {
  addon: AddonData;
  billingPeriod: 'monthly' | 'annual';
}

export function AddOnCard({ addon, billingPeriod }: AddOnCardProps) {
  const price = billingPeriod === 'monthly' ? addon.monthlyPrice : addon.annualPrice;
  const monthlySavings = addon.monthlyPrice * 12 - addon.annualPrice;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition-all hover:-translate-y-1">
      {/* Tag */}
      <div className="mb-4">
        <span className={`${addon.tagColor} px-3 py-1 rounded-full text-xs font-semibold`}>
          {addon.tagText}
        </span>
      </div>

      {/* Suite Name */}
      <h3 className="text-xl font-bold text-[#022641] mb-2">{addon.displayName}</h3>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-4">{addon.description}</p>

      {/* Price */}
      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-xl text-gray-600">$</span>
          <span className="text-3xl font-bold text-[#022641]">{price}</span>
          <span className="text-gray-600">/{billingPeriod === 'monthly' ? 'mo' : 'yr'}</span>
        </div>
        {billingPeriod === 'annual' && monthlySavings > 0 && (
          <div className="text-sm text-green-600 font-medium mt-1">
            Save ${monthlySavings}/year
          </div>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-2">
        {addon.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
