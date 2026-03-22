/**
 * Admin Layout - Shell Integration
 *
 * Wraps all admin routes in AdminShell for unified navigation.
 *
 * ARCHITECTURAL DECISION:
 * - Shell provides consistent sidebar navigation
 * - Pages render in shell content area with ErrorBoundary
 * - Auth checks remain at page level for granular control
 * - Route config preserved for dynamic rendering
 *
 * PHASE 3 INTEGRATION:
 * - Previously: Passthrough layout (return children)
 * - Now: AdminShell wrapper with sidebar navigation
 *
 * TECHNICAL REQUIREMENTS:
 * - Authentication: Server-First DAL via requireAdmin() at page level
 * - Real-time data: Server-side data fetching in pages
 * - Request-time rendering: Session verification on server
 * - Dynamic rendering: force-dynamic prevents SSG attempts
 *
 * GOVERNANCE RULES:
 * - Route segment config MUST be exported from layout
 * - dynamic = 'force-dynamic' prevents all SSG attempts
 * - revalidate = 0 disables caching (admin data is always fresh)
 * - AdminShell provides UI structure, pages handle auth
 *
 * @governance Build Map v2.1 - SIMPLE tier (layout integration)
 * @authority PHASE_3_LAYOUT_INTEGRATION_BRAIN_PLAN.md
 * @see docs/pages/layouts/admin/phases/PHASE_3_LAYOUT_INTEGRATION_BRAIN_PLAN.md
 */

// Route Segment Config - Applies to ALL nested routes
// GOVERNANCE: PRESERVED from original layout
export const dynamic = 'force-dynamic';  // Never use SSG for admin pages
export const revalidate = 0;  // Never cache admin pages

import { AdminShell } from '@/components/admin';

/**
 * Admin Layout Component
 *
 * Wraps all admin pages in unified shell with sidebar navigation.
 *
 * @param children - Nested admin page components
 * @returns AdminShell wrapped content
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminShell>
      {children}
    </AdminShell>
  );
}
