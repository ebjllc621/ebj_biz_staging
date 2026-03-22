/**
 * QuoteCard Component
 *
 * SIMPLE tier component - Single quote summary card
 *
 * @tier SIMPLE
 * @phase Phase 3A - Quote System Foundation
 * @generated DNA v11.4.0
 */

'use client';

import React from 'react';
import { MessageSquare, FileText, Calendar } from 'lucide-react';
import { QuoteStatusBadge } from './QuoteStatusBadge';
import type { Quote } from '../types';

interface QuoteCardProps {
  quote: Quote;
  onClick?: (_clickedQuote: Quote) => void;
  selected?: boolean;
}

export function QuoteCard({ quote, onClick, selected = false }: QuoteCardProps) {
  const handleClick = () => {
    onClick?.(quote);
  };

  const formattedDate = new Date(quote.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const budgetDisplay = quote.budgetMin || quote.budgetMax
    ? [
        quote.budgetMin ? `$${quote.budgetMin.toLocaleString()}` : null,
        quote.budgetMax ? `$${quote.budgetMax.toLocaleString()}` : null
      ]
        .filter(Boolean)
        .join(' - ')
    : null;

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        selected
          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <h3 className="text-sm font-semibold text-gray-900 truncate">{quote.title}</h3>
          </div>

          {quote.serviceCategory && (
            <p className="text-xs text-gray-500 mb-2">{quote.serviceCategory}</p>
          )}

          <p className="text-xs text-gray-600 line-clamp-2">{quote.description}</p>

          <div className="flex items-center gap-3 mt-2">
            {budgetDisplay && (
              <span className="text-xs text-green-700 font-medium">{budgetDisplay}</span>
            )}

            {(quote.responseCount ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <MessageSquare className="w-3 h-3" />
                {quote.responseCount} {quote.responseCount === 1 ? 'bid' : 'bids'}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <QuoteStatusBadge status={quote.status} />
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Calendar className="w-3 h-3" />
            {formattedDate}
          </span>
        </div>
      </div>
    </button>
  );
}
