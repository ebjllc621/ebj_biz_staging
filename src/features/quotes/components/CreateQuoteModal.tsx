/**
 * CreateQuoteModal Component
 *
 * STANDARD tier component - BizModal form for creating a quote
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
import { FileText } from 'lucide-react';
import type { CreateQuoteInput, Quote, QuoteTimeline, QuoteVisibility } from '../types';

interface CreateQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuoteCreated: (_createdQuote: Quote) => void;
}

const TIMELINE_OPTIONS: { value: QuoteTimeline; label: string }[] = [
  { value: 'asap', label: 'As Soon As Possible' },
  { value: '1_week', label: 'Within 1 Week' },
  { value: '2_weeks', label: 'Within 2 Weeks' },
  { value: '1_month', label: 'Within 1 Month' },
  { value: 'flexible', label: 'Flexible' }
];

const VISIBILITY_OPTIONS: { value: QuoteVisibility; label: string; description: string }[] = [
  { value: 'direct', label: 'Direct', description: 'Send to specific businesses' },
  { value: 'group', label: 'Group', description: 'Send to a connection group' },
  { value: 'public', label: 'Public', description: 'Visible to any vendor' }
];

export function CreateQuoteModal({ isOpen, onClose, onQuoteCreated }: CreateQuoteModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [timeline, setTimeline] = useState<QuoteTimeline>('flexible');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [locationState, setLocationState] = useState('');
  const [visibility, setVisibility] = useState<QuoteVisibility>('direct');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    setIsLoading(true);

    try {
      const input: CreateQuoteInput = {
        title: title.trim(),
        description: description.trim(),
        serviceCategory: serviceCategory.trim() || undefined,
        timeline,
        budgetMin: budgetMin ? parseFloat(budgetMin) : undefined,
        budgetMax: budgetMax ? parseFloat(budgetMax) : undefined,
        locationCity: locationCity.trim() || undefined,
        locationState: locationState.trim() || undefined,
        visibility
      };

      const response = await fetchWithCsrf('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to create quote');
      }

      onQuoteCreated(result.data.quote);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create quote');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setServiceCategory('');
    setTimeline('flexible');
    setBudgetMin('');
    setBudgetMax('');
    setLocationCity('');
    setLocationState('');
    setVisibility('direct');
    setError(null);
    onClose();
  };

  return (
    <BizModal isOpen={isOpen} onClose={handleClose} title="Request a Quote" size="large">
      <ErrorBoundary
        componentName="CreateQuoteModal"
        fallback={<div className="p-4 text-red-600">Error loading form. Please close and try again.</div>}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="quote-title" className="block text-sm font-medium text-gray-700 mb-1">
              What do you need? *
            </label>
            <input
              type="text"
              id="quote-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="e.g., HVAC Repair, Website Design, Landscaping"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="quote-description" className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              id="quote-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe your project in detail..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={isLoading}
              required
            />
          </div>

          {/* Service Category & Timeline */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="quote-category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <input
                type="text"
                id="quote-category"
                value={serviceCategory}
                onChange={(e) => setServiceCategory(e.target.value)}
                placeholder="e.g., HVAC, Plumbing"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="quote-timeline" className="block text-sm font-medium text-gray-700 mb-1">
                Timeline
              </label>
              <select
                id="quote-timeline"
                value={timeline}
                onChange={(e) => setTimeline(e.target.value as QuoteTimeline)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              >
                {TIMELINE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Budget */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="quote-budget-min" className="block text-sm font-medium text-gray-700 mb-1">
                Budget Min ($)
              </label>
              <input
                type="number"
                id="quote-budget-min"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                min="0"
                step="1"
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="quote-budget-max" className="block text-sm font-medium text-gray-700 mb-1">
                Budget Max ($)
              </label>
              <input
                type="number"
                id="quote-budget-max"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                min="0"
                step="1"
                placeholder="No limit"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="quote-city" className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                id="quote-city"
                value={locationCity}
                onChange={(e) => setLocationCity(e.target.value)}
                placeholder="City"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="quote-state" className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                type="text"
                id="quote-state"
                value={locationState}
                onChange={(e) => setLocationState(e.target.value)}
                maxLength={2}
                placeholder="FL"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
            <div className="grid grid-cols-3 gap-2">
              {VISIBILITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setVisibility(opt.value)}
                  disabled={isLoading}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    visibility === opt.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="text-xs font-semibold text-gray-900">{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                </button>
              ))}
            </div>
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
              disabled={isLoading || !title.trim() || !description.trim()}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Create Quote Request
                </>
              )}
            </button>
          </div>
        </form>
      </ErrorBoundary>
    </BizModal>
  );
}
