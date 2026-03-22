/**
 * SaveJobAsTemplateModal - Save an existing job posting as a reusable template
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Jobs Phase 4 - Template Integration & Cross-Feature Linking
 */
'use client';

import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { BizModal } from '@/components/ui/BizModal';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { TemplateCategory } from '@features/jobs/types';

interface SaveJobAsTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobData: {
    title: string;
    employment_type: string;
    description: string;
    compensation_type: string;
    required_qualifications?: string[];
    preferred_qualifications?: string[];
    benefits?: string[];
  };
  listingId: number;
  onSuccess?: () => void;
}

const TEMPLATE_CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'retail', label: 'Retail' },
  { value: 'office', label: 'Office' },
  { value: 'trades', label: 'Trades' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'custom', label: 'Custom' },
];

export function SaveJobAsTemplateModal({
  isOpen,
  onClose,
  jobData,
  listingId,
  onSuccess,
}: SaveJobAsTemplateModalProps) {
  const [name, setName] = useState(`${jobData.title} Template`);
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>('custom');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Template name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetchWithCsrf('/api/jobs/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_name: name.trim(),
          template_category: selectedCategory,
          employment_type: jobData.employment_type,
          description_template: jobData.description,
          compensation_type: jobData.compensation_type,
          required_qualifications_template: jobData.required_qualifications,
          preferred_qualifications_template: jobData.preferred_qualifications,
          benefits_defaults: jobData.benefits,
          business_id: listingId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || data.error || 'Failed to save template');
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
        setSuccess(false);
        setName('');
        setSelectedCategory('custom');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  return (
    <BizModal isOpen={isOpen} onClose={handleClose} title="Save as Template" size="small">
      {success ? (
        <div className="flex flex-col items-center justify-center py-6 gap-3">
          <CheckCircle className="w-12 h-12 text-green-500" />
          <p className="text-gray-700 font-medium">Template saved successfully!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-[#ed6437]"
              placeholder="e.g. Summer Server Template"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as TemplateCategory)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-[#ed6437]"
              disabled={saving}
            >
              {TEMPLATE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-gray-500">
            This template will save the description, employment type, compensation type, and qualifications from this job. You can use it as a starting point for future job postings.
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Template'
              )}
            </button>
          </div>
        </div>
      )}
    </BizModal>
  );
}
