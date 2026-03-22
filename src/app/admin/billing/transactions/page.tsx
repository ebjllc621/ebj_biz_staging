/**
 * Admin Billing Transactions Page
 * /admin/billing/transactions - Paginated billing transaction management table
 *
 * GOVERNANCE COMPLIANCE:
 * - Template: AdminTableTemplate (MANDATORY)
 * - Authentication: Admin-only access required
 * - Service Boundary: NO direct database access (API routes only)
 * - Credentials: 'include' for all fetch requests
 * - Complexity: ADVANCED tier (error boundaries required)
 * - ErrorBoundary: MANDATORY
 *
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 3A
 * @component
 * @returns {JSX.Element} Admin transactions management interface
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

interface AdminTransaction {
  id: number;
  invoice_number: string | null;
  transaction_type: string;
  status: string;
  amount: number;
  tax_amount: number | null;
  tax_rate: number | null;
  description: string | null;
  transaction_date: string;
  statement_month: string | null;
  user_id: number;
  listing_id: number | null;
  user_email: string;
  user_name: string | null;
  listing_name: string | null;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface Filters {
  type: string;
  status: string;
  search: string;
}

// ============================================================================
// BADGE HELPERS
// ============================================================================

function TypeBadge({ type }: { type: string }) {
  const colorMap: Record<string, string> = {
    subscription_charge: 'bg-blue-100 text-blue-800',
    addon_charge: 'bg-purple-100 text-purple-800',
    refund: 'bg-red-100 text-red-800',
    credit: 'bg-green-100 text-green-800',
    adjustment: 'bg-gray-100 text-gray-800',
    payment: 'bg-teal-100 text-teal-800'
  };
  const color = colorMap[type] ?? 'bg-gray-100 text-gray-800';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {type.replace(/_/g, ' ')}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    refunded: 'bg-gray-100 text-gray-800'
  };
  const color = colorMap[status] ?? 'bg-gray-100 text-gray-800';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${color}`}>
      {status}
    </span>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function AdminTransactionsContent() {
  const { user, loading: authLoading } = useAuth();

  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1
  });
  const [filters, setFilters] = useState<Filters>({
    type: '',
    status: '',
    search: ''
  });

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchTransactions = useCallback(async (page: number, currentFilters: Filters) => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20'
      });
      if (currentFilters.type) params.set('type', currentFilters.type);
      if (currentFilters.status) params.set('status', currentFilters.status);
      if (currentFilters.search) params.set('search', currentFilters.search);

      const response = await fetch(`/api/admin/billing/transactions?${params.toString()}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data = await response.json();
      const items = data.data?.transactions ?? data.transactions ?? [];
      const paginationData = data.data?.pagination ?? data.pagination;

      setTransactions(items as AdminTransaction[]);
      if (paginationData) {
        setPagination(paginationData as Pagination);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user?.role === 'admin') {
      void fetchTransactions(pagination.page, filters);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, fetchTransactions]);

  const handlePageChange = useCallback((newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    void fetchTransactions(newPage, filters);
  }, [fetchTransactions, filters]);

  const handleFilterChange = useCallback((key: keyof Filters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
    void fetchTransactions(1, newFilters);
  }, [fetchTransactions, filters]);

  // ============================================================================
  // TABLE COLUMNS
  // ============================================================================

  const columns: TableColumn<AdminTransaction>[] = [
    {
      key: 'id',
      header: 'ID',
      accessor: (row) => row.id
    },
    {
      key: 'invoice_number',
      header: 'Invoice #',
      accessor: (row) => row.invoice_number ?? '—'
    },
    {
      key: 'user',
      header: 'User',
      accessor: (row) => (
        <div>
          <p className="font-medium text-sm">{row.user_name ?? row.user_email}</p>
          <p className="text-xs text-gray-500">{row.user_email}</p>
        </div>
      )
    },
    {
      key: 'listing_name',
      header: 'Listing',
      accessor: (row) => row.listing_name ?? '—'
    },
    {
      key: 'transaction_type',
      header: 'Type',
      accessor: (row) => <TypeBadge type={row.transaction_type} />
    },
    {
      key: 'amount',
      header: 'Amount',
      accessor: (row) => `$${row.amount.toFixed(2)}`
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => <StatusBadge status={row.status} />
    },
    {
      key: 'transaction_date',
      header: 'Date',
      accessor: (row) => new Date(row.transaction_date).toLocaleDateString()
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
      <AdminPageHeader
        title="Transactions"
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Type filter */}
        <select
          value={filters.type}
          onChange={(e) => handleFilterChange('type', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">All Types</option>
          <option value="subscription_charge">Subscription Charge</option>
          <option value="addon_charge">Addon Charge</option>
          <option value="refund">Refund</option>
          <option value="credit">Credit</option>
          <option value="adjustment">Adjustment</option>
          <option value="payment">Payment</option>
        </select>

        {/* Status filter */}
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>

        {/* Search */}
        <input
          type="text"
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          placeholder="Search invoice, email, or description..."
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 min-w-[240px]"
        />
      </div>

      {/* Table */}
      <AdminTableTemplate<AdminTransaction>
        title="Transactions"
        data={transactions}
        columns={columns}
        rowKey={(row) => row.id}
        loading={isLoading}
        emptyMessage="No transactions found."
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

export default function AdminTransactionsPage() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <AdminTransactionsContent />
    </ErrorBoundary>
  );
}
