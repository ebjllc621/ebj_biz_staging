/**
 * Admin Billing Statements Page
 * /admin/billing/statements - Monthly statement management
 *
 * GOVERNANCE COMPLIANCE:
 * - Template: AdminTableTemplate (MANDATORY)
 * - Authentication: Admin-only access required
 * - Service Boundary: NO direct database access (API routes only)
 * - Credentials: 'include' for all fetch requests
 * - Complexity: ADVANCED tier (error boundaries required)
 * - ErrorBoundary: MANDATORY
 *
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 5
 * @component
 * @returns {JSX.Element} Admin monthly statements management interface
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

interface AdminStatement {
  id: number;
  userId: number;
  statementMonth: string;
  subscriptionCharges: number;
  addonCharges: number;
  totalCharges: number;
  amountPaid: number;
  amountDue: number;
  status: 'draft' | 'sent' | 'paid';
  pdfUrl: string | null;
  userEmail: string;
  userName: string | null;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface Filters {
  status: string;
  month: string;
}

// ============================================================================
// BADGE HELPERS
// ============================================================================

function StatementStatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800'
  };
  const color = colorMap[status] ?? 'bg-gray-100 text-gray-800';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${color}`}>
      {status}
    </span>
  );
}

// ============================================================================
// GENERATE STATEMENT MODAL
// ============================================================================

function GenerateStatementModal({
  onClose,
  onSuccess
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [userId, setUserId] = useState('');
  const [month, setMonth] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(async () => {
    if (!userId || !month) {
      setError('User ID and month are required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/admin/billing/statements', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: parseInt(userId, 10), month })
      });

      if (!response.ok) {
        const data = await response.json() as { message?: string };
        throw new Error(data.message ?? 'Failed to generate statement');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }, [userId, month, onClose, onSuccess]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Generate Statement</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
            <input
              type="number"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="e.g. 42"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month (YYYY-MM)</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50"
          >
            {isSubmitting ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function AdminStatementsContent() {
  const { user, loading: authLoading } = useAuth();

  const [statements, setStatements] = useState<AdminStatement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1
  });
  const [filters, setFilters] = useState<Filters>({
    status: '',
    month: ''
  });

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchStatements = useCallback(async (page: number, currentFilters: Filters) => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20'
      });
      if (currentFilters.status) params.set('status', currentFilters.status);
      if (currentFilters.month) params.set('month', currentFilters.month);

      const response = await fetch(`/api/admin/billing/statements?${params.toString()}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch statements');
      }

      const data = await response.json() as { data?: { statements?: AdminStatement[]; pagination?: Pagination }; statements?: AdminStatement[]; pagination?: Pagination };
      const items = data.data?.statements ?? data.statements ?? [];
      const paginationData = data.data?.pagination ?? data.pagination;

      setStatements(items);
      if (paginationData) {
        setPagination(paginationData);
      }
    } catch (error) {
      console.error('Error fetching statements:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user?.role === 'admin') {
      void fetchStatements(pagination.page, filters);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, fetchStatements]);

  const handlePageChange = useCallback((newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    void fetchStatements(newPage, filters);
  }, [fetchStatements, filters]);

  const handleFilterChange = useCallback((key: keyof Filters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
    void fetchStatements(1, newFilters);
  }, [fetchStatements, filters]);

  // ============================================================================
  // TABLE COLUMNS
  // ============================================================================

  const columns: TableColumn<AdminStatement>[] = [
    {
      key: 'id',
      header: 'ID',
      accessor: (row) => row.id
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
      key: 'statementMonth',
      header: 'Month',
      accessor: (row) => row.statementMonth
    },
    {
      key: 'totalCharges',
      header: 'Total Charges',
      accessor: (row) => `$${row.totalCharges.toFixed(2)}`
    },
    {
      key: 'amountPaid',
      header: 'Amount Paid',
      accessor: (row) => `$${row.amountPaid.toFixed(2)}`
    },
    {
      key: 'amountDue',
      header: 'Amount Due',
      accessor: (row) => (
        <span className={row.amountDue > 0 ? 'text-orange-600 font-medium' : 'text-green-600'}>
          ${row.amountDue.toFixed(2)}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => <StatementStatusBadge status={row.status} />
    },
    {
      key: 'pdf',
      header: 'PDF',
      accessor: (row) => row.pdfUrl ? (
        <a
          href={row.pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline"
        >
          Download
        </a>
      ) : <span className="text-xs text-gray-400">—</span>
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
      {showGenerateModal && (
        <GenerateStatementModal
          onClose={() => setShowGenerateModal(false)}
          onSuccess={() => void fetchStatements(1, filters)}
        />
      )}

      <div className="flex items-center justify-between mb-4">
        <AdminPageHeader title="Monthly Statements" />
        <button
          onClick={() => setShowGenerateModal(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600"
        >
          Generate Statement
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
        </select>

        <input
          type="month"
          value={filters.month}
          onChange={(e) => handleFilterChange('month', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          title="Filter by month"
        />
      </div>

      {/* Table */}
      <AdminTableTemplate<AdminStatement>
        title="Monthly Statements"
        data={statements}
        columns={columns}
        rowKey={(row) => row.id}
        loading={isLoading}
        emptyMessage="No statements found."
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

export default function AdminStatementsPage() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <AdminStatementsContent />
    </ErrorBoundary>
  );
}
