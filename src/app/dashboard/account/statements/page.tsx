/**
 * Dashboard Statements Page
 * /dashboard/account/statements - Monthly billing statements for authenticated user
 *
 * @tier STANDARD
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 5
 *
 * GOVERNANCE COMPLIANCE:
 * - Client component with authentication check
 * - ErrorBoundary wrapper (STANDARD tier)
 * - credentials: 'include' for authenticated fetch
 * - Download via anchor tag (browser-native PDF download)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/core/context/AuthContext';
import { redirect } from 'next/navigation';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { FileText } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface MonthlyStatement {
  id: number;
  statementMonth: string;
  totalCharges: number;
  amountPaid: number;
  amountDue: number;
  status: 'draft' | 'sent' | 'paid';
  pdfUrl: string | null;
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

function formatMonth(statementMonth: string): string {
  const [year, month] = statementMonth.split('-');
  if (!year || !month) return statementMonth;
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getStatusBadgeClasses(status: string): string {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-700';
    case 'sent':
      return 'bg-blue-100 text-blue-700';
    case 'draft':
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

// ============================================================================
// PAGE CONTENT
// ============================================================================

function StatementsPageContent() {
  const { user, loading } = useAuth();
  const [statements, setStatements] = useState<MonthlyStatement[]>([]);
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

  const fetchStatements = useCallback(async (page: number) => {
    setFetching(true);
    setError(null);
    try {
      const res = await fetch(`/api/billing/statements?page=${page}&pageSize=20`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to load statements');
      const data = await res.json() as {
        data?: { items?: MonthlyStatement[]; pagination?: Pagination };
        items?: MonthlyStatement[];
        pagination?: Pagination;
      };
      setStatements(data.data?.items ?? data.items ?? []);
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
      void fetchStatements(1);
    }
  }, [loading, user, fetchStatements]);

  const handlePageChange = useCallback((newPage: number) => {
    void fetchStatements(newPage);
  }, [fetchStatements]);

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
        <h1 className="text-2xl font-bold text-gray-900">Monthly Statements</h1>
        <p className="text-gray-600 mt-1">View and download your monthly billing statements</p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Empty state */}
      {statements.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No statements generated yet.</p>
          <p className="text-sm text-gray-400 mt-1">Statements are generated monthly for your billing activity.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {statements.map(statement => (
            <div
              key={statement.id}
              className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between hover:border-orange-200 transition-colors"
            >
              {/* Left: Month + charges */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">{formatMonth(statement.statementMonth)}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Total: ${statement.totalCharges.toFixed(2)}
                      {statement.amountPaid > 0 && (
                        <span className="ml-2 text-green-600">
                          Paid: ${statement.amountPaid.toFixed(2)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: Amount due + status + download */}
              <div className="flex items-center gap-4 flex-shrink-0">
                {statement.amountDue > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Amount Due</p>
                    <p className="font-semibold text-orange-600">${statement.amountDue.toFixed(2)}</p>
                  </div>
                )}

                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadgeClasses(statement.status)}`}>
                  {statement.status}
                </span>

                {/* Download button — uses browser-native PDF download via anchor */}
                <a
                  href={`/api/billing/statements/${statement.statementMonth}/download`}
                  download={`bizconekt-statement-${statement.statementMonth}.pdf`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Download PDF
                </a>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-gray-500">
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function StatementsPage() {
  return (
    <ErrorBoundary componentName="StatementsPage">
      <StatementsPageContent />
    </ErrorBoundary>
  );
}
