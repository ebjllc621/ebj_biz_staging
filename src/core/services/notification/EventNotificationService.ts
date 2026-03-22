/**
 * EventNotificationService - Event-Specific Notification Dispatch
 *
 * Coordinates event-related notifications with NotificationService.
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: ErrorService.capture(), never throw (best-effort)
 * - Build Map v2.1 ENHANCED patterns
 *
 * @authority docs/pages/layouts/events/build/phases/PHASE_6_BRAIN_PLAN.md
 * @tier ADVANCED
 * @phase Events Phase 6 - T6.2 EventNotificationService
 * @reference src/core/services/notification/OfferNotificationService.ts
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { NotificationService } from '@core/services/NotificationService';
import { ErrorService } from '@core/services/ErrorService';

// ============================================================================
// Types
// ============================================================================

export interface EventNotificationResult {
  success: boolean;
  error?: string;
}

// ============================================================================
// EventNotificationService
// ============================================================================

export class EventNotificationService {
  private db: DatabaseService;
  private notificationService: NotificationService;

  constructor(db: DatabaseService, notificationService: NotificationService) {
    this.db = db;
    this.notificationService = notificationService;
  }

  // ==========================================================================
  // RSVP Notifications
  // ==========================================================================

  /**
   * Notify a user that their RSVP has been confirmed
   * @param eventId Event ID
   * @param userId User ID of the RSVP attendee
   */
  async notifyRsvpConfirmed(eventId: number, userId: number): Promise<void> {
    try {
      const eventResult = await this.db.query<{
        id: number;
        title: string;
        slug: string | null;
        start_date: Date;
        venue_name: string | null;
        listing_id: number | null;
      }>(
        'SELECT id, title, slug, start_date, venue_name, listing_id FROM events WHERE id = ?',
        [eventId]
      );

      if (eventResult.rows.length === 0) {
        ErrorService.capture('[EventNotificationService] notifyRsvpConfirmed failed: event not found', { eventId });
        return;
      }

      const event = eventResult.rows[0];
      if (!event) {
        return;
      }

      await this.notificationService.dispatch({
        type: 'event.rsvp_confirmed',
        recipientId: userId,
        title: `RSVP Confirmed: ${event.title}`,
        message: `You're going to ${event.title}${event.venue_name ? ' at ' + event.venue_name : ''}`,
        entityType: 'event',
        entityId: event.id,
        actionUrl: `/events/${event.slug || event.id}`,
        priority: 'normal',
        metadata: {
          event_id: eventId,
          start_date: event.start_date
        }
      });

      // Also notify the listing owner about the new RSVP
      if (event.listing_id) {
        await this.notifyNewRsvp(eventId, userId, event);
      }

    } catch (error) {
      ErrorService.capture('[EventNotificationService] notifyRsvpConfirmed failed:', error);
    }
  }

  /**
   * Notify the listing owner that someone RSVPed to their event
   * @param eventId Event ID
   * @param rsvpUserId User ID of the person who RSVPed
   * @param event Pre-fetched event data (optional, to avoid re-querying)
   */
  async notifyNewRsvp(
    eventId: number,
    rsvpUserId: number,
    event?: { id: number; title: string; slug: string | null; listing_id: number | null }
  ): Promise<void> {
    try {
      // Get event if not provided
      let eventData = event;
      if (!eventData) {
        const eventResult = await this.db.query<{
          id: number; title: string; slug: string | null; listing_id: number | null;
        }>(
          'SELECT id, title, slug, listing_id FROM events WHERE id = ?',
          [eventId]
        );
        if (eventResult.rows.length === 0 || !eventResult.rows[0]) return;
        eventData = eventResult.rows[0];
      }

      if (!eventData.listing_id) return;

      // Get listing owner
      const listingResult = await this.db.query<{ user_id: number }>(
        'SELECT user_id FROM listings WHERE id = ?',
        [eventData.listing_id]
      );
      if (listingResult.rows.length === 0 || !listingResult.rows[0]) return;
      const ownerId = listingResult.rows[0].user_id;

      // Don't notify owner if they RSVPed to their own event
      if (ownerId === rsvpUserId) return;

      // Get RSVP user display name
      const userResult = await this.db.query<{ display_name: string | null; first_name: string; last_name: string }>(
        'SELECT display_name, first_name, last_name FROM users WHERE id = ?',
        [rsvpUserId]
      );
      const rsvpUser = userResult.rows[0];
      const userName = rsvpUser
        ? (rsvpUser.display_name || `${rsvpUser.first_name} ${rsvpUser.last_name}`.trim())
        : 'Someone';

      await this.notificationService.dispatch({
        type: 'event.new_rsvp',
        recipientId: ownerId,
        title: `New RSVP: ${eventData.title}`,
        message: `${userName} has RSVPed to your event "${eventData.title}"`,
        entityType: 'event',
        entityId: eventData.id,
        actionUrl: `/dashboard/listings/${eventData.listing_id}/events/attendees`,
        priority: 'normal',
        metadata: {
          event_id: eventId,
          rsvp_user_id: rsvpUserId,
          rsvp_user_name: userName
        }
      });

    } catch (error) {
      ErrorService.capture('[EventNotificationService] notifyNewRsvp failed:', error);
    }
  }

  // ==========================================================================
  // Publication Notifications
  // ==========================================================================

  /**
   * Notify followers when a new event is published by a listing
   * @param eventId Event ID
   * @param listingId Listing ID that published the event
   */
  async notifyEventPublished(eventId: number, listingId: number): Promise<void> {
    try {
      // Get event details
      const eventResult = await this.db.query<{
        id: number;
        title: string;
        slug: string | null;
        start_date: Date;
        venue_name: string | null;
        event_type: string | null;
      }>(
        'SELECT id, title, slug, start_date, venue_name, event_type FROM events WHERE id = ?',
        [eventId]
      );

      if (eventResult.rows.length === 0) {
        ErrorService.capture('[EventNotificationService] notifyEventPublished failed: event not found', { eventId });
        return;
      }

      const event = eventResult.rows[0];
      if (!event) {
        return;
      }

      // Get listing details
      const listingResult = await this.db.query<{
        name: string;
      }>(
        'SELECT name FROM listings WHERE id = ?',
        [listingId]
      );

      if (listingResult.rows.length === 0) {
        ErrorService.capture('[EventNotificationService] notifyEventPublished failed: listing not found', { listingId });
        return;
      }

      const listing = listingResult.rows[0];
      if (!listing) {
        return;
      }

      // Get business followers
      const businessFollowersResult = await this.db.query<{
        user_id: number;
        notification_frequency: string;
      }>(
        `SELECT user_id, notification_frequency FROM event_follows WHERE follow_type = 'business' AND target_id = ?`,
        [listingId]
      );

      // Get all_events followers
      const allEventsFollowersResult = await this.db.query<{
        user_id: number;
        notification_frequency: string;
      }>(
        `SELECT user_id, notification_frequency FROM event_follows WHERE follow_type = 'all_events'`,
        []
      );

      // Get category followers (resolve event_type string to event_types.id)
      let categoryFollowersRows: Array<{ user_id: number; notification_frequency: string }> = [];
      if (event.event_type) {
        const eventTypeResult = await this.db.query<{ id: number }>(
          'SELECT id FROM event_types WHERE name = ? LIMIT 1',
          [event.event_type]
        );
        const eventTypeRow = eventTypeResult.rows[0];
        if (eventTypeRow) {
          const categoryFollowersResult = await this.db.query<{
            user_id: number;
            notification_frequency: string;
          }>(
            `SELECT user_id, notification_frequency FROM event_follows WHERE follow_type = 'category' AND target_id = ?`,
            [eventTypeRow.id]
          );
          categoryFollowersRows = categoryFollowersResult.rows;
        }
      }

      // Deduplicate user_ids
      const seenUserIds = new Set<number>();
      const allFollowers = [
        ...businessFollowersResult.rows,
        ...allEventsFollowersResult.rows,
        ...categoryFollowersRows
      ].filter(row => {
        if (seenUserIds.has(row.user_id)) {
          return false;
        }
        seenUserIds.add(row.user_id);
        return true;
      });

      if (allFollowers.length === 0) {
        return; // No followers, not an error
      }

      const actionUrl = `/events/${event.slug || event.id}`;
      const message = `${listing.name} published a new event${event.venue_name ? ' at ' + event.venue_name : ''}`;

      const dispatchPromises = allFollowers.map(row =>
        this.notificationService.dispatch({
          type: 'event.new_published',
          recipientId: row.user_id,
          title: `New Event: ${event.title}`,
          message,
          entityType: 'event',
          entityId: event.id,
          actionUrl,
          priority: 'normal',
          metadata: {
            event_id: eventId,
            listing_id: listingId,
            start_date: event.start_date
          }
        })
      );

      await Promise.allSettled(dispatchPromises);

    } catch (error) {
      ErrorService.capture('[EventNotificationService] notifyEventPublished failed:', error);
    }
  }

  // ==========================================================================
  // Cancellation Notifications
  // ==========================================================================

  /**
   * Notify all confirmed RSVP attendees when an event is cancelled
   * @param eventId Event ID
   */
  async notifyEventCancelled(eventId: number): Promise<void> {
    try {
      // Get event details
      const eventResult = await this.db.query<{
        id: number;
        title: string;
        slug: string | null;
      }>(
        'SELECT id, title, slug FROM events WHERE id = ?',
        [eventId]
      );

      if (eventResult.rows.length === 0) {
        ErrorService.capture('[EventNotificationService] notifyEventCancelled failed: event not found', { eventId });
        return;
      }

      const event = eventResult.rows[0];
      if (!event) {
        return;
      }

      // Get all confirmed RSVP attendees
      const rsvpResult = await this.db.query<{ user_id: number }>(
        `SELECT user_id FROM event_rsvps WHERE event_id = ? AND rsvp_status = 'confirmed'`,
        [eventId]
      );

      if (rsvpResult.rows.length === 0) {
        return; // No attendees to notify
      }

      const actionUrl = `/events/${event.slug || event.id}`;

      const dispatchPromises = rsvpResult.rows.map(row =>
        this.notificationService.dispatch({
          type: 'event.cancelled',
          recipientId: row.user_id,
          title: `Event Cancelled: ${event.title}`,
          message: `${event.title} has been cancelled`,
          entityType: 'event',
          entityId: event.id,
          actionUrl,
          priority: 'high',
          metadata: {
            event_id: eventId
          }
        })
      );

      await Promise.allSettled(dispatchPromises);

    } catch (error) {
      ErrorService.capture('[EventNotificationService] notifyEventCancelled failed:', error);
    }
  }

  // ==========================================================================
  // Capacity Notifications
  // ==========================================================================

  /**
   * Notify listing owner when RSVP count exceeds 80% of total_capacity
   * Dedup: skips if capacity alert already sent within 24h
   * @param eventId Event ID
   */
  async notifyNearingCapacity(eventId: number): Promise<EventNotificationResult> {
    try {
      // Get event + listing owner
      const eventResult = await this.db.query<{
        id: number;
        title: string;
        slug: string | null;
        total_capacity: number | null;
        rsvp_count: number;
        listing_id: number | null;
      }>(
        'SELECT id, title, slug, total_capacity, rsvp_count, listing_id FROM events WHERE id = ?',
        [eventId]
      );

      if (eventResult.rows.length === 0 || !eventResult.rows[0]) {
        return { success: false, error: 'Event not found' };
      }

      const event = eventResult.rows[0];
      if (!event.listing_id) {
        return { success: true }; // No owner to notify
      }

      // Get listing owner
      const listingResult = await this.db.query<{ user_id: number }>(
        'SELECT user_id FROM listings WHERE id = ?',
        [event.listing_id]
      );

      if (listingResult.rows.length === 0 || !listingResult.rows[0]) {
        return { success: false, error: 'Listing owner not found' };
      }

      const ownerId = listingResult.rows[0].user_id;

      // Dedup: check for existing capacity alert within 24h
      const dedupResult = await this.db.query<{ id: number }>(
        `SELECT id FROM user_notifications
         WHERE user_id = ? AND type = 'event.nearing_capacity'
           AND JSON_EXTRACT(metadata, '$.event_id') = ?
           AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
         LIMIT 1`,
        [ownerId, eventId]
      );

      if (dedupResult.rows.length > 0) {
        return { success: true }; // Already notified recently
      }

      await this.notificationService.dispatch({
        type: 'event.nearing_capacity',
        recipientId: ownerId,
        title: `Event almost full: ${event.title}`,
        message: `${event.title} is over 80% capacity (${event.rsvp_count}${event.total_capacity ? '/' + event.total_capacity : ''} RSVPs)`,
        entityType: 'event',
        entityId: event.id,
        actionUrl: `/dashboard/listings/${event.listing_id}/events/attendees`,
        priority: 'normal',
        metadata: {
          event_id: eventId,
          rsvp_count: event.rsvp_count,
          total_capacity: event.total_capacity
        }
      });

      return { success: true };

    } catch (error) {
      ErrorService.capture('[EventNotificationService] notifyNearingCapacity failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Notification failed' };
    }
  }

  /**
   * Notify listing owner + users who saved event when capacity reaches 0
   * @param eventId Event ID
   */
  async notifyEventFull(eventId: number): Promise<EventNotificationResult> {
    try {
      // Get event details
      const eventResult = await this.db.query<{
        id: number;
        title: string;
        slug: string | null;
        listing_id: number | null;
      }>(
        'SELECT id, title, slug, listing_id FROM events WHERE id = ?',
        [eventId]
      );

      if (eventResult.rows.length === 0 || !eventResult.rows[0]) {
        return { success: false, error: 'Event not found' };
      }

      const event = eventResult.rows[0];
      const actionUrl = `/events/${event.slug || event.id}`;
      const dispatchPromises: Promise<unknown>[] = [];

      // Notify listing owner
      if (event.listing_id) {
        const listingResult = await this.db.query<{ user_id: number }>(
          'SELECT user_id FROM listings WHERE id = ?',
          [event.listing_id]
        );
        const ownerRow = listingResult.rows[0];
        if (ownerRow) {
          dispatchPromises.push(
            this.notificationService.dispatch({
              type: 'event.full',
              recipientId: ownerRow.user_id,
              title: `Event is full: ${event.title}`,
              message: `${event.title} has reached full capacity`,
              entityType: 'event',
              entityId: event.id,
              actionUrl: `/dashboard/listings/${event.listing_id}/events/attendees`,
              priority: 'high',
              metadata: { event_id: eventId }
            })
          );
        }
      }

      // Notify users who saved the event
      const savesResult = await this.db.query<{ user_id: number }>(
        'SELECT user_id FROM event_saves WHERE event_id = ?',
        [eventId]
      );

      for (const row of savesResult.rows) {
        dispatchPromises.push(
          this.notificationService.dispatch({
            type: 'event.full',
            recipientId: row.user_id,
            title: `Event is now full: ${event.title}`,
            message: `${event.title} has reached capacity. Join the waitlist to be notified of openings.`,
            entityType: 'event',
            entityId: event.id,
            actionUrl,
            priority: 'normal',
            metadata: { event_id: eventId }
          })
        );
      }

      await Promise.allSettled(dispatchPromises);

      return { success: true };

    } catch (error) {
      ErrorService.capture('[EventNotificationService] notifyEventFull failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Notification failed' };
    }
  }

  /**
   * Notify users who saved the event when remaining capacity drops below 20%
   * Dedup: skips if already notified within 48h
   * @param eventId Event ID
   */
  async notifySavedEventFillingUp(eventId: number): Promise<EventNotificationResult> {
    try {
      // Get event details
      const eventResult = await this.db.query<{
        id: number;
        title: string;
        slug: string | null;
        total_capacity: number | null;
        remaining_capacity: number | null;
      }>(
        'SELECT id, title, slug, total_capacity, remaining_capacity FROM events WHERE id = ?',
        [eventId]
      );

      if (eventResult.rows.length === 0 || !eventResult.rows[0]) {
        return { success: false, error: 'Event not found' };
      }

      const event = eventResult.rows[0];
      const actionUrl = `/events/${event.slug || event.id}`;

      // Get users who saved the event
      const savesResult = await this.db.query<{ user_id: number }>(
        'SELECT user_id FROM event_saves WHERE event_id = ?',
        [eventId]
      );

      if (savesResult.rows.length === 0) {
        return { success: true }; // No saved users
      }

      const dispatchPromises = savesResult.rows.map(async (row) => {
        // Dedup: check within 48h
        const dedupResult = await this.db.query<{ id: number }>(
          `SELECT id FROM user_notifications
           WHERE user_id = ? AND type = 'event.filling_up'
             AND JSON_EXTRACT(metadata, '$.event_id') = ?
             AND created_at >= DATE_SUB(NOW(), INTERVAL 48 HOUR)
           LIMIT 1`,
          [row.user_id, eventId]
        );

        if (dedupResult.rows.length > 0) {
          return; // Already notified recently
        }

        return this.notificationService.dispatch({
          type: 'event.filling_up',
          recipientId: row.user_id,
          title: `Hurry! ${event.title} is filling up`,
          message: `Only ${event.remaining_capacity ?? 'a few'} spots left for ${event.title}`,
          entityType: 'event',
          entityId: event.id,
          actionUrl,
          priority: 'normal',
          metadata: {
            event_id: eventId,
            remaining_capacity: event.remaining_capacity,
            total_capacity: event.total_capacity
          }
        });
      });

      await Promise.allSettled(dispatchPromises);

      return { success: true };

    } catch (error) {
      ErrorService.capture('[EventNotificationService] notifySavedEventFillingUp failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Notification failed' };
    }
  }

  /**
   * Notify confirmed/pending RSVP attendees when key event fields change
   * @param eventId Event ID
   * @param changes Object describing what changed
   */
  async notifyEventUpdated(
    eventId: number,
    changes: { dateChanged?: boolean; venueChanged?: boolean; description?: string }
  ): Promise<EventNotificationResult> {
    try {
      // Get event details
      const eventResult = await this.db.query<{
        id: number;
        title: string;
        slug: string | null;
      }>(
        'SELECT id, title, slug FROM events WHERE id = ?',
        [eventId]
      );

      if (eventResult.rows.length === 0 || !eventResult.rows[0]) {
        return { success: false, error: 'Event not found' };
      }

      const event = eventResult.rows[0];

      // Get confirmed and pending RSVP attendees
      const rsvpResult = await this.db.query<{ user_id: number }>(
        `SELECT user_id FROM event_rsvps WHERE event_id = ? AND rsvp_status IN ('confirmed', 'pending')`,
        [eventId]
      );

      if (rsvpResult.rows.length === 0) {
        return { success: true }; // No attendees to notify
      }

      // Build change summary message
      const changeParts: string[] = [];
      if (changes.dateChanged) changeParts.push('date/time');
      if (changes.venueChanged) changeParts.push('venue/location');
      const changeSummary = changeParts.length > 0
        ? `${changeParts.join(' and ')} has changed`
        : (changes.description || 'event details have been updated');

      const actionUrl = `/events/${event.slug || event.id}`;

      const dispatchPromises = rsvpResult.rows.map(row =>
        this.notificationService.dispatch({
          type: 'event.updated',
          recipientId: row.user_id,
          title: `Event updated: ${event.title}`,
          message: `${event.title} — ${changeSummary}. Please review the updated details.`,
          entityType: 'event',
          entityId: event.id,
          actionUrl,
          priority: changes.dateChanged || changes.venueChanged ? 'high' : 'normal',
          metadata: {
            event_id: eventId,
            date_changed: changes.dateChanged ?? false,
            venue_changed: changes.venueChanged ?? false
          }
        })
      );

      await Promise.allSettled(dispatchPromises);

      return { success: true };

    } catch (error) {
      ErrorService.capture('[EventNotificationService] notifyEventUpdated failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Notification failed' };
    }
  }
}

export default EventNotificationService;
