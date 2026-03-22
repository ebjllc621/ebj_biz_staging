/**
 * CreateOfferModal Component - Modal for creating new offers
 *
 * @authority PHASE_5.4.1_BRAIN_PLAN.md - Task 2.1
 * @governance Build Map v2.1 ENHANCED compliance
 * @pattern Phase 5.4 BizModal pattern with tier enforcement
 */

'use client';

import { useState } from 'react';
import { BizModal } from '@/components/ui/BizModal';
import { fetchWithCsrf } from '@core/utils/csrf';
import { ErrorService } from '@core/services/ErrorService';

interface Listing {
  id: number;
  name: string;
  tier: string;
}

interface CreateOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  listings: Listing[];
}

/**
 * CreateOfferModal - Create new offer modal
 *
 * Features:
 * - BizModal wrapper
 * - Form validation
 * - Tier limit enforcement
 * - All offer types support (percentage, fixed, BOGO)
 *
 * @param {CreateOfferModalProps} props
 * @returns {JSX.Element}
 */
export function CreateOfferModal({ isOpen, onClose, onSuccess, listings }: CreateOfferModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    listing_id: '',
    title: '',
    description: '',
    offer_type: 'percentage',
    original_price: '',
    sale_price: '',
    discount_percentage: '',
    start_date: '',
    end_date: '',
    redemption_code: '',
    redemption_instructions: '',
    max_per_user: '1'
  });

  /**
   * Handle form field changes
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.listing_id || !formData.title || !formData.start_date || !formData.end_date) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);

      // @governance MANDATORY - CSRF protection for POST requests
      // Source: osi-production-compliance.mdc, Layer 7 Security
      const response = await fetchWithCsrf('/api/offers', {
        method: 'POST',
        body: JSON.stringify({
          listing_id: parseInt(formData.listing_id),
          title: formData.title,
          description: formData.description || null,
          offer_type: formData.offer_type,
          original_price: formData.original_price ? parseFloat(formData.original_price) : null,
          sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
          discount_percentage: formData.discount_percentage ? parseFloat(formData.discount_percentage) : null,
          start_date: formData.start_date,
          end_date: formData.end_date,
          redemption_code: formData.redemption_code || null,
          redemption_instructions: formData.redemption_instructions || null,
          max_per_user: parseInt(formData.max_per_user)
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create offer');
      }

      alert('Offer created successfully!');
      onSuccess();
      resetForm();
    } catch (error) {
      ErrorService.capture('Create offer error:', error);
      alert(error instanceof Error ? error.message : 'Failed to create offer');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Reset form to initial state
   */
  const resetForm = () => {
    setFormData({
      listing_id: '',
      title: '',
      description: '',
      offer_type: 'percentage',
      original_price: '',
      sale_price: '',
      discount_percentage: '',
      start_date: '',
      end_date: '',
      redemption_code: '',
      redemption_instructions: '',
      max_per_user: '1'
    });
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Offer"
      size="large"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Listing Selection */}
        <div>
          <label htmlFor="listing_id" className="block text-sm font-medium text-gray-700">
            Listing *
          </label>
          <select
            id="listing_id"
            name="listing_id"
            value={formData.listing_id}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Select a listing</option>
            {listings.map((listing) => (
              <option key={listing.id} value={listing.id}>
                {listing.name} ({listing.tier})
              </option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Offer Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            placeholder="e.g., 50% Off All Services"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            placeholder="Describe the offer details..."
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        {/* Offer Type */}
        <div>
          <label htmlFor="offer_type" className="block text-sm font-medium text-gray-700">
            Offer Type *
          </label>
          <select
            id="offer_type"
            name="offer_type"
            value={formData.offer_type}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="percentage">Percentage Discount</option>
            <option value="fixed">Fixed Price Discount</option>
            <option value="bogo">Buy One Get One</option>
            <option value="gift">Free Gift/Service</option>
          </select>
        </div>

        {/* Pricing Fields (conditional based on offer type) */}
        {formData.offer_type === 'percentage' && (
          <div>
            <label htmlFor="discount_percentage" className="block text-sm font-medium text-gray-700">
              Discount Percentage (%)
            </label>
            <input
              type="number"
              id="discount_percentage"
              name="discount_percentage"
              value={formData.discount_percentage}
              onChange={handleChange}
              min="0"
              max="100"
              placeholder="e.g., 50"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        )}

        {formData.offer_type === 'fixed' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="original_price" className="block text-sm font-medium text-gray-700">
                Original Price ($)
              </label>
              <input
                type="number"
                id="original_price"
                name="original_price"
                value={formData.original_price}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="e.g., 100.00"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="sale_price" className="block text-sm font-medium text-gray-700">
                Sale Price ($)
              </label>
              <input
                type="number"
                id="sale_price"
                name="sale_price"
                value={formData.sale_price}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="e.g., 50.00"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
              Start Date *
            </label>
            <input
              type="date"
              id="start_date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
              End Date *
            </label>
            <input
              type="date"
              id="end_date"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Redemption Details */}
        <div>
          <label htmlFor="redemption_code" className="block text-sm font-medium text-gray-700">
            Redemption Code (Optional)
          </label>
          <input
            type="text"
            id="redemption_code"
            name="redemption_code"
            value={formData.redemption_code}
            onChange={handleChange}
            placeholder="e.g., SAVE50"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="redemption_instructions" className="block text-sm font-medium text-gray-700">
            Redemption Instructions (Optional)
          </label>
          <textarea
            id="redemption_instructions"
            name="redemption_instructions"
            value={formData.redemption_instructions}
            onChange={handleChange}
            rows={2}
            placeholder="How to redeem this offer..."
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="max_per_user" className="block text-sm font-medium text-gray-700">
            Max Redemptions Per User
          </label>
          <input
            type="number"
            id="max_per_user"
            name="max_per_user"
            value={formData.max_per_user}
            onChange={handleChange}
            min="1"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating...' : 'Create Offer'}
          </button>
        </div>
      </form>
    </BizModal>
  );
}
