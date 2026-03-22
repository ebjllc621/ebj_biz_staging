/**
 * SidebarFeatureCard - Wrapper for sidebar feature content
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 5 - Right Sidebar Management
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Consistent card styling for sidebar features
 * - Optional header with title and description
 * - Flexible children rendering
 * - Tailwind-based responsive design
 *
 * @see docs/pages/layouts/listings/details/detailspageenhance/phases/PHASE_5_BRAIN_PLAN.md
 */

'use client';

import type { ReactNode } from 'react';

export interface SidebarFeatureCardProps {
  /** Optional title for the feature */
  title?: string;
  /** Optional description text */
  description?: string;
  /** Feature content to render */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the header section */
  showHeader?: boolean;
}

/**
 * SidebarFeatureCard Component
 *
 * Provides a consistent wrapper for sidebar feature content with optional
 * header, title, and description. Used by SidebarLayoutManager to render
 * individual features.
 *
 * @param title - Optional feature title
 * @param description - Optional feature description
 * @param children - Feature content
 * @param className - Additional CSS classes
 * @param showHeader - Whether to display the header (default: true)
 * @returns Styled card wrapper for sidebar features
 *
 * @example
 * ```tsx
 * <SidebarFeatureCard title="Map" description="Location and directions">
 *   <MapComponent />
 * </SidebarFeatureCard>
 * ```
 */
export function SidebarFeatureCard({
  title,
  description,
  children,
  className = '',
  showHeader = true
}: SidebarFeatureCardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-sm overflow-hidden ${className}`}>
      {showHeader && title && (
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {description && (
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          )}
        </div>
      )}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

export default SidebarFeatureCard;
