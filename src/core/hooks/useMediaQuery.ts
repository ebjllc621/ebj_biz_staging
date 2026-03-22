/**
 * useMediaQuery - SSR-safe media query hook for responsive design
 *
 * @tier STANDARD
 * @generated DNA v11.4.0 - Phase 7
 * @dna-version 11.4.0
 * @phase 7
 *
 * GOVERNANCE:
 * - SSR-safe implementation (no window access during render)
 * - Cleanup on unmount (prevents memory leaks)
 * - Performance optimized (direct matchMedia API)
 *
 * Features:
 * - SSR-safe (returns false on server, updates in useEffect)
 * - Event-driven updates (no polling)
 * - Automatic cleanup (removes event listeners)
 * - TypeScript strict mode compliant
 *
 * @example
 * ```tsx
 * const isMobile = useIsMobile();
 * const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
 * ```
 */

'use client';

import { useState, useEffect } from 'react';

/**
 * Custom hook for responsive state based on media query
 *
 * @param query - CSS media query string (e.g., '(max-width: 767px)')
 * @returns boolean indicating if media query matches
 *
 * @example
 * ```tsx
 * const isSmallScreen = useMediaQuery('(max-width: 640px)');
 * const isLandscape = useMediaQuery('(orientation: landscape)');
 * const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
 * ```
 */
export function useMediaQuery(query: string): boolean {
  // SSR-safe: Initialize with false, update in useEffect
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // SSR safety: Check for window
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);

    // Set initial state
    setMatches(mediaQuery.matches);

    // Event handler for media query changes
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Modern browsers use addEventListener
    mediaQuery.addEventListener('change', handler);

    // Cleanup function to prevent memory leaks
    return () => {
      mediaQuery.removeEventListener('change', handler);
    };
  }, [query]);

  return matches;
}

/**
 * Convenience hook for mobile detection
 *
 * @returns boolean - true if viewport is mobile (<768px)
 *
 * Mobile breakpoint: 767px (Tailwind's md breakpoint)
 * - Mobile: 0-767px
 * - Desktop: 768px+
 *
 * @example
 * ```tsx
 * const isMobile = useIsMobile();
 *
 * return (
 *   <div className={isMobile ? 'flex-col' : 'flex-row'}>
 *     {isMobile ? <MobileView /> : <DesktopView />}
 *   </div>
 * );
 * ```
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}

/**
 * Convenience hook for tablet detection
 *
 * @returns boolean - true if viewport is tablet (768px-1023px)
 *
 * @example
 * ```tsx
 * const isTablet = useIsTablet();
 * ```
 */
export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

/**
 * Convenience hook for desktop detection
 *
 * @returns boolean - true if viewport is desktop (≥1024px)
 *
 * @example
 * ```tsx
 * const isDesktop = useIsDesktop();
 * ```
 */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}
