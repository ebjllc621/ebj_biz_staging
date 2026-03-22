/**
 * EventTable Component - Data table for displaying events
 *
 * @authority PHASE_5.4.1_BRAIN_PLAN.md - Task 2.2
 * @governance Build Map v2.1 ENHANCED compliance
 */

'use client';

interface Event {
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

interface EventTableProps {
  events: Event[];
  onEdit: (event: Event) => void;
  onDelete: (eventId: number) => void;
  onToggleFeatured: (event: Event) => void;
  onViewAttendees: (eventId: number) => void;
}

/**
 * EventTable - Data table component for events
 *
 * Displays columns: Title, Listing, Date/Time, Location Type, Capacity, RSVPs, Status, Actions
 *
 * @param {EventTableProps} props
 * @returns {JSX.Element}
 */
export function EventTable({ events, onEdit, onDelete, onToggleFeatured, onViewAttendees }: EventTableProps) {
  /**
   * Format date and time for display
   */
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  /**
   * Get status badge color
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * Format location display
   */
  const formatLocation = (event: Event) => {
    switch (event.location_type) {
      case 'physical':
        return `${event.venue_name || 'Physical'} - ${event.city || ''}`;
      case 'virtual':
        return 'Virtual Event';
      case 'hybrid':
        return 'Hybrid (Physical + Virtual)';
      default:
        return event.location_type;
    }
  };

  /**
   * Format capacity display
   */
  const formatCapacity = (event: Event) => {
    if (!event.total_capacity) return 'Unlimited';
    return `${event.remaining_capacity || 0} / ${event.total_capacity}`;
  };

  if (events.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <p className="text-gray-600">No events found. Create your first event to get started!</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Title
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Listing
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date/Time
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Location
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Capacity
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              RSVPs
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {events.map((event) => (
            <tr key={event.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{event.title}</div>
                {event.is_featured && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                    Featured
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{event.listing_name}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{formatDateTime(event.start_date)}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{formatLocation(event)}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{formatCapacity(event)}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{event.rsvp_count}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                    event.status
                  )}`}
                >
                  {event.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  onClick={() => onEdit(event)}
                  className="text-blue-600 hover:text-blue-900 mr-3"
                >
                  Edit
                </button>
                <button
                  onClick={() => onViewAttendees(event.id)}
                  className="text-green-600 hover:text-green-900 mr-3"
                >
                  Attendees
                </button>
                <button
                  onClick={() => onToggleFeatured(event)}
                  className="text-yellow-600 hover:text-yellow-900 mr-3"
                >
                  {event.is_featured ? 'Unfeature' : 'Feature'}
                </button>
                <button
                  onClick={() => onDelete(event.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
