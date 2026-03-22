/**
 * AddOnShowcase - Add-on suites showcase section
 *
 * @tier STANDARD
 * @phase Phase 3 - Public Memberships Page
 */
'use client';

import { AddOnCard } from '../AddOnCard';
import { ADDON_DATA } from '../../constants/pricing-data';

interface AddOnShowcaseProps {
  billingPeriod: 'monthly' | 'annual';
}

export function AddOnShowcase({ billingPeriod }: AddOnShowcaseProps) {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-biz-navy mb-4">
            Supercharge Your Listing
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Add industry-specific tools and features to maximize your business potential.
          </p>
        </div>

        {/* Premium Callout */}
        <div className="bg-gradient-to-r from-[#022641] to-[#ed6437] text-white rounded-xl p-6 mb-12 text-center">
          <p className="text-lg font-semibold">
            💎 Premium members get 2 free add-on suites of their choice
          </p>
          <p className="text-sm mt-2 text-white/90">
            A value of up to $68/month included with your Premium subscription
          </p>
        </div>

        {/* Add-on Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {ADDON_DATA.map((addon) => (
            <AddOnCard
              key={addon.suite}
              addon={addon}
              billingPeriod={billingPeriod}
            />
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            Mix and match add-ons to create the perfect toolkit for your business.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Bundle discounts available: 15% off 2 suites, 25% off 3 suites, 30% off all 4
          </p>
        </div>
      </div>
    </section>
  );
}
