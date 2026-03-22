/**
 * FeatureSelectorGrid - Feature Selection Grid
 *
 * Displays a responsive 2-3 column grid of FeatureCards for all media features.
 * Used as the 'grid' view in MediaManagerLiteModal.
 *
 * @tier STANDARD
 * @phase Phase 5 - Media Manager Lite (User Dashboard)
 */

'use client';

import React from 'react';
import { FeatureCardFromSummary } from './FeatureCard';
import type { FeatureSummary, MediaFeatureKey } from '../types/media-manager-lite-types';

// ============================================================================
// TYPES
// ============================================================================

export interface FeatureSelectorGridProps {
  summaries: FeatureSummary[];
  onSelectFeature: (_key: MediaFeatureKey) => void;
  tier: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function FeatureSelectorGrid({
  summaries,
  onSelectFeature,
  tier
}: FeatureSelectorGridProps) {
  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 gap-3"
      role="list"
      aria-label="Media features"
    >
      {summaries.map((summary) => (
        <div key={summary.config.key} role="listitem">
          <FeatureCardFromSummary
            summary={summary}
            tier={tier}
            onClick={() => onSelectFeature(summary.config.key)}
          />
        </div>
      ))}
    </div>
  );
}

export default FeatureSelectorGrid;
