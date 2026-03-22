/**
 * PodcastFormModal - Create/Edit Podcast Form
 *
 * @description Form modal for creating or editing podcasts
 * @component Client Component
 * @tier STANDARD
 * @phase Content Phase 5A
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier1_Phases/PHASE_5A_DASHBOARD_CONTENT_MANAGER.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use BizModal (MANDATORY)
 * - Orange theme for submit button (#ed6437)
 * - Form validation before submit
 * - Follows EventFormModal.tsx pattern exactly
 */
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import BizModal from '@/components/BizModal/BizModal';
import { Loader2 } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface PodcastFormData {
  title: string;
  audio_url: string;
  description: string;
  thumbnail: string;
  season_number: string;
  episode_number: string;
  duration: string;
  category_id: string;
  tags: string;
}

export interface PodcastFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line no-unused-vars
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isSubmitting: boolean;
  initialData?: Partial<PodcastFormData>;
}

// ============================================================================
// HELPERS
// ============================================================================

const EMPTY_FORM: PodcastFormData = {
  title: '',
  audio_url: '',
  description: '',
  thumbnail: '',
  season_number: '',
  episode_number: '',
  duration: '',
  category_id: '',
  tags: '',
};

/**
 * Format seconds as MM:SS display
 */
function formatDurationDisplay(seconds: string): string {
  const num = parseInt(seconds, 10);
  if (isNaN(num) || num < 0) return '';
  const mins = Math.floor(num / 60);
  const secs = num % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * PodcastFormModal - Podcast create/edit form
 */
export function PodcastFormModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  initialData,
}: PodcastFormModalProps) {
  const [formData, setFormData] = useState<PodcastFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form when initialData changes or modal opens
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        audio_url: initialData.audio_url || '',
        description: initialData.description || '',
        thumbnail: initialData.thumbnail || '',
        season_number: initialData.season_number || '',
        episode_number: initialData.episode_number || '',
        duration: initialData.duration || '',
        category_id: initialData.category_id || '',
        tags: initialData.tags || '',
      });
    } else {
      setFormData(EMPTY_FORM);
    }
    setErrors({});
  }, [initialData, isOpen]);

  // Handle field change
  const handleChange = useCallback((field: keyof PodcastFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  }, []);

  // Validate form
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }

    if (!formData.audio_url.trim()) {
      newErrors.audio_url = 'Audio URL is required';
    } else if (!isValidUrl(formData.audio_url.trim())) {
      newErrors.audio_url = 'Please enter a valid URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle submit
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const submitData: Record<string, unknown> = {
      title: formData.title.trim(),
      audio_url: formData.audio_url.trim(),
    };

    if (formData.description.trim()) {
      submitData.description = formData.description.trim();
    }
    if (formData.thumbnail.trim()) {
      submitData.thumbnail = formData.thumbnail.trim();
    }
    if (formData.season_number.trim()) {
      submitData.season_number = parseInt(formData.season_number, 10);
    }
    if (formData.episode_number.trim()) {
      submitData.episode_number = parseInt(formData.episode_number, 10);
    }
    if (formData.duration.trim()) {
      submitData.duration = parseInt(formData.duration, 10);
    }
    if (formData.category_id.trim()) {
      submitData.category_id = parseInt(formData.category_id, 10);
    }
    if (formData.tags.trim()) {
      submitData.tags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    try {
      await onSubmit(submitData);
      onClose();
    } catch {
      // Error handled by parent
    }
  }, [formData, validate, onSubmit, onClose]);

  const durationDisplay = formData.duration ? formatDurationDisplay(formData.duration) : '';

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Podcast' : 'Create Podcast'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>

          {/* Title */}
          <div>
            <label htmlFor="podcast-title" className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              id="podcast-title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Podcast episode title"
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
          </div>

          {/* Audio URL */}
          <div>
            <label htmlFor="podcast-audio-url" className="block text-sm font-medium text-gray-700 mb-1">
              Audio URL <span className="text-red-600">*</span>
            </label>
            <input
              type="url"
              id="podcast-audio-url"
              value={formData.audio_url}
              onChange={(e) => handleChange('audio_url', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                errors.audio_url ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="https://example.com/podcast.mp3"
            />
            {errors.audio_url && <p className="mt-1 text-sm text-red-600">{errors.audio_url}</p>}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="podcast-description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="podcast-description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent resize-none"
              placeholder="Episode description..."
            />
          </div>
        </div>

        {/* Episode Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Episode Details</h3>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Season Number */}
            <div>
              <label htmlFor="podcast-season" className="block text-sm font-medium text-gray-700 mb-1">
                Season
              </label>
              <input
                type="number"
                id="podcast-season"
                value={formData.season_number}
                onChange={(e) => handleChange('season_number', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                placeholder="1"
                min="1"
              />
            </div>

            {/* Episode Number */}
            <div>
              <label htmlFor="podcast-episode" className="block text-sm font-medium text-gray-700 mb-1">
                Episode
              </label>
              <input
                type="number"
                id="podcast-episode"
                value={formData.episode_number}
                onChange={(e) => handleChange('episode_number', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                placeholder="1"
                min="1"
              />
            </div>

            {/* Duration */}
            <div>
              <label htmlFor="podcast-duration" className="block text-sm font-medium text-gray-700 mb-1">
                Duration (seconds)
              </label>
              <input
                type="number"
                id="podcast-duration"
                value={formData.duration}
                onChange={(e) => handleChange('duration', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                placeholder="3600"
                min="0"
              />
              {durationDisplay && (
                <p className="mt-1 text-xs text-gray-500">{durationDisplay}</p>
              )}
            </div>
          </div>
        </div>

        {/* Media */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Media</h3>

          <div>
            <label htmlFor="podcast-thumbnail" className="block text-sm font-medium text-gray-700 mb-1">
              Thumbnail URL
            </label>
            <input
              type="url"
              id="podcast-thumbnail"
              value={formData.thumbnail}
              onChange={(e) => handleChange('thumbnail', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              placeholder="https://example.com/thumbnail.jpg"
            />
          </div>
        </div>

        {/* Categorization */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Categorization</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="podcast-category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <input
                type="text"
                id="podcast-category"
                value={formData.category_id}
                onChange={(e) => handleChange('category_id', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                placeholder="Category ID"
              />
            </div>

            <div>
              <label htmlFor="podcast-tags" className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <input
                type="text"
                id="podcast-tags"
                value={formData.tags}
                onChange={(e) => handleChange('tags', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                placeholder="tech, business, tips (comma-separated)"
              />
            </div>
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
            {isSubmitting ? 'Saving...' : (initialData ? 'Update Podcast' : 'Create Podcast')}
          </button>
        </div>
      </form>
    </BizModal>
  );
}

export default PodcastFormModal;
