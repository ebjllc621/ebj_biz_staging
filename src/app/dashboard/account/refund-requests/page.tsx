/**
 * Dashboard Refund Requests Page
 * /dashboard/account/refund-requests
 *
 * @tier STANDARD
 * @authority docs/components/billing&subs/phases/PHASE_4B_BRAIN_PLAN.md
 *
 * GOVERNANCE COMPLIANCE:
 * - Client component with authentication check
 * - ErrorBoundary wrapper (STANDARD tier)
 * - credentials: 'include' for authenticated fetch
 * - fetchWithCsrf for POST mutation
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/core/context/AuthContext';
import { redirect } from 'next/navigation';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { RotateCcw } from 'lucide-react';
import { fetchWithCsrf } from '@core/utils/csrf';

// ============================================================================
// TYPES
// ============================================================================

interface RefundRequest {
  id: number;
  entity_type: string;
  entity_id: number;
  requested_amount: string | number;
  approved_amount: string | number | null;
  status: string;
  reason_category: string;
  reason_details: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface RefundFormData {
  entity_type: string;
  entity_id: string;
  original_amount: string;
  requested_amount: string;
  reason_category: string;
  reason_details: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatAmount(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  return `$${parseFloat(String(amount)).toFixed(2)}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

function getStatusBadgeClasses(status: string): string {
  switch (status) {
    case 'submitted':
      return 'bg-yellow-100 text-yellow-600';
    case 'under_review':
      return 'bg-blue-100 text-blue-600';
    case 'approved':
      return 'bg-green-100 text-green-600';
    case 'denied':
      return 'bg-red-100 text-red-600';
    case 'processing':
      return 'bg-orange-100 text-orange-600';
    case 'completed':
      return 'bg-green-800 text-white';
    case 'failed':
      return 'bg-red-100 text-red-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

const INITIAL_FORM: RefundFormData = {
  entity_type: '',
  entity_id: '',
  original_amount: '',
  requested_amount: '',
  reason_category: '',
  reason_details: ''
};

// ============================================================================
// PAGE CONTENT
// ============================================================================

function RefundRequestsPageContent() {
  const { user, loading } = useAuth();
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [form, setForm] = useState<RefundFormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // ============================================================================
  // AUTHENTICATION GATE
  // ============================================================================

  if (!loading && !user) {
    redirect('/');
  }

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchRefunds = useCallback(async () => {
    setFetching(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/billing/refund-request', {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to load refund requests');
      const data = await res.json() as {
        data?: { items?: RefundRequest[] };
        items?: RefundRequest[];
      };
      setRefunds(data.data?.items ?? data.items ?? []);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && user) {
      void fetchRefunds();
    }
  }, [loading, user, fetchRefunds]);

  // ============================================================================
  // FORM HANDLERS
  // ============================================================================

  const handleFormChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const res = await fetchWithCsrf('/api/billing/refund-request', {
        method: 'POST',
        body: JSON.stringify({
          entity_type: form.entity_type,
          entity_id: parseInt(form.entity_id, 10),
          original_amount: parseFloat(form.original_amount),
          requested_amount: parseFloat(form.requested_amount),
          reason_category: form.reason_category,
          reason_details: form.reason_details || undefined
        })
      });

      if (!res.ok) {
        const errData = await res.json() as { message?: string; error?: string };
        throw new Error(errData.message ?? errData.error ?? 'Failed to submit refund request');
      }

      setSubmitSuccess('Your refund request has been submitted successfully.');
      setForm(INITIAL_FORM);
      void fetchRefunds();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }, [form, fetchRefunds]);

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
        <h1 className="text-2xl font-bold text-gray-900">Refund Requests</h1>
        <p className="text-gray-600 mt-1">View and manage your refund requests</p>
      </div>

      {/* Fetch error banner */}
      {fetchError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {fetchError}
        </div>
      )}

      {/* ================================================================ */}
      {/* SECTION 1: Existing Refund Requests                              */}
      {/* ================================================================ */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Your Requests</h2>

        {refunds.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <RotateCcw className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">You haven&apos;t submitted any refund requests.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {refunds.map(refund => (
              <div
                key={refund.id}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  {/* Left: entity info + amounts */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">
                        {refund.entity_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-gray-500">ID: {refund.entity_id}</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      Requested: <span className="font-medium">{formatAmount(refund.requested_amount)}</span>
                      {refund.approved_amount !== null && refund.status === 'completed' && (
                        <span className="ml-2 text-green-700 font-medium">
                          Processed: {formatAmount(refund.approved_amount)}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      Reason: {refund.reason_category.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-gray-400">Submitted: {formatDate(refund.created_at)}</p>

                    {/* Denied: show review notes in red */}
                    {refund.status === 'denied' && refund.review_notes && (
                      <p className="text-xs text-red-600 mt-1">
                        Denial reason: {refund.review_notes}
                      </p>
                    )}
                  </div>

                  {/* Right: status badge */}
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClasses(refund.status)}`}>
                    {refund.status.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* SECTION 2: Create New Refund Request Form                        */}
      {/* ================================================================ */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Request a Refund</h2>

        {/* Success message */}
        {submitSuccess && (
          <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            {submitSuccess}
          </div>
        )}

        {/* Error message */}
        {submitError && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
          {/* Entity Type */}
          <div>
            <label htmlFor="entity_type" className="block text-sm font-medium text-gray-700 mb-1">
              Entity Type <span className="text-red-500">*</span>
            </label>
            <select
              id="entity_type"
              name="entity_type"
              value={form.entity_type}
              onChange={handleFormChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select entity type</option>
              <option value="subscription">Subscription</option>
              <option value="event_ticket">Event Ticket</option>
              <option value="addon">Add-on</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Entity ID */}
          <div>
            <label htmlFor="entity_id" className="block text-sm font-medium text-gray-700 mb-1">
              Entity ID <span className="text-red-500">*</span>
            </label>
            <input
              id="entity_id"
              name="entity_id"
              type="number"
              value={form.entity_id}
              onChange={handleFormChange}
              required
              min="1"
              placeholder="Enter the ID of the item"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Original Amount */}
          <div>
            <label htmlFor="original_amount" className="block text-sm font-medium text-gray-700 mb-1">
              Original Amount <span className="text-red-500">*</span>
            </label>
            <input
              id="original_amount"
              name="original_amount"
              type="number"
              step="0.01"
              value={form.original_amount}
              onChange={handleFormChange}
              required
              min="0.01"
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Requested Amount */}
          <div>
            <label htmlFor="requested_amount" className="block text-sm font-medium text-gray-700 mb-1">
              Requested Amount <span className="text-red-500">*</span>
            </label>
            <input
              id="requested_amount"
              name="requested_amount"
              type="number"
              step="0.01"
              value={form.requested_amount}
              onChange={handleFormChange}
              required
              min="0.01"
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Reason Category */}
          <div>
            <label htmlFor="reason_category" className="block text-sm font-medium text-gray-700 mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <select
              id="reason_category"
              name="reason_category"
              value={form.reason_category}
              onChange={handleFormChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select a reason</option>
              <option value="customer_request">Customer Request</option>
              <option value="service_issue">Service Issue</option>
              <option value="billing_error">Billing Error</option>
              <option value="duplicate_charge">Duplicate Charge</option>
              <option value="cancellation_mid_cycle">Cancellation Mid-Cycle</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Details */}
          <div>
            <label htmlFor="reason_details" className="block text-sm font-medium text-gray-700 mb-1">
              Details
            </label>
            <textarea
              id="reason_details"
              name="reason_details"
              value={form.reason_details}
              onChange={handleFormChange}
              rows={4}
              placeholder="Please provide additional details about your refund request..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-6 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Submitting...' : 'Submit Refund Request'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function RefundRequestsPage() {
  return (
    <ErrorBoundary componentName="RefundRequestsPage">
      <RefundRequestsPageContent />
    </ErrorBoundary>
  );
}
