/**
 * EpisodeItemFormModal - Create/Edit Podcast Episode Form
 *
 * @description Form modal for creating or editing podcaster episodes
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
 * - Follows PortfolioItemFormModal.tsx pattern exactly
 */
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import BizModal from '@/components/BizModal/BizModal';
import { Loader2 } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface EpisodeItemFormData {
  episode_title: string;
  description: string;
  episode_number: string;
  season_number: string;
  duration: string;
  published_at: string;
  audio_url: string;
  guest_names: string;
  listen_url: string;
}

export interface EpisodeItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line no-unused-vars
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isSubmitting: boolean;
  initialData?: Partial<EpisodeItemFormData> & { id?: number };
}

// ============================================================================
// HELPERS
// ============================================================================

const EMPTY_FORM: EpisodeItemFormData = {
  episode_title: '',
  description: '',
  episode_number: '',
  season_number: '',
  duration: '',
  published_at: '',
  audio_url: '',
  guest_names: '',
  listen_url: '',
};

function isValidUrl(value: string): boolean {
  if (!value) return true;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function dateToInputValue(value: unknown): string {
  if (!value) return '';
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  }
  return '';
}

// Convert duration in seconds to display minutes string
function secondsToMinutesString(seconds: unknown): string {
  if (!seconds) return '';
  const num = typeof seconds === 'number' ? seconds : parseInt(String(seconds), 10);
  if (isNaN(num)) return '';
  return String(Math.round(num / 60));
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EpisodeItemFormModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  initialData,
}: EpisodeItemFormModalProps) {
  const isEditing = !!initialData?.id;

  const [formData, setFormData] = useState<EpisodeItemFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof EpisodeItemFormData, string>>>({});

  // Initialize form from initialData
  useEffect(() => {
    if (initialData) {
      setFormData({
        episode_title: initialData.episode_title ?? '',
        description: initialData.description ?? '',
        episode_number: initialData.episode_number ?? '',
        season_number: initialData.season_number ?? '',
        // duration is stored in seconds but displayed as minutes
        duration: initialData.duration
          ? secondsToMinutesString(initialData.duration)
          : '',
        published_at: dateToInputValue(initialData.published_at),
        audio_url: initialData.audio_url ?? '',
        guest_names: initialData.guest_names ?? '',
        listen_url: initialData.listen_url ?? '',
      });
    } else {
      setFormData(EMPTY_FORM);
    }
    setErrors({});
  }, [initialData, isOpen]);

  const handleClose = useCallback(() => {
    setFormData(EMPTY_FORM);
    setErrors({});
    onClose();
  }, [onClose]);

  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof EpisodeItemFormData, string>> = {};

    const title = formData.episode_title.trim();
    if (title && title.length > 255) {
      newErrors.episode_title = 'Episode title must be 255 characters or fewer';
    }

    if (formData.audio_url && !isValidUrl(formData.audio_url)) {
      newErrors.audio_url = 'Audio URL must be a valid URL';
    }

    if (formData.listen_url && !isValidUrl(formData.listen_url)) {
      newErrors.listen_url = 'Listen URL must be a valid URL';
    }

    if (formData.description && formData.description.length > 2000) {
      newErrors.description = 'Description must be 2000 characters or fewer';
    }

    if (formData.episode_number) {
      const num = parseInt(formData.episode_number, 10);
      if (isNaN(num) || num < 0) {
        newErrors.episode_number = 'Episode number must be a positive integer';
      }
    }

    if (formData.season_number) {
      const num = parseInt(formData.season_number, 10);
      if (isNaN(num) || num < 0) {
        newErrors.season_number = 'Season number must be a positive integer';
      }
    }

    if (formData.duration) {
      const mins = parseInt(formData.duration, 10);
      if (isNaN(mins) || mins < 0) {
        newErrors.duration = 'Duration must be a positive number of minutes';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Convert minutes back to seconds for storage
    const durationSeconds = formData.duration
      ? parseInt(formData.duration, 10) * 60
      : undefined;

    const payload: Record<string, unknown> = {
      episode_title: formData.episode_title.trim() || undefined,
      description: formData.description.trim() || undefined,
      episode_number: formData.episode_number ? parseInt(formData.episode_number, 10) : undefined,
      season_number: formData.season_number ? parseInt(formData.season_number, 10) : undefined,
      duration: durationSeconds,
      published_at: formData.published_at || undefined,
      audio_url: formData.audio_url.trim() || undefined,
      guest_names: formData.guest_names.trim()
        ? formData.guest_names.split(',').map(s => s.trim()).filter(Boolean)
        : undefined,
      listen_url: formData.listen_url.trim() || undefined,
    };

    await onSubmit(payload);
  }, [formData, validate, onSubmit]);

  const handleChange = useCallback(
    (field: keyof EpisodeItemFormData) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [field]: e.target.value }));
        if (errors[field]) {
          setErrors(prev => ({ ...prev, [field]: undefined }));
        }
      },
    [errors]
  );

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit Episode' : 'Add Episode'}
      size="large"
    >
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Episode Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Episode Title
          </label>
          <input
            type="text"
            value={formData.episode_title}
            onChange={handleChange('episode_title')}
            placeholder="e.g. How to Build a 7-Figure Business"
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
              errors.episode_title ? 'border-red-400' : 'border-gray-300'
            }`}
          />
          {errors.episode_title && (
            <p className="mt-1 text-xs text-red-600">{errors.episode_title}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={handleChange('description')}
            placeholder="What is this episode about?"
            rows={4}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent resize-none ${
              errors.description ? 'border-red-400' : 'border-gray-300'
            }`}
          />
          <div className="flex justify-between mt-1">
            {errors.description ? (
              <p className="text-xs text-red-600">{errors.description}</p>
            ) : (
              <span />
            )}
            <span className="text-xs text-gray-400">{formData.description.length}/2000</span>
          </div>
        </div>

        {/* Episode Number + Season Number row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Episode Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Episode Number
            </label>
            <input
              type="number"
              value={formData.episode_number}
              onChange={handleChange('episode_number')}
              placeholder="e.g. 42"
              min={0}
              step={1}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                errors.episode_number ? 'border-red-400' : 'border-gray-300'
              }`}
            />
            {errors.episode_number && (
              <p className="mt-1 text-xs text-red-600">{errors.episode_number}</p>
            )}
          </div>

          {/* Season Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Season Number
            </label>
            <input
              type="number"
              value={formData.season_number}
              onChange={handleChange('season_number')}
              placeholder="e.g. 3"
              min={0}
              step={1}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                errors.season_number ? 'border-red-400' : 'border-gray-300'
              }`}
            />
            {errors.season_number && (
              <p className="mt-1 text-xs text-red-600">{errors.season_number}</p>
            )}
          </div>
        </div>

        {/* Duration + Published At row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Duration (minutes) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes)
            </label>
            <input
              type="number"
              value={formData.duration}
              onChange={handleChange('duration')}
              placeholder="e.g. 45"
              min={0}
              step={1}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                errors.duration ? 'border-red-400' : 'border-gray-300'
              }`}
            />
            {errors.duration && (
              <p className="mt-1 text-xs text-red-600">{errors.duration}</p>
            )}
          </div>

          {/* Published At */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Published Date
            </label>
            <input
              type="date"
              value={formData.published_at}
              onChange={handleChange('published_at')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
            />
          </div>
        </div>

        {/* Audio URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Audio URL
          </label>
          <input
            type="url"
            value={formData.audio_url}
            onChange={handleChange('audio_url')}
            placeholder="https://example.com/episode-42.mp3"
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
              errors.audio_url ? 'border-red-400' : 'border-gray-300'
            }`}
          />
          {errors.audio_url && (
            <p className="mt-1 text-xs text-red-600">{errors.audio_url}</p>
          )}
        </div>

        {/* Listen URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Listen URL
          </label>
          <input
            type="url"
            value={formData.listen_url}
            onChange={handleChange('listen_url')}
            placeholder="https://open.spotify.com/episode/..."
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
              errors.listen_url ? 'border-red-400' : 'border-gray-300'
            }`}
          />
          {errors.listen_url && (
            <p className="mt-1 text-xs text-red-600">{errors.listen_url}</p>
          )}
        </div>

        {/* Guest Names */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Guest Names
          </label>
          <input
            type="text"
            value={formData.guest_names}
            onChange={handleChange('guest_names')}
            placeholder="e.g. Jane Smith, John Doe"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">Comma-separated list of guest names</p>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#ed6437] rounded-lg hover:bg-[#d55a31] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Add Episode'}
          </button>
        </div>
      </form>
    </BizModal>
  );
}

export default EpisodeItemFormModal;
