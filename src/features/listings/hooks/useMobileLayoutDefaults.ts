/**
 * useMobileLayoutDefaults - Mobile Layout Detection Hook
 *
 * Detects mobile viewport and provides default layout behavior
 *
 * @tier STANDARD
 * @phase Phase 8 - Mobile Optimization
 * @generated DNA v11.4.0
 */

'use client';

import { useState, useEffect } from 'react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UseMobileLayoutDefaultsOptions {
  /** Viewport breakpoint for mobile detection (default: 1024px - lg breakpoint) */
  breakpoint?: number;
}

export interface UseMobileLayoutDefaultsReturn {
  /** Whether viewport is mobile */
  isMobile: boolean;
  /** Whether sections should default to collapsed */
  defaultCollapsed: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * useMobileLayoutDefaults - Detect mobile and set layout defaults
 *
 * Detects viewport size and provides mobile-specific layout defaults.
 * Sections collapsed by default on mobile to improve UX.
 *
 * @example
 * ```tsx
 * const { isMobile, defaultCollapsed } = useMobileLayoutDefaults();
 *
 * // Use in component
 * const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
 * ```
 */
export function useMobileLayoutDefaults({
  breakpoint = 1024 // lg breakpoint
}: UseMobileLayoutDefaultsOptions = {}): UseMobileLayoutDefaultsReturn {
  const [isMobile, setIsMobile] = useState(false);
  const [defaultCollapsed, setDefaultCollapsed] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < breakpoint;
      setIsMobile(mobile);
      setDefaultCollapsed(mobile); // Collapsed on mobile, expanded on desktop
    };

    // Initial check
    checkMobile();

    // Listen for resize
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return { isMobile, defaultCollapsed };
}

export default useMobileLayoutDefaults;
