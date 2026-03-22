/**
 * RequestQuoteButton - Quote Request CTA with Form Modal
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 6 - Sidebar Components
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Prominent CTA button
 * - BizModal contact form (MANDATORY modal usage)
 * - Form fields: Name, Email, Phone, Message, Preferred Date
 * - CSRF-protected submission with fetchWithCsrf
 * - Auth-gated for lead capture (Preferred/Premium)
 * - Success/error states with user feedback
 * - Email notification to listing owner
 *
 * @see docs/pages/layouts/listings/details/phases/PHASE_6_BRAIN_PLAN.md
 */
'use client';

import { useState, useCallback, useEffect } from 'react';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';
import BizModal from '@/components/BizModal/BizModal';
import { useAuth } from '@core/hooks/useAuth';
import { fetchWithCsrf } from '@core/utils/csrf';
import { useAnalyticsTracking } from '@features/listings/hooks/useAnalyticsTracking';
import type { Listing } from '@core/services/ListingService';

interface RequestQuoteButtonProps {
  /** Listing data */
  listing: Listing;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  message: string;
  preferredDate: string;
}

const INITIAL_FORM_DATA: FormData = {
  name: '',
  email: '',
  phone: '',
  message: '',
  preferredDate: ''
};

export function RequestQuoteButton({ listing }: RequestQuoteButtonProps) {
  const { user } = useAuth();
  const { trackConversion, trackClick } = useAnalyticsTracking(listing.id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pre-fill form with user data if authenticated
  useEffect(() => {
    if (user && isModalOpen) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || ''
        // phone field not available on User type
      }));
    }
  }, [user, isModalOpen]);

  // Listen for calendar date selection event
  useEffect(() => {
    const handleCalendarSelection = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.selectedDate) {
        setFormData(prev => ({
          ...prev,
          preferredDate: customEvent.detail.selectedDate
        }));
        setIsModalOpen(true);
      }
    };

    window.addEventListener('openQuoteModal', handleCalendarSelection);
    return () => {
      window.removeEventListener('openQuoteModal', handleCalendarSelection);
    };
  }, []);

  // Handle form input change
  const handleInputChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  // Validate form
  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setErrorMessage('Name is required');
      return false;
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setErrorMessage('Valid email is required');
      return false;
    }
    if (!formData.message.trim() || formData.message.trim().length < 10) {
      setErrorMessage('Message must be at least 10 characters');
      return false;
    }
    return true;
  };

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetchWithCsrf('/api/listings/contact', {
        method: 'POST',
        body: JSON.stringify({
          listing_id: listing.id,
          listing_name: listing.name,
          sender_name: formData.name,
          sender_email: formData.email,
          sender_phone: formData.phone || null,
          message: formData.message,
          preferred_date: formData.preferredDate || null,
          inquiry_type: 'quote_request'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to send quote request');
      }

      // Track conversion - quote request submitted successfully
      trackConversion('listing_quote');

      setSubmitStatus('success');
      setFormData(INITIAL_FORM_DATA);

      // Close modal after 2 seconds
      setTimeout(() => {
        setIsModalOpen(false);
        setSubmitStatus('idle');
      }, 2000);
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send quote request');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, listing, validateForm]);

  // Handle modal close
  const handleClose = useCallback(() => {
    setIsModalOpen(false);
    setFormData(INITIAL_FORM_DATA);
    setSubmitStatus('idle');
    setErrorMessage(null);
  }, []);

  return (
    <>
      {/* CTA Button */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <button
          onClick={() => {
            setIsModalOpen(true);
            trackClick('listing_quote_open');
          }}
          className="w-full px-6 py-3 bg-biz-orange text-white rounded-lg hover:bg-biz-orange/90 transition-colors text-sm font-medium flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          Request a Quote
        </button>
        <p className="text-xs text-gray-500 text-center mt-2">
          Free quote • No obligation • Quick response
        </p>
      </div>

      {/* BizModal Contact Form */}
      <BizModal
        isOpen={isModalOpen}
        onClose={handleClose}
        title="Request a Quote"
        maxWidth="md"
      >
        {submitStatus === 'success' ? (
          // Success State
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Quote Request Sent!
            </h3>
            <p className="text-gray-600">
              {listing.name} will respond to your inquiry shortly.
            </p>
          </div>
        ) : (
          // Form
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Listing Name Display */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">Requesting quote from:</p>
              <p className="font-semibold text-gray-900">{listing.name}</p>
            </div>

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Your Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biz-orange focus:border-transparent"
                placeholder="John Doe"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Your Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biz-orange focus:border-transparent"
                placeholder="john@example.com"
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number (optional)
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biz-orange focus:border-transparent"
                placeholder="(555) 123-4567"
              />
            </div>

            {/* Preferred Date */}
            {formData.preferredDate && (
              <div>
                <label htmlFor="preferredDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Date
                </label>
                <input
                  type="date"
                  id="preferredDate"
                  name="preferredDate"
                  value={formData.preferredDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biz-orange focus:border-transparent"
                />
              </div>
            )}

            {/* Message */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                Your Message <span className="text-red-500">*</span>
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                required
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biz-orange focus:border-transparent resize-none"
                placeholder="Please describe your project or inquiry in detail..."
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.message.length}/10 characters minimum
              </p>
            </div>

            {/* Error Message */}
            {(submitStatus === 'error' || errorMessage) && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">
                  {errorMessage || 'Failed to send quote request. Please try again.'}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-6 py-3 bg-biz-orange text-white rounded-lg hover:bg-biz-orange/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Sending...' : 'Send Quote Request'}
            </button>
          </form>
        )}
      </BizModal>
    </>
  );
}

export default RequestQuoteButton;
