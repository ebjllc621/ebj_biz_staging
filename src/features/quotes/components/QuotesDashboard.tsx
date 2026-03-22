/**
 * QuotesDashboard Component
 *
 * STANDARD tier component - Main quotes management page with tabs
 *
 * @tier STANDARD
 * @phase Phase 3A - Quote System Foundation
 * @generated DNA v11.4.0
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { FileText, Inbox, TrendingUp, Plus } from 'lucide-react';
import { QuoteCard } from './QuoteCard';
import { QuoteDetailPanel } from './QuoteDetailPanel';
import { CreateQuoteModal } from './CreateQuoteModal';
import { QuoteReceivedList } from './QuoteReceivedList';
import type { Quote, QuoteDashboardSummary } from '../types';

type DashboardTab = 'my-quotes' | 'received' | 'summary';

interface StatCardProps {
  label: string;
  value: number;
  sub?: string;
}

function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function QuotesDashboardContent({ userId }: { userId: number }) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('my-quotes');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [summary, setSummary] = useState<QuoteDashboardSummary | null>(null);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQuotes = useCallback(async () => {
    setIsLoadingQuotes(true);
    setError(null);
    try {
      const res = await fetch('/api/quotes', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setQuotes(data.data.items ?? []);
      } else {
        setError(data.error?.message || 'Failed to load quotes');
      }
    } catch {
      setError('Failed to load quotes');
    } finally {
      setIsLoadingQuotes(false);
    }
  }, []);

  const loadSummary = useCallback(async () => {
    setIsLoadingSummary(true);
    try {
      const res = await fetch('/api/quotes/dashboard', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setSummary(data.data.summary);
      }
    } catch {
      // Non-blocking
    } finally {
      setIsLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    loadQuotes();
    loadSummary();
  }, [loadQuotes, loadSummary]);

  const handleQuoteCreated = (quote: Quote) => {
    setQuotes((prev) => [quote, ...prev]);
    setSelectedQuote(quote);
    setActiveTab('my-quotes');
    loadSummary();
  };

  const tabs: { id: DashboardTab; label: string; icon: React.ReactNode }[] = [
    { id: 'my-quotes', label: 'My Quotes', icon: <FileText className="w-4 h-4" /> },
    { id: 'received', label: 'Received', icon: <Inbox className="w-4 h-4" /> },
    { id: 'summary', label: 'Summary', icon: <TrendingUp className="w-4 h-4" /> }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
          <p className="text-gray-600 mt-1">Manage quote requests and bids</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Quote
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* My Quotes Tab */}
      {activeTab === 'my-quotes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quote List */}
          <div className="lg:col-span-1 space-y-2">
            {isLoadingQuotes ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : quotes.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 mb-3">No quotes yet.</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Create your first quote
                </button>
              </div>
            ) : (
              quotes.map((quote) => (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  onClick={setSelectedQuote}
                  selected={selectedQuote?.id === quote.id}
                />
              ))
            )}
          </div>

          {/* Quote Detail */}
          <div className="lg:col-span-2">
            {selectedQuote ? (
              <QuoteDetailPanel
                quote={selectedQuote}
                currentUserId={userId}
                onQuoteUpdated={(updated) => {
                  setSelectedQuote(updated);
                  setQuotes((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
                }}
              />
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <FileText className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-sm text-gray-400">Select a quote to view details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Received Tab */}
      {activeTab === 'received' && <QuoteReceivedList />}

      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {isLoadingSummary ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : summary ? (
            <>
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-3">My Quote Requests</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard label="Total Sent" value={summary.sentQuotes.total} />
                  <StatCard label="Open" value={summary.sentQuotes.open} sub="Awaiting bids" />
                  <StatCard label="In Progress" value={summary.sentQuotes.inProgress} sub="Bid accepted" />
                  <StatCard label="Completed" value={summary.sentQuotes.completed} />
                </div>
              </div>

              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Received Requests</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <StatCard label="Total Received" value={summary.receivedRequests.total} />
                  <StatCard label="Pending" value={summary.receivedRequests.pending} sub="Need response" />
                  <StatCard label="Responded" value={summary.receivedRequests.responded} />
                </div>
              </div>

              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-3">My Bids</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <StatCard label="Total Bids" value={summary.myResponses.total} />
                  <StatCard label="Pending" value={summary.myResponses.pending} sub="Awaiting decision" />
                  <StatCard label="Accepted" value={summary.myResponses.accepted} />
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No summary data available.</p>
          )}
        </div>
      )}

      {/* Create Quote Modal */}
      <CreateQuoteModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onQuoteCreated={handleQuoteCreated}
      />
    </div>
  );
}

export function QuotesDashboard({ userId }: { userId: number }) {
  return (
    <ErrorBoundary componentName="QuotesDashboard">
      <QuotesDashboardContent userId={userId} />
    </ErrorBoundary>
  );
}
