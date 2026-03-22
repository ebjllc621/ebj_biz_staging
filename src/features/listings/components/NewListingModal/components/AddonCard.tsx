/**
 * AddonCard - Individual Addon Selection Card
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier ENTERPRISE
 * @phase Phase 2 - Section 1 Membership
 */

'use client';

import type { AddonSuite } from '../../../types/listing-form.types';
import { ADDON_FEATURES } from '../constants';

interface AddonCardProps {
  addon: {
    id: number;
    suiteName: AddonSuite;
    displayName: string;
    pricingMonthly: number;
    pricingAnnual: number;
  };
  isSelected: boolean;
  onToggle: () => void;
  isFree?: boolean;
}

const ADDON_ICONS: Record<AddonSuite, React.ReactNode> = {
  creator: (
    <svg className="w-5 h-5 text-[#ed6437]" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
    </svg>
  ),
  realtor: (
    <svg className="w-5 h-5 text-[#ed6437]" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7z" clipRule="evenodd" />
    </svg>
  ),
  restaurant: (
    <svg className="w-5 h-5 text-[#ed6437]" fill="currentColor" viewBox="0 0 20 20">
      <path d="M3.75 3a.75.75 0 01.75.75v5.5a.75.75 0 01-1.5 0v-5.5A.75.75 0 013.75 3zM6.75 3a.75.75 0 01.75.75v5.5a.75.75 0 01-1.5 0v-5.5A.75.75 0 016.75 3zM5.25 10.5a.75.75 0 01.75.75v5a.75.75 0 01-1.5 0v-5a.75.75 0 01.75-.75zM16.5 3a.75.75 0 01.75.75V7.5a3 3 0 01-3 3h-.75v5.75a.75.75 0 01-1.5 0V3.75a.75.75 0 011.5 0V7.5a1.5 1.5 0 001.5 1.5h.75V3.75A.75.75 0 0116.5 3z" />
    </svg>
  ),
  seo_scribe: (
    <svg className="w-5 h-5 text-[#ed6437]" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  )
};

export function AddonCard({ addon, isSelected, onToggle, isFree }: AddonCardProps) {
  const addonInfo = ADDON_FEATURES[addon.suiteName];

  return (
    <div
      role="checkbox"
      aria-checked={isSelected}
      aria-labelledby={`addon-${addon.suiteName}-label`}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => e.key === ' ' && onToggle()}
      className={`
        cursor-pointer rounded-lg border p-4 transition-all
        ${isSelected
          ? 'border-[#ed6437] bg-orange-50'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }
      `}
    >
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="mt-1 h-4 w-4 rounded text-[#ed6437] focus:ring-[#ed6437]"
          tabIndex={-1}
        />

        {/* Icon */}
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 flex-shrink-0">
          {ADDON_ICONS[addon.suiteName]}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span id={`addon-${addon.suiteName}-label`} className="font-semibold text-[#022641]">
              {addon.displayName}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded ${addonInfo.tagColor}`}>
              {addonInfo.tag}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600">{addonInfo.description}</p>

          {/* Features */}
          <ul className="mt-2 space-y-1">
            {addonInfo.features.slice(0, 2).map((feature, idx) => (
              <li key={idx} className="flex items-center gap-2 text-xs text-gray-500">
                <svg className="h-3 w-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="mt-2 text-xs text-[#ed6437] hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              console.log('See details for addon:', addon.suiteName);
            }}
          >
            See all details...
          </button>
        </div>

        {/* Price */}
        <div className="text-right flex-shrink-0">
          {isFree ? (
            <span className="text-green-600 font-semibold">FREE</span>
          ) : (
            <span className="text-sm font-medium text-[#022641]">
              ${addon.pricingMonthly}/mo
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
