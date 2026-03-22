/**
 * Dashboard Purchases Page — My Purchased Tickets
 *
 * Displays the user's purchased event tickets with status badges,
 * event details, and refund request capability.
 *
 * @tier STANDARD
 * @phase Phase 5B - Native Ticketing (My Tickets)
 * @authority CLAUDE.md - UI Standards (BizModal, ErrorBoundary)
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { BizModal, BizModalButton } from '@/components/ui/BizModal';
import { fetchWithCsrf } from '@core/utils/csrf';
import {
  Loader2,
  AlertCircle,
  Ticket,
  Calendar,
  MapPin,
  DollarSign,
  QrCode,
  RefreshCw,
} from 'lucide-react';
import type { EnrichedTicketPurchase } from '@features/events/types';

// ============================================================================
// STATUS BADGE
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Confirmed' },
    refunded: { bg: 'bg-red-100', text: 'text-red-800', label: 'Refunded' },
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
    failed: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Failed' },
    partially_refunded: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Partial Refund' },
  };
  const c = config[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: status };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

// ============================================================================
// TICKET CARD
// ============================================================================

interface TicketCardProps {
  ticket: EnrichedTicketPurchase;
  onRefund: (_purchase: EnrichedTicketPurchase) => void;
}

function TicketCard({ ticket, onRefund }: TicketCardProps) {
  const eventDate = new Date(ticket.event_start_date);
  const isPast = eventDate < new Date();
  const canRefund = ticket.payment_status === 'completed' && !isPast;

  const locationParts = [ticket.event_venue_name, ticket.event_city, ticket.event_state].filter(Boolean);
  const location = locationParts.join(', ');

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <a
              href={`/events/${ticket.event_slug}`}
              className="text-lg font-semibold text-gray-900 hover:text-[#ed6437] truncate"
            >
              {ticket.event_title}
            </a>
            <StatusBadge status={ticket.payment_status} />
          </div>

          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex items-center gap-1.5">
              <Ticket className="w-4 h-4 flex-shrink-0" />
              <span>{ticket.ticket_name} × {ticket.quantity}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>{eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            {location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{location}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">${ticket.total_amount.toFixed(2)} {ticket.currency.toUpperCase()}</span>
              {ticket.payment_status === 'refunded' && ticket.refund_amount && (
                <span className="text-red-600">(Refunded: ${ticket.refund_amount.toFixed(2)})</span>
              )}
            </div>
          </div>

          <div className="text-xs text-gray-400 mt-2">
            Purchased {ticket.purchased_at ? new Date(ticket.purchased_at).toLocaleDateString() : new Date(ticket.created_at).toLocaleDateString()}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {ticket.event_check_in_enabled && ticket.payment_status === 'completed' && (
            <a
              href={`/events/${ticket.event_slug}/check-in`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg"
              style={{ backgroundColor: '#ed6437' }}
            >
              <QrCode className="w-4 h-4" />
              QR Code
            </a>
          )}
          {canRefund && (
            <button
              onClick={() => onRefund(ticket)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refund
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN CONTENT
// ============================================================================

function PurchasesPageContent() {
  const [tickets, setTickets] = useState<EnrichedTicketPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refundTarget, setRefundTarget] = useState<EnrichedTicketPurchase | null>(null);
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/user/event-tickets', { credentials: 'include' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load tickets');
      }
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleRefund = async () => {
    if (!refundTarget) return;

    try {
      setIsRefunding(true);
      setRefundError(null);

      const res = await fetchWithCsrf(`/api/events/${refundTarget.event_id}/refunds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchase_id: refundTarget.id }),
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Refund request failed');
      }

      // Refresh tickets list
      setRefundTarget(null);
      await fetchTickets();
    } catch (err) {
      setRefundError(err instanceof Error ? err.message : 'Refund request failed');
    } finally {
      setIsRefunding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Purchased Tickets</h1>
        <p className="text-gray-600 mt-1">View your event ticket purchases and request refunds</p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#ed6437' }} />
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-red-900">Failed to Load Tickets</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={fetchTickets}
                className="mt-2 text-sm font-medium text-red-700 hover:text-red-800 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && tickets.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Purchased Tickets</h3>
          <p className="text-gray-500">
            When you purchase tickets for events, they&apos;ll appear here.
          </p>
          <a
            href="/events"
            className="inline-block mt-4 px-4 py-2 text-sm font-medium text-white rounded-lg"
            style={{ backgroundColor: '#ed6437' }}
          >
            Browse Events
          </a>
        </div>
      )}

      {/* Ticket cards */}
      {!isLoading && !error && tickets.length > 0 && (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onRefund={setRefundTarget}
            />
          ))}
        </div>
      )}

      {/* Refund Confirmation Modal */}
      {refundTarget && (
        <BizModal
          isOpen={true}
          onClose={() => { setRefundTarget(null); setRefundError(null); }}
          title="Confirm Refund"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to request a refund for this ticket purchase?
            </p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div><span className="font-medium">Event:</span> {refundTarget.event_title}</div>
              <div><span className="font-medium">Ticket:</span> {refundTarget.ticket_name} × {refundTarget.quantity}</div>
              <div><span className="font-medium">Refund Amount:</span> ${refundTarget.total_amount.toFixed(2)} {refundTarget.currency.toUpperCase()}</div>
            </div>
            <p className="text-xs text-gray-500">
              Refunds are processed via Stripe and may take 5-10 business days to appear on your statement.
            </p>

            {refundError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{refundError}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <BizModalButton
                variant="secondary"
                onClick={() => { setRefundTarget(null); setRefundError(null); }}
                disabled={isRefunding}
              >
                Cancel
              </BizModalButton>
              <BizModalButton
                variant="danger"
                onClick={handleRefund}
                disabled={isRefunding}
              >
                {isRefunding ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  'Confirm Refund'
                )}
              </BizModalButton>
            </div>
          </div>
        </BizModal>
      )}
    </div>
  );
}

export default function PurchasesPage() {
  return (
    <ErrorBoundary componentName="DashboardPurchasesPage">
      <PurchasesPageContent />
    </ErrorBoundary>
  );
}
