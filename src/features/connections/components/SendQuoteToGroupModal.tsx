/**
 * SendQuoteToGroupModal Component
 * BizModal to select a quote and send it to all group members
 *
 * GOVERNANCE COMPLIANCE:
 * - STANDARD tier component (100-300 lines) with ErrorBoundary
 * - Uses BizModal for branded modal experience
 * - CSRF protection via fetchWithCsrf
 * - Client Component ('use client')
 *
 * @tier STANDARD
 * @phase Connection Groups Feature - Phase 3B
 * @generated ComponentBuilder
 */

'use client';

import React, { useState, useEffect } from 'react';
import BizModal from '@/components/BizModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { fetchWithCsrf } from '@core/utils/csrf';
import { Send, Loader2 } from 'lucide-react';
import type { Quote } from '@features/quotes/types';

export interface SendQuoteToGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: number;
  groupName: string;
  onSent?: () => void;
}

function SendQuoteToGroupModalContent({
  isOpen,
  onClose,
  groupId,
  groupName,
  onSent
}: SendQuoteToGroupModalProps) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      void loadQuotes();
    }
  }, [isOpen]);

  const loadQuotes = async () => {
    setIsLoadingQuotes(true);
    setError(null);

    try {
      const response = await fetch('/api/users/quotes?status=open&limit=50', {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        setQuotes(result.data.items || result.data.quotes || []);
      }
    } catch {
      setError('Failed to load your quotes');
    } finally {
      setIsLoadingQuotes(false);
    }
  };

  const handleSend = async () => {
    if (!selectedQuoteId) {
      setError('Please select a quote');
      return;
    }

    setError(null);
    setIsSending(true);

    try {
      const response = await fetchWithCsrf(
        `/api/users/connections/groups/${groupId}/quote-pool/send`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quoteId: selectedQuoteId,
            message: message.trim() || undefined
          })
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to send quote');
      }

      onSent?.();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send quote');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setSelectedQuoteId(null);
    setMessage('');
    setError(null);
    onClose();
  };

  const selectedQuote = quotes.find((q) => q.id === selectedQuoteId);

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Send Quote to ${groupName}`}
      size="medium"
    >
      <div className="space-y-4">
        {isLoadingQuotes ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : quotes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No open quotes available.</p>
            <p className="text-gray-400 text-xs mt-1">
              Create a quote first, then send it to the group.
            </p>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Quote *
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {quotes.map((quote) => (
                  <button
                    key={quote.id}
                    type="button"
                    onClick={() => setSelectedQuoteId(quote.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedQuoteId === quote.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900">{quote.title}</p>
                    {quote.serviceCategory && (
                      <p className="text-xs text-gray-500 mt-0.5">{quote.serviceCategory}</p>
                    )}
                    {(quote.budgetMin || quote.budgetMax) && (
                      <p className="text-xs text-blue-600 mt-0.5">
                        Budget: ${quote.budgetMin ?? 0} - ${quote.budgetMax ?? '...'}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {selectedQuote && (
              <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
                <p>
                  Sending <span className="font-medium">{selectedQuote.title}</span> to all
                  members of <span className="font-medium">{groupName}</span>. Members with active
                  listings will receive individual quote requests.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message (optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Add a personal note to the group members..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                disabled={isSending}
              />
              <p className="text-xs text-gray-400 mt-1">{message.length}/500</p>
            </div>
          </>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSending}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={isSending || !selectedQuoteId || isLoadingQuotes}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send to Group
              </>
            )}
          </button>
        </div>
      </div>
    </BizModal>
  );
}

export function SendQuoteToGroupModal(props: SendQuoteToGroupModalProps) {
  return (
    <ErrorBoundary
      componentName="SendQuoteToGroupModal"
      fallback={
        <div className="p-4 text-red-600 text-sm">
          Error loading send quote form. Please close and try again.
        </div>
      }
    >
      <SendQuoteToGroupModalContent {...props} />
    </ErrorBoundary>
  );
}
