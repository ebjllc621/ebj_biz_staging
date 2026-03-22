/**
 * Dashboard Layout - Applies DashboardLayout to all /dashboard routes
 *
 * @tier ADVANCED
 * @generated DNA v11.4.0
 * @authority docs/pages/layouts/home/user/phases/PHASE_1_BRAIN_PLAN.md
 */

import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
