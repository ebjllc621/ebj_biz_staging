'use client';

/**
 * FeatureTipsPanel - Contextual tips display for media upload
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier ADVANCED
 * @phase Phase 2 - Universal Media Upload Modal
 *
 * Looks up FEATURE_TIPS by mediaType and renders a light info panel.
 * Returns null if no tip is found for the given mediaType.
 */

import { getFeatureTip } from '../config/feature-tips';

// ============================================================================
// TYPES
// ============================================================================

interface FeatureTipsPanelProps {
  /** Media type key (e.g. 'gallery', 'logo', 'cover') */
  mediaType: string;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// ICON
// ============================================================================

function InfoIcon() {
  return (
    <svg
      className="w-4 h-4 flex-shrink-0 text-blue-500 mt-0.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function FeatureTipsPanel({ mediaType, className = '' }: FeatureTipsPanelProps) {
  const tip = getFeatureTip(mediaType);

  if (!tip) return null;

  return (
    <div
      className={[
        'rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm',
        className,
      ].join(' ')}
      role="note"
      aria-label={tip.title}
    >
      {/* Title */}
      <div className="flex items-start gap-2 mb-2">
        <InfoIcon />
        <p className="font-semibold text-blue-800">{tip.title}</p>
      </div>

      {/* Tips list */}
      <ul className="space-y-1 pl-6 list-disc text-gray-700">
        {tip.tips.map((tipText, index) => (
          <li key={index}>{tipText}</li>
        ))}
      </ul>

      {/* SEO guidance + example */}
      <div className="mt-3 pt-3 border-t border-blue-200">
        <p className="text-xs text-blue-700">
          <span className="font-semibold">SEO tip: </span>
          {tip.seoGuidance}
        </p>
        <p className="text-xs text-blue-600 mt-1 italic">
          Example: &ldquo;{tip.exampleAltText}&rdquo;
        </p>
      </div>
    </div>
  );
}
