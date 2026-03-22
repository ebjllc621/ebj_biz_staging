/**
 * EventsManager - Events Management
 *
 * @description Manage events with CRUD operations via /api/events
 * @component Client Component
 * @tier ADVANCED
 * @generated ComponentBuilder v3.0
 * @phase Phase 8 - Features Section Pages
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_8_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use ErrorBoundary (ADVANCED tier requirement)
 * - Orange theme (#ed6437) for action buttons
 * - BizModal for all modals (MANDATORY)
 * - fetchWithCsrf for all mutations
 * - Tier limits enforced by EventService
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Loader2, AlertCircle, Calendar } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { useListingData } from '@features/dashboard/hooks/useListingData';
import { fetchWithCsrf } from '@core/utils/csrf';
import { EmptyState } from '../shared/EmptyState';
import { TierLimitBanner } from '../shared/TierLimitBanner';
import { ConfirmDeleteModal } from '../shared/ConfirmDeleteModal';
import { EventCard } from './events/EventCard';
import { EventFormModal } from './events/EventFormModal';
import { EventShareModal } from '@features/events/components/EventShareModal';
import { SocialMediaManagerModal } from './content/SocialMediaManagerModal';
import type { EventDetailData } from '@features/events/types';
import type { MediaItem } from '@features/media/types/shared-media';

// ============================================================================
// TYPES
// ============================================================================

interface Event {
  id: number;
  listing_id: number;
  title: string;
  slug: string;
  description: string | null;
  event_type: string | null;
  start_date: string;
  end_date: string;
  timezone: string;
  location_type: 'physical' | 'virtual' | 'hybrid';
  venue_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  virtual_link: string | null;
  banner_image: string | null;
  thumbnail: string | null;
  is_ticketed: boolean;
  ticket_price: number | null;
  total_capacity: number | null;
  remaining_capacity: number | null;
  rsvp_count: number;
  view_count: number;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  is_featured: boolean;
  external_ticket_url: string | null;
  age_restrictions: string | null;
  parking_notes: string | null;
  weather_contingency: string | null;
  waitlist_enabled: boolean;
  check_in_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface TierLimits {
  essentials: number;
  plus: number;
  preferred: number;
  premium: number;
}

const EVENT_LIMITS: TierLimits = {
  essentials: 4,
  plus: 10,
  preferred: 25,
  premium: 50
};

// ============================================================================
// COMPONENT
// ============================================================================

function EventsManagerContent() {
  const { selectedListingId } = useListingContext();
  const { listing } = useListingData(selectedListingId);
  const searchParams = useSearchParams();

  // State
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Auto-open create modal when ?create=true is in the URL (from Quick Actions)
  useEffect(() => {
    if (searchParams.get('create') === 'true' && !isLoading) {
      setShowCreateModal(true);
    }
  }, [searchParams, isLoading]);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sharingEvent, setSharingEvent] = useState<Event | null>(null);
  const [postPublishEvent, setPostPublishEvent] = useState<Event | null>(null);
  const [socialShareEvent, setSocialShareEvent] = useState<Event | null>(null);

  const tier = listing?.tier || 'essentials';
  const limit = EVENT_LIMITS[tier as keyof TierLimits] || 4;
  const canAddMore = events.length < limit;

  // Fetch events
  const fetchEvents = useCallback(async () => {
    if (!selectedListingId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/events?listingId=${selectedListingId}&limit=100`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const result = await response.json();
      if (result.success) {
        setEvents(result.data.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setIsLoading(false);
    }
  }, [selectedListingId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Convert Event to EventDetailData for EventShareModal
  const eventToShareData = useCallback((event: Event): EventDetailData => {
    return {
      id: event.id,
      listing_id: event.listing_id,
      title: event.title,
      slug: event.slug,
      description: event.description,
      event_type: event.event_type,
      start_date: new Date(event.start_date),
      end_date: new Date(event.end_date),
      timezone: event.timezone,
      location_type: event.location_type,
      venue_name: event.venue_name,
      address: event.address,
      city: event.city,
      state: event.state,
      zip: event.zip,
      virtual_link: event.virtual_link,
      banner_image: event.banner_image,
      thumbnail: event.thumbnail,
      is_ticketed: event.is_ticketed,
      ticket_price: event.ticket_price,
      total_capacity: event.total_capacity,
      remaining_capacity: event.remaining_capacity,
      rsvp_count: event.rsvp_count,
      status: event.status,
      is_featured: event.is_featured,
      is_mock: false,
      view_count: event.view_count,
      created_at: new Date(event.created_at),
      updated_at: new Date(event.updated_at),
      external_ticket_url: event.external_ticket_url,
      age_restrictions: event.age_restrictions,
      parking_notes: event.parking_notes,
      weather_contingency: event.weather_contingency,
      waitlist_enabled: event.waitlist_enabled,
      check_in_enabled: event.check_in_enabled,
      listing_name: listing?.name || null,
      listing_slug: listing?.slug || null,
      listing_logo: listing?.logo_url || null,
      listing_cover_image: listing?.cover_image_url || null,
      listing_tier: listing?.tier || null,
      listing_claimed: false,
      listing_rating: null,
      listing_review_count: null,
      listing_phone: null,
      listing_email: null,
      listing_website: null,
      listing_city: null,
      listing_state: null,
      latitude: null,
      longitude: null,
    } as EventDetailData;
  }, [listing]);

  // Upload pending media after event creation
  const uploadPendingEventMedia = useCallback(async (
    eventId: number,
    mediaItems: MediaItem[]
  ): Promise<{ succeeded: number; failed: number }> => {
    let succeeded = 0;
    let failed = 0;
    let firstImageUrl: string | null = null;

    for (const item of mediaItems) {
      try {
        if (item.media_type === 'video' && item.source === 'embed') {
          // Video embed — create media record directly
          await fetchWithCsrf(`/api/events/${eventId}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              media_type: 'video',
              file_url: item.file_url,
              embed_url: item.embed_url,
              platform: item.platform,
              source: 'embed',
            })
          });
          succeeded++;
        } else if (item.media_type === 'image' && typeof item.file_url === 'string') {
          // Image — file_url is a blob URL from create-mode
          const blob = await fetch(item.file_url).then(r => r.blob());
          const file = new File([blob], `event-image-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });

          // Step 1: Upload to Cloudinary via UMM
          const formData = new FormData();
          formData.append('file', file);
          formData.append('entityType', 'events');
          formData.append('entityId', eventId.toString());
          formData.append('mediaType', 'gallery');

          const uploadResponse = await fetchWithCsrf('/api/media/upload', {
            method: 'POST',
            body: formData
          });

          if (!uploadResponse.ok) { failed++; continue; }

          const uploadData = await uploadResponse.json();
          const fileUrl = uploadData.data?.file?.url;
          if (!fileUrl) { failed++; continue; }

          // Track first image for banner_image
          if (!firstImageUrl) {
            firstImageUrl = fileUrl;
          }

          // Step 2: Add media record
          await fetchWithCsrf(`/api/events/${eventId}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              media_type: 'image',
              file_url: fileUrl,
              alt_text: item.alt_text,
              source: 'upload',
            })
          });
          succeeded++;
        }
      } catch {
        failed++;
        // Non-blocking — continue with remaining media
        // Event is already created; user can add media later
      }
    }

    // Set banner_image on event from first uploaded image
    if (firstImageUrl) {
      try {
        await fetchWithCsrf(`/api/events/${eventId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ banner_image: firstImageUrl })
        });
      } catch {
        console.error('[EventsManager] Failed to set banner_image on event');
      }
    }

    return { succeeded, failed };
  }, []);

  // Handle create
  const handleCreate = useCallback(async (data: Record<string, unknown>) => {
    if (!selectedListingId) return;

    setIsSubmitting(true);
    setError(null);

    // Extract pending media before sending to API
    const pendingMedia = data._pendingMedia as MediaItem[] | undefined;
    const apiData = { ...data };
    delete apiData._pendingMedia;

    try {
      const response = await fetchWithCsrf('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...apiData,
          listing_id: selectedListingId
        })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to create event');
      }

      const result = await response.json();
      const newEventId = result.data?.event?.id;

      if (!newEventId && pendingMedia && pendingMedia.length > 0) {
        console.warn(`[EventsManager] Event created but ID is falsy. Response shape: ${JSON.stringify(result).substring(0, 200)}`);
      }

      // Upload pending media if event was created successfully
      if (newEventId && pendingMedia && pendingMedia.length > 0) {
        const { failed } = await uploadPendingEventMedia(newEventId, pendingMedia);
        if (failed > 0) {
          setError(`Event created, but ${failed} of ${pendingMedia.length} media items failed to upload. You can add them from the edit view.`);
        }
      }

      await fetchEvents();
      setShowCreateModal(false);

      // If status is published, show share modal
      if (data.status === 'published' && newEventId) {
        const newEvent: Event = {
          ...data as unknown as Event,
          id: newEventId,
          listing_id: selectedListingId,
          slug: result.data?.event?.slug || '',
          view_count: 0,
          rsvp_count: 0,
          remaining_capacity: null,
          is_featured: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setPostPublishEvent(newEvent);
        setSocialShareEvent(newEvent);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedListingId, fetchEvents, uploadPendingEventMedia]);

  // Handle update
  const handleUpdate = useCallback(async (data: Record<string, unknown>) => {
    if (!editingEvent) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(`/api/events/${editingEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to update event');
      }

      await fetchEvents();
      setEditingEvent(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update event');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [editingEvent, fetchEvents]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!deletingEvent) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(`/api/events/${deletingEvent.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to delete event');
      }

      await fetchEvents();
      setDeletingEvent(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event');
    } finally {
      setIsDeleting(false);
    }
  }, [deletingEvent, fetchEvents]);

  // Handle status change
  const handleStatusChange = useCallback(async (event: Event, newStatus: string) => {
    setError(null);
    try {
      const response = await fetchWithCsrf(`/api/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to update status');
      }

      await fetchEvents();
      // If status changed to published, offer share
      if (newStatus === 'published') {
        setSharingEvent(event);
        setSocialShareEvent(event);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  }, [fetchEvents]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[#ed6437] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Events</h2>
          <p className="text-sm text-gray-600 mt-1">
            {events.length} of {limit} events used
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={!canAddMore}
          className="flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Create Event
        </button>
      </div>

      {/* Tier Limit Banner */}
      <TierLimitBanner
        current={events.length}
        limit={limit}
        itemType="events"
        tier={tier}
      />

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-sm hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Events List */}
      {events.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No Events Yet"
          description="Create your first event to attract attendees and grow your community"
          action={{
            label: 'Create First Event',
            onClick: () => setShowCreateModal(true)
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onEdit={() => setEditingEvent(event)}
              onDelete={() => setDeletingEvent(event)}
              onShare={() => setSharingEvent(event)}
              onStatusChange={(status) => handleStatusChange(event, status)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <EventFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
        listingId={selectedListingId ?? undefined}
      />

      {/* Edit Modal */}
      {editingEvent && (
        <EventFormModal
          isOpen={true}
          onClose={() => setEditingEvent(null)}
          onSubmit={handleUpdate}
          isSubmitting={isSubmitting}
          listingId={selectedListingId ?? undefined}
          eventId={editingEvent.id}
          initialData={{
            title: editingEvent.title,
            description: editingEvent.description || '',
            event_type: editingEvent.event_type || '',
            start_date: editingEvent.start_date,
            end_date: editingEvent.end_date,
            timezone: editingEvent.timezone,
            location_type: editingEvent.location_type,
            venue_name: editingEvent.venue_name || '',
            address: editingEvent.address || '',
            city: editingEvent.city || '',
            state: editingEvent.state || '',
            zip: editingEvent.zip || '',
            virtual_link: editingEvent.virtual_link || '',
            is_ticketed: editingEvent.is_ticketed,
            ticket_price: editingEvent.ticket_price?.toString() || '',
            total_capacity: editingEvent.total_capacity?.toString() || '',
            status: editingEvent.status === 'completed' ? 'published' : editingEvent.status as 'draft' | 'published',
            external_ticket_url: editingEvent.external_ticket_url || '',
            age_restrictions: editingEvent.age_restrictions || '',
            parking_notes: editingEvent.parking_notes || '',
            weather_contingency: editingEvent.weather_contingency || '',
            waitlist_enabled: editingEvent.waitlist_enabled || false,
            check_in_enabled: editingEvent.check_in_enabled || false
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingEvent && (
        <ConfirmDeleteModal
          isOpen={true}
          onClose={() => setDeletingEvent(null)}
          onConfirm={handleDelete}
          itemType="event"
          itemName={deletingEvent.title}
          isDeleting={isDeleting}
        />
      )}

      {/* Share Modal (on-demand) */}
      {sharingEvent && (
        <EventShareModal
          isOpen={true}
          onClose={() => setSharingEvent(null)}
          event={eventToShareData(sharingEvent)}
        />
      )}

      {/* Post-Publish Share Modal */}
      {postPublishEvent && (
        <EventShareModal
          isOpen={true}
          onClose={() => setPostPublishEvent(null)}
          event={eventToShareData(postPublishEvent)}
        />
      )}

      {/* Social Media Share Modal */}
      {socialShareEvent && selectedListingId && (
        <SocialMediaManagerModal
          isOpen={true}
          onClose={() => setSocialShareEvent(null)}
          listingId={selectedListingId}
          contentType="event"
          contentId={socialShareEvent.id}
          contentTitle={socialShareEvent.title}
        />
      )}
    </div>
  );
}

/**
 * EventsManager - Wrapped with ErrorBoundary
 */
export function EventsManager() {
  return (
    <ErrorBoundary componentName="EventsManager">
      <EventsManagerContent />
    </ErrorBoundary>
  );
}

export default EventsManager;
