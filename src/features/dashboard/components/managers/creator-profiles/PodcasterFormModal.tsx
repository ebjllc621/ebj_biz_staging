/**
 * PodcasterFormModal - Create/Edit Podcaster Profile Form
 *
 * @description Form modal for creating or editing podcaster profiles
 * @component Client Component
 * @tier STANDARD
 * @phase Tier 3 Creator Profiles - Phase 8C (Podcaster Parity)
 * @authority docs/pages/layouts/admin/PODCASTER_PARITY_BRAIN_PLAN.md
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

export interface PodcasterFormData {
  display_name: string;
  podcast_name: string;
  bio: string;
  headline: string;
  hosting_platform: string;
  rss_feed_url: string;
  genres: string;
  publishing_frequency: string;
  avg_episode_length: string;
  guest_booking_info: string;
  monetization_methods: string;
  website_url: string;
  location: string;
}

export interface PodcasterFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line no-unused-vars
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isSubmitting: boolean;
  initialData?: Partial<PodcasterFormData>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const HOSTING_PLATFORMS = [
  'Apple Podcasts',
  'Spotify',
  'Google Podcasts',
  'Anchor',
  'Buzzsprout',
  'Podbean',
  'Other',
];

const PUBLISHING_FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'irregular', label: 'Irregular' },
];

const EMPTY_FORM: PodcasterFormData = {
  display_name: '',
  podcast_name: '',
  bio: '',
  headline: '',
  hosting_platform: '',
  rss_feed_url: '',
  genres: '',
  publishing_frequency: '',
  avg_episode_length: '',
  guest_booking_info: '',
  monetization_methods: '',
  website_url: '',
  location: '',
};

const URL_REGEX = /^https?:\/\/.+/;

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * PodcasterFormModal - Podcaster profile create/edit form
 */
export function PodcasterFormModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  initialData,
}: PodcasterFormModalProps) {
  const [formData, setFormData] = useState<PodcasterFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form when initialData changes or modal opens
  useEffect(() => {
    if (initialData) {
      setFormData({
        display_name: initialData.display_name || '',
        podcast_name: initialData.podcast_name || '',
        bio: initialData.bio || '',
        headline: initialData.headline || '',
        hosting_platform: initialData.hosting_platform || '',
        rss_feed_url: initialData.rss_feed_url || '',
        genres: initialData.genres || '',
        publishing_frequency: initialData.publishing_frequency || '',
        avg_episode_length: initialData.avg_episode_length || '',
        guest_booking_info: initialData.guest_booking_info || '',
        monetization_methods: initialData.monetization_methods || '',
        website_url: initialData.website_url || '',
        location: initialData.location || '',
      });
    } else {
      setFormData(EMPTY_FORM);
    }
    setErrors({});
  }, [initialData, isOpen]);

  // Handle field change
  const handleChange = useCallback((field: keyof PodcasterFormData, value: string) => {
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

    if (formData.rss_feed_url.trim() && !URL_REGEX.test(formData.rss_feed_url.trim())) {
      newErrors.rss_feed_url = 'RSS feed URL must start with http:// or https://';
    }

    if (formData.avg_episode_length.trim()) {
      const val = parseInt(formData.avg_episode_length, 10);
      if (isNaN(val) || val < 0) {
        newErrors.avg_episode_length = 'Average episode length must be a positive number';
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

    if (formData.podcast_name.trim()) {
      submitData.podcast_name = formData.podcast_name.trim();
    }
    if (formData.bio.trim()) {
      submitData.bio = formData.bio.trim();
    }
    if (formData.headline.trim()) {
      submitData.headline = formData.headline.trim();
    }
    if (formData.hosting_platform) {
      submitData.hosting_platform = formData.hosting_platform;
    }
    if (formData.rss_feed_url.trim()) {
      submitData.rss_feed_url = formData.rss_feed_url.trim();
    }
    if (formData.genres.trim()) {
      submitData.genres = formData.genres.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (formData.publishing_frequency) {
      submitData.publishing_frequency = formData.publishing_frequency;
    }
    if (formData.avg_episode_length.trim()) {
      submitData.avg_episode_length = parseInt(formData.avg_episode_length, 10);
    }
    if (formData.guest_booking_info.trim()) {
      submitData.guest_booking_info = formData.guest_booking_info.trim();
    }
    if (formData.monetization_methods.trim()) {
      submitData.monetization_methods = formData.monetization_methods.split(',').map(s => s.trim()).filter(Boolean);
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
      title={initialData ? 'Edit Podcaster Profile' : 'Create Podcaster Profile'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Section 1: Basic Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>

          {/* Display Name */}
          <div>
            <label htmlFor="pod-display-name" className="block text-sm font-medium text-gray-700 mb-1">
              Display Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              id="pod-display-name"
              value={formData.display_name}
              onChange={(e) => handleChange('display_name', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                errors.display_name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Your name or podcaster handle"
            />
            {errors.display_name && <p className="mt-1 text-sm text-red-600">{errors.display_name}</p>}
          </div>

          {/* Podcast Name */}
          <div>
            <label htmlFor="pod-podcast-name" className="block text-sm font-medium text-gray-700 mb-1">
              Podcast Name
            </label>
            <input
              type="text"
              id="pod-podcast-name"
              value={formData.podcast_name}
              onChange={(e) => handleChange('podcast_name', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              placeholder="E.g. The Business Breakdown"
            />
          </div>

          {/* Headline */}
          <div>
            <label htmlFor="pod-headline" className="block text-sm font-medium text-gray-700 mb-1">
              Headline
            </label>
            <input
              type="text"
              id="pod-headline"
              value={formData.headline}
              onChange={(e) => handleChange('headline', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              placeholder="E.g. Weekly Business Insights for Entrepreneurs"
            />
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="pod-bio" className="block text-sm font-medium text-gray-700 mb-1">
              Bio
            </label>
            <textarea
              id="pod-bio"
              value={formData.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent resize-none"
              placeholder="Tell sponsors and guests about your podcast..."
            />
          </div>
        </div>

        {/* Section 2: Podcast Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Podcast Details</h3>

          {/* Hosting Platform */}
          <div>
            <label htmlFor="pod-hosting-platform" className="block text-sm font-medium text-gray-700 mb-1">
              Primary Hosting Platform
            </label>
            <select
              id="pod-hosting-platform"
              value={formData.hosting_platform}
              onChange={(e) => handleChange('hosting_platform', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
            >
              <option value="">Select a platform</option>
              {HOSTING_PLATFORMS.map(platform => (
                <option key={platform} value={platform}>{platform}</option>
              ))}
            </select>
          </div>

          {/* RSS Feed URL */}
          <div>
            <label htmlFor="pod-rss-url" className="block text-sm font-medium text-gray-700 mb-1">
              RSS Feed URL
            </label>
            <input
              type="url"
              id="pod-rss-url"
              value={formData.rss_feed_url}
              onChange={(e) => handleChange('rss_feed_url', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                errors.rss_feed_url ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="https://feeds.example.com/your-podcast"
            />
            {errors.rss_feed_url && <p className="mt-1 text-sm text-red-600">{errors.rss_feed_url}</p>}
          </div>

          {/* Genres */}
          <div>
            <label htmlFor="pod-genres" className="block text-sm font-medium text-gray-700 mb-1">
              Genres
            </label>
            <input
              type="text"
              id="pod-genres"
              value={formData.genres}
              onChange={(e) => handleChange('genres', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              placeholder="E.g. Technology, Business, Education"
            />
            <p className="mt-1 text-xs text-gray-500">
              Comma-separated list. Options: Technology, Business, Comedy, Education, Health, News, Sports, True Crime, Society, Science, Arts, Music, Other
            </p>
          </div>

          {/* Publishing Frequency + Avg Episode Length row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Publishing Frequency */}
            <div>
              <label htmlFor="pod-frequency" className="block text-sm font-medium text-gray-700 mb-1">
                Publishing Frequency
              </label>
              <select
                id="pod-frequency"
                value={formData.publishing_frequency}
                onChange={(e) => handleChange('publishing_frequency', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              >
                <option value="">Select frequency</option>
                {PUBLISHING_FREQUENCIES.map(freq => (
                  <option key={freq.value} value={freq.value}>{freq.label}</option>
                ))}
              </select>
            </div>

            {/* Avg Episode Length */}
            <div>
              <label htmlFor="pod-avg-length" className="block text-sm font-medium text-gray-700 mb-1">
                Avg Episode Length (min)
              </label>
              <input
                type="number"
                id="pod-avg-length"
                value={formData.avg_episode_length}
                onChange={(e) => handleChange('avg_episode_length', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                  errors.avg_episode_length ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="E.g. 45"
                min="0"
              />
              {errors.avg_episode_length && <p className="mt-1 text-sm text-red-600">{errors.avg_episode_length}</p>}
            </div>
          </div>
        </div>

        {/* Section 3: Business Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Business Information</h3>

          {/* Guest Booking Info */}
          <div>
            <label htmlFor="pod-guest-booking" className="block text-sm font-medium text-gray-700 mb-1">
              Guest Booking Info
            </label>
            <textarea
              id="pod-guest-booking"
              value={formData.guest_booking_info}
              onChange={(e) => handleChange('guest_booking_info', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent resize-none"
              placeholder="Describe your guest requirements, booking process, or what you look for in guests..."
            />
          </div>

          {/* Monetization Methods */}
          <div>
            <label htmlFor="pod-monetization" className="block text-sm font-medium text-gray-700 mb-1">
              Monetization Methods
            </label>
            <input
              type="text"
              id="pod-monetization"
              value={formData.monetization_methods}
              onChange={(e) => handleChange('monetization_methods', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              placeholder="E.g. Sponsorship, Ads, Patreon, Merchandise"
            />
            <p className="mt-1 text-xs text-gray-500">
              Comma-separated list. Options: Sponsorship, Ads, Patreon, Merchandise, Premium Content, Donations
            </p>
          </div>
        </div>

        {/* Section 4: Online Presence */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Online Presence</h3>

          {/* Website URL */}
          <div>
            <label htmlFor="pod-website" className="block text-sm font-medium text-gray-700 mb-1">
              Website URL
            </label>
            <input
              type="url"
              id="pod-website"
              value={formData.website_url}
              onChange={(e) => handleChange('website_url', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                errors.website_url ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="https://yourpodcast.com"
            />
            {errors.website_url && <p className="mt-1 text-sm text-red-600">{errors.website_url}</p>}
          </div>

          {/* Location */}
          <div>
            <label htmlFor="pod-location" className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              id="pod-location"
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

export default PodcasterFormModal;
