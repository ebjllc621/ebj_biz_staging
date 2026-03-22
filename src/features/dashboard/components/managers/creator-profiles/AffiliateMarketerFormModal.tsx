/**
 * AffiliateMarketerFormModal - Create/Edit Affiliate Marketer Profile Form
 *
 * @description Form modal for creating or editing affiliate marketer profiles
 * @component Client Component
 * @tier STANDARD
 * @phase Tier 3 Creator Profiles - Phase 8A
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier3_Phases/PHASE_8A_DASHBOARD_PROFILE_CRUD.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use BizModal (MANDATORY)
 * - Orange theme for submit button (#ed6437)
 * - Form validation before submit
 * - Follows ArticleFormModal.tsx pattern exactly
 */
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import BizModal from '@/components/BizModal/BizModal';
import { Loader2 } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface AffiliateMarketerFormData {
  display_name: string;
  headline: string;
  bio: string;
  niches: string;
  specializations: string;
  affiliate_networks: string;
  commission_range_min: string;
  commission_range_max: string;
  flat_fee_min: string;
  flat_fee_max: string;
  audience_size: string;
  platforms: string;
  website_url: string;
  location: string;
}

export interface AffiliateMarketerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line no-unused-vars
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isSubmitting: boolean;
  initialData?: Partial<AffiliateMarketerFormData>;
}

// ============================================================================
// HELPERS
// ============================================================================

const EMPTY_FORM: AffiliateMarketerFormData = {
  display_name: '',
  headline: '',
  bio: '',
  niches: '',
  specializations: '',
  affiliate_networks: '',
  commission_range_min: '',
  commission_range_max: '',
  flat_fee_min: '',
  flat_fee_max: '',
  audience_size: '',
  platforms: '',
  website_url: '',
  location: '',
};

const URL_REGEX = /^https?:\/\/.+/;

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AffiliateMarketerFormModal - Affiliate Marketer profile create/edit form
 */
export function AffiliateMarketerFormModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  initialData,
}: AffiliateMarketerFormModalProps) {
  const [formData, setFormData] = useState<AffiliateMarketerFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form when initialData changes or modal opens
  useEffect(() => {
    if (initialData) {
      setFormData({
        display_name: initialData.display_name || '',
        headline: initialData.headline || '',
        bio: initialData.bio || '',
        niches: initialData.niches || '',
        specializations: initialData.specializations || '',
        affiliate_networks: initialData.affiliate_networks || '',
        commission_range_min: initialData.commission_range_min || '',
        commission_range_max: initialData.commission_range_max || '',
        flat_fee_min: initialData.flat_fee_min || '',
        flat_fee_max: initialData.flat_fee_max || '',
        audience_size: initialData.audience_size || '',
        platforms: initialData.platforms || '',
        website_url: initialData.website_url || '',
        location: initialData.location || '',
      });
    } else {
      setFormData(EMPTY_FORM);
    }
    setErrors({});
  }, [initialData, isOpen]);

  // Handle field change
  const handleChange = useCallback((field: keyof AffiliateMarketerFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  }, []);

  // Validate form
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.display_name.trim()) {
      newErrors.display_name = 'Display name is required';
    } else if (formData.display_name.trim().length < 2) {
      newErrors.display_name = 'Display name must be at least 2 characters';
    } else if (formData.display_name.trim().length > 255) {
      newErrors.display_name = 'Display name must be 255 characters or less';
    }

    if (formData.website_url.trim() && !URL_REGEX.test(formData.website_url.trim())) {
      newErrors.website_url = 'Website URL must start with http:// or https://';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle submit
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    // Build submit data — only include non-empty fields
    const submitData: Record<string, unknown> = {
      display_name: formData.display_name.trim(),
    };

    if (formData.headline.trim()) {
      submitData.headline = formData.headline.trim();
    }
    if (formData.bio.trim()) {
      submitData.bio = formData.bio.trim();
    }
    if (formData.niches.trim()) {
      submitData.niches = formData.niches.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (formData.specializations.trim()) {
      submitData.specializations = formData.specializations.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (formData.affiliate_networks.trim()) {
      submitData.affiliate_networks = formData.affiliate_networks.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (formData.commission_range_min.trim()) {
      submitData.commission_range_min = parseFloat(formData.commission_range_min);
    }
    if (formData.commission_range_max.trim()) {
      submitData.commission_range_max = parseFloat(formData.commission_range_max);
    }
    if (formData.flat_fee_min.trim()) {
      submitData.flat_fee_min = parseFloat(formData.flat_fee_min);
    }
    if (formData.flat_fee_max.trim()) {
      submitData.flat_fee_max = parseFloat(formData.flat_fee_max);
    }
    if (formData.audience_size.trim()) {
      submitData.audience_size = parseInt(formData.audience_size, 10);
    }
    if (formData.platforms.trim()) {
      submitData.platforms = formData.platforms.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (formData.website_url.trim()) {
      submitData.website_url = formData.website_url.trim();
    }
    if (formData.location.trim()) {
      submitData.location = formData.location.trim();
    }

    try {
      await onSubmit(submitData);
      onClose();
    } catch {
      // Error handled by parent
    }
  }, [formData, validate, onSubmit, onClose]);

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Affiliate Marketer Profile' : 'Create Affiliate Marketer Profile'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Section 1: Basic Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>

          {/* Display Name */}
          <div>
            <label htmlFor="am-display-name" className="block text-sm font-medium text-gray-700 mb-1">
              Display Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              id="am-display-name"
              value={formData.display_name}
              onChange={(e) => handleChange('display_name', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                errors.display_name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Your affiliate marketer name"
            />
            {errors.display_name && <p className="mt-1 text-sm text-red-600">{errors.display_name}</p>}
          </div>

          {/* Headline */}
          <div>
            <label htmlFor="am-headline" className="block text-sm font-medium text-gray-700 mb-1">
              Headline
            </label>
            <input
              type="text"
              id="am-headline"
              value={formData.headline}
              onChange={(e) => handleChange('headline', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              placeholder="E.g. Performance-Driven Affiliate Marketer"
            />
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="am-bio" className="block text-sm font-medium text-gray-700 mb-1">
              Bio
            </label>
            <textarea
              id="am-bio"
              value={formData.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent resize-none"
              placeholder="Tell brands about yourself and your expertise..."
            />
          </div>
        </div>

        {/* Section 2: Professional Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Professional Details</h3>

          {/* Niches */}
          <div>
            <label htmlFor="am-niches" className="block text-sm font-medium text-gray-700 mb-1">
              Niches
            </label>
            <input
              type="text"
              id="am-niches"
              value={formData.niches}
              onChange={(e) => handleChange('niches', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              placeholder="E.g. fitness, finance, technology"
            />
            <p className="mt-1 text-xs text-gray-500">Comma-separated list of your niche markets</p>
          </div>

          {/* Specializations */}
          <div>
            <label htmlFor="am-specializations" className="block text-sm font-medium text-gray-700 mb-1">
              Specializations
            </label>
            <input
              type="text"
              id="am-specializations"
              value={formData.specializations}
              onChange={(e) => handleChange('specializations', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              placeholder="E.g. email marketing, SEO, paid ads"
            />
            <p className="mt-1 text-xs text-gray-500">Comma-separated list of your specializations</p>
          </div>

          {/* Affiliate Networks */}
          <div>
            <label htmlFor="am-networks" className="block text-sm font-medium text-gray-700 mb-1">
              Affiliate Networks
            </label>
            <input
              type="text"
              id="am-networks"
              value={formData.affiliate_networks}
              onChange={(e) => handleChange('affiliate_networks', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              placeholder="E.g. Amazon Associates, ShareASale, CJ Affiliate"
            />
            <p className="mt-1 text-xs text-gray-500">Comma-separated list of networks you work with</p>
          </div>
        </div>

        {/* Section 3: Rate Card */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Rate Card</h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Commission Range Min */}
            <div>
              <label htmlFor="am-commission-min" className="block text-sm font-medium text-gray-700 mb-1">
                Commission Min (%)
              </label>
              <input
                type="number"
                id="am-commission-min"
                value={formData.commission_range_min}
                onChange={(e) => handleChange('commission_range_min', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                placeholder="0"
                min="0"
                max="100"
                step="0.1"
              />
            </div>

            {/* Commission Range Max */}
            <div>
              <label htmlFor="am-commission-max" className="block text-sm font-medium text-gray-700 mb-1">
                Commission Max (%)
              </label>
              <input
                type="number"
                id="am-commission-max"
                value={formData.commission_range_max}
                onChange={(e) => handleChange('commission_range_max', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                placeholder="100"
                min="0"
                max="100"
                step="0.1"
              />
            </div>

            {/* Flat Fee Min */}
            <div>
              <label htmlFor="am-flat-fee-min" className="block text-sm font-medium text-gray-700 mb-1">
                Flat Fee Min ($)
              </label>
              <input
                type="number"
                id="am-flat-fee-min"
                value={formData.flat_fee_min}
                onChange={(e) => handleChange('flat_fee_min', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>

            {/* Flat Fee Max */}
            <div>
              <label htmlFor="am-flat-fee-max" className="block text-sm font-medium text-gray-700 mb-1">
                Flat Fee Max ($)
              </label>
              <input
                type="number"
                id="am-flat-fee-max"
                value={formData.flat_fee_max}
                onChange={(e) => handleChange('flat_fee_max', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Audience */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Audience</h3>

          {/* Audience Size */}
          <div>
            <label htmlFor="am-audience-size" className="block text-sm font-medium text-gray-700 mb-1">
              Audience Size
            </label>
            <input
              type="number"
              id="am-audience-size"
              value={formData.audience_size}
              onChange={(e) => handleChange('audience_size', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              placeholder="Total audience across all platforms"
              min="0"
            />
          </div>

          {/* Platforms */}
          <div>
            <label htmlFor="am-platforms" className="block text-sm font-medium text-gray-700 mb-1">
              Platforms
            </label>
            <input
              type="text"
              id="am-platforms"
              value={formData.platforms}
              onChange={(e) => handleChange('platforms', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              placeholder="E.g. Instagram, YouTube, TikTok, Blog"
            />
            <p className="mt-1 text-xs text-gray-500">Comma-separated list of platforms you use</p>
          </div>
        </div>

        {/* Section 5: Online Presence */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Online Presence</h3>

          {/* Website URL */}
          <div>
            <label htmlFor="am-website" className="block text-sm font-medium text-gray-700 mb-1">
              Website URL
            </label>
            <input
              type="url"
              id="am-website"
              value={formData.website_url}
              onChange={(e) => handleChange('website_url', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                errors.website_url ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="https://yourwebsite.com"
            />
            {errors.website_url && <p className="mt-1 text-sm text-red-600">{errors.website_url}</p>}
          </div>

          {/* Location */}
          <div>
            <label htmlFor="am-location" className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              id="am-location"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              placeholder="E.g. New York, NY"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors disabled:opacity-50 font-medium"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? 'Saving...' : (initialData ? 'Update Profile' : 'Create Profile')}
          </button>
        </div>
      </form>
    </BizModal>
  );
}

export default AffiliateMarketerFormModal;
