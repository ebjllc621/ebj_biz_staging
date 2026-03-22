/**
 * Admin Event Exhibitors Page
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
 * @phase Phase 6B - Exhibitor System
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
import type { AdminEventExhibitor, EventExhibitorStatus, ExhibitorBoothSize } from '@features/events/types';

interface ExhibitorStats {
  total: number;
  active: number;
  pending: number;
  declined: number;
  removed: number;
  totalImpressions: number;
  totalClicks: number;
  byBoothSize: Record<string, number>;
}

interface ExhibitorFilters {
  [key: string]: string;
  status: string;
  booth_size: string;
}

const defaultFilters: ExhibitorFilters = {
  status: '',
  booth_size: '',
};

const exhibitorFilterFields: FilterField[] = [
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
    key: 'booth_size',
    label: 'Booth Size',
    type: 'select',
    options: [
      { value: 'small', label: 'Small' },
      { value: 'medium', label: 'Medium' },
      { value: 'large', label: 'Large' },
      { value: 'premium', label: 'Premium' },
    ],
  },
];

const boothSizeColors: Record<ExhibitorBoothSize, string> = {
  small: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  large: 'bg-purple-100 text-purple-800',
  premium: 'bg-amber-100 text-amber-800',
};

const statusColors: Record<EventExhibitorStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-700',
  declined: 'bg-gray-100 text-gray-600',
  removed: 'bg-red-100 text-red-700',
};

export default function AdminEventExhibitorsPage() {
  const { user } = useAuth();

  const [exhibitors, setExhibitors] = useState<AdminEventExhibitor[]>([]);
  const [stats, setStats] = useState<ExhibitorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ExhibitorFilters>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [matchMode, setMatchMode] = useState<MatchMode>('all');

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: string; exhibitors: AdminEventExhibitor[] } | null>(null);

  const fetchExhibitors = useCallback(async () => {
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

      const response = await fetch(`/api/admin/events/exhibitors?${params}`, { credentials: 'include' });
      const result = await response.json();

      if (result.success) {
        setExhibitors(result.data?.exhibitors || []);
        setPagination(prev => ({ ...prev, total: result.data?.pagination?.total || 0 }));
      }
    } catch (error) {
      console.error('Failed to fetch exhibitors:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, sortColumn, sortDirection, searchQuery, filters]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const response = await fetch('/api/admin/events/exhibitors?pageSize=1000', { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        const all: AdminEventExhibitor[] = result.data?.exhibitors || [];
        const computed: ExhibitorStats = {
          total: result.data?.pagination?.total || 0,
          active: all.filter(ex => ex.status === 'active').length,
          pending: all.filter(ex => ex.status === 'pending').length,
          declined: all.filter(ex => ex.status === 'declined').length,
          removed: all.filter(ex => ex.status === 'removed').length,
          totalImpressions: all.reduce((sum, ex) => sum + (ex.impression_count || 0), 0),
          totalClicks: all.reduce((sum, ex) => sum + (ex.click_count || 0), 0),
          byBoothSize: {},
        };
        for (const ex of all) {
          computed.byBoothSize[ex.booth_size] = (computed.byBoothSize[ex.booth_size] || 0) + 1;
        }
        setStats(computed);
      }
    } catch (error) {
      console.error('Failed to fetch exhibitor stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchExhibitors();
      fetchStats();
    }
  }, [user, fetchExhibitors, fetchStats]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSearch = useCallback((query: string, _mode: SearchMode) => {
    setSearchQuery(query);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleFiltersChange = useCallback((newFilters: ExhibitorFilters) => {
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

  const handleStatusChange = useCallback(async (exhibitor: AdminEventExhibitor, newStatus: EventExhibitorStatus) => {
    try {
      await fetch(`/api/events/${exhibitor.event_id}/exhibitors/${exhibitor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      fetchExhibitors();
      fetchStats();
    } catch (error) {
      console.error('Failed to update exhibitor status:', error);
    }
  }, [fetchExhibitors, fetchStats]);

  const handlePasswordVerified = useCallback(async () => {
    if (!pendingAction) return;
    setShowPasswordModal(false);

    try {
      for (const exhibitor of pendingAction.exhibitors) {
        await fetch(`/api/events/${exhibitor.event_id}/exhibitors/${exhibitor.id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
      }
      fetchExhibitors();
      fetchStats();
    } catch (error) {
      console.error('Failed to remove exhibitors:', error);
    }
    setPendingAction(null);
  }, [pendingAction, fetchExhibitors, fetchStats]);

  const statsSections: StatSection[] = useMemo(() => {
    if (!stats) return [];
    return [
      {
        title: 'Totals',
        items: [
          { label: 'Total Exhibitors', value: stats.total, bold: true },
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
        title: 'Analytics',
        items: [
          { label: 'Total Impressions', value: stats.totalImpressions },
          { label: 'Total Clicks', value: stats.totalClicks },
        ],
      },
      {
        title: 'By Booth Size',
        items: Object.entries(stats.byBoothSize || {}).map(([k, v]) => ({ label: k, value: v })),
      },
    ];
  }, [stats]);

  const columns: TableColumn<AdminEventExhibitor>[] = useMemo(() => [
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
      header: 'Exhibitor',
      accessor: (row) => row.listing_name ? (
        <a href={`/listings/${row.listing_slug}`} target="_blank" rel="noopener noreferrer"
          className="text-biz-orange hover:underline">
          {row.listing_name}
        </a>
      ) : '-',
      sortable: false,
    },
    {
      key: 'booth_number',
      header: 'Booth #',
      accessor: (row) => row.booth_number || '-',
      sortable: false,
    },
    {
      key: 'booth_size',
      header: 'Booth Size',
      accessor: (row) => (
        <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${boothSizeColors[row.booth_size as ExhibitorBoothSize] || 'bg-gray-100 text-gray-700'}`}>
          {row.booth_size}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => (
        <span className={`px-2 py-1 rounded text-xs ${statusColors[row.status as EventExhibitorStatus] || 'bg-gray-100 text-gray-600'}`}>
          {row.status}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'impression_count',
      header: 'Impressions',
      accessor: (row) => row.impression_count ?? 0,
      sortable: true,
    },
    {
      key: 'click_count',
      header: 'Clicks',
      accessor: (row) => row.click_count ?? 0,
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

  const actions: TableAction<AdminEventExhibitor>[] = useMemo(() => [
    {
      label: 'View Event',
      icon: <Eye className="w-4 h-4" />,
      iconOnly: true,
      onClick: (ex) => window.open(`/events/${ex.event_slug}`, '_blank'),
      variant: 'primary',
    },
    {
      label: 'Activate',
      icon: <CheckCircle className="w-4 h-4" />,
      iconOnly: true,
      onClick: (ex) => handleStatusChange(ex, 'active'),
      isHidden: (ex) => ex.status === 'active',
      variant: 'primary',
    },
    {
      label: 'Remove',
      icon: <XCircle className="w-4 h-4" />,
      iconOnly: true,
      onClick: (ex) => handleStatusChange(ex, 'removed'),
      isHidden: (ex) => ex.status === 'removed',
      variant: 'danger',
    },
  ], [handleStatusChange]);

  const bulkActions: BulkAction<AdminEventExhibitor>[] = useMemo(() => [
    {
      label: 'Remove Selected',
      onClick: (selected) => {
        setPendingAction({ type: 'remove', exhibitors: selected });
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
        title="Event Exhibitors"
        onCreateNew={() => {}}
        onImportExport={() => {}}
      />

      <AdminStatsPanel title="Exhibitor Statistics" sections={statsSections} loading={statsLoading} />

      <div className="flex items-center gap-4 mb-4">
        <AdminSearchBar placeholder="Search by event, business..." onSearch={handleSearch} />
        <AdminAdvancedFilterPanel
          isOpen={filtersOpen}
          filters={filters}
          onChange={handleFiltersChange}
          onClear={handleClearFilters}
          onToggle={() => setFiltersOpen(p => !p)}
          activeFilterCount={activeFilterCount}
          fields={exhibitorFilterFields}
          matchMode={matchMode}
          onMatchModeChange={setMatchMode}
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <AdminPaginationControls
          title="Exhibitors"
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          loading={loading}
          onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))}
          onPageSizeChange={(s) => setPagination(prev => ({ ...prev, pageSize: s, page: 1 }))}
          onRefresh={fetchExhibitors}
        />
        <AdminTableTemplate<AdminEventExhibitor>
          title=""
          data={exhibitors}
          columns={columns}
          rowKey={(row) => row.id}
          loading={loading}
          actions={actions}
          bulkActions={bulkActions}
          tableId="admin-event-exhibitors"
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
        operationDescription={`remove ${pendingAction?.exhibitors.length || 0} exhibitor(s)`}
      />
    </div>
  );
}
