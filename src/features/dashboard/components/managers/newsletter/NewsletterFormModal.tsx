/**
 * NewsletterFormModal - Create/Edit Newsletter Form
 *
 * @description Form modal for creating or editing newsletters
 * @component Client Component
 * @tier STANDARD
 * @phase Tier 2 Content Types - Phase N7A
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier2_Phases/PHASE_N7A_DASHBOARD_NEWSLETTER_MANAGER.md
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
import { SEOPreviewPanel } from '../content/SEOPreviewPanel';

// ============================================================================
// TYPES
// ============================================================================

export interface NewsletterFormData {
  title: string;
  excerpt: string;
  web_content: string;
  featured_image: string;
  category_id: string;
  tags: string;
  reading_time: string;
  issue_number: string;
}

export interface NewsletterFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line no-unused-vars
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isSubmitting: boolean;
  initialData?: Partial<NewsletterFormData>;
}

// ============================================================================
// HELPERS
// ============================================================================

const EMPTY_FORM: NewsletterFormData = {
  title: '',
  excerpt: '',
  web_content: '',
  featured_image: '',
  category_id: '',
  tags: '',
  reading_time: '',
  issue_number: '',
};

/**
 * Auto-calculate reading time from word count (~200 words/min)
 */
function calcReadingTime(content: string): string {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  if (!words) return '';
  return String(Math.max(1, Math.ceil(words / 200)));
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * NewsletterFormModal - Newsletter create/edit form
 */
export function NewsletterFormModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  initialData,
}: NewsletterFormModalProps) {
  const [formData, setFormData] = useState<NewsletterFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form when initialData changes or modal opens
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        excerpt: initialData.excerpt || '',
        web_content: initialData.web_content || '',
        featured_image: initialData.featured_image || '',
        category_id: initialData.category_id || '',
        tags: initialData.tags || '',
        reading_time: initialData.reading_time || '',
        issue_number: initialData.issue_number || '',
      });
    } else {
      setFormData(EMPTY_FORM);
    }
    setErrors({});
  }, [initialData, isOpen]);

  // Handle field change
  const handleChange = useCallback((field: keyof NewsletterFormData, value: string) => {
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

    if (!formData.web_content.trim()) {
      newErrors.web_content = 'Web content is required';
    } else if (formData.web_content.trim().length < 10) {
      newErrors.web_content = 'Web content must be at least 10 characters';
    }

    if (formData.issue_number.trim()) {
      const n = parseInt(formData.issue_number, 10);
      if (isNaN(n) || n < 1) {
        newErrors.issue_number = 'Issue number must be a positive integer';
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
      title: formData.title.trim(),
    };

    if (formData.excerpt.trim()) {
      submitData.excerpt = formData.excerpt.trim();
    }
    if (formData.web_content.trim()) {
      submitData.web_content = formData.web_content.trim();
    }
    if (formData.featured_image.trim()) {
      submitData.featured_image = formData.featured_image.trim();
    }
    if (formData.category_id.trim()) {
      submitData.category_id = parseInt(formData.category_id, 10);
    }
    if (formData.tags.trim()) {
      submitData.tags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
    }
    if (formData.issue_number.trim()) {
      submitData.issue_number = parseInt(formData.issue_number, 10);
    }

    // Reading time: use provided value, or auto-calculate from web_content
    const readingTimeStr = formData.reading_time.trim() || calcReadingTime(formData.web_content);
    if (readingTimeStr) {
      submitData.reading_time = parseInt(readingTimeStr, 10);
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
      title={initialData ? 'Edit Newsletter' : 'Create Newsletter'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>

          {/* Title */}
          <div>
            <label htmlFor="newsletter-title" className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              id="newsletter-title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Newsletter title"
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
          </div>

          {/* Issue Number */}
          <div>
            <label htmlFor="newsletter-issue-number" className="block text-sm font-medium text-gray-700 mb-1">
              Issue Number
            </label>
            <input
              type="number"
              id="newsletter-issue-number"
              value={formData.issue_number}
              onChange={(e) => handleChange('issue_number', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                errors.issue_number ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="e.g. 1"
              min="1"
            />
            {errors.issue_number && <p className="mt-1 text-sm text-red-600">{errors.issue_number}</p>}
          </div>

          {/* Excerpt */}
          <div>
            <label htmlFor="newsletter-excerpt" className="block text-sm font-medium text-gray-700 mb-1">
              Excerpt
            </label>
            <textarea
              id="newsletter-excerpt"
              value={formData.excerpt}
              onChange={(e) => handleChange('excerpt', e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent resize-none"
              placeholder="Brief summary of the newsletter..."
            />
          </div>

          {/* SEO Preview */}
          <SEOPreviewPanel
            title={formData.title}
            description={formData.excerpt}
            contentType="article"
          />

          {/* Web Content */}
          <div>
            <label htmlFor="newsletter-web-content" className="block text-sm font-medium text-gray-700 mb-1">
              Web Content <span className="text-red-600">*</span>
            </label>
            <textarea
              id="newsletter-web-content"
              value={formData.web_content}
              onChange={(e) => handleChange('web_content', e.target.value)}
              rows={10}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent resize-none ${
                errors.web_content ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Write your newsletter content here..."
            />
            {errors.web_content && <p className="mt-1 text-sm text-red-600">{errors.web_content}</p>}
            {formData.web_content && (
              <p className="mt-1 text-xs text-gray-500">
                Estimated read: {calcReadingTime(formData.web_content)} min
              </p>
            )}
          </div>
        </div>

        {/* Media */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Media</h3>

          <div>
            <label htmlFor="newsletter-image" className="block text-sm font-medium text-gray-700 mb-1">
              Featured Image URL
            </label>
            <input
              type="url"
              id="newsletter-image"
              value={formData.featured_image}
              onChange={(e) => handleChange('featured_image', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              placeholder="https://example.com/image.jpg"
            />
            <p className="mt-1 text-xs text-gray-500">Direct URL to featured image</p>
          </div>
        </div>

        {/* Categorization */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Categorization</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label htmlFor="newsletter-category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <input
                type="text"
                id="newsletter-category"
                value={formData.category_id}
                onChange={(e) => handleChange('category_id', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                placeholder="Category ID"
              />
            </div>

            {/* Reading Time */}
            <div>
              <label htmlFor="newsletter-reading-time" className="block text-sm font-medium text-gray-700 mb-1">
                Reading Time (minutes)
              </label>
              <input
                type="number"
                id="newsletter-reading-time"
                value={formData.reading_time}
                onChange={(e) => handleChange('reading_time', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                placeholder="Auto-calculated if blank"
                min="1"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="newsletter-tags" className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <input
              type="text"
              id="newsletter-tags"
              value={formData.tags}
              onChange={(e) => handleChange('tags', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              placeholder="business, tips, marketing (comma-separated)"
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
            {isSubmitting ? 'Saving...' : (initialData ? 'Update Newsletter' : 'Create Newsletter')}
          </button>
        </div>
      </form>
    </BizModal>
  );
}

export default NewsletterFormModal;
