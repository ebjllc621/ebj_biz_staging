/**
 * SEOHealthBadge - Per-file SEO status indicator dot
 *
 * - Green: both altText AND titleText present ("SEO Complete")
 * - Yellow: altText present but no titleText ("Missing Title")
 * - Red: no altText ("Missing Alt Text")
 *
 * @tier SIMPLE
 * @phase Phase 4B - Batch Operations + SEO + Context Menus
 */

'use client';

import { memo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface SEOHealthBadgeProps {
  altText?: string;
  titleText?: string;
  size?: 'sm' | 'md';
}

// ============================================================================
// COMPONENT
// ============================================================================

export const SEOHealthBadge = memo(function SEOHealthBadge({
  altText,
  titleText,
  size = 'sm',
}: SEOHealthBadgeProps) {
  const hasAlt = !!(altText && altText.trim());
  const hasTitle = !!(titleText && titleText.trim());

  let colorClass: string;
  let label: string;

  if (hasAlt && hasTitle) {
    colorClass = 'bg-green-500';
    label = 'SEO Complete';
  } else if (hasAlt && !hasTitle) {
    colorClass = 'bg-yellow-400';
    label = 'Missing Title';
  } else {
    colorClass = 'bg-red-500';
    label = 'Missing Alt Text';
  }

  const sizeClass = size === 'md' ? 'w-3 h-3' : 'w-2 h-2';

  return (
    <span
      className={`inline-block rounded-full flex-shrink-0 ${sizeClass} ${colorClass}`}
      title={label}
      aria-label={label}
    />
  );
});

export default SEOHealthBadge;
