/**
 * GuideFormModal - Create/Edit Guide Form with Multi-Section Editor
 *
 * @description Form modal for creating or editing guides, including a multi-section editor
 * @component Client Component
 * @tier STANDARD
 * @phase Tier 2 Content Types - Phase G8
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier2_Phases/PHASE_G8_DASHBOARD_GUIDE_CREATION.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use BizModal (MANDATORY)
 * - Orange theme for submit button (#ed6437)
 * - Form validation before submit
 * - Follows NewsletterFormModal.tsx pattern exactly
 */
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import BizModal from '@/components/BizModal/BizModal';
import { Loader2, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { SEOPreviewPanel } from '../content/SEOPreviewPanel';

// ============================================================================
// TYPES
// ============================================================================

export interface GuideFormData {
  title: string;
  subtitle: string;
  excerpt: string;
  overview: string;
  prerequisites: string;
  difficulty_level: string;
  estimated_time: string;
  featured_image: string;
  category_id: string;
  tags: string;
  version: string;
}

export interface SectionFormData {
  id?: number;
  title: string;
  content: string;
  estimated_time: string;
  sort_order: number;
}

export interface GuideFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line no-unused-vars
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isSubmitting: boolean;
  initialData?: {
    title: string;
    subtitle: string;
    excerpt: string;
    overview: string;
    prerequisites: string;
    difficulty_level: string;
    estimated_time: string;
    featured_image: string;
    category_id: string;
    tags: string;
    version: string;
    sections: Array<{
      id: number;
      title: string;
      content: string | null;
      estimated_time: number | null;
      sort_order: number;
    }>;
  };
}

// ============================================================================
// HELPERS
// ============================================================================

const EMPTY_FORM: GuideFormData = {
  title: '',
  subtitle: '',
  excerpt: '',
  overview: '',
  prerequisites: '',
  difficulty_level: 'beginner',
  estimated_time: '',
  featured_image: '',
  category_id: '',
  tags: '',
  version: '',
};

const EMPTY_SECTION = (): SectionFormData => ({
  title: '',
  content: '',
  estimated_time: '',
  sort_order: 0,
});

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * GuideFormModal - Guide create/edit form with multi-section editor
 */
export function GuideFormModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  initialData,
}: GuideFormModalProps) {
  const [formData, setFormData] = useState<GuideFormData>(EMPTY_FORM);
  const [sections, setSections] = useState<SectionFormData[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form when initialData changes or modal opens
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        subtitle: initialData.subtitle || '',
        excerpt: initialData.excerpt || '',
        overview: initialData.overview || '',
        prerequisites: initialData.prerequisites || '',
        difficulty_level: initialData.difficulty_level || 'beginner',
        estimated_time: initialData.estimated_time || '',
        featured_image: initialData.featured_image || '',
        category_id: initialData.category_id || '',
        tags: initialData.tags || '',
        version: initialData.version || '',
      });
      setSections(
        (initialData.sections || []).map((s, idx) => ({
          id: s.id,
          title: s.title,
          content: s.content || '',
          estimated_time: s.estimated_time?.toString() || '',
          sort_order: s.sort_order ?? idx + 1,
        }))
      );
    } else {
      setFormData(EMPTY_FORM);
      setSections([]);
    }
    setErrors({});
  }, [initialData, isOpen]);

  // Handle field change
  const handleChange = useCallback((field: keyof GuideFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  }, []);

  // Section handlers
  const handleAddSection = useCallback(() => {
    setSections(prev => {
      const nextOrder = prev.length + 1;
      return [...prev, { ...EMPTY_SECTION(), sort_order: nextOrder }];
    });
  }, []);

  const handleRemoveSection = useCallback((index: number) => {
    setSections(prev => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((s, i) => ({ ...s, sort_order: i + 1 }));
    });
  }, []);

  const handleSectionChange = useCallback((index: number, field: keyof SectionFormData, value: string) => {
    setSections(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  }, []);

  const handleMoveSectionUp = useCallback((index: number) => {
    if (index === 0) return;
    setSections(prev => {
      const updated = [...prev];
      const temp = updated[index - 1];
      updated[index - 1] = updated[index]!;
      updated[index] = temp!;
      return updated.map((s, i) => ({ ...s, sort_order: i + 1 }));
    });
  }, []);

  const handleMoveSectionDown = useCallback((index: number) => {
    setSections(prev => {
      if (index >= prev.length - 1) return prev;
      const updated = [...prev];
      const temp = updated[index + 1];
      updated[index + 1] = updated[index]!;
      updated[index] = temp!;
      return updated.map((s, i) => ({ ...s, sort_order: i + 1 }));
    });
  }, []);

  // Validate form
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }

    if (formData.estimated_time.trim()) {
      const n = parseInt(formData.estimated_time, 10);
      if (isNaN(n) || n < 1) {
        newErrors.estimated_time = 'Estimated time must be a positive number';
      }
    }

    // Validate sections — each must have a title
    sections.forEach((section, idx) => {
      if (!section.title.trim()) {
        newErrors[`section_title_${idx}`] = 'Section title is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, sections]);

  // Handle submit
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    // Build submit data — only include non-empty fields
    const submitData: Record<string, unknown> = {
      title: formData.title.trim(),
    };

    if (formData.subtitle.trim()) submitData.subtitle = formData.subtitle.trim();
    if (formData.excerpt.trim()) submitData.excerpt = formData.excerpt.trim();
    if (formData.overview.trim()) submitData.overview = formData.overview.trim();
    if (formData.prerequisites.trim()) submitData.prerequisites = formData.prerequisites.trim();
    if (formData.difficulty_level) submitData.difficulty_level = formData.difficulty_level;
    if (formData.estimated_time.trim()) submitData.estimated_time = parseInt(formData.estimated_time, 10);
    if (formData.featured_image.trim()) submitData.featured_image = formData.featured_image.trim();
    if (formData.category_id.trim()) submitData.category_id = parseInt(formData.category_id, 10);
    if (formData.tags.trim()) {
      submitData.tags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
    }
    if (formData.version.trim()) submitData.version = formData.version.trim();

    // Include sections
    submitData.sections = sections.map((s, idx) => ({
      ...(s.id !== undefined ? { id: s.id } : {}),
      title: s.title.trim(),
      content: s.content.trim() || null,
      estimated_time: s.estimated_time.trim() ? parseInt(s.estimated_time, 10) : null,
      sort_order: idx + 1,
    }));

    try {
      await onSubmit(submitData);
      onClose();
    } catch {
      // Error handled by parent
    }
  }, [formData, sections, validate, onSubmit, onClose]);

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Guide' : 'Create Guide'}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>

          {/* Title */}
          <div>
            <label htmlFor="guide-title" className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              id="guide-title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Guide title"
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
          </div>

          {/* Subtitle */}
          <div>
            <label htmlFor="guide-subtitle" className="block text-sm font-medium text-gray-700 mb-1">
              Subtitle
            </label>
            <input
              type="text"
              id="guide-subtitle"
              value={formData.subtitle}
              onChange={(e) => handleChange('subtitle', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              placeholder="Optional subtitle"
            />
          </div>

          {/* Excerpt */}
          <div>
            <label htmlFor="guide-excerpt" className="block text-sm font-medium text-gray-700 mb-1">
              Excerpt
            </label>
            <textarea
              id="guide-excerpt"
              value={formData.excerpt}
              onChange={(e) => handleChange('excerpt', e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent resize-none"
              placeholder="Brief summary of the guide..."
            />
          </div>

          {/* SEO Preview */}
          <SEOPreviewPanel
            title={formData.title}
            description={formData.excerpt}
            contentType="article"
          />

          {/* Overview */}
          <div>
            <label htmlFor="guide-overview" className="block text-sm font-medium text-gray-700 mb-1">
              Overview
            </label>
            <textarea
              id="guide-overview"
              value={formData.overview}
              onChange={(e) => handleChange('overview', e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent resize-none"
              placeholder="Describe what readers will learn from this guide..."
            />
          </div>

          {/* Prerequisites */}
          <div>
            <label htmlFor="guide-prerequisites" className="block text-sm font-medium text-gray-700 mb-1">
              Prerequisites
            </label>
            <textarea
              id="guide-prerequisites"
              value={formData.prerequisites}
              onChange={(e) => handleChange('prerequisites', e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent resize-none"
              placeholder="What should readers know before starting this guide?"
            />
          </div>
        </div>

        {/* Guide Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Guide Settings</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Difficulty Level */}
            <div>
              <label htmlFor="guide-difficulty" className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty Level
              </label>
              <select
                id="guide-difficulty"
                value={formData.difficulty_level}
                onChange={(e) => handleChange('difficulty_level', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent bg-white"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {/* Estimated Time */}
            <div>
              <label htmlFor="guide-estimated-time" className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Time (minutes)
              </label>
              <input
                type="number"
                id="guide-estimated-time"
                value={formData.estimated_time}
                onChange={(e) => handleChange('estimated_time', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                  errors.estimated_time ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g. 30"
                min="1"
              />
              {errors.estimated_time && <p className="mt-1 text-sm text-red-600">{errors.estimated_time}</p>}
            </div>

            {/* Version */}
            <div>
              <label htmlFor="guide-version" className="block text-sm font-medium text-gray-700 mb-1">
                Version
              </label>
              <input
                type="text"
                id="guide-version"
                value={formData.version}
                onChange={(e) => handleChange('version', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                placeholder="e.g. 1.0"
              />
            </div>

            {/* Category */}
            <div>
              <label htmlFor="guide-category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <input
                type="text"
                id="guide-category"
                value={formData.category_id}
                onChange={(e) => handleChange('category_id', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                placeholder="Category ID"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="guide-tags" className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <input
              type="text"
              id="guide-tags"
              value={formData.tags}
              onChange={(e) => handleChange('tags', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              placeholder="business, tips, how-to (comma-separated)"
            />
          </div>
        </div>

        {/* Media */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Media</h3>

          <div>
            <label htmlFor="guide-image" className="block text-sm font-medium text-gray-700 mb-1">
              Featured Image URL
            </label>
            <input
              type="url"
              id="guide-image"
              value={formData.featured_image}
              onChange={(e) => handleChange('featured_image', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              placeholder="https://example.com/image.jpg"
            />
            <p className="mt-1 text-xs text-gray-500">Direct URL to featured image</p>
          </div>
        </div>

        {/* Sections Editor */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Sections ({sections.length})
            </h3>
            <button
              type="button"
              onClick={handleAddSection}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-[#ed6437] border border-[#ed6437] rounded-lg hover:bg-orange-50 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add Section
            </button>
          </div>

          {sections.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <p className="text-sm text-gray-500">No sections yet. Add sections to structure your guide.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sections.map((section, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50"
                >
                  {/* Section header */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Section {index + 1}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveSectionUp(index)}
                        disabled={index === 0}
                        className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveSectionDown(index)}
                        disabled={index === sections.length - 1}
                        className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveSection(index)}
                        className="p-1 text-red-500 hover:text-red-700"
                        title="Remove section"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Section title */}
                  <div>
                    <label
                      htmlFor={`section-title-${index}`}
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Title <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      id={`section-title-${index}`}
                      value={section.title}
                      onChange={(e) => handleSectionChange(index, 'title', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent text-sm ${
                        errors[`section_title_${index}`] ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Section title"
                    />
                    {errors[`section_title_${index}`] && (
                      <p className="mt-1 text-xs text-red-600">{errors[`section_title_${index}`]}</p>
                    )}
                  </div>

                  {/* Section content */}
                  <div>
                    <label
                      htmlFor={`section-content-${index}`}
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Content
                    </label>
                    <textarea
                      id={`section-content-${index}`}
                      value={section.content}
                      onChange={(e) => handleSectionChange(index, 'content', e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent resize-none text-sm"
                      placeholder="Write the content for this section..."
                    />
                  </div>

                  {/* Section estimated time */}
                  <div>
                    <label
                      htmlFor={`section-time-${index}`}
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Estimated Time (minutes)
                    </label>
                    <input
                      type="number"
                      id={`section-time-${index}`}
                      value={section.estimated_time}
                      onChange={(e) => handleSectionChange(index, 'estimated_time', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent text-sm"
                      placeholder="e.g. 5"
                      min="1"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
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
            {isSubmitting ? 'Saving...' : (initialData ? 'Update Guide' : 'Create Guide')}
          </button>
        </div>
      </form>
    </BizModal>
  );
}

export default GuideFormModal;
