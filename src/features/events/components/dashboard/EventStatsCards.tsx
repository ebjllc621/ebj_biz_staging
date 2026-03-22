/**
 * EventStatsCards - Quick stats row for created events in dashboard
 *
 * Displays RSVP count, capacity, page views, and shares as compact stat pills.
 *
 * @tier STANDARD
 * @phase Phase 6A - Dashboard My Events Page
 */

import { Users, Eye, Share2, Ticket } from 'lucide-react';

interface EventStatsCardsProps {
  rsvpCount: number;
  totalCapacity: number | null;
  pageViews: number;
  shares: number;
  status: string;
}

export function EventStatsCards({
  rsvpCount,
  totalCapacity,
  pageViews,
  shares,
  status,
}: EventStatsCardsProps) {
  const capacityLabel =
    totalCapacity != null
      ? `${rsvpCount} / ${totalCapacity}`
      : `${rsvpCount} / \u221e`;

  const statusColors: Record<string, string> = {
    published: 'bg-green-50 text-green-700',
    draft: 'bg-yellow-50 text-yellow-700',
    cancelled: 'bg-red-50 text-red-700',
    completed: 'bg-gray-100 text-gray-600',
  };
  const statusColor = statusColors[status] ?? 'bg-gray-100 text-gray-600';

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      {/* RSVP / Capacity */}
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
        <Users className="w-3.5 h-3.5" />
        {capacityLabel}
        <span className="text-gray-400">RSVPs</span>
      </span>

      {/* Page Views */}
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
        <Eye className="w-3.5 h-3.5" />
        {pageViews}
        <span className="text-gray-400">views</span>
      </span>

      {/* Shares */}
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
        <Share2 className="w-3.5 h-3.5" />
        {shares}
        <span className="text-gray-400">shares</span>
      </span>

      {/* Status */}
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColor}`}>
        <Ticket className="w-3.5 h-3.5" />
        {status}
      </span>
    </div>
  );
}
