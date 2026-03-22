/**
 * RouteGuard - Route Protection Component
 *
 * @authority PHASE_2.3_BRAIN_PLAN.md Task 2.4.4
 * @governance Build Map v2.1 ENHANCED - Client component patterns
 * @governance Role-based access control (7-tier system)
 * @see .cursor/rules/react18-nextjs14-governance.mdc for client component standards
 *
 * PURPOSE:
 * - Protect routes by authentication status
 * - Enforce role-based access control
 * - Handle loading states during auth checks
 * - Redirect unauthorized users
 * - Prevent flash of protected content
 *
 * USAGE:
 * ```tsx
 * // Protect admin page
 * <RouteGuard requireAuth requiredRoles={['admin']}>
 *   <AdminDashboard />
 * </RouteGuard>
 *
 * // Protect user profile page
 * <RouteGuard requireAuth>
 *   <UserProfile />
 * </RouteGuard>
 *
 * // Require specific roles
 * <RouteGuard requireAuth requiredRoles={['preferred', 'premium', 'admin']}>
 *   <PremiumFeature />
 * </RouteGuard>
 * ```
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use useAuth hook for state
 * - MUST handle loading states properly
 * - MUST prevent flash of protected content
 * - MUST support 7-tier role system
 */
'use client';

import { useAuth } from '@/core/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';

/**
 * RouteGuard component props
 */
export interface RouteGuardProps {
  /** Content to protect */
  children: ReactNode;
  /** Whether authentication is required (default: true) */
  requireAuth?: boolean;
  /** Required roles for access (empty = any authenticated user) */
  requiredRoles?: string[];
  /** URL to redirect to if unauthorized (default: /login) */
  fallbackUrl?: string;
  /** Custom loading component */
  loadingComponent?: ReactNode;
  /** Custom unauthorized component (shown instead of redirect) */
  unauthorizedComponent?: ReactNode;
}

/**
 * Default loading component
 */
function DefaultLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Default unauthorized component
 */
function DefaultUnauthorized() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center max-w-md p-8">
        <h1 className="text-4xl font-bold text-red-600 mb-4">403</h1>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Access Denied</h2>
        <p className="text-gray-600 mb-6">
          You do not have permission to access this page.
        </p>
        <a
          href="/"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Return Home
        </a>
      </div>
    </div>
  );
}

/**
 * RouteGuard Component
 *
 * Protects routes based on authentication status and user roles.
 * Handles loading states and redirects for unauthorized access.
 *
 * @param props - RouteGuard configuration
 * @returns Protected content or loading/unauthorized state
 *
 * @example
 * ```tsx
 * // Protect admin dashboard
 * <RouteGuard requireAuth requiredRoles={['admin']}>
 *   <AdminDashboard />
 * </RouteGuard>
 *
 * // Any authenticated user
 * <RouteGuard requireAuth>
 *   <UserProfile />
 * </RouteGuard>
 *
 * // Multiple accepted roles
 * <RouteGuard requireAuth requiredRoles={['preferred', 'premium', 'admin']}>
 *   <PremiumContent />
 * </RouteGuard>
 *
 * // Custom loading
 * <RouteGuard requireAuth loadingComponent={<CustomSpinner />}>
 *   <ProtectedContent />
 * </RouteGuard>
 * ```
 */
export function RouteGuard({
  children,
  requireAuth = true,
  requiredRoles = [],
  fallbackUrl = '/login',
  loadingComponent,
  unauthorizedComponent
}: RouteGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for auth check to complete
    if (loading) return;

    // Check authentication requirement
    if (requireAuth && !user) {
      // User must be logged in but isn't
      router.push(fallbackUrl as any);
      return;
    }

    // Check role requirements
    if (requiredRoles.length > 0 && user) {
      const hasRequiredRole = requiredRoles.includes(user.role);
      if (!hasRequiredRole) {
        // User doesn't have required role
        if (unauthorizedComponent) {
          // Show custom unauthorized component (handled below)
          return;
        } else {
          // Redirect to unauthorized page
          router.push('/unauthorized' as any);
          return;
        }
      }
    }
  }, [user, loading, requireAuth, requiredRoles, router, fallbackUrl, unauthorizedComponent]);

  // Show loading state during auth check
  if (loading) {
    return <>{loadingComponent || <DefaultLoading />}</>;
  }

  // Check authentication
  if (requireAuth && !user) {
    // Prevent flash of protected content while redirecting
    return null;
  }

  // Check roles
  if (requiredRoles.length > 0 && user) {
    const hasRequiredRole = requiredRoles.includes(user.role);
    if (!hasRequiredRole) {
      // Show unauthorized component or null (while redirecting)
      return <>{unauthorizedComponent || <DefaultUnauthorized />}</>;
    }
  }

  // All checks passed - render protected content
  return <>{children}</>;
}

/**
 * Convenience wrapper for admin-only routes
 */
export function AdminGuard({ children }: { children: ReactNode }) {
  return (
    <RouteGuard requireAuth requiredRoles={['admin']}>
      {children}
    </RouteGuard>
  );
}

/**
 * Convenience wrapper for premium-tier routes
 */
export function PremiumGuard({ children }: { children: ReactNode }) {
  return (
    <RouteGuard requireAuth requiredRoles={['preferred', 'premium', 'admin']}>
      {children}
    </RouteGuard>
  );
}

/**
 * Convenience wrapper for creator routes
 */
export function CreatorGuard({ children }: { children: ReactNode }) {
  return (
    <RouteGuard requireAuth requiredRoles={['creator', 'preferred', 'premium', 'admin']}>
      {children}
    </RouteGuard>
  );
}

/**
 * Convenience wrapper for authenticated routes (any role)
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  return (
    <RouteGuard requireAuth>
      {children}
    </RouteGuard>
  );
}

/**
 * Default export
 */
export default RouteGuard;
