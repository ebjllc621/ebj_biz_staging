/**
 * TierCard - Individual Tier Selection Card
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier ENTERPRISE
 * @phase Phase 2 - Section 1 Membership
 */

'use client';

import type { ListingTier } from '../../../types/listing-form.types';
import { TIER_FEATURES } from '../constants';

interface TierCardProps {
  tier: {
    id: number;
    name: string;
    tier: ListingTier;
    pricingMonthly: number;
    pricingAnnual: number;
  };
  isSelected: boolean;
  onChange: () => void;
  isPopular?: boolean;
}

export function TierCard({ tier, isSelected, onChange, isPopular }: TierCardProps) {
  const features = TIER_FEATURES[tier.tier];

  return (
    <div
      role="radio"
      aria-checked={isSelected}
      aria-labelledby={`tier-${tier.tier}-label`}
      tabIndex={0}
      onClick={onChange}
      onKeyDown={(e) => e.key === ' ' && onChange()}
      className={`
        relative cursor-pointer rounded-lg border-2 p-4 transition-all
        ${isSelected
          ? 'border-[#ed6437] bg-orange-50'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }
      `}
    >
      {/* Popular Badge */}
      {isPopular && (
        <span className="absolute -top-3 left-4 bg-[#ed6437] text-white text-xs px-2 py-1 rounded">
          Most Popular
        </span>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <input
          type="radio"
          checked={isSelected}
          onChange={onChange}
          className="h-4 w-4 text-[#ed6437] focus:ring-[#ed6437]"
          tabIndex={-1}
        />
        <span id={`tier-${tier.tier}-label`} className="font-semibold text-[#022641]">
          {tier.name.replace(' FREE', '')}
        </span>
      </div>

      {/* Pricing - consistent height for visual balance */}
      <div className="h-10 flex flex-col justify-center">
        <span className="text-base font-bold text-[#022641]">
          {tier.pricingMonthly === 0 ? 'FREE' : `$${tier.pricingMonthly}/mo`}
        </span>
        {tier.pricingMonthly > 0 && (
          <p className="text-xs text-green-600 font-medium">
            Save 15% with annual billing
          </p>
        )}
      </div>

      {/* Features */}
      <ul className="mt-3 space-y-1.5">
        {features.slice(0, 4).map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
            <svg className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {/* See Details Link */}
      <button
        type="button"
        className="mt-3 text-sm text-[#ed6437] hover:underline"
        onClick={(e) => {
          e.stopPropagation();
          // Phase 2: Link to /pricing or open details modal
          console.log('See details for tier:', tier.tier);
        }}
      >
        See all details...
      </button>
    </div>
  );
}
