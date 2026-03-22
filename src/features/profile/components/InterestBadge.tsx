/**
 * InterestBadge - Unified badge component for category and custom interests
 *
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @authority docs/pages/layouts/userProfile/phases/PHASE_3B_BRAIN_PLAN.md
 *
 * GOVERNANCE COMPLIANCE:
 * - Client component ('use client' directive)
 * - Lucide React icons only
 * - Tailwind CSS styling
 * - Orange badges for category interests (#ed6437)
 * - Navy blue badges for custom interests (#022641)
 */

'use client';

import { X } from 'lucide-react';

export type InterestBadgeType = 'category' | 'custom';

export interface InterestBadgeProps {
  /** Unique interest ID */
  id: number;
  /** Display label */
  label: string;
  /** Interest type (determines badge color) */
  type: InterestBadgeType;
  /** Delete handler */
  onDelete: (_id: number) => void;
  /** Whether the badge is disabled during operations */
  disabled?: boolean;
}

export function InterestBadge({
  id,
  label,
  type,
  onDelete,
  disabled = false
}: InterestBadgeProps) {
  // Color scheme based on interest type
  const colorClasses = type === 'category'
    ? 'bg-[#ed6437] text-white hover:bg-[#d95630]'  // Orange for category
    : 'bg-[#022641] text-white hover:bg-[#033a5c]'; // Navy blue for custom

  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors ${colorClasses}`}
    >
      {label}
      <button
        type="button"
        onClick={() => onDelete(id)}
        disabled={disabled}
        className="text-white hover:text-gray-200 ml-1 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={`Remove ${label}`}
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

export default InterestBadge;
