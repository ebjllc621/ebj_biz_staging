/**
 * InternetPersonalityFormModal - Create/Edit Internet Personality Profile Form
 *
 * @description Form modal for creating or editing internet personality profiles
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
 * - Follows AffiliateMarketerFormModal.tsx pattern exactly
 */
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import BizModal from '@/components/BizModal/BizModal';
import { Loader2 } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface InternetPersonalityFormData {
  display_name: string;
  headline: string;
  bio: string;
  content_categories: string;
  platforms: string;
  creating_since: string;
  total_reach: string;
  avg_engagement_rate: string;
  collaboration_types: string;
  website_url: string;
  media_kit_url: string;
  management_contact: string;
  location: string;
}

export interface InternetPersonalityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line no-unused-vars
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isSubmitting: boolean;
  initialData?: Partial<InternetPersonalityFormData>;
}

// ============================================================================
// HELPERS
// ============================================================================

const EMPTY_FORM: InternetPersonalityFormData = {
  display_name: '',
  headline: '',
  bio: '',
  content_categories: '',
  platforms: '',
  creating_since: '',
  total_reach: '',
  avg_engagement_rate: '',
  collaboration_types: '',
  website_url: '',
  media_kit_url: '',
  management_contact: '',
  location: '',
};

const URL_REGEX = /^https?:\/\/.+/;
const CURRENT_YEAR = new Date().getFullYear();

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * InternetPersonalityFormModal - Internet Personality profile create/edit form
 */
export function InternetPersonalityFormModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  initialData,
}: InternetPersonalityFormModalProps) {
  const [formData, setFormData] = useState<InternetPersonalityFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form when initialData changes or modal opens
  useEffect(() => {
    if (initialData) {
      setFormData({
        display_name: initialData.display_name || '',
        headline: initialData.headline || '',
        bio: initialData.bio || '',
        content_categories: initialData.content_categories || '',
        platforms: initialData.platforms || '',
        creating_since: initialData.creating_since || '',
        total_reach: initialData.total_reach || '',
        avg_engagement_rate: initialData.avg_engagement_rate || '',
        collaboration_types: initialData.collaboration_types || '',
        website_url: initialData.website_url || '',
        media_kit_url: initialData.media_kit_url || '',
        management_contact: initialData.management_contact || '',
        location: initialData.location || '',
      });
    } else {
      setFormData(EMPTY_FORM);
    }
    setErrors({});
  }, [initialData, isOpen]);

  // Handle field change
  const handleChange = useCallback((field: keyof InternetPersonalityFormData, value: string) => {
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

    if (formData.media_kit_url.trim() && !URL_REGEX.test(formData.media_kit_url.trim())) {
      newErrors.media_kit_url = 'Media kit URL must start with http:// or https://';
    }

    if (formData.creating_since.trim()) {
      const year = parseInt(formData.creating_since, 10);
      if (isNaN(year) || year < 1990 || year > CURRENT_YEAR) {
        newErrors.creating_since = `Year must be between 1990 and ${CURRENT_YEAR}`;
      }
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
    if (formData.content_categories.trim()) {
      submitData.content_categories = formData.content_categories.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (formData.platforms.trim()) {
      submitData.platforms = formData.platforms.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (formData.creating_since.trim()) {
      submitData.creating_since = parseInt(formData.creating_since, 10);
    }
    if (formData.total_reach.trim()) {
      submitData.total_reach = parseInt(formData.total_reach, 10);
    }
    if (formData.avg_engagement_rate.trim()) {
      submitData.avg_engagement_rate = parseFloat(formData.avg_engagement_rate);
    }
    if (formData.collaboration_types.trim()) {
      submitData.collaboration_types = formData.collaboration_types.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (formData.website_url.trim()) {
      submitData.website_url = formData.website_url.trim();
    }
    if (formData.media_kit_url.trim()) {
      submitData.media_kit_url = formData.media_kit_url.trim();
    }
    if (formData.management_contact.trim()) {
      submitData.management_contact = formData.management_contact.trim();
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
      title={initialData ? 'Edit Internet Personality Profile' : 'Create Internet Personality Profile'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Section 1: Basic Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>

          {/* Display Name */}
          <div>
            <label htmlFor="ip-display-name" className="block text-sm font-medium text-gray-700 mb-1">
              Display Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              id="ip-display-name"
              value={formData.display_name}
              onChange={(e) => handleChange('display_name', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                errors.display_name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Your creator name or handle"
            />
            {errors.display_name && <p className="mt-1 text-sm text-red-600">{errors.display_name}</p>}
          </div>

          {/* Headline */}
          <div>
            <label htmlFor="ip-headline" className="block text-sm font-medium text-gray-700 mb-1">
              Headline
            </label>
            <input
              type="text"
              id="ip-headline"
              value={formData.headline}
              onChange={(e) => handleChange('headline', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              placeholder="E.g. Lifestyle & Travel Content Creator"
            />
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="ip-bio" className="block text-sm font-medium text-gray-700 mb-1">
              Bio
            </label>
            <textarea
              id="ip-bio"
              value={formData.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent resize-none"
              placeholder="Tell brands about yourself and your content..."
            />
          </div>
        </div>

        {/* Section 2: Content Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Content Details</h3>

          {/* Content Categories */}
          <div>
            <label htmlFor="ip-categories" className="block text-sm font-medium text-gray-700 mb-1">
              Content Categories
            </label>
            <input
              type="text"
              id="ip-categories"
              value={formData.content_categories}
              onChange={(e) => handleChange('content_categories', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              placeholder="E.g. lifestyle, travel, food, fitness"
            />
            <p className="mt-1 text-xs text-gray-500">Comma-separated list of content categories</p>
          </div>

          {/* Platforms */}
          <div>
            <label htmlFor="ip-platforms" className="block text-sm font-medium text-gray-700 mb-1">
              Platforms
            </label>
            <input
              type="text"
              id="ip-platforms"
              value={formData.platforms}
              onChange={(e) => handleChange('platforms', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              placeholder="E.g. Instagram, YouTube, TikTok, Podcast"
            />
            <p className="mt-1 text-xs text-gray-500">Comma-separated list of platforms you create for</p>
          </div>

          {/* Creating Since */}
          <div>
            <label htmlFor="ip-creating-since" className="block text-sm font-medium text-gray-700 mb-1">
              Creating Since (Year)
            </label>
            <input
              type="number"
              id="ip-creating-since"
              value={formData.creating_since}
              onChange={(e) => handleChange('creating_since', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                errors.creating_since ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder={String(CURRENT_YEAR)}
              min="1990"
              max={CURRENT_YEAR}
            />
            {errors.creating_since && <p className="mt-1 text-sm text-red-600">{errors.creating_since}</p>}
          </div>
        </div>

        {/* Section 3: Engagement */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Engagement</h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Total Reach */}
            <div>
              <label htmlFor="ip-total-reach" className="block text-sm font-medium text-gray-700 mb-1">
                Total Reach
              </label>
              <input
                type="number"
                id="ip-total-reach"
                value={formData.total_reach}
                onChange={(e) => handleChange('total_reach', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                placeholder="Combined followers across platforms"
                min="0"
              />
            </div>

            {/* Avg Engagement Rate */}
            <div>
              <label htmlFor="ip-engagement-rate" className="block text-sm font-medium text-gray-700 mb-1">
                Avg Engagement Rate (%)
              </label>
              <input
                type="number"
                id="ip-engagement-rate"
                value={formData.avg_engagement_rate}
                onChange={(e) => handleChange('avg_engagement_rate', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                placeholder="3.5"
                min="0"
                max="100"
                step="0.1"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Collaboration */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Collaboration</h3>

          {/* Collaboration Types */}
          <div>
            <label htmlFor="ip-collab-types" className="block text-sm font-medium text-gray-700 mb-1">
              Collaboration Types
            </label>
            <input
              type="text"
              id="ip-collab-types"
              value={formData.collaboration_types}
              onChange={(e) => handleChange('collaboration_types', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              placeholder="E.g. sponsored posts, product reviews, brand ambassadorship"
            />
            <p className="mt-1 text-xs text-gray-500">Comma-separated list of collaboration types you offer</p>
          </div>
        </div>

        {/* Section 5: Online Presence */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Online Presence</h3>

          {/* Website URL */}
          <div>
            <label htmlFor="ip-website" className="block text-sm font-medium text-gray-700 mb-1">
              Website URL
            </label>
            <input
              type="url"
              id="ip-website"
              value={formData.website_url}
              onChange={(e) => handleChange('website_url', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                errors.website_url ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="https://yourcreatorsite.com"
            />
            {errors.website_url && <p className="mt-1 text-sm text-red-600">{errors.website_url}</p>}
          </div>

          {/* Media Kit URL */}
          <div>
            <label htmlFor="ip-media-kit" className="block text-sm font-medium text-gray-700 mb-1">
              Media Kit URL
            </label>
            <input
              type="url"
              id="ip-media-kit"
              value={formData.media_kit_url}
              onChange={(e) => handleChange('media_kit_url', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                errors.media_kit_url ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="https://yoursite.com/media-kit"
            />
            {errors.media_kit_url && <p className="mt-1 text-sm text-red-600">{errors.media_kit_url}</p>}
          </div>

          {/* Management Contact */}
          <div>
            <label htmlFor="ip-management" className="block text-sm font-medium text-gray-700 mb-1">
              Management Contact
            </label>
            <input
              type="text"
              id="ip-management"
              value={formData.management_contact}
              onChange={(e) => handleChange('management_contact', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              placeholder="management@yourmanager.com"
            />
          </div>

          {/* Location */}
          <div>
            <label htmlFor="ip-location" className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              id="ip-location"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              placeholder="E.g. Los Angeles, CA"
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

export default InternetPersonalityFormModal;
