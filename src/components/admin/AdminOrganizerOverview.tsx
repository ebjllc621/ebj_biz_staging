/**
 * AdminOrganizerOverview - Platform-wide organizer activity stats for admin dashboard
 *
 * Fetches and displays aggregate organizer workflow statistics:
 * - Total co-hosts, exhibitors, service requests
 * - Events actively using each organizer feature
 * - Average acceptance and fulfillment rates
 *
 * Follows AdminStatsPanel 3-column grid pattern.
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 6D - Admin Organizer Overview
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

import { useState, useEffect } from 'react';
import { AdminStatsPanel } from '@/components/admin/shared/AdminStatsPanel';
import type { AdminOrganizerStats } from '@features/events/types';

// ============================================================================
// PROPS
// ============================================================================

interface AdminOrganizerOverviewProps {
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AdminOrganizerOverview({ className }: AdminOrganizerOverviewProps) {
  const [stats, setStats] = useState<AdminOrganizerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchStats = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/events/organizer-stats', {
          credentials: 'include',
        });
        if (cancelled) return;
        if (!res.ok) {
          setError('Failed to load organizer stats');
          return;
        }
        const data = await res.json();
        setStats(data?.data?.organizer_stats ?? null);
      } catch {
        if (!cancelled) setError('Failed to load organizer stats');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void fetchStats();
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 ${className ?? ''}`}>
        {error}
      </div>
    );
  }

  const sections = stats
    ? [
        {
          title: 'Co-Hosts',
          items: [
            { label: 'Total Co-Hosts', value: stats.total_co_hosts, bold: true },
            { label: 'Events Using', value: stats.events_with_co_hosts },
            { label: 'Avg Acceptance Rate', value: `${stats.avg_co_host_acceptance_rate.toFixed(1)}%` },
          ],
        },
        {
          title: 'Exhibitors',
          items: [
            { label: 'Total Exhibitors', value: stats.total_exhibitors, bold: true },
            { label: 'Events Using', value: stats.events_with_exhibitors },
            { label: 'Avg Acceptance Rate', value: `${stats.avg_exhibitor_acceptance_rate.toFixed(1)}%` },
          ],
        },
        {
          title: 'Service Requests',
          items: [
            { label: 'Total Requests', value: stats.total_service_requests, bold: true },
            { label: 'Events Using', value: stats.events_with_service_requests },
            { label: 'Avg Fulfillment Rate', value: `${stats.avg_service_fulfillment_rate.toFixed(1)}%` },
          ],
        },
      ]
    : [];

  return (
    <div className={className}>
      <AdminStatsPanel
        title="Organizer Activity Overview"
        sections={sections}
        loading={isLoading}
      />
    </div>
  );
}

export default AdminOrganizerOverview;
