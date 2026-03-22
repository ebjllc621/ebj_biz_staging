/**
 * useAuthStateMonitor - Monitor Auth State Changes and Redirect on Logout
 *
 * @authority SESSION_EXPIRATION_REDIRECT_BRAIN_PLAN.md
 * @tier STANDARD
 * @governance React 18 hooks, Next.js 14 App Router
 *
 * PURPOSE:
 * - Detect when user transitions from authenticated to logged out
 * - Automatically redirect to home when on protected routes
 * - Revalidate session when tab becomes visible after idle
 * - Prevent sensitive data exposure after session expiration
 *
 * SECURITY:
 * - Addresses vulnerability where protected content remains visible after logout
 * - Ensures immediate redirect when session expires
 * - No flash of protected content during redirect
 *
 * USAGE:
 * ```tsx
 * // In ClientLayout or protected layout
 * useAuthStateMonitor({
 *   revalidateOnFocus: true,
 *   revalidateInterval: 5 * 60 * 1000, // 5 minutes
 * });
 * ```
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/core/context/AuthContext';
import { usePageVisibility } from './usePageVisibility';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UseAuthStateMonitorOptions {
  /** Routes that require authentication (regex patterns) */
  protectedRoutes?: RegExp[];
  /** URL to redirect to when logged out (default: '/') */
  redirectUrl?: string;
  /** Re-validate session when tab becomes visible (default: true) */
  revalidateOnFocus?: boolean;
  /** Minimum time between revalidations in ms (default: 30000) */
  revalidateThrottle?: number;
  /** Interval for periodic revalidation in ms (default: 0 = disabled) */
  revalidateInterval?: number;
}

export interface UseAuthStateMonitorReturn {
  /** Whether current route is protected */
  isProtectedRoute: boolean;
  /** Whether user is currently authenticated */
  isAuthenticated: boolean;
  /** Whether auth state is loading */
  isLoading: boolean;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

/**
 * Default protected route patterns
 * Matches /dashboard/*, /admin/*, /settings/*, /profile/*
 */
const DEFAULT_PROTECTED_ROUTES: RegExp[] = [
  /^\/dashboard(\/.*)?$/,
  /^\/admin(\/.*)?$/,
  /^\/settings(\/.*)?$/,
  /^\/profile(\/.*)?$/,
  /^\/my-listings(\/.*)?$/,
  /^\/my-events(\/.*)?$/,
  /^\/my-offers(\/.*)?$/,
];

const DEFAULT_REDIRECT_URL = '/';
const DEFAULT_REVALIDATE_THROTTLE = 30000; // 30 seconds

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * useAuthStateMonitor - Monitor authentication state and handle redirects
 *
 * Watches for auth state transitions and automatically redirects users
 * to the home page when they become logged out while on protected routes.
 *
 * @param options - Configuration options
 * @returns Auth monitoring state
 *
 * @example
 * ```tsx
 * function ProtectedLayout({ children }) {
 *   const { isAuthenticated, isLoading } = useAuthStateMonitor();
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (!isAuthenticated) return null; // Redirecting...
 *
 *   return <>{children}</>;
 * }
 * ```
 */
export function useAuthStateMonitor(
  options: UseAuthStateMonitorOptions = {}
): UseAuthStateMonitorReturn {
  const {
    protectedRoutes = DEFAULT_PROTECTED_ROUTES,
    redirectUrl = DEFAULT_REDIRECT_URL,
    revalidateOnFocus = true,
    revalidateThrottle = DEFAULT_REVALIDATE_THROTTLE,
    revalidateInterval = 0,
  } = options;

  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, refreshUser } = useAuth();
  const isVisible = usePageVisibility();

  // Track previous auth state to detect transitions
  const wasAuthenticated = useRef<boolean | null>(null);
  const lastRevalidation = useRef<number>(Date.now());
  const isRedirecting = useRef<boolean>(false);

  // ============================================================================
  // HELPER: Check if current route is protected
  // ============================================================================

  const isProtectedRoute = protectedRoutes.some(pattern => pattern.test(pathname));

  // ============================================================================
  // HELPER: Throttled revalidation
  // ============================================================================

  const throttledRefresh = useCallback(() => {
    const timeSinceLastCheck = Date.now() - lastRevalidation.current;

    if (timeSinceLastCheck >= revalidateThrottle) {
      lastRevalidation.current = Date.now();
      refreshUser();
    }
  }, [revalidateThrottle, refreshUser]);

  // ============================================================================
  // EFFECT: Monitor auth state transitions
  // ============================================================================

  useEffect(() => {
    // Skip during initial loading
    if (loading) return;

    // Prevent multiple redirects
    if (isRedirecting.current) return;

    const isAuthenticated = user !== null;

    // Detect logout transition: was authenticated → now not authenticated
    if (wasAuthenticated.current === true && !isAuthenticated && isProtectedRoute) {
      // User was logged in, now logged out, on protected route
      // Redirect to home immediately
      isRedirecting.current = true;
      router.replace(redirectUrl as Parameters<typeof router.replace>[0]);
    }

    // Detect initial unauthenticated visit to protected route
    // wasAuthenticated.current === null means this is the first auth check
    if (wasAuthenticated.current === null && !isAuthenticated && isProtectedRoute) {
      // User arrived at a protected route without being authenticated
      // Redirect to home immediately
      isRedirecting.current = true;
      router.replace(redirectUrl as Parameters<typeof router.replace>[0]);
    }

    // Update previous state
    wasAuthenticated.current = isAuthenticated;
  }, [user, loading, isProtectedRoute, router, redirectUrl]);

  // ============================================================================
  // EFFECT: Revalidate session when tab becomes visible
  // ============================================================================

  useEffect(() => {
    if (!revalidateOnFocus || !isProtectedRoute) return;

    // When tab becomes visible and user was authenticated, revalidate
    if (isVisible && wasAuthenticated.current === true) {
      throttledRefresh();
    }
  }, [isVisible, isProtectedRoute, revalidateOnFocus, throttledRefresh]);

  // ============================================================================
  // EFFECT: Optional interval-based revalidation
  // ============================================================================

  useEffect(() => {
    if (revalidateInterval <= 0 || !isProtectedRoute) return;

    const interval = setInterval(() => {
      if (wasAuthenticated.current === true) {
        lastRevalidation.current = Date.now();
        refreshUser();
      }
    }, revalidateInterval);

    return () => clearInterval(interval);
  }, [revalidateInterval, isProtectedRoute, refreshUser]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    isProtectedRoute,
    isAuthenticated: user !== null,
    isLoading: loading,
  };
}

export default useAuthStateMonitor;
