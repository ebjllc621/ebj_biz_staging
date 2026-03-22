/**
 * Event ICS Export API Route
 * GET /api/events/[id]/ics - Download .ics calendar file for an event
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - requireAuth: false - public route (allows sharing .ics links)
 * - Returns raw text/calendar response (not JSON)
 *
 * @authority CLAUDE.md - API Standards section
 * @phase Phase 6B - Dashboard Calendar & .ics Export
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { getEventService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { NextResponse } from 'next/server';
import type { Event } from '@core/services/EventService';

const eventService = getEventService();

/**
 * GET /api/events/[id]/ics
 * Returns a downloadable .ics calendar file for the specified event.
 * Conforms to RFC 5545 iCalendar format.
 */
export const GET = apiHandler(async (context: ApiContext) => {
  // Extract event ID from URL pathname (pattern: /api/events/[id]/ics)
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  // pathname: /api/events/{id}/ics → segments[-1] = 'ics', segments[-2] = id
  const idSegment = segments[segments.length - 2];
  const eventId = parseInt(idSegment ?? '', 10);
  if (isNaN(eventId)) {
    throw BizError.badRequest('Invalid event ID');
  }

  const event = await eventService.getById(eventId);
  if (!event || event.status === 'draft') {
    throw BizError.notFound('Event not found');
  }

  const icsContent = generateIcsContent(event);

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${event.slug}.ics"`,
    },
  });
}, {
  allowedMethods: ['GET'],
  requireAuth: false,
});

/**
 * Generate RFC 5545 iCalendar content string for the given event.
 */
function generateIcsContent(event: Event): string {
  // Format date to iCalendar UTC format: 20260608T140000Z
  const formatIcsDate = (date: Date | string): string => {
    const d = new Date(date);
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  // Build location string from available address parts
  const locationParts = [
    event.venue_name,
    event.address,
    event.city,
    event.state,
    event.zip,
  ].filter(Boolean);
  const location = locationParts.join(', ');

  // Strip HTML tags from description and escape newlines for iCalendar
  const plainDescription = (event.description || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\n/g, '\\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bizconekt//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:event-${event.id}@bizconekt.com`,
    `DTSTART:${formatIcsDate(event.start_date)}`,
    `DTEND:${formatIcsDate(event.end_date)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(plainDescription)}`,
    location ? `LOCATION:${escapeIcsText(location)}` : null,
    `URL:https://bizconekt.com/events/${event.slug}`,
    `STATUS:${event.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter((line): line is string => line !== null);

  return lines.join('\r\n');
}

/**
 * Escape special iCalendar text characters per RFC 5545.
 */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}
