/**
 * CampaignFormModal - Create/Edit Campaign Modal
 *
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Phase 10 - Marketing & Advanced Features
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_10_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST use BizModal wrapper
 * - Form validation required
 * - Date validation (end >= start)
 */
'use client';

import React, { useState, useEffect } from 'react';
import BizModal from '@/components/BizModal/BizModal';
import type { Campaign, CampaignType } from '@core/services/CampaignService';
import type { CampaignFormData } from '@features/dashboard/types';
import { AlertCircle } from 'lucide-react';

export interface CampaignFormModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close callback */
  onClose: () => void;
  /** Submit callback */
  onSubmit: (data: CampaignFormData) => Promise<void>;
  /** Existing campaign (for edit mode) */
  campaign?: Campaign;
  /** Loading state */
  isLoading?: boolean;
}

const campaignTypes: { value: CampaignType; label: string }[] = [
  { value: 'sponsored_listing', label: 'Sponsored Listing' },
  { value: 'featured_event', label: 'Featured Event' },
  { value: 'featured_offer', label: 'Featured Offer' },
  { value: 'banner_ad', label: 'Banner Ad' },
  { value: 'email_blast', label: 'Email Blast' }
];

export function CampaignFormModal({
  isOpen,
  onClose,
  onSubmit,
  campaign,
  isLoading = false
}: CampaignFormModalProps) {
  const [formData, setFormData] = useState<CampaignFormData>({
    title: '',
    description: '',
    campaign_type: 'sponsored_listing',
    budget: 0,
    start_date: '',
    end_date: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when editing
  useEffect(() => {
    if (campaign) {
      setFormData({
        title: campaign.title,
        description: campaign.description || '',
        campaign_type: campaign.campaign_type,
        budget: campaign.budget,
        daily_budget: campaign.daily_budget || undefined,
        start_date: new Date(campaign.start_date).toISOString().split('T')[0] || '',
        end_date: new Date(campaign.end_date).toISOString().split('T')[0] || ''
      });
    } else {
      // Reset form for create mode
      setFormData({
        title: '',
        description: '',
        campaign_type: 'sponsored_listing',
        budget: 0,
        start_date: '',
        end_date: ''
      });
    }
    setErrors({});
  }, [campaign, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (formData.budget <= 0) {
      newErrors.budget = 'Budget must be greater than 0';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    }

    if (formData.start_date && formData.end_date && formData.end_date < formData.start_date) {
      newErrors.end_date = 'End date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to save campaign'
      });
    }
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={campaign ? 'Edit Campaign' : 'Create Campaign'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Display */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{errors.submit}</p>
          </div>
        )}

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Campaign Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
              errors.title ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter campaign title"
          />
          {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title}</p>}
        </div>

        {/* Campaign Type */}
        <div>
          <label htmlFor="campaign_type" className="block text-sm font-medium text-gray-700 mb-2">
            Campaign Type <span className="text-red-500">*</span>
          </label>
          <select
            id="campaign_type"
            value={formData.campaign_type}
            onChange={(e) => setFormData({ ...formData, campaign_type: e.target.value as CampaignType })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            {campaignTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            placeholder="Describe your campaign"
          />
        </div>

        {/* Budget Row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-2">
              Total Budget <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                id="budget"
                value={formData.budget || ''}
                onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })}
                className={`w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                  errors.budget ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            {errors.budget && <p className="text-sm text-red-600 mt-1">{errors.budget}</p>}
          </div>

          <div>
            <label htmlFor="daily_budget" className="block text-sm font-medium text-gray-700 mb-2">
              Daily Budget (Optional)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                id="daily_budget"
                value={formData.daily_budget || ''}
                onChange={(e) => setFormData({ ...formData, daily_budget: parseFloat(e.target.value) || undefined })}
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>
        </div>

        {/* Date Row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="start_date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                errors.start_date ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.start_date && <p className="text-sm text-red-600 mt-1">{errors.start_date}</p>}
          </div>

          <div>
            <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
              End Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="end_date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                errors.end_date ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.end_date && <p className="text-sm text-red-600 mt-1">{errors.end_date}</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Saving...' : campaign ? 'Update Campaign' : 'Create Campaign'}
          </button>
        </div>
      </form>
    </BizModal>
  );
}

export default CampaignFormModal;
