/**
 * CommunityGigForm - Submit Community Gig Modal
 *
 * Allows any authenticated user to submit a community gig for admin moderation.
 *
 * @tier STANDARD
 * @phase Jobs Phase 5 - Community Gig Board
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/integrationPointRef/jobs/phases/PHASE_5_PLAN.md
 *
 * @see src/features/events/components/CommunityEventForm.tsx - Canon pattern
 */

'use client';

import { useState, FormEvent } from 'react';
import { BizModal } from '@/components/ui/BizModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { fetchWithCsrf } from '@core/utils/csrf';

interface CommunityGigFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormFields {
  title: string;
  description: string;
  employment_type: string;
  compensation_type: string;
  compensation_min: string;
  compensation_max: string;
  work_location_type: string;
  city: string;
  state: string;
  application_deadline: string;
  schedule_info: string;
  contact_email: string;
  contact_phone: string;
}

const INITIAL_FORM: FormFields = {
  title: '',
  description: '',
  employment_type: 'gig',
  compensation_type: 'hourly',
  compensation_min: '',
  compensation_max: '',
  work_location_type: 'onsite',
  city: '',
  state: '',
  application_deadline: '',
  schedule_info: '',
  contact_email: '',
  contact_phone: '',
};

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'gig', label: 'Gig' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'full_time', label: 'Full Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'temporary', label: 'Temporary' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'internship', label: 'Internship' },
];

const COMPENSATION_TYPE_OPTIONS = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'salary', label: 'Salary' },
  { value: 'stipend', label: 'Stipend' },
  { value: 'unpaid', label: 'Unpaid / Volunteer' },
  { value: 'competitive', label: 'Competitive' },
];

const WORK_LOCATION_OPTIONS = [
  { value: 'onsite', label: 'On-Site' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
];


function CommunityGigFormContent({ isOpen, onClose, onSuccess }: CommunityGigFormProps) {
  const [form, setForm] = useState<FormFields>(INITIAL_FORM);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const validate = (): string | null => {
    if (!form.title.trim()) return 'Gig title is required.';
    if (!form.employment_type) return 'Employment type is required.';
    if (!form.compensation_type) return 'Compensation type is required.';
    if (!form.work_location_type) return 'Work location type is required.';
    if (form.work_location_type !== 'remote' && !form.city.trim()) {
      return 'City is required for on-site and hybrid gigs.';
    }
    if (form.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) {
      return 'Please enter a valid email address.';
    }
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        is_community_gig: true,
        title: form.title.trim(),
        description: form.description.trim() || '',
        employment_type: form.employment_type,
        compensation_type: form.compensation_type,
        compensation_min: form.compensation_min ? parseFloat(form.compensation_min) : undefined,
        compensation_max: form.compensation_max ? parseFloat(form.compensation_max) : undefined,
        work_location_type: form.work_location_type,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        application_method: 'native',
        application_deadline: form.application_deadline || undefined,
        schedule_info: form.schedule_info.trim() || undefined,
        contact_email: form.contact_email.trim() || undefined,
        contact_phone: form.contact_phone.trim() || undefined,
      };

      const response = await fetchWithCsrf('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to submit gig. Please try again.');
      }

      setSuccess(true);
      onSuccess?.();

      // Auto-close after 2 seconds
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit gig. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setForm(INITIAL_FORM);
    setError(null);
    setSuccess(false);
    onClose();
  };

  const showLocationFields = form.work_location_type !== 'remote';
  const showCompensationRange = !['unpaid', 'competitive'].includes(form.compensation_type);

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Post a Community Gig"
      size="large"
    >
      {success ? (
        <div className="py-8 text-center">
          <div className="mb-4 text-green-600">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Gig Submitted!</h3>
          <p className="text-gray-600 mb-6">
            Your gig has been submitted for moderation. It will appear publicly once approved.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gig Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              maxLength={255}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Help move furniture this weekend"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe what you need done, requirements, etc."
            />
          </div>

          {/* Employment Type + Compensation Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gig Type <span className="text-red-500">*</span>
              </label>
              <select
                name="employment_type"
                value={form.employment_type}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {EMPLOYMENT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Compensation <span className="text-red-500">*</span>
              </label>
              <select
                name="compensation_type"
                value={form.compensation_type}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {COMPENSATION_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Compensation range (conditional) */}
          {showCompensationRange && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Pay (optional)
                </label>
                <input
                  type="number"
                  name="compensation_min"
                  value={form.compensation_min}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Pay (optional)
                </label>
                <input
                  type="number"
                  name="compensation_max"
                  value={form.compensation_max}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>
          )}

          {/* Work Location Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Work Location <span className="text-red-500">*</span>
            </label>
            <select
              name="work_location_type"
              value={form.work_location_type}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {WORK_LOCATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* City / State (conditional) */}
          {showLocationFields && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  maxLength={100}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="City"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  maxLength={50}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="State"
                />
              </div>
            </div>
          )}

          {/* Contact Info */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
            <p className="text-sm text-blue-800 font-medium mb-1">How will people contact you?</p>
            <p className="text-xs text-blue-600 mb-3">
              Interested users will contact you through Bizconekt Messages by default. You can also provide an email or phone number.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Email (optional)
                </label>
                <input
                  type="email"
                  name="contact_email"
                  value={form.contact_email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Phone (optional)
                </label>
                <input
                  type="tel"
                  name="contact_phone"
                  value={form.contact_phone}
                  onChange={handleChange}
                  maxLength={20}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Application Deadline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deadline (optional)
            </label>
            <input
              type="date"
              name="application_deadline"
              value={form.application_deadline}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Schedule Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Schedule / Availability (optional)
            </label>
            <input
              type="text"
              name="schedule_info"
              value={form.schedule_info}
              onChange={handleChange}
              maxLength={255}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Weekends only, flexible hours"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-[#ed6437] text-white rounded-md hover:bg-[#d55a31] transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Submitting...' : 'Submit Gig'}
            </button>
          </div>
        </form>
      )}
    </BizModal>
  );
}

export function CommunityGigForm(props: CommunityGigFormProps) {
  return (
    <ErrorBoundary componentName="CommunityGigForm">
      <CommunityGigFormContent {...props} />
    </ErrorBoundary>
  );
}
