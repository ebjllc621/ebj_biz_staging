/**
 * FeatureCard - Media Feature Selection Card
 *
 * Displays a clickable card for a media feature showing:
 * - Feature icon
 * - Feature label and description
 * - Current count / max count badge
 * - SEO health dot (when applicable)
 * - Disabled state for locked tiers
 *
 * @tier STANDARD
 * @phase Phase 5 - Media Manager Lite (User Dashboard)
 */

'use client';

import React from 'react';
import {
  Image as ImageIcon,
  CircleUser,
  Film,
  Paperclip,
  Lock
} from 'lucide-react';
import type { FeatureConfig, FeatureSummary } from '../types/media-manager-lite-types';

// ============================================================================
// TYPES
// ============================================================================

export interface FeatureCardProps {
  config: FeatureConfig;
  currentCount: number;
  maxCount: number;
  seoCompleteCount: number;
  seoTotalCount: number;
  onClick: () => void;
  disabled?: boolean;
}

// ============================================================================
// ICON MAP
// ============================================================================

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Image: ImageIcon,
  CircleUser,
  Film,
  Paperclip,
};

// We can't import Panorama from lucide-react (it doesn't exist). Use a fallback.
function PanoramaFallback({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 20.25h18A1.5 1.5 0 0022.5 18.75V5.25A1.5 1.5 0 0021 3.75H3A1.5 1.5 0 001.5 5.25v13.5A1.5 1.5 0 003 20.25z" />
    </svg>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getCountBadgeColor(current: number, max: number): string {
  if (max === 0) return 'bg-gray-100 text-gray-500';
  const pct = (current / max) * 100;
  if (current >= max) return 'bg-red-100 text-red-700';
  if (pct >= 80) return 'bg-amber-100 text-amber-700';
  return 'bg-green-100 text-green-700';
}

function getSEODotColor(completeCount: number, totalCount: number): string | null {
  if (totalCount === 0) return null;
  const pct = (completeCount / totalCount) * 100;
  if (pct === 100) return 'bg-green-500';
  if (pct >= 50) return 'bg-yellow-400';
  return 'bg-red-500';
}

// ============================================================================
// COMPONENT
// ============================================================================

export function FeatureCard({
  config,
  currentCount,
  maxCount,
  seoCompleteCount,
  seoTotalCount,
  onClick,
  disabled = false
}: FeatureCardProps) {
  const IconComponent = ICON_MAP[config.icon] ?? (config.icon === 'Panorama' ? PanoramaFallback : ImageIcon);
  const countBadgeColor = getCountBadgeColor(currentCount, maxCount);
  const seoDotColor = getSEODotColor(seoCompleteCount, seoTotalCount);

  const handleClick = () => {
    if (!disabled) onClick();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={[
        'relative p-4 rounded-xl border transition-all duration-200 select-none',
        disabled
          ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
          : 'border-gray-200 bg-white cursor-pointer hover:border-[#ed6437] hover:shadow-md hover:bg-orange-50'
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={[
          'flex-shrink-0 p-2 rounded-lg',
          disabled ? 'bg-gray-100' : 'bg-orange-50 border border-orange-100'
        ].join(' ')}>
          {disabled ? (
            <Lock className="w-5 h-5 text-gray-400" />
          ) : (
            <IconComponent className="w-5 h-5 text-[#ed6437]" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 text-sm truncate">
              {config.label}
            </h3>

            {/* SEO health dot */}
            {seoDotColor && (
              <span
                className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${seoDotColor}`}
                title={`SEO: ${seoCompleteCount}/${seoTotalCount} complete`}
                aria-label={`SEO health: ${seoCompleteCount} of ${seoTotalCount} items complete`}
              />
            )}
          </div>

          <p className="text-xs text-gray-500 mb-2 line-clamp-1">
            {disabled ? 'Upgrade to unlock' : config.description}
          </p>

          {/* Count badge */}
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${countBadgeColor}`}>
            {disabled ? 'Locked' : `${currentCount} / ${maxCount}`}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Build FeatureCard from a FeatureSummary
 */
export function FeatureCardFromSummary({
  summary,
  tier,
  onClick
}: {
  summary: FeatureSummary;
  tier: string;
  onClick: () => void;
}) {
  const { config, currentCount, maxCount, seoCompleteCount, seoTotalCount } = summary;
  const tierLimit = config.tierLimits[tier] ?? config.tierLimits['essentials'] ?? 0;
  const disabled = tierLimit === 0;

  return (
    <FeatureCard
      config={config}
      currentCount={currentCount}
      maxCount={maxCount}
      seoCompleteCount={seoCompleteCount}
      seoTotalCount={seoTotalCount}
      onClick={onClick}
      disabled={disabled}
    />
  );
}

export default FeatureCard;
