/**
 * TierComparisonSection - Main tier comparison cards section
 *
 * @tier STANDARD
 * @phase Phase 3 - Public Memberships Page
 */
'use client';

import { PricingToggle } from '../PricingToggle';
import { TierCard } from '../TierCard';
import { TIER_DATA } from '../../constants/pricing-data';

interface TierComparisonSectionProps {
  billingPeriod: 'monthly' | 'annual';
  onBillingPeriodChange: (period: 'monthly' | 'annual') => void;
  onSelectTier: (tier: string) => void;
}

export function TierComparisonSection({
  billingPeriod,
  onBillingPeriodChange,
  onSelectTier
}: TierComparisonSectionProps) {
  return (
    <section id="tier-comparison" className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-biz-navy mb-4">
            Choose Your Plan
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Whether you're just starting out or running a thriving business, we have a plan that fits your needs.
          </p>
        </div>

        {/* Pricing Toggle */}
        <PricingToggle
          value={billingPeriod}
          onChange={onBillingPeriodChange}
          savingsText="Save 17%"
        />

        {/* Tier Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {TIER_DATA.map((tier) => (
            <TierCard
              key={tier.tier}
              tier={tier}
              billingPeriod={billingPeriod}
              onSelect={() => onSelectTier(tier.tier)}
            />
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            All plans include secure hosting, SSL certificate, and 99.9% uptime guarantee.
          </p>
        </div>
      </div>
    </section>
  );
}
