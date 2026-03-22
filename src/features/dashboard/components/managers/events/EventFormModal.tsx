/**
 * EventFormModal - Create/Edit Event Form
 *
 * @description Form modal for creating or editing events
 * @component Client Component
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Phase 8 - Features Section Pages
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_8_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use BizModal (MANDATORY)
 * - Orange theme for submit button (#ed6437)
 * - Form validation before submit
 */
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import BizModal from '@/components/BizModal/BizModal';
import { Loader2, ChevronDown } from 'lucide-react';
import MediaUploadSection from '@features/media/components/MediaUploadSection';
import type { MediaItem, MediaLimits } from '@features/media/types/shared-media';
import { EventRecurrenceConfig } from '@features/events/components/EventRecurrenceConfig';
import { EventTicketTierEditor } from '@features/events/components/EventTicketTierEditor';
import type { TicketTierFormData } from '@features/events/components/EventTicketTierEditor';

// ============================================================================
// TYPES
// ============================================================================

export interface EventFormData {
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
  is_ticketed: boolean;
  ticket_price: string;
  total_capacity: string;
  status: 'draft' | 'published';
  external_ticket_url: string;
  age_restrictions: string;
  parking_notes: string;
  weather_contingency: string;
  waitlist_enabled: boolean;
  check_in_enabled: boolean;
  // Phase 3B: Recurrence fields
  is_recurring: boolean;
  recurrence_type: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrence_days: number[];
  recurrence_end_date: string;
  // Phase 5A: Multi-tier ticket management
  ticket_tiers: TicketTierFormData[];
}

export interface EventFormModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close modal callback */
  onClose: () => void;
  /** Submit callback */
  // eslint-disable-next-line no-unused-vars
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  /** Whether form is submitting */
  isSubmitting: boolean;
  /** Initial data for edit mode */
  initialData?: Partial<EventFormData>;
  /** Listing ID for tier feature access fetch */
  listingId?: number;
  /** Event ID for edit-mode features (ticket loading, media) */
  eventId?: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

interface TierFeatureAccess {
  tier: string;
  maxMediaPerEvent: number;
  allowExternalTicketLink: boolean;
  allowNativeTicketing: boolean;
  maxTicketTiers: number;
  allowRecurring: boolean;
  maxCoHosts: number;
  allowCheckIn: boolean;
  allowWaitlist: boolean;
  allowFeatured: boolean;
}

/**
 * EventFormModal - Event create/edit form
 */
export function EventFormModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  initialData,
  listingId,
  eventId
}: EventFormModalProps) {
  const [formData, setFormData] = useState<EventFormData>({
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
    is_ticketed: false,
    ticket_price: '',
    total_capacity: '',
    status: 'draft',
    external_ticket_url: '',
    age_restrictions: '',
    parking_notes: '',
    weather_contingency: '',
    waitlist_enabled: false,
    check_in_enabled: false,
    // Phase 3B: Recurrence fields
    is_recurring: false,
    recurrence_type: 'none',
    recurrence_days: [],
    recurrence_end_date: '',
    // Phase 5A: Multi-tier ticket management
    ticket_tiers: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tierAccess, setTierAccess] = useState<TierFeatureAccess | null>(null);
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const [showRecurrenceSection, setShowRecurrenceSection] = useState(false);
  const [eventTypeOptions, setEventTypeOptions] = useState<Array<{ slug: string; name: string }>>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [mediaLimits, setMediaLimits] = useState<MediaLimits>({
    images: { current: 0, limit: 1, unlimited: false },
    videos: { current: 0, limit: 0, unlimited: false },
  });

  // Initialize form data
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        event_type: initialData.event_type || '',
        start_date: initialData.start_date ? initialData.start_date.substring(0, 16) : '',
        end_date: initialData.end_date ? initialData.end_date.substring(0, 16) : '',
        timezone: initialData.timezone || 'America/New_York',
        location_type: initialData.location_type || 'physical',
        venue_name: initialData.venue_name || '',
        address: initialData.address || '',
        city: initialData.city || '',
        state: initialData.state || '',
        zip: initialData.zip || '',
        virtual_link: initialData.virtual_link || '',
        is_ticketed: initialData.is_ticketed || false,
        ticket_price: initialData.ticket_price || '',
        total_capacity: initialData.total_capacity || '',
        status: initialData.status || 'draft',
        external_ticket_url: initialData.external_ticket_url || '',
        age_restrictions: initialData.age_restrictions || '',
        parking_notes: initialData.parking_notes || '',
        weather_contingency: initialData.weather_contingency || '',
        waitlist_enabled: initialData.waitlist_enabled || false,
        check_in_enabled: initialData.check_in_enabled || false,
        // Phase 3B: Recurrence fields
        is_recurring: (initialData as Partial<EventFormData>).is_recurring || false,
        recurrence_type: (initialData as Partial<EventFormData>).recurrence_type || 'none',
        recurrence_days: (initialData as Partial<EventFormData>).recurrence_days || [],
        recurrence_end_date: (initialData as Partial<EventFormData>).recurrence_end_date || '',
        // Phase 5A: Multi-tier ticket management
        ticket_tiers: (initialData as Partial<EventFormData>).ticket_tiers || [],
      });
    }
  }, [initialData]);

  // Fetch tier features via API rather than receiving listingTier as a prop (like
  // OfferFormModal/JobFormModal do). EventFormModal needs granular feature flags
  // (allowExternalTicketLink, allowNativeTicketing, allowWaitlist, allowCheckIn)
  // that are computed server-side from the tier, so a single tier string isn't enough.
  useEffect(() => {
    if (!listingId || !isOpen) return;
    const fetchTierFeatures = async () => {
      try {
        const response = await fetch(`/api/events/tier-features?listingId=${listingId}`, {
          credentials: 'include'
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setTierAccess(result.data);
          }
        }
      } catch {
        // Non-blocking — form works without tier data
      }
    };
    fetchTierFeatures();
  }, [listingId, isOpen]);

  // Fetch event types from API
  useEffect(() => {
    if (!isOpen) return;
    const fetchEventTypes = async () => {
      try {
        const response = await fetch('/api/events/types');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data?.eventTypes) {
            setEventTypeOptions(result.data.eventTypes);
          }
        }
      } catch {
        // Fallback — dropdown will be empty but form still works
      }
    };
    fetchEventTypes();
  }, [isOpen]);

  // Auto-expand additional details if editing event has those fields set
  useEffect(() => {
    if (initialData?.age_restrictions || initialData?.parking_notes || initialData?.weather_contingency) {
      setShowAdditionalDetails(true);
    }
    // Auto-expand recurrence section if editing a recurring event
    if ((initialData as Partial<EventFormData>)?.is_recurring) {
      setShowRecurrenceSection(true);
    }
  }, [initialData]);

  // Load existing media in edit mode
  useEffect(() => {
    if (!eventId || !isOpen) return;
    const loadMedia = async () => {
      try {
        const response = await fetch(`/api/events/${eventId}/media`, {
          credentials: 'include'
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setMediaItems((result.data.media || []).map((m: Record<string, unknown>) => ({
              id: m.id as number,
              media_type: m.media_type as 'image' | 'video',
              file_url: m.file_url as string,
              alt_text: (m.alt_text as string) ?? null,
              sort_order: (m.sort_order as number) ?? 0,
              embed_url: (m.embed_url as string) ?? null,
              platform: (m.platform as string) ?? null,
              source: (m.source as string) ?? null,
            })));
            if (result.data.limits) {
              setMediaLimits(result.data.limits);
            }
          }
        }
      } catch {
        // Non-blocking
      }
    };
    loadMedia();
  }, [eventId, isOpen]);

  // Set default media limits in create mode based on tier
  useEffect(() => {
    if (eventId || !tierAccess) return;
    const tier = tierAccess.tier;
    const imageLimitsByTier: Record<string, number> = {
      essentials: 1, plus: 3, preferred: 6, premium: 6
    };
    const videoLimitsByTier: Record<string, number> = {
      essentials: 0, plus: 1, preferred: 3, premium: 3
    };
    setMediaLimits({
      images: { current: 0, limit: imageLimitsByTier[tier] ?? 1, unlimited: false },
      videos: { current: 0, limit: videoLimitsByTier[tier] ?? 0, unlimited: false },
    });
  }, [eventId, tierAccess]);

  // Reset media state when modal opens in create mode
  useEffect(() => {
    if (isOpen && !eventId) {
      setMediaItems([]);
    }
  }, [isOpen, eventId]);

  // Handle media change
  const handleMediaChange = useCallback((updatedMedia: MediaItem[]) => {
    setMediaItems(updatedMedia);
  }, []);

  // Validate form
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    }

    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      if (start >= end) {
        newErrors.end_date = 'End date must be after start date';
      }
    }

    if (formData.location_type === 'physical' && !formData.venue_name.trim()) {
      newErrors.venue_name = 'Venue name is required for physical events';
    }

    if (formData.location_type === 'virtual' && !formData.virtual_link.trim()) {
      newErrors.virtual_link = 'Virtual link is required for virtual events';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle submit
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const submitData: Record<string, unknown> = {
      title: formData.title,
      description: formData.description || undefined,
      event_type: formData.event_type || undefined,
      start_date: formData.start_date,
      end_date: formData.end_date,
      timezone: formData.timezone,
      location_type: formData.location_type,
      venue_name: formData.venue_name || undefined,
      address: formData.address || undefined,
      city: formData.city || undefined,
      state: formData.state || undefined,
      zip: formData.zip || undefined,
      virtual_link: formData.virtual_link || undefined,
      is_ticketed: formData.is_ticketed,
      ticket_price: formData.ticket_price ? parseFloat(formData.ticket_price) : undefined,
      total_capacity: formData.total_capacity ? parseInt(formData.total_capacity, 10) : undefined,
      status: formData.status,
      external_ticket_url: formData.external_ticket_url || undefined,
      age_restrictions: formData.age_restrictions || undefined,
      parking_notes: formData.parking_notes || undefined,
      weather_contingency: formData.weather_contingency || undefined,
      waitlist_enabled: formData.waitlist_enabled,
      check_in_enabled: formData.check_in_enabled,
      // Phase 3B: Recurring fields
      is_recurring: formData.is_recurring,
      recurrence_type: formData.is_recurring ? formData.recurrence_type : 'none',
      recurrence_days: formData.is_recurring ? formData.recurrence_days : [],
      recurrence_end_date: formData.is_recurring ? (formData.recurrence_end_date || undefined) : undefined,
      // Phase 5A: Multi-tier ticket management
      ticket_tiers: formData.is_ticketed && formData.ticket_tiers.length > 0
        ? formData.ticket_tiers
        : undefined,
    };

    // Attach pending media for create-mode (parent handles upload)
    if (!eventId) {
      submitData._pendingMedia = mediaItems;
    }

    try {
      await onSubmit(submitData);
      onClose();
    } catch {
      // Error handled by parent
    }
  }, [formData, validate, onSubmit, onClose, eventId, mediaItems]);

  // Handle field change
  const handleChange = useCallback((field: keyof EventFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  }, []);

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Event' : 'Create Event'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Event Title <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Summer Sale Event"
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent resize-none"
              placeholder="Describe your event..."
            />
          </div>

          {/* Event Type */}
          <div>
            <label htmlFor="event_type" className="block text-sm font-medium text-gray-700 mb-1">
              Event Type
            </label>
            <select
              id="event_type"
              value={formData.event_type}
              onChange={(e) => handleChange('event_type', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
            >
              <option value="">Select type...</option>
              {eventTypeOptions.map(et => (
                <option key={et.slug} value={et.slug}>{et.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Media Upload Section */}
        <MediaUploadSection
          entityType="events"
          entityId={eventId ?? null}
          media={mediaItems}
          limits={mediaLimits}
          onMediaChange={handleMediaChange}
          cropperContext="event_banner"
          disabled={isSubmitting}
          label="Event Media"
        />

        {/* Date & Time Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Date & Time</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start Date */}
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date & Time <span className="text-red-600">*</span>
              </label>
              <input
                type="datetime-local"
                id="start_date"
                value={formData.start_date}
                onChange={(e) => handleChange('start_date', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                  errors.start_date ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.start_date && <p className="mt-1 text-sm text-red-600">{errors.start_date}</p>}
            </div>

            {/* End Date */}
            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
                End Date & Time <span className="text-red-600">*</span>
              </label>
              <input
                type="datetime-local"
                id="end_date"
                value={formData.end_date}
                onChange={(e) => handleChange('end_date', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                  errors.end_date ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.end_date && <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>}
            </div>
          </div>
        </div>

        {/* Location Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Location</h3>

          {/* Location Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location Type
            </label>
            <div className="flex gap-4">
              {(['physical', 'virtual', 'hybrid'] as const).map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="location_type"
                    value={type}
                    checked={formData.location_type === type}
                    onChange={(e) => handleChange('location_type', e.target.value)}
                    className="w-4 h-4 text-[#ed6437] border-gray-300 focus:ring-[#ed6437]"
                  />
                  <span className="text-sm text-gray-700 capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Physical Location Fields */}
          {(formData.location_type === 'physical' || formData.location_type === 'hybrid') && (
            <>
              <div>
                <label htmlFor="venue_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Venue Name {formData.location_type === 'physical' && <span className="text-red-600">*</span>}
                </label>
                <input
                  type="text"
                  id="venue_name"
                  value={formData.venue_name}
                  onChange={(e) => handleChange('venue_name', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                    errors.venue_name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Convention Center"
                />
                {errors.venue_name && <p className="mt-1 text-sm text-red-600">{errors.venue_name}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                    placeholder="123 Main St"
                  />
                </div>
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                    placeholder="NY"
                    maxLength={2}
                  />
                </div>
              </div>
            </>
          )}

          {/* Virtual Link */}
          {(formData.location_type === 'virtual' || formData.location_type === 'hybrid') && (
            <div>
              <label htmlFor="virtual_link" className="block text-sm font-medium text-gray-700 mb-1">
                Virtual Link {formData.location_type === 'virtual' && <span className="text-red-600">*</span>}
              </label>
              <input
                type="url"
                id="virtual_link"
                value={formData.virtual_link}
                onChange={(e) => handleChange('virtual_link', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                  errors.virtual_link ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="https://zoom.us/..."
              />
              {errors.virtual_link && <p className="mt-1 text-sm text-red-600">{errors.virtual_link}</p>}
            </div>
          )}
        </div>

        {/* Recurring Event Section — Phase 3B, tier-gated */}
        {tierAccess?.allowRecurring && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setShowRecurrenceSection(prev => !prev)}
              className="flex items-center justify-between w-full text-left"
            >
              <h3 className="text-lg font-semibold text-gray-900">Recurring Event</h3>
              <ChevronDown
                className={`w-5 h-5 text-gray-500 transition-transform ${
                  showRecurrenceSection ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showRecurrenceSection && (
              <EventRecurrenceConfig
                value={{
                  is_recurring: formData.is_recurring,
                  recurrence_type: formData.recurrence_type,
                  recurrence_days: formData.recurrence_days,
                  recurrence_end_date: formData.recurrence_end_date,
                }}
                onChange={(data) => {
                  setFormData(prev => ({
                    ...prev,
                    is_recurring: data.is_recurring,
                    recurrence_type: data.recurrence_type,
                    recurrence_days: data.recurrence_days,
                    recurrence_end_date: data.recurrence_end_date,
                  }));
                }}
                disabled={isSubmitting}
              />
            )}
          </div>
        )}

        {/* Ticketing Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Ticketing</h3>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_ticketed}
              onChange={(e) => handleChange('is_ticketed', e.target.checked)}
              className="w-4 h-4 text-[#ed6437] border-gray-300 rounded focus:ring-[#ed6437]"
            />
            <span className="text-sm text-gray-700">This is a ticketed event</span>
          </label>

          {formData.is_ticketed && (
            <div className="space-y-4">
              {/* Multi-tier ticket editor for Preferred/Premium tiers */}
              {tierAccess?.allowNativeTicketing ? (
                <div className="space-y-4">
                  <EventTicketTierEditor
                    eventId={eventId}
                    maxTiers={tierAccess.maxTicketTiers}
                    tiers={formData.ticket_tiers}
                    onChange={(tiers) => setFormData((prev) => ({ ...prev, ticket_tiers: tiers }))}
                    disabled={isSubmitting}
                  />
                  <div>
                    <label htmlFor="total_capacity" className="block text-sm font-medium text-gray-700 mb-1">
                      Total Capacity
                    </label>
                    <input
                      type="number"
                      id="total_capacity"
                      value={formData.total_capacity}
                      onChange={(e) => handleChange('total_capacity', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                      placeholder="100"
                      min="1"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="ticket_price" className="block text-sm font-medium text-gray-700 mb-1">
                      Ticket Price ($)
                    </label>
                    <input
                      type="number"
                      id="ticket_price"
                      value={formData.ticket_price}
                      onChange={(e) => handleChange('ticket_price', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div>
                    <label htmlFor="total_capacity" className="block text-sm font-medium text-gray-700 mb-1">
                      Total Capacity
                    </label>
                    <input
                      type="number"
                      id="total_capacity"
                      value={formData.total_capacity}
                      onChange={(e) => handleChange('total_capacity', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                      placeholder="100"
                      min="1"
                    />
                  </div>
                </div>
              )}

              {/* External Ticket URL — tier-gated (Plus+) */}
              {(!tierAccess || tierAccess.allowExternalTicketLink) ? (
                <div>
                  <label htmlFor="external_ticket_url" className="block text-sm font-medium text-gray-700 mb-1">
                    External Ticket Link
                  </label>
                  <input
                    type="url"
                    id="external_ticket_url"
                    value={formData.external_ticket_url}
                    onChange={(e) => handleChange('external_ticket_url', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                    placeholder="https://eventbrite.com/your-event"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Link to your ticketing page (Eventbrite, Square, your website)
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-500">
                    External ticket links available on Plus tier and above.
                    <span className="text-[#ed6437] font-medium ml-1">Upgrade to unlock</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Event Options Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Event Options</h3>

          {/* Waitlist Toggle — tier-gated (Plus+) */}
          {(!tierAccess || tierAccess.allowWaitlist) ? (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.waitlist_enabled}
                onChange={(e) => handleChange('waitlist_enabled', e.target.checked)}
                className="w-4 h-4 text-[#ed6437] border-gray-300 rounded focus:ring-[#ed6437]"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Enable Waitlist</span>
                <p className="text-xs text-gray-500">Allow guests to join a waitlist when the event is full</p>
              </div>
            </label>
          ) : (
            <div className="flex items-center gap-3 opacity-60">
              <input type="checkbox" disabled className="w-4 h-4 border-gray-300 rounded" />
              <div>
                <span className="text-sm font-medium text-gray-400">Enable Waitlist</span>
                <p className="text-xs text-gray-400">
                  Available on Plus tier and above.
                  <span className="text-[#ed6437] font-medium ml-1">Upgrade</span>
                </p>
              </div>
            </div>
          )}

          {/* Check-In Toggle — tier-gated (Plus+) */}
          {(!tierAccess || tierAccess.allowCheckIn) ? (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.check_in_enabled}
                onChange={(e) => handleChange('check_in_enabled', e.target.checked)}
                className="w-4 h-4 text-[#ed6437] border-gray-300 rounded focus:ring-[#ed6437]"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Enable Check-In</span>
                <p className="text-xs text-gray-500">Track attendee check-ins at the event</p>
              </div>
            </label>
          ) : (
            <div className="flex items-center gap-3 opacity-60">
              <input type="checkbox" disabled className="w-4 h-4 border-gray-300 rounded" />
              <div>
                <span className="text-sm font-medium text-gray-400">Enable Check-In</span>
                <p className="text-xs text-gray-400">
                  Available on Plus tier and above.
                  <span className="text-[#ed6437] font-medium ml-1">Upgrade</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Additional Details Section (Collapsible) */}
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setShowAdditionalDetails(!showAdditionalDetails)}
            className="flex items-center gap-2 text-lg font-semibold text-gray-900"
          >
            Additional Details
            <ChevronDown
              className={`w-5 h-5 transition-transform ${showAdditionalDetails ? 'rotate-180' : ''}`}
            />
          </button>

          {showAdditionalDetails && (
            <div className="space-y-4">
              {/* Age Restrictions */}
              <div>
                <label htmlFor="age_restrictions" className="block text-sm font-medium text-gray-700 mb-1">
                  Age Restrictions
                </label>
                <input
                  type="text"
                  id="age_restrictions"
                  value={formData.age_restrictions}
                  onChange={(e) => handleChange('age_restrictions', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                  placeholder="e.g., 21+, Family-friendly, All ages"
                />
              </div>

              {/* Parking Notes */}
              <div>
                <label htmlFor="parking_notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Parking &amp; Access Notes
                </label>
                <textarea
                  id="parking_notes"
                  value={formData.parking_notes}
                  onChange={(e) => handleChange('parking_notes', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent resize-none"
                  placeholder="Parking available at..."
                />
              </div>

              {/* Weather Contingency */}
              <div>
                <label htmlFor="weather_contingency" className="block text-sm font-medium text-gray-700 mb-1">
                  Weather Contingency
                </label>
                <textarea
                  id="weather_contingency"
                  value={formData.weather_contingency}
                  onChange={(e) => handleChange('weather_contingency', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent resize-none"
                  placeholder="In case of rain, the event will be held..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Status Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Status</h3>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Publication Status
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
            >
              <option value="draft">Draft (Not visible to public)</option>
              <option value="published">Published (Visible to public)</option>
            </select>
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
            {isSubmitting ? 'Saving...' : (initialData ? 'Update Event' : 'Create Event')}
          </button>
        </div>
      </form>
    </BizModal>
  );
}

export default EventFormModal;
