/**
 * QualityIndicator - Visual indicator for connection request quality level
 *
 * @tier SIMPLE
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @phase Connect P2 Phase 3
 * @reference src/features/connections/components/IntentBadge.tsx - Pattern source
 *
 * GOVERNANCE:
 * - Client Component ('use client')
 * - Lucide icons only
 * - Tailwind CSS styling
 */

'use client';

import React from 'react';
import {
  Star,
  CircleDot,
  AlertCircle
} from 'lucide-react';

interface QualityIndicatorProps {
  level: 'high' | 'medium' | 'low';
  size?: 'sm' | 'md';
  showScore?: boolean;
  score?: number;
}

/**
 * Quality level configuration with icons and colors
 */
const QUALITY_CONFIG: Record<'high' | 'medium' | 'low', {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  textColor: string;
  borderColor: string;
}> = {
  high: {
    label: 'High Quality',
    icon: Star,
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    borderColor: 'border-green-200'
  },
  medium: {
    label: 'Standard',
    icon: CircleDot,
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200'
  },
  low: {
    label: 'Review',
    icon: AlertCircle,
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-500',
    borderColor: 'border-gray-200'
  }
};

/**
 * QualityIndicator component
 * Displays request quality level with icon and optional score
 */
export function QualityIndicator({
  level,
  size = 'sm',
  showScore = false,
  score
}: QualityIndicatorProps) {
  const config = QUALITY_CONFIG[level];
  const Icon = config.icon;
  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-0.5'
    : 'text-sm px-2.5 py-1';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full border font-medium
        ${config.bgColor} ${config.textColor} ${config.borderColor}
        ${sizeClasses}
      `}
      title={config.label}
    >
      <Icon className={iconSize} />
      <span>{config.label}</span>
      {showScore && score !== undefined && (
        <span className="ml-0.5">({score})</span>
      )}
    </span>
  );
}

/**
 * Export quality configuration for use in other components
 */
export { QUALITY_CONFIG };
export default QualityIndicator;
