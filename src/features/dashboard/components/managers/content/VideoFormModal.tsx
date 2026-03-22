/**
 * VideoFormModal - Create/Edit Video Form
 *
 * @description Form modal for creating or editing videos with auto URL type detection
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

type VideoTypeValue = 'youtube' | 'vimeo' | 'upload' | 'embed';

export interface VideoFormData {
  title: string;
  video_url: string;
  video_type: VideoTypeValue;
  description: string;
  thumbnail: string;
  duration: string;
  category_id: string;
  tags: string;
}

export interface VideoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line no-unused-vars
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isSubmitting: boolean;
  initialData?: Partial<VideoFormData>;
}

// ============================================================================
// HELPERS
// ============================================================================

const EMPTY_FORM: VideoFormData = {
  title: '',
  video_url: '',
  video_type: 'youtube',
  description: '',
  thumbnail: '',
  duration: '',
  category_id: '',
  tags: '',
};

/**
 * Auto-detect video type from URL
 */
function detectVideoType(url: string): VideoTypeValue {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('vimeo.com')) return 'vimeo';
  if (/\.(mp4|webm|ogg)$/i.test(url)) return 'upload';
  return 'embed';
}

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
 * VideoFormModal - Video create/edit form
 */
export function VideoFormModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  initialData,
}: VideoFormModalProps) {
  const [formData, setFormData] = useState<VideoFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form when initialData changes or modal opens
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        video_url: initialData.video_url || '',
        video_type: initialData.video_type || 'youtube',
        description: initialData.description || '',
        thumbnail: initialData.thumbnail || '',
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
  const handleChange = useCallback((field: keyof VideoFormData, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Auto-detect video type when URL changes
      if (field === 'video_url' && value.trim()) {
        updated.video_type = detectVideoType(value.trim());
      }
      return updated;
    });
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

    if (!formData.video_url.trim()) {
      newErrors.video_url = 'Video URL is required';
    } else if (!isValidUrl(formData.video_url.trim())) {
      newErrors.video_url = 'Please enter a valid URL';
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
      video_url: formData.video_url.trim(),
      video_type: formData.video_type,
    };

    if (formData.description.trim()) {
      submitData.description = formData.description.trim();
    }
    if (formData.thumbnail.trim()) {
      submitData.thumbnail = formData.thumbnail.trim();
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
      title={initialData ? 'Edit Video' : 'Create Video'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>

          {/* Title */}
          <div>
            <label htmlFor="video-title" className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              id="video-title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Video title"
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
          </div>

          {/* Video URL */}
          <div>
            <label htmlFor="video-url" className="block text-sm font-medium text-gray-700 mb-1">
              Video URL <span className="text-red-600">*</span>
            </label>
            <input
              type="url"
              id="video-url"
              value={formData.video_url}
              onChange={(e) => handleChange('video_url', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                errors.video_url ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
            />
            {errors.video_url && <p className="mt-1 text-sm text-red-600">{errors.video_url}</p>}
            {formData.video_url && (
              <p className="mt-1 text-xs text-gray-500">
                Detected type: <span className="font-medium">{formData.video_type}</span>
              </p>
            )}
          </div>

          {/* Video Type (manual override) */}
          <div>
            <label htmlFor="video-type" className="block text-sm font-medium text-gray-700 mb-1">
              Video Type
            </label>
            <select
              id="video-type"
              value={formData.video_type}
              onChange={(e) => handleChange('video_type', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
            >
              <option value="youtube">YouTube</option>
              <option value="vimeo">Vimeo</option>
              <option value="upload">Direct Upload (MP4/WebM)</option>
              <option value="embed">Embed (other)</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="video-description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="video-description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent resize-none"
              placeholder="Video description..."
            />
          </div>
        </div>

        {/* Media & Timing */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Media & Timing</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Thumbnail */}
            <div>
              <label htmlFor="video-thumbnail" className="block text-sm font-medium text-gray-700 mb-1">
                Thumbnail URL
              </label>
              <input
                type="url"
                id="video-thumbnail"
                value={formData.thumbnail}
                onChange={(e) => handleChange('thumbnail', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                placeholder="https://example.com/thumb.jpg"
              />
            </div>

            {/* Duration */}
            <div>
              <label htmlFor="video-duration" className="block text-sm font-medium text-gray-700 mb-1">
                Duration (seconds)
              </label>
              <input
                type="number"
                id="video-duration"
                value={formData.duration}
                onChange={(e) => handleChange('duration', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                placeholder="1800"
                min="0"
              />
              {durationDisplay && (
                <p className="mt-1 text-xs text-gray-500">{durationDisplay}</p>
              )}
            </div>
          </div>
        </div>

        {/* Categorization */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Categorization</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="video-category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <input
                type="text"
                id="video-category"
                value={formData.category_id}
                onChange={(e) => handleChange('category_id', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                placeholder="Category ID"
              />
            </div>

            <div>
              <label htmlFor="video-tags" className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <input
                type="text"
                id="video-tags"
                value={formData.tags}
                onChange={(e) => handleChange('tags', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                placeholder="tutorial, demo (comma-separated)"
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
            {isSubmitting ? 'Saving...' : (initialData ? 'Update Video' : 'Create Video')}
          </button>
        </div>
      </form>
    </BizModal>
  );
}

export default VideoFormModal;
