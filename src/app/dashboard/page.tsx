/**
 * Dashboard Overview Page - Landing page for user dashboard
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @updated Phase 2 - Dashboard Core (2026-01-11)
 * @authority docs/pages/layouts/home/user/phases/PHASE_2_BRAIN_PLAN.md
 *
 * GOVERNANCE COMPLIANCE:
 * - Client component with authentication check
 * - ErrorBoundary wrapper (STANDARD tier)
 * - Loading state during auth check
 * - Redirect unauthorized users
 *
 * Features:
 * - Full dashboard overview with real stats
 * - Quick actions grid
 * - Recent activity feed
 * - Authentication gate
 */

'use client';

import { useAuth } from '@/core/context/AuthContext';
import { redirect } from 'next/navigation';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { DashboardOverview } from '@/features/dashboard/components/DashboardOverview';

function DashboardPageContent() {
  const { user, loading } = useAuth();

  // ============================================================================
  // AUTHENTICATION GATE
  // ============================================================================

  // Redirect if not authenticated
  if (!loading && !user) {
    redirect('/');
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--dashboard-spinner)]" />
      </div>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return <DashboardOverview />;
}

/**
 * DashboardPage - Wrapped with ErrorBoundary (STANDARD tier requirement)
 */
export default function DashboardPage() {
  return (
    <ErrorBoundary componentName="DashboardPage">
      <DashboardPageContent />
    </ErrorBoundary>
  );
}
