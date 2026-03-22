/**
 * EventCard - Event Display Card
 *
 * @description Individual event card with edit/delete/share actions and stats row
 * @component Client Component
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Phase 8 - Features Section Pages
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_8_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - Orange theme for action buttons (#ed6437)
 * - Displays date, location, capacity, status
 */
'use client';

import React from 'react';
import {
  Edit2, Trash2, Calendar, MapPin, Video, Users, DollarSign,
  Eye, Share2, Play, XCircle, CheckCircle
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface Event {
  id: number;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  location_type: 'physical' | 'virtual' | 'hybrid';
  venue_name: string | null;
  city: string | null;
  state: string | null;
  is_ticketed: boolean;
  ticket_price: number | null;
  total_capacity: number | null;
  rsvp_count: number;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  view_count: number;
}

export interface EventCardProps {
  /** Event data */
  event: Event;
  /** Edit callback */
  onEdit: () => void;
  /** Delete callback */
  onDelete: () => void;
  /** Share callback */
  onShare?: () => void;
  /** Status change callback */
  onStatusChange?: (status: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * EventCard - Event display card
 *
 * @param event - Event data
 * @param onEdit - Edit callback
 * @param onDelete - Delete callback
 * @param onShare - Share callback (optional)
 * @param onStatusChange - Status change callback (optional)
 * @returns Event card
 */
export function EventCard({ event, onEdit, onDelete, onShare, onStatusChange }: EventCardProps) {
  const startDate = new Date(event.start_date);
  const formattedDate = startDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  const statusColors = {
    draft: 'bg-gray-100 text-gray-700',
    published: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-blue-100 text-blue-700'
  };

  const locationIcons = {
    physical: MapPin,
    virtual: Video,
    hybrid: MapPin
  };

  const LocationIcon = locationIcons[event.location_type];

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      {/* Header: Title + Status + Actions */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {event.title}
          </h3>
          <span className={`inline-block mt-1 px-2 py-1 rounded text-xs font-medium ${statusColors[event.status]}`}>
            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="p-2 text-gray-600 hover:text-[#ed6437] hover:bg-gray-100 rounded transition-colors"
            title="Edit event"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          {onShare && (
            <button
              onClick={onShare}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Share event"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete event"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Description */}
      {event.description && (
        <p className="text-sm text-gray-700 mb-3 line-clamp-2">
          {event.description}
        </p>
      )}

      {/* Event Details */}
      <div className="space-y-2">
        {/* Date */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4 flex-shrink-0" />
          <span>{formattedDate}</span>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <LocationIcon className="w-4 h-4 flex-shrink-0" />
          <span>
            {event.location_type === 'virtual' ? 'Virtual Event' :
             event.venue_name ? event.venue_name :
             event.city && event.state ? `${event.city}, ${event.state}` :
             'Location TBD'}
          </span>
        </div>

        {/* Capacity */}
        {event.total_capacity && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="w-4 h-4 flex-shrink-0" />
            <span>
              {event.rsvp_count} / {event.total_capacity} attendees
            </span>
          </div>
        )}

        {/* Ticket Price */}
        {event.is_ticketed && event.ticket_price !== null && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <DollarSign className="w-4 h-4 flex-shrink-0" />
            <span>${parseFloat(String(event.ticket_price)).toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="flex items-center flex-wrap gap-x-4 gap-y-1 pt-2 mt-2 border-t border-gray-100">
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <Eye className="w-3.5 h-3.5" />
          <span>{event.view_count} views</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <Users className="w-3.5 h-3.5" />
          <span>{event.rsvp_count} RSVPs</span>
        </div>
      </div>

      {/* Quick Actions */}
      {onStatusChange && event.status !== 'completed' && (
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          {event.status === 'draft' && (
            <button
              onClick={() => onStatusChange('published')}
              className="flex items-center gap-1 px-2 py-1 text-xs text-green-700 bg-green-50 hover:bg-green-100 rounded transition-colors"
              title="Publish event"
            >
              <Play className="w-3 h-3" />
              Publish
            </button>
          )}
          {event.status === 'published' && (
            <>
              <button
                onClick={() => onStatusChange('cancelled')}
                className="flex items-center gap-1 px-2 py-1 text-xs text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors"
                title="Cancel event"
              >
                <XCircle className="w-3 h-3" />
                Cancel
              </button>
              <button
                onClick={() => onStatusChange('completed')}
                className="flex items-center gap-1 px-2 py-1 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                title="Mark as completed"
              >
                <CheckCircle className="w-3 h-3" />
                Complete
              </button>
            </>
          )}
          {event.status === 'cancelled' && (
            <button
              onClick={() => onStatusChange('published')}
              className="flex items-center gap-1 px-2 py-1 text-xs text-green-700 bg-green-50 hover:bg-green-100 rounded transition-colors"
              title="Re-publish event"
            >
              <Play className="w-3 h-3" />
              Re-publish
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default EventCard;
