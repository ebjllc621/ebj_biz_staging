/**
 * PortfolioItemFormModal - Create/Edit Portfolio Item Form
 *
 * @description Form modal for creating or editing affiliate marketer portfolio items
 * @component Client Component
 * @tier STANDARD
 * @phase Tier 3 Creator Profiles - Phase 8B
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier3_Phases/PHASE_8B_PORTFOLIO_COLLABORATION_MANAGEMENT.md
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

export interface PortfolioItemFormData {
  campaign_title: string;
  brand_name: string;
  brand_logo: string;
  description: string;
  results_summary: string;
  conversion_rate: string;
  content_url: string;
  campaign_date: string;
}

export interface PortfolioItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line no-unused-vars
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isSubmitting: boolean;
  initialData?: Partial<PortfolioItemFormData> & { id?: number };
}

// ============================================================================
// HELPERS
// ============================================================================

const EMPTY_FORM: PortfolioItemFormData = {
  campaign_title: '',
  brand_name: '',
  brand_logo: '',
  description: '',
  results_summary: '',
  conversion_rate: '',
  content_url: '',
  campaign_date: '',
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
    // Handle ISO strings or date strings
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  }
  return '';
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PortfolioItemFormModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  initialData,
}: PortfolioItemFormModalProps) {
  const isEditing = !!initialData?.id;

  const [formData, setFormData] = useState<PortfolioItemFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof PortfolioItemFormData, string>>>({});

  // Initialize form from initialData
  useEffect(() => {
    if (initialData) {
      setFormData({
        campaign_title: initialData.campaign_title ?? '',
        brand_name: initialData.brand_name ?? '',
        brand_logo: initialData.brand_logo ?? '',
        description: initialData.description ?? '',
        results_summary: initialData.results_summary ?? '',
        conversion_rate: initialData.conversion_rate ?? '',
        content_url: initialData.content_url ?? '',
        campaign_date: dateToInputValue(initialData.campaign_date),
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
    const newErrors: Partial<Record<keyof PortfolioItemFormData, string>> = {};

    const title = formData.campaign_title.trim();
    if (!title) {
      newErrors.campaign_title = 'Campaign title is required';
    } else if (title.length < 2) {
      newErrors.campaign_title = 'Campaign title must be at least 2 characters';
    } else if (title.length > 255) {
      newErrors.campaign_title = 'Campaign title must be 255 characters or fewer';
    }

    if (formData.brand_logo && !isValidUrl(formData.brand_logo)) {
      newErrors.brand_logo = 'Brand logo must be a valid URL';
    }

    if (formData.content_url && !isValidUrl(formData.content_url)) {
      newErrors.content_url = 'Content URL must be a valid URL';
    }

    if (formData.description && formData.description.length > 2000) {
      newErrors.description = 'Description must be 2000 characters or fewer';
    }

    if (formData.results_summary && formData.results_summary.length > 1000) {
      newErrors.results_summary = 'Results summary must be 1000 characters or fewer';
    }

    if (formData.conversion_rate) {
      const rate = parseFloat(formData.conversion_rate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        newErrors.conversion_rate = 'Conversion rate must be a number between 0 and 100';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload: Record<string, unknown> = {
      campaign_title: formData.campaign_title.trim(),
      brand_name: formData.brand_name.trim() || undefined,
      brand_logo: formData.brand_logo.trim() || undefined,
      description: formData.description.trim() || undefined,
      results_summary: formData.results_summary.trim() || undefined,
      conversion_rate: formData.conversion_rate ? parseFloat(formData.conversion_rate) : undefined,
      content_url: formData.content_url.trim() || undefined,
      campaign_date: formData.campaign_date || undefined,
    };

    await onSubmit(payload);
  }, [formData, validate, onSubmit]);

  const handleChange = useCallback(
    (field: keyof PortfolioItemFormData) =>
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
      title={isEditing ? 'Edit Portfolio Item' : 'Add Portfolio Item'}
      size="large"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Campaign Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Campaign Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.campaign_title}
            onChange={handleChange('campaign_title')}
            placeholder="e.g. Summer Product Launch Campaign"
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
              errors.campaign_title ? 'border-red-400' : 'border-gray-300'
            }`}
          />
          {errors.campaign_title && (
            <p className="mt-1 text-xs text-red-600">{errors.campaign_title}</p>
          )}
        </div>

        {/* Brand Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Brand Name
          </label>
          <input
            type="text"
            value={formData.brand_name}
            onChange={handleChange('brand_name')}
            placeholder="e.g. Acme Corp"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
          />
        </div>

        {/* Brand Logo URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Brand Logo URL
          </label>
          <input
            type="url"
            value={formData.brand_logo}
            onChange={handleChange('brand_logo')}
            placeholder="https://example.com/logo.png"
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
              errors.brand_logo ? 'border-red-400' : 'border-gray-300'
            }`}
          />
          {errors.brand_logo && (
            <p className="mt-1 text-xs text-red-600">{errors.brand_logo}</p>
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
            placeholder="Describe the campaign objectives and your role..."
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

        {/* Results Summary */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Results Summary
          </label>
          <textarea
            value={formData.results_summary}
            onChange={handleChange('results_summary')}
            placeholder="Summarize the campaign results and outcomes..."
            rows={3}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent resize-none ${
              errors.results_summary ? 'border-red-400' : 'border-gray-300'
            }`}
          />
          <div className="flex justify-between mt-1">
            {errors.results_summary ? (
              <p className="text-xs text-red-600">{errors.results_summary}</p>
            ) : (
              <span />
            )}
            <span className="text-xs text-gray-400">{formData.results_summary.length}/1000</span>
          </div>
        </div>

        {/* Conversion Rate + Campaign Date row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Conversion Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Conversion Rate (%)
            </label>
            <input
              type="number"
              value={formData.conversion_rate}
              onChange={handleChange('conversion_rate')}
              placeholder="e.g. 3.5"
              min={0}
              max={100}
              step={0.01}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                errors.conversion_rate ? 'border-red-400' : 'border-gray-300'
              }`}
            />
            {errors.conversion_rate && (
              <p className="mt-1 text-xs text-red-600">{errors.conversion_rate}</p>
            )}
          </div>

          {/* Campaign Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Date
            </label>
            <input
              type="date"
              value={formData.campaign_date}
              onChange={handleChange('campaign_date')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
            />
          </div>
        </div>

        {/* Content URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Content URL
          </label>
          <input
            type="url"
            value={formData.content_url}
            onChange={handleChange('content_url')}
            placeholder="https://example.com/campaign-post"
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
              errors.content_url ? 'border-red-400' : 'border-gray-300'
            }`}
          />
          {errors.content_url && (
            <p className="mt-1 text-xs text-red-600">{errors.content_url}</p>
          )}
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
            {isEditing ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </form>
    </BizModal>
  );
}

export default PortfolioItemFormModal;
