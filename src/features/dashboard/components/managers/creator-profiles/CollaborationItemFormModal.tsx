/**
 * CollaborationItemFormModal - Create/Edit Collaboration Item Form
 *
 * @description Form modal for creating or editing internet personality collaborations
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
 * - Mirrors PortfolioItemFormModal with IP-specific fields
 */
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import BizModal from '@/components/BizModal/BizModal';
import { Loader2 } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface CollaborationItemFormData {
  brand_name: string;
  brand_logo: string;
  collaboration_type: string;
  description: string;
  content_url: string;
  collaboration_date: string;
}

export interface CollaborationItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line no-unused-vars
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isSubmitting: boolean;
  initialData?: Partial<CollaborationItemFormData> & { id?: number };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COLLABORATION_TYPES = [
  'Sponsored Content',
  'Brand Ambassador',
  'Product Review',
  'Affiliate',
  'Event',
  'Other',
] as const;

const EMPTY_FORM: CollaborationItemFormData = {
  brand_name: '',
  brand_logo: '',
  collaboration_type: '',
  description: '',
  content_url: '',
  collaboration_date: '',
};

// ============================================================================
// HELPERS
// ============================================================================

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

// ============================================================================
// COMPONENT
// ============================================================================

export function CollaborationItemFormModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  initialData,
}: CollaborationItemFormModalProps) {
  const isEditing = !!initialData?.id;

  const [formData, setFormData] = useState<CollaborationItemFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof CollaborationItemFormData, string>>>({});

  // Initialize form from initialData
  useEffect(() => {
    if (initialData) {
      setFormData({
        brand_name: initialData.brand_name ?? '',
        brand_logo: initialData.brand_logo ?? '',
        collaboration_type: initialData.collaboration_type ?? '',
        description: initialData.description ?? '',
        content_url: initialData.content_url ?? '',
        collaboration_date: dateToInputValue(initialData.collaboration_date),
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
    const newErrors: Partial<Record<keyof CollaborationItemFormData, string>> = {};

    const name = formData.brand_name.trim();
    if (!name) {
      newErrors.brand_name = 'Brand name is required';
    } else if (name.length < 2) {
      newErrors.brand_name = 'Brand name must be at least 2 characters';
    } else if (name.length > 255) {
      newErrors.brand_name = 'Brand name must be 255 characters or fewer';
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload: Record<string, unknown> = {
      brand_name: formData.brand_name.trim(),
      brand_logo: formData.brand_logo.trim() || undefined,
      collaboration_type: formData.collaboration_type || undefined,
      description: formData.description.trim() || undefined,
      content_url: formData.content_url.trim() || undefined,
      collaboration_date: formData.collaboration_date || undefined,
    };

    await onSubmit(payload);
  }, [formData, validate, onSubmit]);

  const handleChange = useCallback(
    (field: keyof CollaborationItemFormData) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
      title={isEditing ? 'Edit Collaboration' : 'Add Collaboration'}
      size="large"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Brand Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Brand Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.brand_name}
            onChange={handleChange('brand_name')}
            placeholder="e.g. Nike, Apple, Coca-Cola"
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
              errors.brand_name ? 'border-red-400' : 'border-gray-300'
            }`}
          />
          {errors.brand_name && (
            <p className="mt-1 text-xs text-red-600">{errors.brand_name}</p>
          )}
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

        {/* Collaboration Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Collaboration Type
          </label>
          <select
            value={formData.collaboration_type}
            onChange={handleChange('collaboration_type')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent bg-white"
          >
            <option value="">Select type...</option>
            {COLLABORATION_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={handleChange('description')}
            placeholder="Describe the collaboration and your role..."
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

        {/* Content URL + Collaboration Date row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Content URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content URL
            </label>
            <input
              type="url"
              value={formData.content_url}
              onChange={handleChange('content_url')}
              placeholder="https://example.com/post"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                errors.content_url ? 'border-red-400' : 'border-gray-300'
              }`}
            />
            {errors.content_url && (
              <p className="mt-1 text-xs text-red-600">{errors.content_url}</p>
            )}
          </div>

          {/* Collaboration Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Collaboration Date
            </label>
            <input
              type="date"
              value={formData.collaboration_date}
              onChange={handleChange('collaboration_date')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
            />
          </div>
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
            {isEditing ? 'Save Changes' : 'Add Collaboration'}
          </button>
        </div>
      </form>
    </BizModal>
  );
}

export default CollaborationItemFormModal;
