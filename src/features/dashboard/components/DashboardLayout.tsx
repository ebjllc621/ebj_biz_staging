/**
 * DashboardLayout - Main Layout Wrapper for User Dashboard Pages
 *
 * @tier ADVANCED
 * @generated DNA v11.4.0
 * @dna-version 11.4.0
 * @authority docs/pages/layouts/home/user/phases/PHASE_1_BRAIN_PLAN.md
 *
 * GOVERNANCE COMPLIANCE:
 * - Client component with ErrorBoundary wrapper
 * - useCallback for handlers passed to children
 * - Mobile responsive (hamburger menu)
 * - Circuit breaker pattern (ADVANCED tier)
 * - Path aliases (@/features/, @/components/)
 *
 * Features:
 * - Wraps dashboard pages with sidebar
 * - Manages sidebar open/close state
 * - Mobile hamburger menu
 * - Header with page title
 * - Overlay for mobile sidebar
 */

'use client';

import React, { useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu, LogIn } from 'lucide-react';
import { DashboardSidebar } from './DashboardSidebar';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useAuth } from '@/core/context/AuthContext';
import { DashboardModeProvider, type DashboardMode } from '../context';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface DashboardLayoutProps {
  /** Child content to render */
  children: React.ReactNode;
}

// ============================================================================
// DASHBOARDLAYOUT COMPONENT
// ============================================================================

function DashboardLayoutContent({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Desktop sidebar collapsed state - false means expanded (visible by default)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ============================================================================
  // HANDLERS - Must be declared before any early returns (Rules of Hooks)
  // Hooks must be called in the same order on every render.
  // ============================================================================

  const handleOpenSidebar = useCallback(() => {
    setSidebarOpen(true);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const handleToggleCollapse = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  // Compute theme class and initial mode based on route
  // Billing account pages are accessed from listing manager context, so they use the listing manager theme
  const billingAccountPaths = [
    '/dashboard/account/payment-methods',
    '/dashboard/account/billing-history',
    '/dashboard/account/subscription-overview',
    '/dashboard/account/statements',
    '/dashboard/account/refund-requests',
    '/dashboard/account/campaign-bank'
  ];
  const isBillingAccountRoute = billingAccountPaths.some(p => pathname?.startsWith(p));
  const isListingManagerRoute = (pathname?.startsWith('/dashboard/listings') ?? false) || isBillingAccountRoute;
  const themeClass = isListingManagerRoute ? 'theme-listing-manager' : '';
  const initialMode: DashboardMode = isListingManagerRoute ? 'listing-manager' : 'personal';

  // ============================================================================
  // AUTH GATE - Blocks sidebar/menu from rendering to unauthenticated users
  // All hooks have been called above, so early returns are safe here.
  // ============================================================================

  // Loading state - show spinner, do NOT render sidebar
  if (loading) {
    return (
      <div className="h-[calc(100vh-64px)] bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--dashboard-spinner,#002641)] mx-auto" />
          <p className="mt-4 text-gray-500 text-sm">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login prompt, do NOT render sidebar
  if (!user) {
    return (
      <div className="h-[calc(100vh-64px)] bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full mx-4 text-center">
          <LogIn className="w-12 h-12 text-[#002641] mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-[#002641] mb-2">Authentication Required</h1>
          <p className="text-gray-600 mb-6">
            You must be signed in to access your dashboard.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#002641] text-white rounded-md hover:bg-[#003a5c] transition-colors font-medium"
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  // ============================================================================
  // AUTHENTICATED USER - Render sidebar + content
  // ============================================================================

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <DashboardModeProvider initialMode={initialMode}>
      {/*
       * Dashboard Container
       * - Height constrained to viewport minus site header (64px)
       * - overflow-hidden prevents document-level scrolling
       * - Sidebar and content scroll independently
       *
       * PHASE 4: Independent Scroll Behavior
       */}
      <div className={`h-[calc(100vh-64px)] overflow-hidden bg-gray-50 flex ${themeClass}`}>
        {/* Sidebar */}
        <DashboardSidebar
          isOpen={sidebarOpen}
          onClose={handleCloseSidebar}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={handleCloseSidebar}
            aria-hidden="true"
          />
        )}

        {/* Main Content Wrapper - min-w-0 required for flex child to shrink below content width */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
          {/* Mobile Header - sticky within content area */}
          <header className="sticky top-0 z-30 bg-white border-b border-gray-200 flex-shrink-0 lg:hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <button
                onClick={handleOpenSidebar}
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                aria-label="Open sidebar"
              >
                <Menu className="w-6 h-6" />
              </button>
              <span className="text-lg font-semibold text-gray-900">Dashboard</span>
              <div className="w-10" /> {/* Spacer */}
            </div>
          </header>

          {/* Page Content - scrollable area with horizontal overflow hidden */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hidden p-4 lg:p-6 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </DashboardModeProvider>
  );
}

// PHASE 4 COMPLETE: Independent scroll behavior implemented
// PHASE 5 MARKER: Add ListingContext provider around content for listing routes

/**
 * DashboardLayout - Wrapped with ErrorBoundary (ADVANCED tier requirement)
 *
 * @example
 * ```tsx
 * <DashboardLayout>
 *   <DashboardPage />
 * </DashboardLayout>
 * ```
 */
export function DashboardLayout(props: DashboardLayoutProps) {
  return (
    <ErrorBoundary componentName="DashboardLayout">
      <DashboardLayoutContent {...props} />
    </ErrorBoundary>
  );
}

export default DashboardLayout;
