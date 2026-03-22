/**
 * ArticleFormModal - Create/Edit Article Form
 *
 * @description Form modal for creating or editing articles
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
import { SEOPreviewPanel } from './SEOPreviewPanel';

// ============================================================================
// TYPES
// ============================================================================

export interface ArticleFormData {
  title: string;
  excerpt: string;
  content: string;
  featured_image: string;
  category_id: string;
  tags: string;
  reading_time: string;
}

export interface ArticleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line no-unused-vars
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isSubmitting: boolean;
  initialData?: Partial<ArticleFormData>;
}

// ============================================================================
// HELPERS
// ============================================================================

const EMPTY_FORM: ArticleFormData = {
  title: '',
  excerpt: '',
  content: '',
  featured_image: '',
  category_id: '',
  tags: '',
  reading_time: '',
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
 * ArticleFormModal - Article create/edit form
 */
export function ArticleFormModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  initialData,
}: ArticleFormModalProps) {
  const [formData, setFormData] = useState<ArticleFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form when initialData changes or modal opens
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        excerpt: initialData.excerpt || '',
        content: initialData.content || '',
        featured_image: initialData.featured_image || '',
        category_id: initialData.category_id || '',
        tags: initialData.tags || '',
        reading_time: initialData.reading_time || '',
      });
    } else {
      setFormData(EMPTY_FORM);
    }
    setErrors({});
  }, [initialData, isOpen]);

  // Handle field change
  const handleChange = useCallback((field: keyof ArticleFormData, value: string) => {
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
    if (formData.content.trim()) {
      submitData.content = formData.content.trim();
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

    // Reading time: use provided value, or auto-calculate from content
    const readingTimeStr = formData.reading_time.trim() || calcReadingTime(formData.content);
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
      title={initialData ? 'Edit Article' : 'Create Article'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>

          {/* Title */}
          <div>
            <label htmlFor="article-title" className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              id="article-title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Article title"
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
          </div>

          {/* Excerpt */}
          <div>
            <label htmlFor="article-excerpt" className="block text-sm font-medium text-gray-700 mb-1">
              Excerpt
            </label>
            <textarea
              id="article-excerpt"
              value={formData.excerpt}
              onChange={(e) => handleChange('excerpt', e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent resize-none"
              placeholder="Brief summary of the article..."
            />
          </div>

          {/* SEO Preview */}
          <SEOPreviewPanel
            title={formData.title}
            description={formData.excerpt}
            contentType="article"
          />

          {/* Content */}
          <div>
            <label htmlFor="article-content" className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <textarea
              id="article-content"
              value={formData.content}
              onChange={(e) => handleChange('content', e.target.value)}
              rows={10}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent resize-none"
              placeholder="Write your article content here..."
            />
            {formData.content && (
              <p className="mt-1 text-xs text-gray-500">
                Estimated read: {calcReadingTime(formData.content)} min
              </p>
            )}
          </div>
        </div>

        {/* Media */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Media</h3>

          <div>
            <label htmlFor="article-image" className="block text-sm font-medium text-gray-700 mb-1">
              Featured Image URL
            </label>
            <input
              type="url"
              id="article-image"
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
              <label htmlFor="article-category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <input
                type="text"
                id="article-category"
                value={formData.category_id}
                onChange={(e) => handleChange('category_id', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                placeholder="Category ID"
              />
            </div>

            {/* Reading Time */}
            <div>
              <label htmlFor="article-reading-time" className="block text-sm font-medium text-gray-700 mb-1">
                Reading Time (minutes)
              </label>
              <input
                type="number"
                id="article-reading-time"
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
            <label htmlFor="article-tags" className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <input
              type="text"
              id="article-tags"
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
            {isSubmitting ? 'Saving...' : (initialData ? 'Update Article' : 'Create Article')}
          </button>
        </div>
      </form>
    </BizModal>
  );
}

export default ArticleFormModal;
