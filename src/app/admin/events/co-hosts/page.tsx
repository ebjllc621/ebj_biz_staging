/**
 * Admin Event Co-Hosts Page
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
 * @phase Phase 6A - Co-Host System
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
import type { AdminEventCoHost, EventCoHostStatus, EventCoHostRole } from '@features/events/types';

interface CoHostStats {
  total: number;
  active: number;
  pending: number;
  declined: number;
  removed: number;
  byRole: Record<string, number>;
}

interface CoHostFilters {
  [key: string]: string;
  status: string;
  co_host_role: string;
}

const defaultFilters: CoHostFilters = {
  status: '',
  co_host_role: '',
};

const coHostFilterFields: FilterField[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'pending', label: 'Pending' },
      { value: 'active', label: 'Active' },
      { value: 'declined', label: 'Declined' },
      { value: 'removed', label: 'Removed' },
    ],
  },
  {
    key: 'co_host_role',
    label: 'Role',
    type: 'select',
    options: [
      { value: 'organizer', label: 'Organizer' },
      { value: 'vendor', label: 'Vendor' },
      { value: 'performer', label: 'Performer' },
      { value: 'exhibitor', label: 'Exhibitor' },
    ],
  },
];

const roleColors: Record<EventCoHostRole, string> = {
  organizer: 'bg-blue-100 text-blue-800',
  vendor: 'bg-purple-100 text-purple-800',
  performer: 'bg-pink-100 text-pink-800',
  exhibitor: 'bg-amber-100 text-amber-800',
};

const statusColors: Record<EventCoHostStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-700',
  declined: 'bg-gray-100 text-gray-600',
  removed: 'bg-red-100 text-red-700',
};

export default function AdminEventCoHostsPage() {
  const { user } = useAuth();

  const [coHosts, setCoHosts] = useState<AdminEventCoHost[]>([]);
  const [stats, setStats] = useState<CoHostStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<CoHostFilters>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [matchMode, setMatchMode] = useState<MatchMode>('all');

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: string; coHosts: AdminEventCoHost[] } | null>(null);

  const fetchCoHosts = useCallback(async () => {
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

      const response = await fetch(`/api/admin/events/co-hosts?${params}`, { credentials: 'include' });
      const result = await response.json();

      if (result.success) {
        setCoHosts(result.data?.co_hosts || []);
        setPagination(prev => ({ ...prev, total: result.data?.pagination?.total || 0 }));
      }
    } catch (error) {
      console.error('Failed to fetch co-hosts:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, sortColumn, sortDirection, searchQuery, filters]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const response = await fetch('/api/admin/events/co-hosts?pageSize=1000', { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        const all: AdminEventCoHost[] = result.data?.co_hosts || [];
        const computed: CoHostStats = {
          total: result.data?.pagination?.total || 0,
          active: all.filter(ch => ch.status === 'active').length,
          pending: all.filter(ch => ch.status === 'pending').length,
          declined: all.filter(ch => ch.status === 'declined').length,
          removed: all.filter(ch => ch.status === 'removed').length,
          byRole: {},
        };
        for (const ch of all) {
          computed.byRole[ch.co_host_role] = (computed.byRole[ch.co_host_role] || 0) + 1;
        }
        setStats(computed);
      }
    } catch (error) {
      console.error('Failed to fetch co-host stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchCoHosts();
      fetchStats();
    }
  }, [user, fetchCoHosts, fetchStats]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSearch = useCallback((query: string, _mode: SearchMode) => {
    setSearchQuery(query);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleFiltersChange = useCallback((newFilters: CoHostFilters) => {
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

  const handleStatusChange = useCallback(async (coHost: AdminEventCoHost, newStatus: EventCoHostStatus) => {
    try {
      await fetch(`/api/events/${coHost.event_id}/co-hosts/${coHost.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      fetchCoHosts();
      fetchStats();
    } catch (error) {
      console.error('Failed to update co-host status:', error);
    }
  }, [fetchCoHosts, fetchStats]);

  const handlePasswordVerified = useCallback(async () => {
    if (!pendingAction) return;
    setShowPasswordModal(false);

    try {
      for (const coHost of pendingAction.coHosts) {
        await fetch(`/api/events/${coHost.event_id}/co-hosts/${coHost.id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
      }
      fetchCoHosts();
      fetchStats();
    } catch (error) {
      console.error('Failed to remove co-hosts:', error);
    }
    setPendingAction(null);
  }, [pendingAction, fetchCoHosts, fetchStats]);

  const statsSections: StatSection[] = useMemo(() => {
    if (!stats) return [];
    return [
      {
        title: 'Totals',
        items: [
          { label: 'Total Co-Hosts', value: stats.total, bold: true },
          { label: 'Active', value: stats.active },
          { label: 'Pending', value: stats.pending },
        ],
      },
      {
        title: 'By Status',
        items: [
          { label: 'Active', value: stats.active },
          { label: 'Pending', value: stats.pending },
          { label: 'Declined', value: stats.declined },
          { label: 'Removed', value: stats.removed },
        ],
      },
      {
        title: 'By Role',
        items: Object.entries(stats.byRole || {}).map(([k, v]) => ({ label: k, value: v })),
      },
    ];
  }, [stats]);

  const columns: TableColumn<AdminEventCoHost>[] = useMemo(() => [
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
      header: 'Co-Host Business',
      accessor: (row) => row.listing_name ? (
        <a href={`/listings/${row.listing_slug}`} target="_blank" rel="noopener noreferrer"
          className="text-biz-orange hover:underline">
          {row.listing_name}
        </a>
      ) : '-',
      sortable: false,
    },
    {
      key: 'co_host_role',
      header: 'Role',
      accessor: (row) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${roleColors[row.co_host_role]}`}>
          {row.co_host_role}
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
      key: 'invited_by_name',
      header: 'Invited By',
      accessor: (row) => row.invited_by_name || '-',
      sortable: false,
    },
    {
      key: 'created_at',
      header: 'Created',
      accessor: (row) => new Date(row.created_at).toLocaleDateString(),
      sortable: true,
    },
  ], []);

  const actions: TableAction<AdminEventCoHost>[] = useMemo(() => [
    {
      label: 'View Event',
      icon: <Eye className="w-4 h-4" />,
      iconOnly: true,
      onClick: (ch) => window.open(`/events/${ch.event_slug}`, '_blank'),
      variant: 'primary',
    },
    {
      label: 'Activate',
      icon: <CheckCircle className="w-4 h-4" />,
      iconOnly: true,
      onClick: (ch) => handleStatusChange(ch, 'active'),
      isHidden: (ch) => ch.status === 'active',
      variant: 'primary',
    },
    {
      label: 'Remove',
      icon: <XCircle className="w-4 h-4" />,
      iconOnly: true,
      onClick: (ch) => handleStatusChange(ch, 'removed'),
      isHidden: (ch) => ch.status === 'removed',
      variant: 'danger',
    },
  ], [handleStatusChange]);

  const bulkActions: BulkAction<AdminEventCoHost>[] = useMemo(() => [
    {
      label: 'Remove Selected',
      onClick: (selected) => {
        setPendingAction({ type: 'remove', coHosts: selected });
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
        title="Event Co-Hosts"
        onCreateNew={() => {}}
        onImportExport={() => {}}
      />

      <AdminStatsPanel title="Co-Host Statistics" sections={statsSections} loading={statsLoading} />

      <div className="flex items-center gap-4 mb-4">
        <AdminSearchBar placeholder="Search by event, business..." onSearch={handleSearch} />
        <AdminAdvancedFilterPanel
          isOpen={filtersOpen}
          filters={filters}
          onChange={handleFiltersChange}
          onClear={handleClearFilters}
          onToggle={() => setFiltersOpen(p => !p)}
          activeFilterCount={activeFilterCount}
          fields={coHostFilterFields}
          matchMode={matchMode}
          onMatchModeChange={setMatchMode}
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <AdminPaginationControls
          title="Co-Hosts"
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          loading={loading}
          onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))}
          onPageSizeChange={(s) => setPagination(prev => ({ ...prev, pageSize: s, page: 1 }))}
          onRefresh={fetchCoHosts}
        />
        <AdminTableTemplate<AdminEventCoHost>
          title=""
          data={coHosts}
          columns={columns}
          rowKey={(row) => row.id}
          loading={loading}
          actions={actions}
          bulkActions={bulkActions}
          tableId="admin-event-co-hosts"
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
        operationDescription={`remove ${pendingAction?.coHosts.length || 0} co-host(s)`}
      />
    </div>
  );
}
