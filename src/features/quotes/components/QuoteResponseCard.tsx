/**
 * QuoteResponseCard Component
 *
 * SIMPLE tier component - Single bid/response display card
 *
 * @tier SIMPLE
 * @phase Phase 3A - Quote System Foundation
 * @generated DNA v11.4.0
 */

'use client';

import React from 'react';
import { Clock, DollarSign, User, Calendar } from 'lucide-react';
import { QuoteStatusBadge } from './QuoteStatusBadge';
import type { QuoteResponse } from '../types';

interface QuoteResponseCardProps {
  response: QuoteResponse;
  isRequester: boolean;
  onAccept?: (_id: number) => void;
  onReject?: (_id: number) => void;
  onMessage?: (_id: number) => void;
}

export function QuoteResponseCard({
  response,
  isRequester,
  onAccept,
  onReject,
  onMessage
}: QuoteResponseCardProps) {
  const formattedDate = new Date(response.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const canAcceptReject = isRequester && response.status === 'pending';

  return (
    <div className="p-4 rounded-xl border border-gray-200 bg-white">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {response.responderName ?? 'Vendor'}
            </p>
            {response.listingName && (
              <p className="text-xs text-gray-500">{response.listingName}</p>
            )}
          </div>
        </div>
        <QuoteStatusBadge status={response.status} />
      </div>

      <p className="text-sm text-gray-700 mb-3">{response.bidDescription}</p>

      <div className="flex flex-wrap gap-3 mb-3">
        {response.bidAmount !== null && response.bidAmount !== undefined && (
          <span className="flex items-center gap-1 text-sm font-semibold text-green-700">
            <DollarSign className="w-4 h-4" />
            {response.bidAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
          </span>
        )}

        {response.estimatedDuration && (
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            {response.estimatedDuration}
          </span>
        )}

        {response.validUntil && (
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5" />
            Valid until {new Date(response.validUntil).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{formattedDate}</span>

        <div className="flex gap-2">
          {onMessage && (
            <button
              onClick={() => onMessage(response.id)}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Message
            </button>
          )}

          {canAcceptReject && (
            <>
              {onReject && (
                <button
                  onClick={() => onReject(response.id)}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Decline
                </button>
              )}
              {onAccept && (
                <button
                  onClick={() => onAccept(response.id)}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Accept
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
