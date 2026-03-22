/**
 * QuoteDetailPanel Component
 *
 * STANDARD tier component - Full quote details view with tabs
 *
 * @tier STANDARD
 * @phase Phase 3A - Quote System Foundation
 * @generated DNA v11.4.0
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Calendar, MapPin, DollarSign, Clock, FileText } from 'lucide-react';
import { fetchWithCsrf } from '@core/utils/csrf';
import { QuoteStatusBadge } from './QuoteStatusBadge';
import { QuoteResponseCard } from './QuoteResponseCard';
import { QuoteMessageThread } from './QuoteMessageThread';
import { SubmitBidModal } from './SubmitBidModal';
import type { Quote, QuoteResponse, QuoteMessage } from '../types';

type Tab = 'details' | 'responses' | 'messages';

interface QuoteDetailPanelProps {
  quote: Quote;
  currentUserId: number;
  onQuoteUpdated?: (_updatedQuote: Quote) => void;
}

function QuoteDetailPanelContent({ quote, currentUserId }: QuoteDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [responses, setResponses] = useState<QuoteResponse[]>([]);
  const [messages, setMessages] = useState<QuoteMessage[]>([]);
  const [isLoadingResponses, setIsLoadingResponses] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRequester = quote.requesterUserId === currentUserId;

  const loadResponses = useCallback(async () => {
    setIsLoadingResponses(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/responses`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setResponses(data.data.items ?? []);
      }
    } catch {
      setError('Failed to load responses');
    } finally {
      setIsLoadingResponses(false);
    }
  }, [quote.id]);

  const loadMessages = useCallback(async () => {
    setIsLoadingMessages(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/messages`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setMessages(data.data.messages ?? []);
      }
    } catch {
      // Non-blocking
    } finally {
      setIsLoadingMessages(false);
    }
  }, [quote.id]);

  useEffect(() => {
    if (activeTab === 'responses') loadResponses();
    if (activeTab === 'messages') loadMessages();
  }, [activeTab, loadResponses, loadMessages]);

  const handleAccept = async (responseId: number) => {
    try {
      const res = await fetchWithCsrf(`/api/quotes/${quote.id}/responses/${responseId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        loadResponses();
      }
    } catch {
      setError('Failed to accept response');
    }
  };

  const handleReject = async (responseId: number) => {
    try {
      const res = await fetchWithCsrf(`/api/quotes/${quote.id}/responses/${responseId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        loadResponses();
      }
    } catch {
      setError('Failed to reject response');
    }
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'details', label: 'Details' },
    { id: 'responses', label: 'Bids', count: quote.responseCount },
    { id: 'messages', label: 'Messages' }
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <h2 className="text-lg font-bold text-gray-900 truncate">{quote.title}</h2>
            </div>
            {quote.serviceCategory && (
              <p className="text-sm text-gray-500">{quote.serviceCategory}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <QuoteStatusBadge status={quote.status} size="md" />
            {!isRequester && quote.status === 'open' && (
              <button
                onClick={() => setShowBidModal(true)}
                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Submit Bid
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.count ? (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                {tab.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700 leading-relaxed">{quote.description}</p>

            <div className="grid grid-cols-2 gap-4">
              {(quote.budgetMin || quote.budgetMax) && (
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Budget</p>
                    <p className="text-sm font-medium text-gray-900">
                      {[
                        quote.budgetMin ? `$${quote.budgetMin.toLocaleString()}` : null,
                        quote.budgetMax ? `$${quote.budgetMax.toLocaleString()}` : null
                      ]
                        .filter(Boolean)
                        .join(' - ')}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Timeline</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {quote.timeline.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>

              {(quote.locationCity || quote.locationState) && (
                <div className="flex items-center gap-2 col-span-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Location</p>
                    <p className="text-sm font-medium text-gray-900">
                      {[quote.locationCity, quote.locationState].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Posted</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(quote.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Responses Tab */}
        {activeTab === 'responses' && (
          <div className="space-y-3">
            {isLoadingResponses ? (
              <div className="py-8 text-center">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : responses.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No bids yet.</p>
            ) : (
              responses.map((response) => (
                <QuoteResponseCard
                  key={response.id}
                  response={response}
                  isRequester={isRequester}
                  onAccept={isRequester ? handleAccept : undefined}
                  onReject={isRequester ? handleReject : undefined}
                />
              ))
            )}
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="h-96 -mx-6 -mb-6">
            {isLoadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <QuoteMessageThread
                quoteId={quote.id}
                messages={messages}
                currentUserId={currentUserId}
                onMessageSent={(msg) => setMessages((prev) => [...prev, msg])}
              />
            )}
          </div>
        )}
      </div>

      {/* Submit Bid Modal */}
      <SubmitBidModal
        isOpen={showBidModal}
        onClose={() => setShowBidModal(false)}
        quoteId={quote.id}
        quoteTitle={quote.title}
        onBidSubmitted={(response) => {
          setResponses((prev) => [...prev, response]);
          setShowBidModal(false);
          setActiveTab('responses');
        }}
      />
    </div>
  );
}

export function QuoteDetailPanel(props: QuoteDetailPanelProps) {
  return (
    <ErrorBoundary componentName="QuoteDetailPanel">
      <QuoteDetailPanelContent {...props} />
    </ErrorBoundary>
  );
}
