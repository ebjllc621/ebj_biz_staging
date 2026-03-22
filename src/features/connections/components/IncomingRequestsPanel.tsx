'use client';

/**
 * @tier STANDARD
 * @component IncomingRequestsPanel
 * @description Panel component displaying incoming connection requests with accept/decline actions
 * @governance Build Map v2.1 ENHANCED compliant | UMM compliant | Service Architecture v2.0
 */

import { useState } from 'react';
import { ConnectionRequest } from '../types';
import { RequestCard } from './RequestCard';
import { ErrorService } from '@core/services/ErrorService';

interface IncomingRequestsPanelProps {
  requests: ConnectionRequest[];
  isLoading: boolean;
  onAccept: (requestId: number) => Promise<void>;
  onDecline: (requestId: number) => Promise<void>;
  onRequestsChange: () => void;
}

export function IncomingRequestsPanel({
  requests,
  isLoading,
  onAccept,
  onDecline,
  onRequestsChange
}: IncomingRequestsPanelProps) {
  const [loadingRequestId, setLoadingRequestId] = useState<number | null>(null);

  const handleAccept = async (requestId: number) => {
    try {
      setLoadingRequestId(requestId);
      await onAccept(requestId);
      onRequestsChange();
    } catch (error) {
      ErrorService.capture('Error accepting request:', error);
    } finally {
      setLoadingRequestId(null);
    }
  };

  const handleDecline = async (requestId: number) => {
    try {
      setLoadingRequestId(requestId);
      await onDecline(requestId);
      onRequestsChange();
    } catch (error) {
      ErrorService.capture('Error declining request:', error);
    } finally {
      setLoadingRequestId(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Panel Header */}
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Incoming Requests</h2>
        {requests.length > 0 && (
          <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            {requests.length}
          </span>
        )}
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      ) : requests.length === 0 ? (
        /* Empty State */
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <p className="mt-4 text-sm text-gray-500">No pending requests</p>
        </div>
      ) : (
        /* Request List */
        <div className="space-y-4">
          {requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              type="incoming"
              onAccept={() => handleAccept(request.id)}
              onDecline={() => handleDecline(request.id)}
              isLoading={loadingRequestId === request.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
