/**
 * CommunityEventForm - Submit Community Event Modal
 *
 * Allows any authenticated user to submit a community event for admin moderation.
 *
 * @tier STANDARD
 * @phase Events Phase 3A - Community Events
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/integrationPointRef/events/phases/PHASE_3A_PLAN.md
 */

'use client';

import { useState, useEffect, FormEvent } from 'react';
import { BizModal } from '@/components/ui/BizModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { fetchWithCsrf } from '@core/utils/csrf';

interface CommunityEventFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface EventTypeOption {
  value: string;
  label: string;
}

interface FormFields {
  title: string;
  description: string;
  event_type: string;
  start_date: string;
  end_date: string;
  timezone: string;
  location_type: 'physical' | 'virtual' | 'hybrid';
  venue_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  virtual_link: string;
  total_capacity: string;
}

const INITIAL_FORM: FormFields = {
  title: '',
  description: '',
  event_type: '',
  start_date: '',
  end_date: '',
  timezone: 'America/New_York',
  location_type: 'physical',
  venue_name: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  virtual_link: '',
  total_capacity: '',
};

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time' },
  { value: 'America/Chicago', label: 'Central Time' },
  { value: 'America/Denver', label: 'Mountain Time' },
  { value: 'America/Los_Angeles', label: 'Pacific Time' },
  { value: 'America/Anchorage', label: 'Alaska Time' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
];

function CommunityEventFormContent({ isOpen, onClose, onSuccess }: CommunityEventFormProps) {
  const [form, setForm] = useState<FormFields>(INITIAL_FORM);
  const [eventTypeOptions, setEventTypeOptions] = useState<EventTypeOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load event types
  useEffect(() => {
    const fetchEventTypes = async () => {
      try {
        const response = await fetch('/api/events/types');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data?.eventTypes) {
            setEventTypeOptions(
              result.data.eventTypes.map((et: { slug: string; name: string }) => ({
                value: et.slug,
                label: et.name,
              }))
            );
          }
        }
      } catch {
        // Non-blocking — form works without dynamic types
      }
    };
    fetchEventTypes();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const validate = (): string | null => {
    if (!form.title.trim()) return 'Event title is required.';
    if (!form.start_date) return 'Start date is required.';
    if (!form.end_date) return 'End date is required.';
    if (new Date(form.end_date) <= new Date(form.start_date)) {
      return 'End date must be after start date.';
    }
    if (new Date(form.start_date) < new Date()) {
      return 'Start date cannot be in the past.';
    }
    if (form.location_type === 'virtual' && !form.virtual_link.trim()) {
      return 'Virtual link is required for virtual events.';
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
        is_community_event: true,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        event_type: form.event_type || undefined,
        start_date: form.start_date,
        end_date: form.end_date,
        timezone: form.timezone,
        location_type: form.location_type,
        venue_name: form.venue_name.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        zip: form.zip.trim() || undefined,
        virtual_link: form.virtual_link.trim() || undefined,
        total_capacity: form.total_capacity ? parseInt(form.total_capacity) : undefined,
      };

      const response = await fetchWithCsrf('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to submit event. Please try again.');
      }

      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit event. Please try again.');
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

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Submit Community Event"
      size="large"
    >
      {success ? (
        <div className="py-8 text-center">
          <div className="mb-4 text-green-600">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Event Submitted!</h3>
          <p className="text-gray-600 mb-6">
            Your event has been submitted for moderation. You&apos;ll be notified when it&apos;s approved.
          </p>
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Done
          </button>
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
              Event Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              maxLength={255}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter event title"
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
              placeholder="Describe your event"
            />
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Type
            </label>
            <select
              name="event_type"
              value={form.event_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select type (optional)</option>
              {eventTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date &amp; Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                name="start_date"
                value={form.start_date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date &amp; Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                name="end_date"
                value={form.end_date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timezone
            </label>
            <select
              name="timezone"
              value={form.timezone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          {/* Location Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location Type
            </label>
            <select
              name="location_type"
              value={form.location_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="physical">In-Person</option>
              <option value="virtual">Virtual</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>

          {/* Venue / Location fields */}
          {(form.location_type === 'physical' || form.location_type === 'hybrid') && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Venue Name
                </label>
                <input
                  type="text"
                  name="venue_name"
                  value={form.venue_name}
                  onChange={handleChange}
                  maxLength={255}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Venue or location name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  maxLength={255}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    maxLength={100}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    maxLength={50}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                  <input
                    type="text"
                    name="zip"
                    value={form.zip}
                    onChange={handleChange}
                    maxLength={20}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </>
          )}

          {/* Virtual link */}
          {(form.location_type === 'virtual' || form.location_type === 'hybrid') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Virtual Link{form.location_type === 'virtual' && <span className="text-red-500"> *</span>}
              </label>
              <input
                type="url"
                name="virtual_link"
                value={form.virtual_link}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://zoom.us/..."
              />
            </div>
          )}

          {/* Total Capacity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Capacity (optional)
            </label>
            <input
              type="number"
              name="total_capacity"
              value={form.total_capacity}
              onChange={handleChange}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Leave blank for unlimited"
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
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Submitting...' : 'Submit Event'}
            </button>
          </div>
        </form>
      )}
    </BizModal>
  );
}

export function CommunityEventForm(props: CommunityEventFormProps) {
  return (
    <ErrorBoundary componentName="CommunityEventForm">
      <CommunityEventFormContent {...props} />
    </ErrorBoundary>
  );
}
