/**
 * DashboardSidebarSection - Collapsible Sidebar Section Wrapper
 *
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Phase 1 - Dual-Section Sidebar Foundation
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_1_BRAIN_PLAN.md
 *
 * GOVERNANCE COMPLIANCE:
 * - Client component with ErrorBoundary wrapper
 * - Smooth expand/collapse animation (300ms ease-in-out)
 * - Auto-scroll to section on expand (after initial mount)
 * - Chevron rotation on expand
 * - Variant theming (personal = blue, listing-manager = orange)
 * - Lucide React icons only
 *
 * Features:
 * - Collapsible section with header
 * - Smooth expand/collapse animations
 * - Auto-scroll behavior
 * - Variant-based color theming
 * - Responsive to collapsed sidebar state
 */

'use client';

import { type ReactNode, useRef, useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type SidebarSectionVariant = 'personal' | 'listing-manager';

export interface DashboardSidebarSectionProps {
  /** Unique section identifier */
  id: string;
  /** Section title */
  title: string;
  /** Whether section is expanded */
  isExpanded: boolean;
  /** Section variant for theming */
  variant: SidebarSectionVariant;
  /** Toggle section callback */
  onToggle: () => void;
  /** Section content */
  children: ReactNode;
  /** Whether sidebar is collapsed (desktop only) */
  isCollapsed?: boolean;
}

// ============================================================================
// VARIANT THEME CONFIGURATION
// ============================================================================
// Variant prop determines the section's identity color
// Section titles should maintain their identity color regardless of active route theme

const variantColors: Record<SidebarSectionVariant, string> = {
  personal: '#1e40af',         // blue-800 - Personal always darker blue
  'listing-manager': '#ed6437' // Bizconekt orange - Listing Manager always orange
};

// ============================================================================
// COMPONENT
// ============================================================================

function DashboardSidebarSectionContent({
  id,
  title,
  isExpanded,
  variant,
  onToggle,
  children,
  isCollapsed = false
}: DashboardSidebarSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  // Track previous expanded state to detect user-initiated expansions
  const prevExpandedRef = useRef<boolean | null>(null);
  const [isUserToggle, setIsUserToggle] = useState(false);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Detect when isExpanded changes from false to true (user click)
  // Don't scroll on initial mount even if expanded by default
  useEffect(() => {
    // Skip the very first render (initial mount)
    if (prevExpandedRef.current === null) {
      prevExpandedRef.current = isExpanded;
      return;
    }

    // Detect user-initiated expansion (false -> true)
    if (isExpanded && !prevExpandedRef.current) {
      setIsUserToggle(true);
    }

    prevExpandedRef.current = isExpanded;
  }, [isExpanded]);

  // Auto-scroll to section only when user clicks to expand (not on initial load)
  useEffect(() => {
    if (isExpanded && isUserToggle && sectionRef.current) {
      // Delay to allow collapse/expand animations to complete
      const timer = setTimeout(() => {
        const scrollableParent = sectionRef.current?.closest('.overflow-y-auto') as HTMLElement | null;

        if (scrollableParent && sectionRef.current) {
          // Scroll to show section at top of sidebar
          scrollableParent.scrollTo({
            top: sectionRef.current.offsetTop - 16, // 16px offset for spacing
            behavior: 'smooth'
          });
        }
        // Reset the flag after scrolling
        setIsUserToggle(false);
      }, 150); // Wait for animation to complete

      return () => clearTimeout(timer);
    }
  }, [isExpanded, isUserToggle]);

  // ============================================================================
  // RENDER
  // ============================================================================

  // When collapsed (desktop only), only show children for the expanded section
  if (isCollapsed) {
    if (!isExpanded) return null;
    return (
      <div ref={sectionRef} className="space-y-1">
        {children}
      </div>
    );
  }

  return (
    <div ref={sectionRef} className="border-b border-gray-200 last:border-0">
      {/* Section Header */}
      <button
        onClick={onToggle}
        className="w-full px-3 py-3 flex items-center justify-between text-left font-semibold transition-colors hover:bg-gray-50"
        style={{ color: variantColors[variant] }}
        aria-expanded={isExpanded}
        aria-controls={`section-${id}`}
      >
        <span className="text-sm uppercase tracking-wider">{title}</span>

        {/* Chevron Icon */}
        <ChevronDown
          className={`
            w-5 h-5 transition-transform duration-300 ease-in-out
            ${isExpanded ? 'rotate-180' : ''}
          `}
          aria-hidden="true"
        />
      </button>

      {/* Section Content with smooth transition */}
      <div
        id={`section-${id}`}
        className={`
          transition-all duration-300 ease-in-out overflow-hidden
          ${isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}
        `}
        aria-hidden={!isExpanded}
      >
        <div className="py-2">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * DashboardSidebarSection - Wrapped with ErrorBoundary (STANDARD tier requirement)
 *
 * @example
 * ```tsx
 * <DashboardSidebarSection
 *   id="personal"
 *   title="Personal"
 *   isExpanded={personalExpanded}
 *   variant="personal"
 *   onToggle={togglePersonalSection}
 * >
 *   <MenuItems />
 * </DashboardSidebarSection>
 * ```
 */
export function DashboardSidebarSection(props: DashboardSidebarSectionProps) {
  return (
    <ErrorBoundary componentName="DashboardSidebarSection">
      <DashboardSidebarSectionContent {...props} />
    </ErrorBoundary>
  );
}

export default DashboardSidebarSection;
