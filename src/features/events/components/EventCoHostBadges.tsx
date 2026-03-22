/**
 * EventCoHostBadges - Display active co-hosts as linked badges on event detail page
 *
 * Fetches active co-hosts and renders as a row of role-colored badges
 * linked to listing pages. Returns null if no active co-hosts.
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 6A - Co-Host System
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Users } from 'lucide-react';
import type { EventCoHost, EventCoHostRole } from '@features/events/types';

interface EventCoHostBadgesProps {
  eventId: number;
  className?: string;
}

const roleColors: Record<EventCoHostRole, string> = {
  organizer: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  vendor: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
  performer: 'bg-pink-100 text-pink-800 hover:bg-pink-200',
  exhibitor: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
};

const roleIcons: Record<EventCoHostRole, string> = {
  organizer: 'Co-organizer',
  vendor: 'Vendor',
  performer: 'Performer',
  exhibitor: 'Exhibitor',
};

function EventCoHostBadgesContent({ eventId, className = '' }: EventCoHostBadgesProps) {
  const [coHosts, setCoHosts] = useState<EventCoHost[]>([]);

  useEffect(() => {
    const fetchCoHosts = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/co-hosts`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setCoHosts(data?.data?.co_hosts || []);
        }
      } catch {
        // Silently fail
      }
    };

    fetchCoHosts();
  }, [eventId]);

  if (coHosts.length === 0) return null;

  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-600">Co-Hosts</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {coHosts.map((coHost) => (
          <Link
            key={coHost.id}
            href={`/listings/${coHost.listing_slug}` as Route}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${roleColors[coHost.co_host_role]}`}
          >
            <span>{roleIcons[coHost.co_host_role]}</span>
            <span>{coHost.listing_name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function EventCoHostBadges(props: EventCoHostBadgesProps) {
  return (
    <ErrorBoundary>
      <EventCoHostBadgesContent {...props} />
    </ErrorBoundary>
  );
}
