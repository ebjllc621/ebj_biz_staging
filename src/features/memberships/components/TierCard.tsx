/**
 * TierCard - Individual tier pricing card
 *
 * @tier SIMPLE
 * @phase Phase 3 - Public Memberships Page
 */
'use client';

import { Check } from 'lucide-react';
import BizButton from '@/components/BizButton/BizButton';
import type { TierData } from '../types';

interface TierCardProps {
  tier: TierData;
  billingPeriod: 'monthly' | 'annual';
  onSelect: () => void;
}

export function TierCard({ tier, billingPeriod, onSelect }: TierCardProps) {
  const price = billingPeriod === 'monthly' ? tier.monthlyPrice : tier.annualPrice;
  const isFree = price === null;

  // Calculate savings for annual
  const monthlySavings = tier.monthlyPrice && tier.annualPrice
    ? (tier.monthlyPrice * 12 - tier.annualPrice)
    : 0;

  return (
    <div
      className={`relative bg-white rounded-xl shadow-lg p-6 flex flex-col h-full transition-all hover:shadow-2xl hover:-translate-y-1 ${
        tier.highlighted ? 'ring-2 ring-[#ed6437]' : ''
      }`}
    >
      {/* Badge */}
      {tier.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#ed6437] text-white px-4 py-1 rounded-full text-sm font-semibold">
          {tier.badge}
        </div>
      )}

      {/* Tier Name */}
      <div className="text-center mb-4">
        <h3 className="text-2xl font-bold text-[#022641] mb-2">{tier.name}</h3>
        <p className="text-sm text-gray-600">{tier.tagline}</p>
      </div>

      {/* Price */}
      <div className="text-center mb-6">
        {isFree ? (
          <div className="text-4xl font-bold text-[#022641]">Free</div>
        ) : (
          <>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-2xl text-gray-600">$</span>
              <span className="text-5xl font-bold text-[#022641]">{price}</span>
              <span className="text-gray-600">/{billingPeriod === 'monthly' ? 'mo' : 'yr'}</span>
            </div>
            {billingPeriod === 'annual' && monthlySavings > 0 && (
              <div className="text-sm text-green-600 font-medium mt-2">
                Save ${monthlySavings}/year
              </div>
            )}
          </>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-6 flex-grow">
        {tier.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <BizButton
        variant={tier.cta.variant}
        onClick={onSelect}
        className={`w-full py-3 font-semibold ${
          tier.cta.variant === 'primary'
            ? 'bg-[#ed6437] hover:bg-[#ed6437]/90 text-white'
            : tier.cta.variant === 'secondary'
            ? 'bg-[#022641] hover:bg-[#022641]/90 text-white'
            : 'border-2 border-[#022641] text-[#022641] hover:bg-[#022641] hover:text-white'
        }`}
      >
        {tier.cta.text}
      </BizButton>
    </div>
  );
}
