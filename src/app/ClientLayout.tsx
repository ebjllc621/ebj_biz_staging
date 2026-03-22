/**
 * ClientLayout - Client Boundary Wrapper with Auth Context
 *
 * @description Establishes proper client/server boundary for App Router
 * @component Client Component (uses hooks, requires client runtime)
 * @architecture Build Map v2.1 ENHANCED - App Router client boundary pattern
 * @see .cursor/rules/react18-nextjs14-governance.mdc for client component standards
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST wrap all client components (SiteHeader, SiteFooter)
 * - MUST provide Context Providers at this level
 * - MUST NOT use server-only features (DB, file system)
 *
 * ADMIN LAYOUT HANDLING:
 * - Admin routes (/admin/*) render full-width without SiteHeader/SiteFooter
 * - AdminShell provides its own navigation and layout
 * - AuthProvider still wraps admin for auth context access
 *
 * SESSION SECURITY:
 * - AuthStateMonitor detects session expiration on protected routes
 * - Automatically redirects to home when user becomes logged out
 * - Revalidates session when tab becomes visible after idle
 */
'use client';

import { ReactNode, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ScrollToTop from '@/components/ScrollToTop';
import { AuthProvider } from '@/core/context/AuthContext';
import { useAuthStateMonitor } from '@/core/hooks/useAuthStateMonitor';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';

interface ClientLayoutProps {
  children: ReactNode;
}

// ============================================================================
// AUTH STATE MONITOR WRAPPER
// ============================================================================

/**
 * AuthStateMonitorWrapper - Monitors auth state changes inside AuthProvider
 *
 * Must be inside AuthProvider to access auth context.
 * Handles session expiration redirect for protected routes.
 */
function AuthStateMonitorWrapper({ children }: { children: ReactNode }) {
  // Monitor auth state changes and redirect on logout from protected routes
  useAuthStateMonitor({
    revalidateOnFocus: true,
    revalidateThrottle: 30000, // 30 seconds minimum between checks
  });

  return <>{children}</>;
}

/**
 * ClientLayout Component
 *
 * Creates client boundary wrapper with Context Providers.
 * AuthProvider ensures single source of truth for authentication state.
 *
 * Admin routes bypass SiteHeader/SiteFooter and container constraint
 * to allow AdminShell to render full-width.
 *
 * @param children - Page content (can be Server or Client components)
 * @returns Wrapped layout with providers and client components
 */
export default function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');

  // Admin routes: Full-width, no site header/footer (AdminShell handles layout)
  // Note: Admin routes don't track page views to avoid inflating analytics
  if (isAdminRoute) {
    return (
      <AuthProvider>
        <AuthStateMonitorWrapper>
          {children}
        </AuthStateMonitorWrapper>
      </AuthProvider>
    );
  }

  // Public routes: Standard layout with header, footer, container, and analytics
  return (
    <AuthProvider>
      <AuthStateMonitorWrapper>
        {/* Page View Tracking - wrapped in Suspense for useSearchParams */}
        <Suspense fallback={null}>
          <PageViewTracker />
        </Suspense>
        <SiteHeader />
        <main id="main" className="container" role="main">
          {children}
        </main>
        <SiteFooter />
        <ScrollToTop />
      </AuthStateMonitorWrapper>
    </AuthProvider>
  );
}
