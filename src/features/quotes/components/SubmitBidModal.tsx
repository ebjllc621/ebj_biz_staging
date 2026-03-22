/**
 * SubmitBidModal Component
 *
 * STANDARD tier component - BizModal form for submitting a bid
 *
 * @tier STANDARD
 * @phase Phase 3A - Quote System Foundation
 * @generated DNA v11.4.0
 * @reference src/features/connections/components/CreateGroupModal.tsx
 */

'use client';

import React, { useState } from 'react';
import BizModal from '@/components/BizModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { fetchWithCsrf } from '@core/utils/csrf';
import { DollarSign } from 'lucide-react';
import type { CreateQuoteResponseInput, QuoteResponse } from '../types';

interface SubmitBidModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteId: number;
  quoteRequestId?: number;
  quoteTitle: string;
  onBidSubmitted: (_submittedBid: QuoteResponse) => void;
}

export function SubmitBidModal({
  isOpen,
  onClose,
  quoteId,
  quoteRequestId,
  quoteTitle,
  onBidSubmitted
}: SubmitBidModalProps) {
  const [bidAmount, setBidAmount] = useState('');
  const [bidDescription, setBidDescription] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!bidDescription.trim()) {
      setError('Bid description is required');
      return;
    }

    setIsLoading(true);

    try {
      const input: CreateQuoteResponseInput = {
        quoteId,
        quoteRequestId,
        bidAmount: bidAmount ? parseFloat(bidAmount) : undefined,
        bidDescription: bidDescription.trim(),
        estimatedDuration: estimatedDuration.trim() || undefined,
        validUntil: validUntil || undefined
      };

      const response = await fetchWithCsrf(`/api/quotes/${quoteId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to submit bid');
      }

      onBidSubmitted(result.data.response);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit bid');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setBidAmount('');
    setBidDescription('');
    setEstimatedDuration('');
    setValidUntil('');
    setError(null);
    onClose();
  };

  return (
    <BizModal isOpen={isOpen} onClose={handleClose} title="Submit Your Bid" subtitle={quoteTitle} size="medium">
      <ErrorBoundary
        componentName="SubmitBidModal"
        fallback={<div className="p-4 text-red-600">Error loading form. Please close and try again.</div>}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Bid Amount */}
          <div>
            <label htmlFor="bid-amount" className="block text-sm font-medium text-gray-700 mb-1">
              Bid Amount ($)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                id="bid-amount"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Leave blank if you prefer to discuss pricing</p>
          </div>

          {/* Bid Description */}
          <div>
            <label htmlFor="bid-description" className="block text-sm font-medium text-gray-700 mb-1">
              Bid Description *
            </label>
            <textarea
              id="bid-description"
              value={bidDescription}
              onChange={(e) => setBidDescription(e.target.value)}
              rows={4}
              placeholder="Describe your approach, experience, and why you're the right fit..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={isLoading}
              required
            />
          </div>

          {/* Estimated Duration */}
          <div>
            <label htmlFor="bid-duration" className="block text-sm font-medium text-gray-700 mb-1">
              Estimated Duration
            </label>
            <input
              type="text"
              id="bid-duration"
              value={estimatedDuration}
              onChange={(e) => setEstimatedDuration(e.target.value)}
              placeholder="e.g., 2-3 days, 1 week"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>

          {/* Valid Until */}
          <div>
            <label htmlFor="bid-valid-until" className="block text-sm font-medium text-gray-700 mb-1">
              Bid Valid Until
            </label>
            <input
              type="date"
              id="bid-valid-until"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              disabled={isLoading || !bidDescription.trim()}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Bid'
              )}
            </button>
          </div>
        </form>
      </ErrorBoundary>
    </BizModal>
  );
}
