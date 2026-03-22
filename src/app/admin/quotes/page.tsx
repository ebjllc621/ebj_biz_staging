/**
 * Admin Quotes Management Page
 *
 * GOVERNANCE COMPLIANCE:
 * - Template: AdminTableTemplate (MANDATORY)
 * - Authentication: Admin-only access required
 * - Service Boundary: API routes only (no direct DB access)
 * - Credentials: 'include' for all fetch requests
 * - Complexity: STANDARD tier
 *
 * @tier STANDARD
 * @phase Phase 3 Tech Debt Remediation
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { Eye } from 'lucide-react';
import { AdminTableTemplate, TableColumn, TableAction } from '@/components/admin/templates/AdminTableTemplate';
import { useAuth } from '@core/hooks/useAuth';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ErrorFallback } from '@/components/common/ErrorFallback';

interface AdminQuote {
  id: number;
  requesterName: string;
  requesterEmail: string;
  title: string;
  description: string;
  serviceCategory: string | null;
  timeline: string;
  status: string;
  visibility: string;
  requestCount: number;
  responseCount: number;
  createdAt: string;
}

interface PaginationData {
  total: number;
  limit: number;
  offset: number;
}

function AdminQuotesContent() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<AdminQuote[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({ total: 0, limit: 20, offset: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit', '20');
      params.set('offset', String((currentPage - 1) * 20));
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/admin/quotes?${params.toString()}`, {
        credentials: 'include'
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || 'Failed to fetch quotes');
      }

      const data = await res.json();
      setQuotes(data.data?.quotes ?? []);
      setPagination(data.data?.pagination ?? { total: 0, limit: 20, offset: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchQuotes();
    }
  }, [user, fetchQuotes]);

  if (!user || user.role !== 'admin') {
    return <div className="p-6 text-center text-gray-500">Admin access required</div>;
  }

  const columns: TableColumn<AdminQuote>[] = [
    { key: 'id', header: 'ID', accessor: (q) => q.id, width: '60px', sortable: true },
    { key: 'title', header: 'Title', accessor: (q) => q.title, sortable: true },
    { key: 'requesterName', header: 'Requester', accessor: (q) => q.requesterName },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      accessor: (quote) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          quote.status === 'open' ? 'bg-green-100 text-green-800' :
          quote.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
          quote.status === 'completed' ? 'bg-gray-100 text-gray-800' :
          quote.status === 'cancelled' ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {quote.status}
        </span>
      )
    },
    { key: 'serviceCategory', header: 'Category', accessor: (q) => q.serviceCategory || '-' },
    { key: 'responseCount', header: 'Responses', accessor: (q) => q.responseCount, width: '100px' },
    {
      key: 'createdAt',
      header: 'Created',
      width: '140px',
      accessor: (q) => new Date(q.createdAt).toLocaleDateString(),
      sortable: true
    }
  ];

  const actions: TableAction<AdminQuote>[] = [
    {
      label: 'View',
      icon: <Eye className="w-4 h-4" />,
      onClick: (quote) => {
        window.open(`/dashboard/quotes?quoteId=${quote.id}`, '_blank');
      }
    }
  ];

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  const statusOptions = ['open', 'in_progress', 'completed', 'cancelled', 'expired'];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Quotes Manager</h1>
        <span className="text-sm text-gray-500">{pagination.total} total quotes</span>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
        >
          <option value="">All Statuses</option>
          {statusOptions.map(s => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">{error}</div>
      )}

      <AdminTableTemplate<AdminQuote>
        title=""
        data={quotes}
        columns={columns}
        actions={actions}
        loading={loading}
        rowKey={(q) => q.id}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="px-3 py-1 text-sm border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="px-3 py-1 text-sm border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminQuotesPage() {
  return (
    <ErrorBoundary componentName="AdminQuotes" fallback={<ErrorFallback title="Admin Quotes Error" />}>
      <AdminQuotesContent />
    </ErrorBoundary>
  );
}
