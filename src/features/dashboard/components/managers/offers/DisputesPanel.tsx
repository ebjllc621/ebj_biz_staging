/**
 * DisputesPanel - Read-only view of offer disputes for business owners
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 6 - Dispute Resolution
 * @governance Build Map v2.1 ENHANCED
 *
 * Business owners can view disputes raised against their offers.
 * Resolution is admin-only — this panel is read-only.
 * Fetches from GET /api/offers/[id]/dispute for each offer.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import type { OfferDispute } from '@features/offers/types';

// ============================================================================
// TYPES
// ============================================================================

interface DisputeWithOfferContext extends OfferDispute {
  offerId: number;
  offerTitle: string;
}

interface OfferSummary {
  id: number;
  title: string;
}

interface DisputesPanelProps {
  listingId: number;
}

// ============================================================================
// STATUS BADGE
// ============================================================================

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-800',
  investigating: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-800'
      }`}
    >
      {status}
    </span>
  );
}

// ============================================================================
// DISPUTE CARD
// ============================================================================

function DisputeCard({ dispute }: { dispute: DisputeWithOfferContext }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      <button
        onClick={() => setIsExpanded(prev => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <StatusBadge status={dispute.status} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {dispute.offerTitle}
            </p>
            <p className="text-xs text-gray-500">
              {dispute.reason.replace(/_/g, ' ')} &middot;{' '}
              {new Date(dispute.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100 space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Reason
            </p>
            <p className="text-sm text-gray-700">
              {dispute.reason.replace(/_/g, ' ')}
            </p>
          </div>

          {dispute.details && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Customer Details
              </p>
              <p className="text-sm text-gray-700">{dispute.details}</p>
            </div>
          )}

          {dispute.resolution && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Resolution
              </p>
              <p className="text-sm text-gray-700">{dispute.resolution}</p>
            </div>
          )}

          {dispute.resolved_at && (
            <p className="text-xs text-gray-400">
              Resolved: {new Date(dispute.resolved_at).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PANEL CONTENT
// ============================================================================

function DisputesPanelContent({ listingId }: DisputesPanelProps) {
  const [disputes, setDisputes] = useState<DisputeWithOfferContext[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDisputes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get all offers for this listing first
      const offersResponse = await fetch(
        `/api/offers?listingId=${listingId}&limit=100`,
        { credentials: 'include' }
      );

      if (!offersResponse.ok) {
        throw new Error('Failed to load offers');
      }

      const offersResult = await offersResponse.json();
      const offers: OfferSummary[] = (offersResult.data?.data ?? []).map(
        (o: { id: number; title: string }) => ({ id: o.id, title: o.title })
      );

      if (offers.length === 0) {
        setDisputes([]);
        return;
      }

      // Fetch disputes for each offer in parallel
      const disputeRequests = offers.map(async (offer) => {
        try {
          const res = await fetch(`/api/offers/${offer.id}/dispute`, {
            credentials: 'include',
          });
          if (!res.ok) return [];
          const result = await res.json();
          const offerDisputes: OfferDispute[] = result.data ?? [];
          return offerDisputes.map(d => ({
            ...d,
            offerId: offer.id,
            offerTitle: offer.title,
          }));
        } catch {
          return [];
        }
      });

      const results = await Promise.all(disputeRequests);
      const allDisputes = results.flat();

      // Sort by created_at descending
      allDisputes.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setDisputes(allDisputes);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load disputes'
      );
    } finally {
      setIsLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-[#ed6437] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (disputes.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="font-medium text-gray-700">No disputes</p>
        <p className="text-sm mt-1">
          Disputes filed by customers on your offers will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        {disputes.length} dispute{disputes.length !== 1 ? 's' : ''} found
      </p>
      {disputes.map(dispute => (
        <DisputeCard key={dispute.id} dispute={dispute} />
      ))}
    </div>
  );
}

// ============================================================================
// PUBLIC EXPORT (with ErrorBoundary)
// ============================================================================

export function DisputesPanel({ listingId }: DisputesPanelProps) {
  return (
    <ErrorBoundary componentName="DisputesPanel">
      <DisputesPanelContent listingId={listingId} />
    </ErrorBoundary>
  );
}

export default DisputesPanel;
