/**
 * Admin Event Manager Page
 *
 * GOVERNANCE COMPLIANCE:
 * - Authority: docs/components/admin/ADMIN_TABLE_CANONICAL_STANDARD.md
 * - Template: AdminTableTemplate (MANDATORY)
 * - Authentication: Admin-only access required
 * - Service Boundary: EventService via API routes
 * - Credentials: 'include' for all fetch requests
 * - Complexity: STANDARD tier
 *
 * Canonical Features:
 * - Page header with "+ New" and "Import/Export" buttons
 * - Statistics panel with event metrics
 * - Search bar with mode detection
 * - Advanced filters panel
 * - Pagination controls in table header
 * - Icon-only action buttons with canonical colors
 * - Server-side sorting
 * - Bulk actions
 *
 * @authority docs/components/admin/ADMIN_TABLE_CANONICAL_STANDARD.md
 * @component
 * @returns {JSX.Element} Admin events manager
 */

'use client';

// Force dynamic rendering (required for useAuth() - React Context cannot be used in SSG)
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Eye, Edit2, CheckCircle, XCircle, Star, Trash2 } from 'lucide-react';
import { AdminTableTemplate, TableColumn, TableAction, BulkAction } from '@/components/admin/templates/AdminTableTemplate';
import {
  AdminPageHeader,
  AdminStatsPanel,
  AdminSearchBar,
  AdminAdvancedFilterPanel,
  AdminPaginationControls,
  AdminPasswordModal,
  type StatSection,
  type FilterField,
  type MatchMode,
  type SearchMode
} from '@/components/admin/shared';
import { useAuth } from '@core/hooks/useAuth';
import { EventFormModal } from '@features/dashboard/components/managers/events/EventFormModal';
import { fetchWithCsrf } from '@core/utils/csrf';

interface Event {
  id: number;
  title: string;
  slug?: string;
  event_type: string;
  start_date: string;
  end_date: string;
  status: string;
  featured: boolean;
  capacity: number | null;
  listing_id: number;
  listing_name?: string;
}

interface EventStats {
  total: number;
  approved: number;
  pending: number;
  cancelled: number;
  featured: number;
  upcoming: number;
  byType: Record<string, number>;
}

interface EventFilters {
  [key: string]: string;
  id: string;
  title: string;
  status: string;
  event_type: string;
  featured: string;
}

const defaultFilters: EventFilters = {
  id: '',
  title: '',
  status: '',
  event_type: '',
  featured: ''
};

function buildEventFilterFields(eventTypeOptions: Array<{ value: string; label: string }>): FilterField[] {
  return [
    { key: 'id', label: 'Event ID', type: 'number', placeholder: 'e.g., 123' },
    { key: 'title', label: 'Title', type: 'text', placeholder: 'e.g., Annual Gala' },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'approved', label: 'Approved' },
        { value: 'pending', label: 'Pending' },
        { value: 'cancelled', label: 'Cancelled' }
      ]
    },
    {
      key: 'event_type',
      label: 'Event Type',
      type: 'select',
      options: eventTypeOptions
    },
    {
      key: 'featured',
      label: 'Featured',
      type: 'select',
      options: [
        { value: 'true', label: 'Featured Only' },
        { value: 'false', label: 'Not Featured' }
      ]
    }
  ];
}

const statusColors: Record<string, string> = {
  approved: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800'
};

export default function AdminEventsPage() {
  const { user } = useAuth();

  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortColumn, setSortColumn] = useState<string>('start_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('all');
  const [filters, setFilters] = useState<EventFilters>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [matchMode, setMatchMode] = useState<MatchMode>('all');

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: string; events: Event[] } | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editEventFullData, setEditEventFullData] = useState<Record<string, unknown> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic event type options from API
  const [eventTypeOptions, setEventTypeOptions] = useState<Array<{ value: string; label: string }>>([]);

  useEffect(() => {
    const fetchEventTypes = async () => {
      try {
        const response = await fetch('/api/events/types');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data?.eventTypes) {
            setEventTypeOptions(result.data.eventTypes.map((et: { slug: string; name: string }) => ({
              value: et.slug,
              label: et.name,
            })));
          }
        }
      } catch {
        // Non-blocking — filters work without dynamic types
      }
    };
    fetchEventTypes();
  }, []);

  const eventFilterFields = useMemo(() => buildEventFilterFields(eventTypeOptions), [eventTypeOptions]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        pageSize: String(pagination.pageSize),
        sortColumn,
        sortDirection,
        search: searchQuery,
        searchMode,
        matchMode,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      });

      const response = await fetch(`/api/admin/events?${params}`, { credentials: 'include' });
      const result = await response.json();

      if (result.success) {
        setEvents(result.data?.events || []);
        setPagination(prev => ({ ...prev, total: result.data?.pagination?.total || 0 }));
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, sortColumn, sortDirection, searchQuery, searchMode, filters, matchMode]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const response = await fetch('/api/admin/events/stats', { credentials: 'include' });
      const result = await response.json();
      if (result.success) setStats(result.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchEvents();
      fetchStats();
    }
  }, [user, fetchEvents, fetchStats]);

  const handleSearch = useCallback((query: string, mode: SearchMode) => {
    setSearchQuery(query);
    setSearchMode(mode);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleFiltersChange = useCallback((newFilters: EventFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(defaultFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const activeFilterCount = useMemo(() => Object.values(filters).filter(v => v !== '').length, [filters]);

  const handleColumnSort = useCallback((columnKey: string) => {
    const dbColumn = columnKey;
    if (sortColumn === dbColumn) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(dbColumn);
      setSortDirection('asc');
    }
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [sortColumn]);

  const handleFeatureToggle = useCallback(async (event: Event) => {
    try {
      await fetch(`/api/admin/events/${event.id}/feature`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ featured: !event.featured })
      });
      fetchEvents();
      fetchStats();
    } catch (error) {
      console.error('Failed to toggle feature:', error);
    }
  }, [fetchEvents, fetchStats]);

  const handleStatusChange = useCallback(async (event: Event, newStatus: string) => {
    try {
      await fetch(`/api/admin/events/${event.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });
      fetchEvents();
      fetchStats();
    } catch (error) {
      console.error('Failed to change status:', error);
    }
  }, [fetchEvents, fetchStats]);

  const handleBulkDelete = useCallback((selectedEvents: Event[]) => {
    setPendingAction({ type: 'delete', events: selectedEvents });
    setShowPasswordModal(true);
  }, []);

  const handlePasswordVerified = useCallback(async () => {
    if (!pendingAction) return;
    setShowPasswordModal(false);

    try {
      const ids = pendingAction.events.map(e => e.id);
      await fetch('/api/admin/events/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'delete', eventIds: ids })
      });
      fetchEvents();
      fetchStats();
    } catch (error) {
      console.error('Failed to delete events:', error);
    }
    setPendingAction(null);
  }, [pendingAction, fetchEvents, fetchStats]);

  const handleEditClick = useCallback(async (event: Event) => {
    try {
      const response = await fetch(`/api/events/${event.id}`, { credentials: 'include' });
      const result = await response.json();
      if (!result.success) return;
      const ev = result.data?.event;
      if (!ev) return;
      const initialData: Record<string, unknown> = {
        title: ev.title ?? '',
        description: ev.description ?? '',
        event_type: ev.event_type ?? '',
        start_date: ev.start_date,
        end_date: ev.end_date,
        timezone: ev.timezone,
        location_type: ev.location_type,
        venue_name: ev.venue_name ?? '',
        address: ev.address ?? '',
        city: ev.city ?? '',
        state: ev.state ?? '',
        zip: ev.zip ?? '',
        virtual_link: ev.virtual_link ?? '',
        is_ticketed: ev.is_ticketed ?? false,
        ticket_price: ev.ticket_price != null ? String(ev.ticket_price) : '',
        total_capacity: ev.total_capacity != null ? String(ev.total_capacity) : '',
        status: ev.status === 'completed' ? 'published' : (ev.status ?? 'draft'),
        external_ticket_url: ev.external_ticket_url ?? '',
        age_restrictions: ev.age_restrictions ?? '',
        parking_notes: ev.parking_notes ?? '',
        weather_contingency: ev.weather_contingency ?? '',
        waitlist_enabled: ev.waitlist_enabled ?? false,
        check_in_enabled: ev.check_in_enabled ?? false
      };
      setEditingEvent(event);
      setEditEventFullData(initialData);
    } catch (error) {
      console.error('Failed to fetch event for edit:', error);
    }
  }, []);

  const handleCreate = useCallback(async (data: Record<string, unknown>) => {
    setIsSubmitting(true);
    const apiData = { ...data };
    delete apiData._pendingMedia;
    try {
      const response = await fetchWithCsrf('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData)
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to create event');
      }
      setShowCreateModal(false);
      fetchEvents();
      fetchStats();
    } catch (err) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [fetchEvents, fetchStats]);

  const handleUpdate = useCallback(async (data: Record<string, unknown>) => {
    if (!editingEvent) return;
    setIsSubmitting(true);
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
      setEditingEvent(null);
      setEditEventFullData(null);
      fetchEvents();
      fetchStats();
    } catch (err) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [editingEvent, fetchEvents, fetchStats]);

  const statsSections: StatSection[] = useMemo(() => {
    if (!stats) return [];
    return [
      {
        title: 'Totals',
        items: [
          { label: 'Total Events', value: stats.total, bold: true },
          { label: 'Featured', value: stats.featured },
          { label: 'Upcoming', value: stats.upcoming }
        ]
      },
      {
        title: 'By Status',
        items: [
          { label: 'Approved', value: stats.approved },
          { label: 'Pending', value: stats.pending },
          { label: 'Cancelled', value: stats.cancelled }
        ]
      },
      {
        title: 'By Type',
        items: Object.entries(stats.byType || {}).slice(0, 3).map(([k, v]) => ({ label: k, value: v }))
      }
    ];
  }, [stats]);

  const columns: TableColumn<Event>[] = useMemo(() => [
    { key: 'id', header: 'ID', accessor: (row) => row.id, sortable: true },
    { key: 'title', header: 'Title', accessor: (row) => row.title, sortable: true },
    { key: 'event_type', header: 'Type', accessor: (row) => row.event_type, sortable: true },
    { key: 'start_date', header: 'Start', accessor: (e) => new Date(e.start_date).toLocaleDateString(), sortable: true },
    { key: 'end_date', header: 'End', accessor: (e) => new Date(e.end_date).toLocaleDateString() },
    {
      key: 'status',
      header: 'Status',
      accessor: (e) => (
        <span className={`px-2 py-1 rounded text-xs ${statusColors[e.status] || 'bg-gray-100 text-gray-800'}`}>
          {e.status}
        </span>
      )
    },
    {
      key: 'featured',
      header: 'Featured',
      accessor: (e) => e.featured ? <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> : <span className="text-gray-400">-</span>
    },
    { key: 'capacity', header: 'Capacity', accessor: (e) => e.capacity ?? 'Unlimited' }
  ], []);

  const actions: TableAction<Event>[] = useMemo(() => [
    { label: 'View', icon: <Eye className="w-4 h-4" />, iconOnly: true, onClick: (e) => window.open(`/events/${e.slug || e.id}`, '_blank'), variant: 'primary' },
    { label: 'Edit', icon: <Edit2 className="w-4 h-4" />, iconOnly: true, onClick: (e) => handleEditClick(e), variant: 'primary' },
    { label: 'Feature', icon: <Star className="w-4 h-4" />, iconOnly: true, onClick: handleFeatureToggle, variant: 'primary' },
    { label: 'Approve', icon: <CheckCircle className="w-4 h-4" />, iconOnly: true, onClick: (e) => handleStatusChange(e, 'approved'), isHidden: (e) => e.status !== 'pending', variant: 'primary' },
    { label: 'Cancel', icon: <XCircle className="w-4 h-4" />, iconOnly: true, onClick: (e) => handleStatusChange(e, 'cancelled'), isHidden: (e) => e.status === 'cancelled', variant: 'danger' },
    {
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      iconOnly: true,
      onClick: (e) => {
        setPendingAction({ type: 'delete', events: [e] });
        setShowPasswordModal(true);
      },
      variant: 'danger'
    }
  ], [handleFeatureToggle, handleStatusChange, handleEditClick]);

  const bulkActions: BulkAction<Event>[] = useMemo(() => [
    { label: 'Delete Selected', onClick: handleBulkDelete }
  ], [handleBulkDelete]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-600 font-medium">Access Denied: Admin privileges required</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <AdminPageHeader
        title="Events Manager"
        onCreateNew={() => setShowCreateModal(true)}
        onImportExport={() => { window.open('/api/admin/events/export?format=csv', '_blank'); }}
      />

      <AdminStatsPanel title="Event Statistics" sections={statsSections} loading={statsLoading} />

      <div className="flex items-center gap-4 mb-4">
        <AdminSearchBar placeholder="Search by title, #ID..." onSearch={handleSearch} />
        <AdminAdvancedFilterPanel
          isOpen={filtersOpen}
          filters={filters}
          onChange={handleFiltersChange}
          onClear={handleClearFilters}
          onToggle={() => setFiltersOpen(p => !p)}
          activeFilterCount={activeFilterCount}
          fields={eventFilterFields}
          matchMode={matchMode}
          onMatchModeChange={setMatchMode}
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <AdminPaginationControls
          title="Events"
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          loading={loading}
          onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))}
          onPageSizeChange={(s) => setPagination(prev => ({ ...prev, pageSize: s, page: 1 }))}
          onRefresh={fetchEvents}
        />
        <AdminTableTemplate<Event>
          title=""
          data={events}
          columns={columns}
          rowKey={(row) => row.id}
          loading={loading}
          actions={actions}
          bulkActions={bulkActions}
          tableId="admin-events"
          onSort={handleColumnSort}
          sortState={{ column: sortColumn, direction: sortDirection }}
        />
      </div>

      {/* Create Event Modal */}
      <EventFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
      />

      {/* Edit Event Modal */}
      {editingEvent && editEventFullData && (
        <EventFormModal
          isOpen={true}
          onClose={() => { setEditingEvent(null); setEditEventFullData(null); }}
          onSubmit={handleUpdate}
          isSubmitting={isSubmitting}
          listingId={editingEvent.listing_id}
          eventId={editingEvent.id}
          initialData={editEventFullData}
        />
      )}

      <AdminPasswordModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setPendingAction(null);
        }}
        onVerified={handlePasswordVerified}
        operationDescription={`delete ${pendingAction?.events.length || 0} event(s)`}
      />
    </div>
  );
}
