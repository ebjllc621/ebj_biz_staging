/**
 * EventTicketSelector - Ticket tier selection for RSVP flow + purchase
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 5A - Extended with purchase button for native ticketing
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { TicketTierDisplay } from '@features/events/types';

interface EventTicketSelectorProps {
  eventId: number;
  onTicketSelect: (_ticketId: number | null) => void;
  selectedTicketId: number | null;
  /** When true, shows a "Buy Ticket" button that triggers Stripe checkout */
  allowPurchase?: boolean;
  /** Event slug for redirect URLs (required when allowPurchase is true) */
  eventSlug?: string;
}

function EventTicketSelectorInner({
  eventId,
  onTicketSelect,
  selectedTicketId,
  allowPurchase = false,
}: EventTicketSelectorProps) {
  const [tickets, setTickets] = useState<TicketTierDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`/api/events/${eventId}/tickets`, {
          credentials: 'include'
        });
        if (!res.ok) {
          throw new Error('Failed to load ticket options');
        }
        const data = await res.json();
        // API returns { data: { tickets: TicketTier[] } }
        const rawTickets = data.data?.tickets || [];
        // Map to TicketTierDisplay with computed fields
        const mapped: TicketTierDisplay[] = rawTickets.map((t: {
          id: number;
          event_id: number;
          ticket_name: string;
          ticket_price: number;
          quantity_total: number;
          quantity_sold: number;
        }) => ({
          ...t,
          remaining: t.quantity_total - t.quantity_sold,
          soldOut: t.quantity_sold >= t.quantity_total
        }));
        setTickets(mapped);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tickets');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTickets();
  }, [eventId]);

  const handlePurchase = async () => {
    if (!selectedTicketId || isPurchasing) return;

    setIsPurchasing(true);
    setPurchaseError(null);

    try {
      const res = await fetchWithCsrf(`/api/events/${eventId}/tickets/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ticket_id: selectedTicketId,
          quantity: 1,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to create checkout session');
      }

      const checkoutUrl = data.data?.checkout_url;
      if (checkoutUrl) {
        // Redirect to Stripe hosted checkout
        window.location.href = checkoutUrl;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      setPurchaseError(err instanceof Error ? err.message : 'Purchase failed');
      setIsPurchasing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-16 bg-gray-100 rounded-lg" />
        <div className="h-16 bg-gray-100 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
    );
  }

  if (tickets.length === 0) {
    return (
      <p className="text-sm text-gray-500">No ticket tiers available.</p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700">Select a ticket type:</p>
      {tickets.map((ticket) => {
        const isSelected = selectedTicketId === ticket.id;
        const isSoldOut = ticket.soldOut;

        return (
          <button
            key={ticket.id}
            type="button"
            disabled={isSoldOut}
            onClick={() => onTicketSelect(isSoldOut ? null : (isSelected ? null : ticket.id))}
            className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
              isSoldOut
                ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                : isSelected
                  ? 'border-biz-orange bg-orange-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Radio indicator */}
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                  isSelected
                    ? 'border-biz-orange bg-biz-orange'
                    : 'border-gray-300 bg-white'
                }`}>
                  {isSelected && (
                    <div className="w-2 h-2 bg-white rounded-full m-auto mt-0.5" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{ticket.ticket_name}</p>
                  <p className="text-xs text-gray-500">
                    {ticket.remaining} of {ticket.quantity_total} remaining
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isSoldOut && (
                  <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                    SOLD OUT
                  </span>
                )}
                <p className="text-sm font-semibold text-gray-900">
                  {ticket.ticket_price === 0 ? 'Free' : `$${Number(ticket.ticket_price).toFixed(2)}`}
                </p>
              </div>
            </div>
          </button>
        );
      })}

      {/* Phase 5A: Purchase button for native ticketing */}
      {allowPurchase && selectedTicketId && (
        <div className="pt-2">
          {purchaseError && (
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg mb-2">
              {purchaseError}
            </p>
          )}
          <button
            type="button"
            onClick={handlePurchase}
            disabled={isPurchasing}
            className="w-full py-2.5 px-4 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a30] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {isPurchasing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Buy Ticket
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export function EventTicketSelector(props: EventTicketSelectorProps) {
  return (
    <ErrorBoundary componentName="EventTicketSelector">
      <EventTicketSelectorInner {...props} />
    </ErrorBoundary>
  );
}

export default EventTicketSelector;
