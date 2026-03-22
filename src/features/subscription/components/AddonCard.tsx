/**
 * AddonCard - Individual add-on suite display card
 *
 * Displays add-on information including features, pricing, and action button.
 * Supports 4 suite types: Creator, Realtor, Restaurant, Scribe SEO.
 *
 * @authority PHASE_5.5_BRAIN_PLAN.md - Add-On Management
 * @governance Build Map v2.1 ENHANCED compliance
 */

'use client';

import type { AddonSuite } from '@core/types/subscription';

export interface AddonCardProps {
  addon: AddonSuite;
  isActive: boolean;
  isPremium: boolean;
  onAdd: () => void;
  onRemove: () => void;
}

/**
 * AddonCard - Renders an individual add-on suite card
 *
 * @component
 * @param {AddonCardProps} props - Component props
 * @returns {JSX.Element} Rendered add-on card
 *
 * @example
 * ```tsx
 * <AddonCard
 *   addon={creatorSuite}
 *   isActive={false}
 *   isPremium={false}
 *   onAdd={handleAdd}
 *   onRemove={handleRemove}
 * />
 * ```
 */
export function AddonCard({ addon, isActive, isPremium, onAdd, onRemove }: AddonCardProps) {
  const isFreeForPremium = isPremium && addon.suite_name === 'seo_scribe';

  // Icon mapping (using emoji for simplicity - can be replaced with actual icons)
  const icons = {
    creator: '🎨',
    realtor: '🏠',
    restaurant: '🍽️',
    seo_scribe: '🔍'
  };

  const icon = icons[addon.suite_name] || '📦';

  const getPricingDisplay = (): string => {
    if (isFreeForPremium) {
      return 'FREE with Premium';
    }
    return addon.pricing_monthly
      ? `$${addon.pricing_monthly}/month`
      : 'FREE';
  };

  const getAnnualPricingDisplay = (): string | null => {
    if (isFreeForPremium || !addon.pricing_annual) {
      return null;
    }
    return `$${addon.pricing_annual}/year (Save 15%)`;
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-lg border-2 transition-all ${
        isActive ? 'border-green-500' : 'border-gray-200'
      }`}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start justify-between mb-3">
          <div className="text-4xl">{icon}</div>
          {isActive && (
            <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full border border-green-300">
              Active
            </span>
          )}
          {isFreeForPremium && !isActive && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full border border-blue-300">
              FREE for You
            </span>
          )}
        </div>

        <h3 className="text-xl font-bold mb-2">{addon.display_name}</h3>

        <div className="space-y-1">
          <p className="text-lg font-semibold text-gray-900">
            {getPricingDisplay()}
          </p>
          {getAnnualPricingDisplay() && (
            <p className="text-sm text-gray-600">{getAnnualPricingDisplay()}</p>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="p-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Features Included:</h4>
        <ul className="space-y-2">
          {addon.features.map((feature, index) => (
            <li key={index} className="flex items-start text-sm text-gray-700">
              <span className="text-green-600 mr-2 mt-0.5">✓</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Button */}
      <div className="p-6 pt-0">
        {isActive ? (
          <button
            onClick={onRemove}
            className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
          >
            Remove from Plan
          </button>
        ) : isFreeForPremium ? (
          <button
            onClick={onAdd}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Activate FREE Suite
          </button>
        ) : (
          <button
            onClick={onAdd}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
          >
            Add to Plan - {getPricingDisplay()}
          </button>
        )}
      </div>
    </div>
  );
}
