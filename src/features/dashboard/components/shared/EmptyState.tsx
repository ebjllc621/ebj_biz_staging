/**
 * EmptyState - Empty State Display
 *
 * @description Reusable empty state component with icon and message
 * @component Client Component
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Phase 8 - Features Section Pages
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_8_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - Orange theme for action button (#ed6437)
 * - Friendly, encouraging message
 */
'use client';

import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface EmptyStateProps {
  /** Icon component (from lucide-react) */
  icon: LucideIcon;
  /** Title message */
  title: string;
  /** Description message */
  description: string;
  /** Optional action button */
  action?: {
    /** Button label */
    label: string;
    /** Button click handler */
    onClick: () => void;
  };
  /** Optional children (replaces action button) */
  children?: ReactNode;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * EmptyState - Empty state display
 *
 * Provides consistent UI for empty states with optional action button.
 *
 * @param icon - Icon component
 * @param title - Title message
 * @param description - Description message
 * @param action - Optional action button
 * @param children - Optional children (custom action)
 * @returns Empty state display
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={Calendar}
 *   title="No Events Yet"
 *   description="Create your first event to get started"
 *   action={{
 *     label: "Create Event",
 *     onClick: () => setShowCreateModal(true)
 *   }}
 * />
 * ```
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  children
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {/* Icon */}
      <div className="bg-gray-100 rounded-full p-6 mb-4">
        <Icon className="w-12 h-12 text-gray-400" />
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {title}
      </h3>

      {/* Description */}
      <p className="text-gray-600 mb-6 max-w-md">
        {description}
      </p>

      {/* Action Button or Children */}
      {children || (action && (
        <button
          onClick={action.onClick}
          className="px-6 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors font-medium"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

export default EmptyState;
