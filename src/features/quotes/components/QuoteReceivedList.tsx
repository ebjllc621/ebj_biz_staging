/**
 * QuoteReceivedList Component
 *
 * STANDARD tier component - List of received quote requests with action buttons
 *
 * @tier STANDARD
 * @phase Phase 3A - Quote System Foundation
 * @generated DNA v11.4.0
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Inbox, Eye, XCircle } from 'lucide-react';
import { QuoteStatusBadge } from './QuoteStatusBadge';
import { SubmitBidModal } from './SubmitBidModal';
import type { QuoteRequest } from '../types';

interface QuoteRequestWithQuote extends QuoteRequest {
  quoteTitle?: string;
  quoteDescription?: string;
  quoteId: number;
}

function QuoteReceivedListContent() {
  const [requests, setRequests] = useState<QuoteRequestWithQuote[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<QuoteRequestWithQuote | null>(null);
  const [showBidModal, setShowBidModal] = useState(false);

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/quotes/received', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setRequests(data.data.items ?? []);
        setTotal(data.data.total ?? 0);
      } else {
        setError(data.error?.message || 'Failed to load received requests');
      }
    } catch {
      setError('Failed to load received requests');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleMarkViewed = async (requestId: number) => {
    // Optimistic update - mark as viewed locally
    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'viewed' as const } : r))
    );
  };

  const handleDecline = async (requestId: number) => {
    // Optimistic update - mark as declined locally
    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'declined' as const } : r))
    );
  };

  const handleBidSubmitted = () => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === selectedRequest?.id ? { ...r, status: 'responded' } : r
      )
    );
    setShowBidModal(false);
    setSelectedRequest(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Inbox className="w-5 h-5 text-gray-500" />
          <h2 className="text-base font-semibold text-gray-900">Received Requests</h2>
          {total > 0 && (
            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
              {total}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No quote requests received yet.</p>
          <p className="text-xs text-gray-400 mt-1">
            When businesses or users request quotes from your listings, they appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div key={request.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {request.quoteTitle && (
                    <h3 className="text-sm font-semibold text-gray-900 truncate mb-1">
                      {request.quoteTitle}
                    </h3>
                  )}
                  {request.quoteDescription && (
                    <p className="text-xs text-gray-600 line-clamp-2">{request.quoteDescription}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Received {new Date(request.invitedAt).toLocaleDateString()}
                  </p>
                </div>
                <QuoteStatusBadge status={request.status} />
              </div>

              {request.status !== 'declined' && request.status !== 'responded' && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                  {request.status === 'pending' && (
                    <button
                      onClick={() => handleMarkViewed(request.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Mark Viewed
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedRequest(request);
                      setShowBidModal(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Submit Bid
                  </button>

                  <button
                    onClick={() => handleDecline(request.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors ml-auto"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Decline
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedRequest && (
        <SubmitBidModal
          isOpen={showBidModal}
          onClose={() => {
            setShowBidModal(false);
            setSelectedRequest(null);
          }}
          quoteId={selectedRequest.quoteId}
          quoteRequestId={selectedRequest.id}
          quoteTitle={selectedRequest.quoteTitle ?? 'Quote Request'}
          onBidSubmitted={handleBidSubmitted}
        />
      )}
    </div>
  );
}

export function QuoteReceivedList() {
  return (
    <ErrorBoundary componentName="QuoteReceivedList">
      <QuoteReceivedListContent />
    </ErrorBoundary>
  );
}
