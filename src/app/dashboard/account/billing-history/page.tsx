/**
 * Dashboard Billing History Page
 *
 * @tier STANDARD
 * @authority docs/components/billing&subs/phases/PHASE_3B_BRAIN_PLAN.md
 *
 * GOVERNANCE COMPLIANCE:
 * - Client component with authentication check
 * - ErrorBoundary wrapper (STANDARD tier)
 * - credentials: 'include' for authenticated fetch
 * - Paginated transaction list
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/core/context/AuthContext';
import { redirect } from 'next/navigation';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { FileText, ChevronLeft, ChevronRight } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface BillingTransaction {
  id: number;
  transaction_date: string;
  description: string | null;
  transaction_type: string;
  amount: string | number;
  status: string;
  invoice_number: string | null;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatAmount(amount: string | number): string {
  return `$${parseFloat(String(amount)).toFixed(2)}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

function getTypeBadgeClasses(type: string): string {
  switch (type) {
    case 'subscription_charge':
      return 'bg-blue-100 text-blue-600';
    case 'refund':
      return 'bg-red-100 text-red-600';
    case 'credit':
      return 'bg-green-100 text-green-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

function getStatusBadgeClasses(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-600';
    case 'pending':
      return 'bg-yellow-100 text-yellow-600';
    case 'failed':
      return 'bg-red-100 text-red-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

function formatTypeName(type: string): string {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ============================================================================
// PAGE CONTENT
// ============================================================================

function BillingHistoryPageContent() {
  const { user, loading } = useAuth();
  const [transactions, setTransactions] = useState<BillingTransaction[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // AUTHENTICATION GATE
  // ============================================================================

  if (!loading && !user) {
    redirect('/');
  }

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchTransactions = useCallback(async (page: number) => {
    setFetching(true);
    setError(null);
    try {
      const res = await fetch(`/api/billing/transactions?page=${page}&pageSize=20`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to load billing history');
      const data = await res.json() as {
        data?: { items?: BillingTransaction[]; pagination?: Pagination };
        items?: BillingTransaction[];
        pagination?: Pagination;
      };
      setTransactions(data.data?.items ?? data.items ?? []);
      const pag = data.data?.pagination ?? data.pagination;
      if (pag) setPagination(pag);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && user) {
      void fetchTransactions(1);
    }
  }, [loading, user, fetchTransactions]);

  const handlePageChange = useCallback((newPage: number) => {
    void fetchTransactions(newPage);
  }, [fetchTransactions]);

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--dashboard-spinner,#ea580c)]" />
      </div>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing History</h1>
        <p className="text-gray-600 mt-1">View all billing transactions on your account</p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Empty state */}
      {transactions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No billing transactions yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Description</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Amount</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Invoice #</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {formatDate(tx.transaction_date)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {tx.description ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeClasses(tx.transaction_type)}`}>
                        {formatTypeName(tx.transaction_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap font-medium">
                      {formatAmount(tx.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClasses(tx.status)}`}>
                        {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {tx.invoice_number ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BillingHistoryPage() {
  return (
    <ErrorBoundary componentName="BillingHistoryPage">
      <BillingHistoryPageContent />
    </ErrorBoundary>
  );
}
