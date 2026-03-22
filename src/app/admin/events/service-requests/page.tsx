/**
 * Admin Event Service Requests Page
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
 * @phase Phase 6C - Service Procurement (Quote Integration)
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Eye, XCircle, ExternalLink } from 'lucide-react';
import { AdminTableTemplate, type TableColumn, type TableAction } from '@/components/admin/templates/AdminTableTemplate';
import {
  AdminPageHeader,
  AdminStatsPanel,
  AdminSearchBar,
  AdminAdvancedFilterPanel,
  AdminPaginationControls,
  type StatSection,
  type FilterField,
  type MatchMode,
  type SearchMode,
} from '@/components/admin/shared';
import { useAuth } from '@core/hooks/useAuth';
import type {
  AdminEventServiceRequest,
  EventServiceRequestStatus,
  EventServiceRequestPriority,
} from '@features/events/types';

interface ServiceRequestStats {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  fulfilled: number;
}

interface ServiceRequestFilters {
  [key: string]: string;
  status: string;
  service_category: string;
  priority: string;
}

const defaultFilters: ServiceRequestFilters = {
  status: '',
  service_category: '',
  priority: '',
};

const filterFields: FilterField[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'open', label: 'Open' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'fulfilled', label: 'Fulfilled' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
  },
  {
    key: 'service_category',
    label: 'Category',
    type: 'select',
    options: [
      { value: 'catering', label: 'Catering & Food Service' },
      { value: 'av_equipment', label: 'AV & Sound Equipment' },
      { value: 'security', label: 'Security & Safety' },
      { value: 'decor', label: 'Decor & Styling' },
      { value: 'photography', label: 'Photography & Videography' },
      { value: 'entertainment', label: 'Entertainment & Performance' },
      { value: 'transportation', label: 'Transportation & Logistics' },
      { value: 'venue_services', label: 'Venue Services' },
      { value: 'cleaning', label: 'Cleaning & Maintenance' },
      { value: 'staffing', label: 'Staffing & Personnel' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    key: 'priority',
    label: 'Priority',
    type: 'select',
    options: [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'urgent', label: 'Urgent' },
    ],
  },
];

const statusColors: Record<EventServiceRequestStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  fulfilled: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const priorityColors: Record<EventServiceRequestPriority, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

function formatBudget(min: number | null, max: number | null): string {
  if (!min && !max) return 'Open';
  if (min && max) return `$${min.toLocaleString()} – $${max.toLocaleString()}`;
  if (min) return `From $${min.toLocaleString()}`;
  return `Up to $${max!.toLocaleString()}`;
}

export default function AdminEventServiceRequestsPage() {
  const { user } = useAuth();

  const [requests, setRequests] = useState<AdminEventServiceRequest[]>([]);
  const [stats, setStats] = useState<ServiceRequestStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ServiceRequestFilters>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [matchMode, setMatchMode] = useState<MatchMode>('all');

  const fetchRequests = useCallback(async () => {
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

      const response = await fetch(`/api/admin/events/service-requests?${params}`, { credentials: 'include' });
      const result = await response.json();

      if (result.success) {
        setRequests(result.data?.service_requests || []);
        setPagination(prev => ({ ...prev, total: result.data?.pagination?.total || 0 }));
      }
    } catch (error) {
      console.error('Failed to fetch service requests:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, sortColumn, sortDirection, searchQuery, filters]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const response = await fetch('/api/admin/events/service-requests?pageSize=1000', { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        const all: AdminEventServiceRequest[] = result.data?.service_requests || [];
        const byStatus: Record<string, number> = {};
        const byCategory: Record<string, number> = {};

        for (const req of all) {
          byStatus[req.status] = (byStatus[req.status] || 0) + 1;
          byCategory[req.service_category] = (byCategory[req.service_category] || 0) + 1;
        }

        setStats({
          total: result.data?.pagination?.total || 0,
          byStatus,
          byCategory,
          fulfilled: byStatus['fulfilled'] || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch service request stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchRequests();
      fetchStats();
    }
  }, [user, fetchRequests, fetchStats]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSearch = useCallback((query: string, _mode: SearchMode) => {
    setSearchQuery(query);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleFiltersChange = useCallback((newFilters: ServiceRequestFilters) => {
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

  const statsSections: StatSection[] = useMemo(() => {
    if (!stats) return [];
    return [
      {
        title: 'Overview',
        items: [
          { label: 'Total Requests', value: stats.total, bold: true },
          { label: 'Fulfilled', value: stats.fulfilled },
          {
            label: 'Fulfillment Rate',
            value: stats.total > 0 ? `${Math.round((stats.fulfilled / stats.total) * 100)}%` : '0%',
          },
        ],
      },
      {
        title: 'By Status',
        items: [
          { label: 'Draft', value: stats.byStatus['draft'] || 0 },
          { label: 'Open', value: stats.byStatus['open'] || 0 },
          { label: 'In Progress', value: stats.byStatus['in_progress'] || 0 },
          { label: 'Fulfilled', value: stats.byStatus['fulfilled'] || 0 },
          { label: 'Cancelled', value: stats.byStatus['cancelled'] || 0 },
        ],
      },
      {
        title: 'Top Categories',
        items: Object.entries(stats.byCategory || {})
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([k, v]) => ({ label: k.replace('_', ' '), value: v })),
      },
    ];
  }, [stats]);

  const columns: TableColumn<AdminEventServiceRequest>[] = useMemo(() => [
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
      key: 'requester_listing_name',
      header: 'Requester',
      accessor: (row) => row.requester_listing_name || '-',
      sortable: false,
    },
    {
      key: 'service_category',
      header: 'Category',
      accessor: (row) => (
        <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-gray-100 text-gray-800 capitalize">
          {row.service_category.replace('_', ' ')}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'title',
      header: 'Title',
      accessor: (row) => (
        <span className="text-sm text-gray-900 max-w-[200px] truncate block" title={row.title}>
          {row.title}
        </span>
      ),
      sortable: false,
    },
    {
      key: 'priority',
      header: 'Priority',
      accessor: (row) => (
        <span className={`px-2 py-0.5 text-xs rounded-full font-medium capitalize ${priorityColors[row.priority as EventServiceRequestPriority] || 'bg-gray-100 text-gray-600'}`}>
          {row.priority}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => (
        <span className={`px-2 py-0.5 text-xs rounded font-medium ${statusColors[row.status as EventServiceRequestStatus] || 'bg-gray-100 text-gray-700'}`}>
          {row.status.replace('_', ' ')}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'budget',
      header: 'Budget',
      accessor: (row) => (
        <span className="text-xs text-gray-600">
          {formatBudget(row.budget_min, row.budget_max)}
        </span>
      ),
      sortable: false,
    },
    {
      key: 'quote_response_count',
      header: 'Bids',
      accessor: (row) => row.quote_response_count ?? 0,
      sortable: false,
    },
    {
      key: 'fulfilled_by_name',
      header: 'Fulfilled By',
      accessor: (row) => row.fulfilled_by_name || '-',
      sortable: false,
    },
    {
      key: 'created_at',
      header: 'Created',
      accessor: (row) => new Date(row.created_at).toLocaleDateString(),
      sortable: true,
    },
  ], []);

  const actions: TableAction<AdminEventServiceRequest>[] = useMemo(() => [
    {
      label: 'View Event',
      icon: <Eye className="w-4 h-4" />,
      iconOnly: true,
      onClick: (req) => window.open(`/events/${req.event_slug}`, '_blank'),
      variant: 'primary',
    },
    {
      label: 'View Bids',
      icon: <ExternalLink className="w-4 h-4" />,
      iconOnly: true,
      onClick: (req) => req.quote_id && window.open(`/dashboard/quotes?quoteId=${req.quote_id}`, '_blank'),
      isHidden: (req) => !req.quote_id,
      variant: 'primary',
    },
    {
      label: 'Cancel',
      icon: <XCircle className="w-4 h-4" />,
      iconOnly: true,
      onClick: async (req) => {
        if (!confirm(`Cancel "${req.title}"?`)) return;
        try {
          await fetch(`/api/events/${req.event_id}/service-requests/${req.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status: 'cancelled' }),
          });
          fetchRequests();
          fetchStats();
        } catch (error) {
          console.error('Failed to cancel service request:', error);
        }
      },
      isHidden: (req) => req.status === 'cancelled' || req.status === 'fulfilled',
      variant: 'danger',
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        title="Event Service Requests"
        onCreateNew={() => {}}
        onImportExport={() => {}}
      />

      <AdminStatsPanel title="Service Request Statistics" sections={statsSections} loading={statsLoading} />

      <div className="flex items-center gap-4 mb-4">
        <AdminSearchBar placeholder="Search by title, event, requester..." onSearch={handleSearch} />
        <AdminAdvancedFilterPanel
          isOpen={filtersOpen}
          filters={filters}
          onChange={handleFiltersChange}
          onClear={handleClearFilters}
          onToggle={() => setFiltersOpen(p => !p)}
          activeFilterCount={activeFilterCount}
          fields={filterFields}
          matchMode={matchMode}
          onMatchModeChange={setMatchMode}
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <AdminPaginationControls
          title="Service Requests"
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          loading={loading}
          onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))}
          onPageSizeChange={(s) => setPagination(prev => ({ ...prev, pageSize: s, page: 1 }))}
          onRefresh={fetchRequests}
        />
        <AdminTableTemplate<AdminEventServiceRequest>
          title=""
          data={requests}
          columns={columns}
          rowKey={(row) => row.id}
          loading={loading}
          actions={actions}
          tableId="admin-event-service-requests"
          onSort={handleColumnSort}
          sortState={{ column: sortColumn, direction: sortDirection }}
        />
      </div>
    </div>
  );
}
