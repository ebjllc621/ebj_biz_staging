/**
 * EditEventModal Component - Modal for editing existing events
 *
 * @authority PHASE_5.4.1_BRAIN_PLAN.md - Task 2.2
 * @governance Build Map v2.1 ENHANCED compliance
 * @pattern Phase 5.4 BizModal pattern
 */

'use client';

import { useState, useEffect } from 'react';
import { BizModal } from '@/components/ui/BizModal';
import { fetchWithCsrf } from '@core/utils/csrf';
import { ErrorService } from '@core/services/ErrorService';

interface Listing {
  id: number;
  name: string;
  tier: string;
}

export interface EventData {
  id: number;
  listing_id: number;
  listing_name: string;
  title: string;
  slug: string;
  description: string | null;
  event_type: string | null;
  start_date: string;
  end_date: string;
  timezone: string;
  location_type: string;
  venue_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  virtual_link: string | null;
  is_ticketed: boolean;
  ticket_price: number | null;
  total_capacity: number | null;
  remaining_capacity: number | null;
  rsvp_count: number;
  status: string;
  is_featured: boolean;
}

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
  event: EventData;
  listings: Listing[];
}

/**
 * EditEventModal - Edit existing event modal
 *
 * Features:
 * - BizModal wrapper
 * - Pre-populated form with existing event data
 * - Form validation
 *
 * @param {EditEventModalProps} props
 * @returns {JSX.Element}
 */
export function EditEventModal({ isOpen, onClose, onSuccess, event, listings }: EditEventModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    listing_id: '',
    title: '',
    description: '',
    event_type: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    timezone: 'America/New_York',
    location_type: 'physical',
    venue_name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    virtual_link: '',
    is_ticketed: false,
    ticket_price: '',
    total_capacity: ''
  });

  // Initialize form with event data
  useEffect(() => {
    if (event) {
      const startDate = new Date(event.start_date);
      const endDate = new Date(event.end_date);

      setFormData({
        listing_id: event.listing_id.toString(),
        title: event.title,
        description: event.description || '',
        event_type: event.event_type || '',
        start_date: event.start_date?.split('T')[0] || '',
        start_time: startDate.toTimeString().slice(0, 5),
        end_date: event.end_date?.split('T')[0] || '',
        end_time: endDate.toTimeString().slice(0, 5),
        timezone: event.timezone,
        location_type: event.location_type,
        venue_name: event.venue_name || '',
        address: event.address || '',
        city: event.city || '',
        state: event.state || '',
        zip: event.zip || '',
        virtual_link: event.virtual_link || '',
        is_ticketed: event.is_ticketed,
        ticket_price: event.ticket_price?.toString() || '',
        total_capacity: event.total_capacity?.toString() || ''
      });
    }
  }, [event]);

  /**
   * Handle form field changes
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.listing_id || !formData.title || !formData.start_date || !formData.end_date) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);

      // Combine date and time
      const startDateTime = formData.start_time
        ? `${formData.start_date}T${formData.start_time}`
        : formData.start_date;
      const endDateTime = formData.end_time
        ? `${formData.end_date}T${formData.end_time}`
        : formData.end_date;

      // @governance MANDATORY - CSRF protection for PUT requests
      // Source: osi-production-compliance.mdc, Layer 7 Security
      const response = await fetchWithCsrf(`/api/events/${event.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          listing_id: parseInt(formData.listing_id),
          title: formData.title,
          description: formData.description || null,
          event_type: formData.event_type || null,
          start_date: startDateTime,
          end_date: endDateTime,
          timezone: formData.timezone,
          location_type: formData.location_type,
          venue_name: formData.venue_name || null,
          address: formData.address || null,
          city: formData.city || null,
          state: formData.state || null,
          zip: formData.zip || null,
          virtual_link: formData.virtual_link || null,
          is_ticketed: formData.is_ticketed,
          ticket_price: formData.ticket_price ? parseFloat(formData.ticket_price) : null,
          total_capacity: formData.total_capacity ? parseInt(formData.total_capacity) : null
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update event');
      }

      alert('Event updated successfully!');
      onSuccess();
    } catch (error) {
      ErrorService.capture('Update event error:', error);
      alert(error instanceof Error ? error.message : 'Failed to update event');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Event"
      size="large"
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Listing Selection */}
        <div>
          <label htmlFor="listing_id" className="block text-sm font-medium text-gray-700">
            Listing *
          </label>
          <select
            id="listing_id"
            name="listing_id"
            value={formData.listing_id}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Select a listing</option>
            {listings.map((listing) => (
              <option key={listing.id} value={listing.id}>
                {listing.name} ({listing.tier})
              </option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Event Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        {/* Event Type */}
        <div>
          <label htmlFor="event_type" className="block text-sm font-medium text-gray-700">
            Event Type
          </label>
          <input
            type="text"
            id="event_type"
            name="event_type"
            value={formData.event_type}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        {/* Date & Time Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
              Start Date *
            </label>
            <input
              type="date"
              id="start_date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="start_time" className="block text-sm font-medium text-gray-700">
              Start Time
            </label>
            <input
              type="time"
              id="start_time"
              name="start_time"
              value={formData.start_time}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
              End Date *
            </label>
            <input
              type="date"
              id="end_date"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="end_time" className="block text-sm font-medium text-gray-700">
              End Time
            </label>
            <input
              type="time"
              id="end_time"
              name="end_time"
              value={formData.end_time}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Timezone */}
        <div>
          <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
            Timezone
          </label>
          <select
            id="timezone"
            name="timezone"
            value={formData.timezone}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
          </select>
        </div>

        {/* Location Type */}
        <div>
          <label htmlFor="location_type" className="block text-sm font-medium text-gray-700">
            Location Type *
          </label>
          <select
            id="location_type"
            name="location_type"
            value={formData.location_type}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="physical">Physical Location</option>
            <option value="virtual">Virtual Event</option>
            <option value="hybrid">Hybrid (Physical + Virtual)</option>
          </select>
        </div>

        {/* Physical Location Fields (conditional) */}
        {(formData.location_type === 'physical' || formData.location_type === 'hybrid') && (
          <>
            <div>
              <label htmlFor="venue_name" className="block text-sm font-medium text-gray-700">
                Venue Name
              </label>
              <input
                type="text"
                id="venue_name"
                name="venue_name"
                value={formData.venue_name}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                  State
                </label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  maxLength={2}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="zip" className="block text-sm font-medium text-gray-700">
                  ZIP
                </label>
                <input
                  type="text"
                  id="zip"
                  name="zip"
                  value={formData.zip}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </>
        )}

        {/* Virtual Link (conditional) */}
        {(formData.location_type === 'virtual' || formData.location_type === 'hybrid') && (
          <div>
            <label htmlFor="virtual_link" className="block text-sm font-medium text-gray-700">
              Virtual Event Link
            </label>
            <input
              type="url"
              id="virtual_link"
              name="virtual_link"
              value={formData.virtual_link}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Ticketing Configuration */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_ticketed"
            name="is_ticketed"
            checked={formData.is_ticketed}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="is_ticketed" className="ml-2 block text-sm text-gray-900">
            This is a ticketed event
          </label>
        </div>

        {formData.is_ticketed && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="ticket_price" className="block text-sm font-medium text-gray-700">
                Ticket Price ($)
              </label>
              <input
                type="number"
                id="ticket_price"
                name="ticket_price"
                value={formData.ticket_price}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="total_capacity" className="block text-sm font-medium text-gray-700">
                Total Capacity
              </label>
              <input
                type="number"
                id="total_capacity"
                name="total_capacity"
                value={formData.total_capacity}
                onChange={handleChange}
                min="1"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 sticky bottom-0 bg-white border-t">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Updating...' : 'Update Event'}
          </button>
        </div>
      </form>
    </BizModal>
  );
}
