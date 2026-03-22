/**
 * ListingQuotes - Quote Request Form
 *
 * @component Client Component
 * @tier ADVANCED
 * @phase Phase 7 - Feature Component Enhancements
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Two modes: Direct Quote & Bulk Quote Request
 * - Form fields: Service type, Description, Timeline, Budget
 * - File attachments support (future enhancement)
 * - Auth-gated (requires login)
 * - Success confirmation with expected response time
 * - CSRF protection for mutations
 *
 * @see docs/pages/layouts/listings/details/detailspageenhance/phases/PHASE_7_BRAIN_PLAN.md
 */
'use client';

import { useState, useCallback } from 'react';
import { FileQuestion, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@core/hooks/useAuth';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { Listing } from '@core/services/ListingService';

interface QuoteFormData {
  service_type: string;
  description: string;
  timeline: 'asap' | '1_week' | '1_month' | 'flexible';
  budget_min: string;
  budget_max: string;
}

interface ListingQuotesProps {
  /** Listing data */
  listing: Listing;
  /** Mode: direct or bulk */
  mode?: 'direct' | 'bulk';
  /** Whether in edit mode */
  isEditing?: boolean;
}

const initialFormData: QuoteFormData = {
  service_type: '',
  description: '',
  timeline: 'flexible',
  budget_min: '',
  budget_max: ''
};

export function ListingQuotes({ listing, mode = 'direct', isEditing }: ListingQuotesProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<QuoteFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Handle form field changes
  const handleChange = useCallback((
    field: keyof QuoteFormData,
    value: string
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('Please log in to request a quote');
      return;
    }

    if (!formData.description.trim()) {
      setError('Please describe your project');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetchWithCsrf('/api/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          listing_id: listing.id,
          mode,
          ...formData,
          budget_min: formData.budget_min ? parseFloat(formData.budget_min) : undefined,
          budget_max: formData.budget_max ? parseFloat(formData.budget_max) : undefined
        })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to submit quote request');
      }

      // Success
      setSuccess(true);
      setFormData(initialFormData);

      // Reset success message after 5 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit quote request');
    } finally {
      setIsSubmitting(false);
    }
  }, [user, listing.id, mode, formData]);

  // Don't render if not available (can add tier check here)
  if (!listing) {
    return null;
  }

  return (
    <section className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-biz-navy flex items-center gap-2">
          <FileQuestion className="w-5 h-5 text-biz-orange" />
          Request a Quote
        </h2>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-green-900 mb-1">Quote Request Sent!</h3>
            <p className="text-sm text-green-700">
              You should receive a response within 24-48 hours.
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Quote Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Service Type */}
        <div>
          <label htmlFor="service_type" className="block text-sm font-medium text-gray-700 mb-1">
            Service Type
          </label>
          <input
            type="text"
            id="service_type"
            value={formData.service_type}
            onChange={(e) => handleChange('service_type', e.target.value)}
            placeholder="e.g., Web Design, Consultation, Repair"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biz-orange focus:border-transparent"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Project Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Tell us about your project..."
            rows={4}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biz-orange focus:border-transparent resize-none"
          />
        </div>

        {/* Timeline */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Timeline
          </label>
          <div className="flex flex-wrap gap-3">
            {[
              { value: 'asap', label: 'ASAP' },
              { value: '1_week', label: '1 Week' },
              { value: '1_month', label: '1 Month' },
              { value: 'flexible', label: 'Flexible' }
            ].map((option) => (
              <label key={option.value} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="timeline"
                  value={option.value}
                  checked={formData.timeline === option.value}
                  onChange={(e) => handleChange('timeline', e.target.value as QuoteFormData['timeline'])}
                  className="w-4 h-4 text-biz-orange focus:ring-biz-orange border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Budget Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Budget Range (Optional)
          </label>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <input
                type="number"
                value={formData.budget_min}
                onChange={(e) => handleChange('budget_min', e.target.value)}
                placeholder="Min"
                min="0"
                step="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biz-orange focus:border-transparent"
              />
            </div>
            <span className="text-gray-500">-</span>
            <div className="flex-1">
              <input
                type="number"
                value={formData.budget_max}
                onChange={(e) => handleChange('budget_max', e.target.value)}
                placeholder="Max"
                min="0"
                step="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biz-orange focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !user}
            className="w-full px-6 py-3 bg-biz-orange text-white rounded-lg hover:bg-biz-orange/90 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
          >
            {isSubmitting ? (
              <>Submitting...</>
            ) : !user ? (
              <>Log In to Submit</>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Submit Quote Request
              </>
            )}
          </button>
        </div>

        {/* Response Time Notice */}
        <div className="text-sm text-gray-500 text-center">
          💡 Response typically within 24-48 hours
        </div>
      </form>
    </section>
  );
}
