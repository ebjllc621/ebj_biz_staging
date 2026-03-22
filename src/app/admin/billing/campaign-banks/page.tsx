/**
 * Admin Campaign Banks Page
 * /admin/billing/campaign-banks - Paginated campaign bank management table
 *
 * GOVERNANCE COMPLIANCE:
 * - Template: AdminTableTemplate (MANDATORY)
 * - Authentication: Admin-only access required
 * - Service Boundary: NO direct database access (API routes only)
 * - Credentials: 'include' for all fetch requests
 * - Complexity: ADVANCED tier (error boundaries required)
 * - ErrorBoundary: MANDATORY
 *
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 6
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { AdminTableTemplate, TableColumn } from '@/components/admin/templates/AdminTableTemplate';
import { AdminPageHeader } from '@/components/admin/shared/AdminPageHeader';
import { useAuth } from '@core/hooks/useAuth';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ErrorFallback } from '@/components/common/ErrorFallback';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface AdminCampaignBank {
  id: number;
  userId: number;
  listingId: number;
  balance: number;
  totalDeposited: number;
  totalSpent: number;
  lastDepositAt: string | null;
  lastSpendAt: string | null;
  status: 'active' | 'frozen' | 'depleted';
  createdAt: string;
  updatedAt: string;
  userEmail: string;
  userName: string | null;
  listingName: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface Filters {
  status: string;
  userId: string;
}

// ============================================================================
// BADGE HELPERS
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    frozen: 'bg-yellow-100 text-yellow-800',
    depleted: 'bg-red-100 text-red-800'
  };
  const color = colorMap[status] ?? 'bg-gray-100 text-gray-800';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${color}`}>
      {status}
    </span>
  );
}

function formatMoney(val: number): string {
  return `$${parseFloat(String(val)).toFixed(2)}`;
}

function formatDate(val: string | null): string {
  if (!val) return '—';
  return new Date(val).toLocaleDateString();
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function AdminCampaignBanksContent() {
  const { user, loading: authLoading } = useAuth();

  const [banks, setBanks] = useState<AdminCampaignBank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1
  });
  const [filters, setFilters] = useState<Filters>({
    status: '',
    userId: ''
  });

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchBanks = useCallback(async (page: number, currentFilters: Filters) => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20'
      });
      if (currentFilters.status) params.set('status', currentFilters.status);
      if (currentFilters.userId) params.set('user_id', currentFilters.userId);

      const response = await fetch(`/api/admin/billing/campaign-banks?${params.toString()}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch campaign banks');
      }

      const data = await response.json() as {
        data?: { campaign_banks?: AdminCampaignBank[]; pagination?: Pagination };
        campaign_banks?: AdminCampaignBank[];
        pagination?: Pagination;
      };
      const items = data.data?.campaign_banks ?? data.campaign_banks ?? [];
      const paginationData = data.data?.pagination ?? data.pagination;

      setBanks(items);
      if (paginationData) {
        setPagination(paginationData);
      }
    } catch (error) {
      console.error('Error fetching campaign banks:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user?.role === 'admin') {
      void fetchBanks(pagination.page, filters);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, fetchBanks]);

  const handlePageChange = useCallback((newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    void fetchBanks(newPage, filters);
  }, [fetchBanks, filters]);

  const handleFilterChange = useCallback((key: keyof Filters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
    void fetchBanks(1, newFilters);
  }, [fetchBanks, filters]);

  // ============================================================================
  // TABLE COLUMNS
  // ============================================================================

  const columns: TableColumn<AdminCampaignBank>[] = [
    {
      key: 'id',
      header: 'ID',
      accessor: (row) => row.id
    },
    {
      key: 'listing',
      header: 'Listing',
      accessor: (row) => row.listingName
    },
    {
      key: 'user',
      header: 'User',
      accessor: (row) => (
        <div>
          <p className="font-medium text-sm">{row.userName ?? row.userEmail}</p>
          <p className="text-xs text-gray-500">{row.userEmail}</p>
        </div>
      )
    },
    {
      key: 'balance',
      header: 'Balance',
      accessor: (row) => <span className="font-semibold">{formatMoney(row.balance)}</span>
    },
    {
      key: 'totalDeposited',
      header: 'Deposited',
      accessor: (row) => formatMoney(row.totalDeposited)
    },
    {
      key: 'totalSpent',
      header: 'Spent',
      accessor: (row) => formatMoney(row.totalSpent)
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => <StatusBadge status={row.status} />
    },
    {
      key: 'lastActivity',
      header: 'Last Activity',
      accessor: (row) => {
        const lastDeposit = row.lastDepositAt ? new Date(row.lastDepositAt) : null;
        const lastSpend = row.lastSpendAt ? new Date(row.lastSpendAt) : null;
        const latest = lastDeposit && lastSpend
          ? (lastDeposit > lastSpend ? lastDeposit : lastSpend)
          : lastDeposit ?? lastSpend;
        return latest ? formatDate(latest.toISOString()) : '—';
      }
    }
  ];

  // ============================================================================
  // RENDER
  // ============================================================================

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Access denied. Admin privileges required.</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <AdminPageHeader title="Campaign Banks" />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="frozen">Frozen</option>
          <option value="depleted">Depleted</option>
        </select>

        <input
          type="number"
          value={filters.userId}
          onChange={(e) => handleFilterChange('userId', e.target.value)}
          placeholder="Filter by User ID..."
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 min-w-[180px]"
        />
      </div>

      {/* Table */}
      <AdminTableTemplate<AdminCampaignBank>
        title="Campaign Banks"
        data={banks}
        columns={columns}
        rowKey={(row) => row.id}
        loading={isLoading}
        emptyMessage="No campaign banks found."
        searchable={false}
        pagination={{
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onPageChange: handlePageChange
        }}
      />
    </div>
  );
}

// ============================================================================
// EXPORT WITH ERROR BOUNDARY
// ============================================================================

export default function AdminCampaignBanksPage() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <AdminCampaignBanksContent />
    </ErrorBoundary>
  );
}
