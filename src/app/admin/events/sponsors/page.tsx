/**
 * Admin Event Sponsors Page
 *
 * GOVERNANCE COMPLIANCE:
 * - Authority: docs/components/admin/ADMIN_TABLE_CANONICAL_STANDARD.md
 * - Template: AdminTableTemplate (MANDATORY)
 * - Authentication: Admin-only access required
 * - Service Boundary: EventService via API routes
 * - Credentials: 'include' for all fetch requests
 * - Complexity: STANDARD tier
 *
 * @authority docs/components/admin/ADMIN_TABLE_CANONICAL_STANDARD.md
 * @phase Phase 5 - Task 5.13: Admin Event Sponsors Page
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Eye, CheckCircle, XCircle } from 'lucide-react';
import { AdminTableTemplate, type TableColumn, type TableAction, type BulkAction } from '@/components/admin/templates/AdminTableTemplate';
import {
  AdminPageHeader,
  AdminStatsPanel,
  AdminSearchBar,
  AdminAdvancedFilterPanel,
  AdminPaginationControls,
  AdminPasswordModal,
  type StatSection,
  type FilterField,
  type MatchMode,
  type SearchMode,
} from '@/components/admin/shared';
import { useAuth } from '@core/hooks/useAuth';
import type { AdminEventSponsor, EventSponsorStatus, EventSponsorTier } from '@features/events/types';

interface SponsorStats {
  total: number;
  active: number;
  pending: number;
  expired: number;
  cancelled: number;
  byTier: Record<string, number>;
}

interface SponsorFilters {
  [key: string]: string;
  status: string;
  sponsor_tier: string;
}

const defaultFilters: SponsorFilters = {
  status: '',
  sponsor_tier: '',
};

const sponsorFilterFields: FilterField[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'pending', label: 'Pending' },
      { value: 'active', label: 'Active' },
      { value: 'expired', label: 'Expired' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
  },
  {
    key: 'sponsor_tier',
    label: 'Tier',
    type: 'select',
    options: [
      { value: 'title', label: 'Title' },
      { value: 'gold', label: 'Gold' },
      { value: 'silver', label: 'Silver' },
      { value: 'bronze', label: 'Bronze' },
      { value: 'community', label: 'Community' },
    ],
  },
];

const tierColors: Record<EventSponsorTier, string> = {
  title: 'bg-amber-100 text-amber-800',
  gold: 'bg-yellow-100 text-yellow-800',
  silver: 'bg-gray-100 text-gray-700',
  bronze: 'bg-orange-100 text-orange-700',
  community: 'bg-green-100 text-green-700',
};

const statusColors: Record<EventSponsorStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-700',
  expired: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
};

export default function AdminEventSponsorsPage() {
  const { user } = useAuth();

  const [sponsors, setSponsors] = useState<AdminEventSponsor[]>([]);
  const [stats, setStats] = useState<SponsorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SponsorFilters>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [matchMode, setMatchMode] = useState<MatchMode>('all');

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: string; sponsors: AdminEventSponsor[] } | null>(null);

  const fetchSponsors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        pageSize: String(pagination.pageSize),
        sortColumn,
        sortDirection,
        search: searchQuery,
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')),
      });

      const response = await fetch(`/api/admin/events/sponsors?${params}`, { credentials: 'include' });
      const result = await response.json();

      if (result.success) {
        setSponsors(result.data?.sponsors || []);
        setPagination(prev => ({ ...prev, total: result.data?.pagination?.total || 0 }));
      }
    } catch (error) {
      console.error('Failed to fetch sponsors:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, sortColumn, sortDirection, searchQuery, filters]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const response = await fetch('/api/admin/events/sponsors?pageSize=1000', { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        const all: AdminEventSponsor[] = result.data?.sponsors || [];
        const computed: SponsorStats = {
          total: result.data?.pagination?.total || 0,
          active: all.filter(s => s.status === 'active').length,
          pending: all.filter(s => s.status === 'pending').length,
          expired: all.filter(s => s.status === 'expired').length,
          cancelled: all.filter(s => s.status === 'cancelled').length,
          byTier: {},
        };
        for (const s of all) {
          computed.byTier[s.sponsor_tier] = (computed.byTier[s.sponsor_tier] || 0) + 1;
        }
        setStats(computed);
      }
    } catch (error) {
      console.error('Failed to fetch sponsor stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchSponsors();
      fetchStats();
    }
  }, [user, fetchSponsors, fetchStats]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSearch = useCallback((query: string, _mode: SearchMode) => {
    setSearchQuery(query);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleFiltersChange = useCallback((newFilters: SponsorFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(defaultFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const activeFilterCount = useMemo(() => Object.values(filters).filter(v => v !== '').length, [filters]);

  const handleColumnSort = useCallback((columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [sortColumn]);

  const handleStatusChange = useCallback(async (sponsor: AdminEventSponsor, newStatus: EventSponsorStatus) => {
    try {
      await fetch(`/api/admin/events/sponsors/${sponsor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      fetchSponsors();
      fetchStats();
    } catch (error) {
      console.error('Failed to update sponsor status:', error);
    }
  }, [fetchSponsors, fetchStats]);

  const handlePasswordVerified = useCallback(async () => {
    if (!pendingAction) return;
    setShowPasswordModal(false);

    try {
      for (const sponsor of pendingAction.sponsors) {
        await fetch(`/api/admin/events/sponsors/${sponsor.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status: 'cancelled' }),
        });
      }
      fetchSponsors();
      fetchStats();
    } catch (error) {
      console.error('Failed to cancel sponsors:', error);
    }
    setPendingAction(null);
  }, [pendingAction, fetchSponsors, fetchStats]);

  const statsSections: StatSection[] = useMemo(() => {
    if (!stats) return [];
    return [
      {
        title: 'Totals',
        items: [
          { label: 'Total Sponsors', value: stats.total, bold: true },
          { label: 'Active', value: stats.active },
          { label: 'Pending', value: stats.pending },
        ],
      },
      {
        title: 'By Status',
        items: [
          { label: 'Active', value: stats.active },
          { label: 'Pending', value: stats.pending },
          { label: 'Expired', value: stats.expired },
          { label: 'Cancelled', value: stats.cancelled },
        ],
      },
      {
        title: 'By Tier',
        items: Object.entries(stats.byTier || {}).map(([k, v]) => ({ label: k, value: v })),
      },
    ];
  }, [stats]);

  const columns: TableColumn<AdminEventSponsor>[] = useMemo(() => [
    { key: 'id', header: 'ID', accessor: (row) => row.id, sortable: true },
    {
      key: 'event_title',
      header: 'Event',
      accessor: (row) => row.event_title ? (
        <a href={`/events/${row.event_slug}`} target="_blank" rel="noopener noreferrer"
          className="text-biz-orange hover:underline">
          {row.event_title}
        </a>
      ) : '-',
      sortable: false,
    },
    {
      key: 'listing_name',
      header: 'Sponsor Business',
      accessor: (row) => row.listing_name ? (
        <a href={`/listings/${row.listing_slug}`} target="_blank" rel="noopener noreferrer"
          className="text-biz-orange hover:underline">
          {row.listing_name}
        </a>
      ) : '-',
      sortable: false,
    },
    {
      key: 'sponsor_tier',
      header: 'Tier',
      accessor: (row) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${tierColors[row.sponsor_tier]}`}>
          {row.sponsor_tier}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => (
        <span className={`px-2 py-1 rounded text-xs ${statusColors[row.status]}`}>
          {row.status}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'click_count',
      header: 'Clicks',
      accessor: (row) => row.click_count,
      sortable: true,
    },
    {
      key: 'impression_count',
      header: 'Impressions',
      accessor: (row) => row.impression_count,
      sortable: true,
    },
    {
      key: 'created_at',
      header: 'Created',
      accessor: (row) => new Date(row.created_at).toLocaleDateString(),
      sortable: true,
    },
  ], []);

  const actions: TableAction<AdminEventSponsor>[] = useMemo(() => [
    {
      label: 'View Event',
      icon: <Eye className="w-4 h-4" />,
      iconOnly: true,
      onClick: (s) => window.open(`/events/${s.event_slug}`, '_blank'),
      variant: 'primary',
    },
    {
      label: 'Activate',
      icon: <CheckCircle className="w-4 h-4" />,
      iconOnly: true,
      onClick: (s) => handleStatusChange(s, 'active'),
      isHidden: (s) => s.status === 'active',
      variant: 'primary',
    },
    {
      label: 'Cancel',
      icon: <XCircle className="w-4 h-4" />,
      iconOnly: true,
      onClick: (s) => handleStatusChange(s, 'cancelled'),
      isHidden: (s) => s.status === 'cancelled',
      variant: 'danger',
    },
  ], [handleStatusChange]);

  const bulkActions: BulkAction<AdminEventSponsor>[] = useMemo(() => [
    {
      label: 'Cancel Selected',
      onClick: (selected) => {
        setPendingAction({ type: 'cancel', sponsors: selected });
        setShowPasswordModal(true);
      },
    },
  ], []);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-600 font-medium">Access Denied: Admin privileges required</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <AdminPageHeader
        title="Event Sponsors"
        onCreateNew={() => {}}
        onImportExport={() => {}}
      />

      <AdminStatsPanel title="Sponsor Statistics" sections={statsSections} loading={statsLoading} />

      <div className="flex items-center gap-4 mb-4">
        <AdminSearchBar placeholder="Search by event, business..." onSearch={handleSearch} />
        <AdminAdvancedFilterPanel
          isOpen={filtersOpen}
          filters={filters}
          onChange={handleFiltersChange}
          onClear={handleClearFilters}
          onToggle={() => setFiltersOpen(p => !p)}
          activeFilterCount={activeFilterCount}
          fields={sponsorFilterFields}
          matchMode={matchMode}
          onMatchModeChange={setMatchMode}
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <AdminPaginationControls
          title="Sponsors"
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          loading={loading}
          onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))}
          onPageSizeChange={(s) => setPagination(prev => ({ ...prev, pageSize: s, page: 1 }))}
          onRefresh={fetchSponsors}
        />
        <AdminTableTemplate<AdminEventSponsor>
          title=""
          data={sponsors}
          columns={columns}
          rowKey={(row) => row.id}
          loading={loading}
          actions={actions}
          bulkActions={bulkActions}
          tableId="admin-event-sponsors"
          onSort={handleColumnSort}
          sortState={{ column: sortColumn, direction: sortDirection }}
        />
      </div>

      <AdminPasswordModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setPendingAction(null);
        }}
        onVerified={handlePasswordVerified}
        operationDescription={`cancel ${pendingAction?.sponsors.length || 0} sponsor(s)`}
      />
    </div>
  );
}
