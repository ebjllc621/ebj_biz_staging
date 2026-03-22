/**
 * HiringEventCard Component
 *
 * Hiring event card with event details and participating businesses
 *
 * GOVERNANCE COMPLIANCE:
 * - 'use client' directive for client component
 * - Import aliases: @core/, @features/, @components/
 *
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 * @tier STANDARD
 * @phase Jobs Phase 4 - Platform Growth & Future Features
 * @reference src/features/events/components/EventCard.tsx - Event card pattern
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import type { HiringEvent } from '@features/jobs/types';

interface HiringEventCardProps {
  event: HiringEvent;
  onRegister?: (eventId: number) => void;
}

export function HiringEventCard({ event, onRegister }: HiringEventCardProps) {
  const [isRegistering, setIsRegistering] = useState(false);

  const handleRegister = async () => {
    if (!onRegister) return;
    setIsRegistering(true);
    try {
      await onRegister(event.id);
    } catch (error) {
      console.error('Registration failed:', error);
    } finally {
      setIsRegistering(false);
    }
  };

  const eventTypeLabels: Record<string, string> = {
    job_fair: 'Job Fair',
    career_expo: 'Career Expo',
    networking: 'Networking Event',
    hiring_sprint: 'Hiring Sprint',
    webinar: 'Webinar',
    info_session: 'Info Session'
  };

  const eventTypeLabel = eventTypeLabels[event.event_type] || event.event_type;
  const eventTypeColors: Record<string, string> = {
    job_fair: 'bg-blue-100 text-blue-800',
    career_expo: 'bg-purple-100 text-purple-800',
    networking: 'bg-green-100 text-green-800',
    hiring_sprint: 'bg-red-100 text-red-800',
    webinar: 'bg-yellow-100 text-yellow-800',
    info_session: 'bg-gray-100 text-gray-800'
  };

  const eventTypeColor = eventTypeColors[event.event_type] || 'bg-gray-100 text-gray-800';

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${eventTypeColor}`}>
            {eventTypeLabel}
          </span>
          {event.registration_required && (
            <span className="text-xs text-gray-600">Registration Required</span>
          )}
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {event.event_name || 'Hiring Event'}
        </h3>
      </div>

      {/* Date & Time */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center text-sm text-gray-600">
          <svg
            className="w-4 h-4 mr-2 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          {event.event_date ? formatDate(event.event_date) : 'Date TBD'}
        </div>
        {event.event_location && (
          <div className="flex items-center text-sm text-gray-600">
            <svg
              className="w-4 h-4 mr-2 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {event.event_location}
          </div>
        )}
      </div>

      {/* Expected Openings */}
      {event.expected_openings && (
        <div className="mb-4">
          <div className="text-sm font-semibold text-gray-700">
            <span className="text-primary text-lg">{event.expected_openings}+</span> job openings
          </div>
        </div>
      )}

      {/* Featured Roles */}
      {event.featured_roles && event.featured_roles.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Featured Roles</h4>
          <div className="flex flex-wrap gap-1">
            {event.featured_roles.slice(0, 3).map((role, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-50 text-blue-700"
              >
                {role}
              </span>
            ))}
            {event.featured_roles.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs text-gray-600">
                +{event.featured_roles.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Participating Businesses Count */}
      {event.participating_listings && event.participating_listings.length > 0 && (
        <div className="mb-4 p-3 bg-green-50 rounded-md">
          <div className="text-sm text-green-800">
            <span className="font-semibold">{event.participating_listings.length}</span> businesses participating
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
        <Link
          href={`/jobs/events/${event.id}` as Route}
          className="flex-1 text-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          View Details
        </Link>
        {event.registration_required && (
          <>
            {event.external_registration_url ? (
              <a
                href={event.external_registration_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-dark transition-colors"
              >
                Register
              </a>
            ) : (
              onRegister && (
                <button
                  onClick={handleRegister}
                  disabled={isRegistering}
                  className="flex-1 text-center px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRegistering ? 'Registering...' : 'Register'}
                </button>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}
