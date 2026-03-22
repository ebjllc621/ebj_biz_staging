/**
 * ListingLeadCapturePanel - Lead Capture Manager UI
 *
 * @tier ADVANCED
 * @phase Phase 2B - Lead Capture System
 * @authority docs/pages/layouts/listings/features/phases/PHASE_2B_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST wrap in ErrorBoundary (ADVANCED tier)
 * - MUST use credentials: 'include' on ALL fetch calls
 * - Orange theme (#ed6437) consistent with listing manager
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import {
  Target,
  Download,
  AlertCircle,
  Loader2,
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface Lead {
  id: number;
  listing_id: number;
  user_id: number | null;
  name: string;
  email: string;
  phone: string | null;
  interaction_type: string;
  source: string;
  source_url: string | null;
  message_preview: string | null;
  source_record_id: number | null;
  source_record_type: string | null;
  tier_at_capture: string;
  status: string;
  captured_at: string;
  updated_at: string;
}

interface LeadSummary {
  total: number;
  thisMonth: number;
  byType: Array<{ type: string; count: number }>;
  bySource: Array<{ source: string; count: number }>;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ExportEligibility {
  canExport: boolean;
  emailAccess: boolean;
  phoneAccess: boolean;
  monthlyLimit: number;
  remainingExports: number;
  tier: string;
}

interface LeadsApiResponse {
  leads: Lead[];
  summary: LeadSummary;
  pagination: Pagination;
  export_eligibility: ExportEligibility;
}

interface ListingLeadCapturePanelProps {
  listingId: number;
  listingName?: string;
  listingTier?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatInteractionType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatSource(source: string): string {
  return source.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'new':
      return 'bg-blue-100 text-blue-800';
    case 'contacted':
      return 'bg-yellow-100 text-yellow-800';
    case 'converted':
      return 'bg-green-100 text-green-800';
    case 'archived':
      return 'bg-gray-100 text-gray-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

// ============================================================================
// INNER COMPONENT (wrapped by ErrorBoundary)
// ============================================================================

function ListingLeadCapturePanelInner({
  listingId,
  listingName,
  listingTier
}: ListingLeadCapturePanelProps) {
  // State
  const [data, setData] = useState<LeadsApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // ============================================================================
  // FETCH
  // ============================================================================

  const fetchLeads = useCallback(async (page: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (filterType) params.set('type', filterType);
      if (filterStatus) params.set('status', filterStatus);
      if (filterStart) params.set('start', filterStart);
      if (filterEnd) params.set('end', filterEnd);

      const response = await fetch(
        `/api/listings/${listingId}/leads?${params.toString()}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(errBody.message ?? `Failed to load leads (${response.status})`);
      }

      const result = await response.json() as { data: LeadsApiResponse };
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads');
    } finally {
      setIsLoading(false);
    }
  }, [listingId, filterType, filterStatus, filterStart, filterEnd]);

  useEffect(() => {
    void fetchLeads(currentPage);
  }, [fetchLeads, currentPage]);

  // ============================================================================
  // FILTER HANDLERS
  // ============================================================================

  function handleApplyFilters() {
    setCurrentPage(1);
    void fetchLeads(1);
  }

  function handleClearFilters() {
    setFilterType('');
    setFilterStatus('');
    setFilterStart('');
    setFilterEnd('');
    setCurrentPage(1);
  }

  // ============================================================================
  // EXPORT
  // ============================================================================

  async function handleExport() {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (filterType) params.set('type', filterType);
      if (filterStatus) params.set('status', filterStatus);
      if (filterStart) params.set('start', filterStart);
      if (filterEnd) params.set('end', filterEnd);

      const response = await fetch(
        `/api/listings/${listingId}/leads/export?${params.toString()}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(errBody.message ?? 'Export failed');
      }

      const blob = await response.blob();
      const today = new Date().toISOString().split('T')[0];
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `listing-leads-${today}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (isLoading && !data) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
        </div>
      </div>
    );
  }

  // ============================================================================
  // ERROR STATE
  // ============================================================================

  if (error && !data) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-red-900">Failed to Load Leads</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const exportEligibility = data?.export_eligibility;
  const summary = data?.summary;
  const pagination = data?.pagination;
  const leads = data?.leads ?? [];

  const isEssentialsOrPlus =
    !listingTier ||
    listingTier === 'essentials' ||
    listingTier === 'plus';

  // Count quote requests from byType
  const quoteRequestCount =
    summary?.byType.find(t => t.type === 'quote_request')?.count ?? 0;
  const messageCount =
    summary?.byType.find(t => t.type === 'message')?.count ?? 0;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Lead Capture</h2>
              {listingName && (
                <p className="text-sm text-gray-500">{listingName}</p>
              )}
            </div>
          </div>

          {/* Export Button */}
          <div className="flex items-center gap-2">
            {exportEligibility && !exportEligibility.canExport ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <ArrowUpRight className="w-4 h-4" />
                <span>Upgrade to Preferred to export</span>
              </div>
            ) : null}
            <button
              onClick={() => void handleExport()}
              disabled={isExporting || !exportEligibility?.canExport}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Tier Upgrade Banner */}
      {isEssentialsOrPlus && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ArrowUpRight className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-orange-900">Unlock Full Lead Access</h3>
              <p className="text-sm text-orange-700 mt-1">
                Upgrade to Preferred or Premium to export leads with full contact details including
                phone numbers and unlimited monthly exports.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Leads</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{summary?.total ?? 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">This Month</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{summary?.thisMonth ?? 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Quote Requests</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{quoteRequestCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Messages</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{messageCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All Types</option>
            <option value="general_inquiry">General Inquiry</option>
            <option value="quote_request">Quote Request</option>
            <option value="message">Message</option>
            <option value="appointment">Appointment</option>
            <option value="bookmark">Bookmark</option>
            <option value="contact_click">Contact Click</option>
            <option value="directions_click">Directions Click</option>
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="converted">Converted</option>
            <option value="archived">Archived</option>
          </select>

          <input
            type="date"
            value={filterStart}
            onChange={e => setFilterStart(e.target.value)}
            placeholder="Start date"
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />

          <input
            type="date"
            value={filterEnd}
            onChange={e => setFilterEnd(e.target.value)}
            placeholder="End date"
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={handleApplyFilters}
            className="px-3 py-1.5 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors"
          >
            Apply
          </button>
          <button
            onClick={handleClearFilters}
            className="px-3 py-1.5 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Inline Error (for filter/refresh errors when data already loaded) */}
      {error && data && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-orange-600 animate-spin" />
          </div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center">
            <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-sm font-semibold text-gray-900">No leads captured yet</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              When visitors contact you or send messages, their information will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Source</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Message</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map(lead => (
                    <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{lead.name}</td>
                      <td className="px-4 py-3 text-gray-600">{lead.email}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatInteractionType(lead.interaction_type)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatSource(lead.source)}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                        {lead.message_preview ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(lead.status)}`}>
                          {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {formatDate(lead.captured_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Showing {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} leads
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={pagination.page <= 1}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-600">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                    disabled={pagination.page >= pagination.totalPages}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// EXPORTED COMPONENT (with ErrorBoundary)
// ============================================================================

export function ListingLeadCapturePanel(props: ListingLeadCapturePanelProps) {
  return (
    <ErrorBoundary>
      <ListingLeadCapturePanelInner {...props} />
    </ErrorBoundary>
  );
}
