/**
 * /dashboard/listings - Listing Manager Dashboard Page
 *
 * @description Landing page for users managing their business listings
 * @component Server/Client Component
 * @tier ADVANCED
 * @generated ComponentBuilder v3.0
 * @phase Phase 6 - Listing Manager Dashboard
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_6_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST use 'use client' directive
 * - MUST check authentication via useAuth
 * - MUST use ErrorBoundary (ADVANCED tier requirement)
 * - Uses orange theme via --dashboard-primary CSS variable (auto-switched by route)
 *
 * LAYOUT CONTEXT:
 * This page is wrapped by /dashboard/listings/layout.tsx which provides:
 * - ListingContextProvider for listing selection state
 * - DashboardLayout with orange theming
 * - DashboardSidebar with ListingSelector
 */
'use client';

import React from 'react';
import { useAuth } from '@/core/context/AuthContext';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ListingManagerDashboard } from '@features/dashboard/components/ListingManagerDashboard';

/**
 * ListingDashboardPage component content
 */
function ListingDashboardPageContent() {
  const { user, loading } = useAuth();

  // Show loading spinner while auth check completes
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--dashboard-spinner)]" />
      </div>
    );
  }

  // Auth check (RouteGuard at layout level should handle this, but defensive check)
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please log in to access this page.</p>
        </div>
      </div>
    );
  }

  return <ListingManagerDashboard />;
}

/**
 * ListingDashboardPage - Wrapped with ErrorBoundary (ADVANCED tier requirement)
 */
export default function ListingDashboardPage() {
  return (
    <ErrorBoundary componentName="ListingDashboardPage">
      <ListingDashboardPageContent />
    </ErrorBoundary>
  );
}
