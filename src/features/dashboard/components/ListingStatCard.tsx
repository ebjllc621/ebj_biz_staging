/**
 * ListingStatCard - Statistics Display Card for Listings
 *
 * @tier SIMPLE
 * @generated ComponentBuilder v3.0
 * @phase Phase 6 - Listing Manager Dashboard
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_6_BRAIN_PLAN.md
 * @reference src/features/dashboard/components/DashboardStatCard.tsx
 *
 * Extension of DashboardStatCard with:
 * - Yellow variant for ratings display
 * - Support for decimal values (e.g., "4.5" for average rating)
 */
'use client';

import React from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { ArrowUpRight } from 'lucide-react';

/** Color mode for KPI card display */
export type KpiColorMode = 'default' | 'option1' | 'option2' | 'option3' | 'option4';

export interface ListingStatCardProps {
  /** Card title */
  title: string;
  /** Numeric value to display (supports decimals) */
  value: number;
  /** Icon component from Lucide */
  icon: React.ComponentType<{ className?: string }>;
  /** Color variant */
  variant?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'yellow';
  /** Subtitle text (e.g., "this month") */
  subtitle?: string;
  /** Change indicator (e.g., "+12.5%") */
  change?: string;
  /** Change direction */
  changeDirection?: 'up' | 'down' | 'neutral';
  /** Link destination */
  href?: string;
  /** Number of decimal places to show (default: 0) */
  decimals?: number;
  /** Color mode override for card background/border (icons unchanged) */
  colorMode?: KpiColorMode;
}

const variantStyles = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    text: 'text-blue-900',
    border: 'border-blue-200'
  },
  green: {
    bg: 'bg-green-50',
    icon: 'text-green-600',
    text: 'text-green-900',
    border: 'border-green-200'
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'text-purple-600',
    text: 'text-purple-900',
    border: 'border-purple-200'
  },
  orange: {
    bg: 'bg-orange-50',
    icon: 'text-orange-600',
    text: 'text-orange-900',
    border: 'border-orange-200'
  },
  red: {
    bg: 'bg-red-50',
    icon: 'text-red-600',
    text: 'text-red-900',
    border: 'border-red-200'
  },
  yellow: {
    bg: 'bg-yellow-50',
    icon: 'text-yellow-600',
    text: 'text-yellow-900',
    border: 'border-yellow-200'
  }
};

/** Card background/border/text overrides per color mode (icons stay unchanged) */
const colorModeCardStyles: Record<KpiColorMode, { bg: string; border: string; text?: string } | null> = {
  default: null, // Use variant styles
  option1: { bg: 'bg-gray-100', border: 'border-gray-500', text: 'text-gray-800' },
  option2: { bg: 'bg-[#e8edf2]', border: 'border-[#002641]', text: 'text-[#002641]' },
  option3: { bg: 'bg-[#fdf0ec]', border: 'border-[#ed6437]', text: 'text-[#ed6437]' },
  option4: { bg: 'bg-[#e8edf2]', border: 'border-[#ed6437]', text: 'text-[#002641]' },
};

export function ListingStatCard({
  title,
  value,
  icon: Icon,
  variant = 'blue',
  subtitle,
  change,
  changeDirection = 'neutral',
  href,
  decimals = 0,
  colorMode = 'default'
}: ListingStatCardProps) {
  const styles = variantStyles[variant];
  const cardOverride = colorModeCardStyles[colorMode];

  // Card-level bg/border/text can be overridden; icon colors never change
  const cardBg = cardOverride?.bg ?? styles.bg;
  const cardBorder = cardOverride?.border ?? styles.border;
  const valueText = cardOverride?.text ?? styles.text;

  // Format value with specified decimals
  const formattedValue = decimals > 0
    ? value.toFixed(decimals)
    : value.toLocaleString();

  const content = (
    <div
      className={`
        relative px-3 py-3 rounded-xl border ${cardBorder} ${cardBg}
        transition-all duration-200
        ${href ? 'hover:shadow-md cursor-pointer' : ''}
      `}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg bg-white ${styles.border} border`}>
          <Icon className={`w-6 h-6 ${styles.icon}`} />
        </div>
        {href && (
          <ArrowUpRight className={`w-5 h-5 ${styles.icon} opacity-50`} />
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>

      {/* Value */}
      <p className={`text-3xl font-bold ${valueText} mb-2`}>
        {formattedValue}
      </p>

      {/* Footer */}
      {(change || subtitle) && (
        <div className="flex items-center gap-2 text-sm">
          {change && (
            <span
              className={`font-medium ${
                changeDirection === 'up'
                  ? 'text-green-600'
                  : changeDirection === 'down'
                  ? 'text-red-600'
                  : 'text-gray-600'
              }`}
            >
              {change}
            </span>
          )}
          {subtitle && <span className="text-gray-500">{subtitle}</span>}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href as Route}>
        {content}
      </Link>
    );
  }

  return content;
}

export default ListingStatCard;
