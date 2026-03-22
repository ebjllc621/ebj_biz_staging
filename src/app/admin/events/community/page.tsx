/**
 * Admin Community Events Moderation Page
 *
 * Review and approve/reject community-submitted events.
 *
 * @tier STANDARD
 * @phase Events Phase 3A - Community Events
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/integrationPointRef/events/phases/PHASE_3A_PLAN.md
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { AdminTableTemplate, TableColumn, TableAction } from '@/components/admin/templates/AdminTableTemplate';
import {
  AdminPageHeader,
  AdminStatsPanel,
  type StatSection,
} from '@/components/admin/shared';
import { useAuth } from '@core/hooks/useAuth';
import { BizModal } from '@/components/ui/BizModal';
import { fetchWithCsrf } from '@core/utils/csrf';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

interface CommunityEvent {
  id: number;
  title: string;
  event_type: string | null;
  start_date: string;
  end_date: string;
  location_type: string;
  city: string | null;
  state: string | null;
  submitted_by_user_id: number | null;
  created_at: string;
  status: string;
}

function AdminCommunityEventsContent() {
  const { user } = useAuth();

  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rejection modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingEventId, setRejectingEventId] = useState<number | null>(null);
  const [rejectingEventTitle, setRejectingEventTitle] = useState('');
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [rejectionError, setRejectionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPendingEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/events/moderation', {
        credentials: 'include',
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to load community events');
      }

      setEvents(result.data.events || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load community events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingEvents();
  }, [fetchPendingEvents]);

  const handleApprove = async (event: CommunityEvent) => {
    if (!confirm(`Approve "${event.title}"?`)) return;

    setActionLoading(true);
    try {
      const response = await fetchWithCsrf('/api/admin/events/moderation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: event.id, action: 'approve' }),
        credentials: 'include',
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to approve event');
      }

      await fetchPendingEvents();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to approve event');
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (event: CommunityEvent) => {
    setRejectingEventId(event.id);
    setRejectingEventTitle(event.title);
    setRejectionNotes('');
    setRejectionError(null);
    setRejectModalOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectingEventId) return;
    if (!rejectionNotes.trim()) {
      setRejectionError('Rejection reason is required.');
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetchWithCsrf('/api/admin/events/moderation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: rejectingEventId,
          action: 'reject',
          notes: rejectionNotes.trim(),
        }),
        credentials: 'include',
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to reject event');
      }

      setRejectModalOpen(false);
      setRejectingEventId(null);
      setRejectingEventTitle('');
      setRejectionNotes('');
      await fetchPendingEvents();
    } catch (err) {
      setRejectionError(err instanceof Error ? err.message : 'Failed to reject event');
    } finally {
      setActionLoading(false);
    }
  };

  // Stats
  const statSections: StatSection[] = [
    {
      title: 'Moderation Queue',
      items: [
        {
          label: 'Pending Review',
          value: loading ? '-' : events.length,
        },
      ],
    },
  ];

  // Table columns
  const columns: TableColumn<CommunityEvent>[] = [
    {
      key: 'id',
      header: 'ID',
      accessor: (event) => <span className="text-gray-500 text-sm">#{event.id}</span>,
    },
    {
      key: 'title',
      header: 'Title',
      accessor: (event) => (
        <div>
          <div className="font-medium text-gray-900">{event.title}</div>
          {event.event_type && (
            <div className="text-xs text-gray-500">{event.event_type}</div>
          )}
        </div>
      ),
    },
    {
      key: 'submitted_by_user_id',
      header: 'Submitted By',
      accessor: (event) => (
        <span className="text-gray-600 text-sm">
          {event.submitted_by_user_id ? `User #${event.submitted_by_user_id}` : 'Unknown'}
        </span>
      ),
    },
    {
      key: 'start_date',
      header: 'Event Date',
      accessor: (event) => (
        <div className="text-sm">
          <div>{new Date(event.start_date).toLocaleDateString()}</div>
          <div className="text-gray-500 text-xs">
            {new Date(event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      ),
    },
    {
      key: 'location_type',
      header: 'Location',
      accessor: (event) => (
        <div className="text-sm">
          <span className="capitalize">{event.location_type}</span>
          {event.city && (
            <div className="text-gray-500 text-xs">
              {event.city}{event.state ? `, ${event.state}` : ''}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'created_at',
      header: 'Submitted',
      accessor: (event) => (
        <span className="text-gray-500 text-sm">
          {new Date(event.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  // Table actions
  const actions: TableAction<CommunityEvent>[] = [
    {
      label: 'Approve',
      variant: 'primary',
      onClick: handleApprove,
    },
    {
      label: 'Reject',
      variant: 'danger',
      onClick: openRejectModal,
    },
  ];

  if (!user) {
    return (
      <div className="p-6 text-center text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Community Events Moderation" />

      <AdminStatsPanel sections={statSections} loading={loading} />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
          <button
            onClick={fetchPendingEvents}
            className="ml-3 text-sm underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      <AdminTableTemplate
        title="Pending Moderation"
        data={events}
        columns={columns}
        actions={actions}
        loading={loading}
        emptyMessage="No community events pending moderation."
        rowKey={(event) => event.id}
      />

      {/* Rejection Notes Modal */}
      <BizModal
        isOpen={rejectModalOpen}
        onClose={() => {
          setRejectModalOpen(false);
          setRejectingEventId(null);
          setRejectionNotes('');
          setRejectionError(null);
        }}
        title="Reject Community Event"
        size="medium"
      >
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            Rejecting:{' '}
            <span className="font-medium text-gray-900">{rejectingEventTitle}</span>
          </p>

          {rejectionError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {rejectionError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rejectionNotes}
              onChange={(e) => {
                setRejectionNotes(e.target.value);
                setRejectionError(null);
              }}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Explain why this event is being rejected..."
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setRejectModalOpen(false);
                setRejectingEventId(null);
                setRejectionNotes('');
                setRejectionError(null);
              }}
              disabled={actionLoading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRejectConfirm}
              disabled={actionLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {actionLoading ? 'Rejecting...' : 'Reject Event'}
            </button>
          </div>
        </div>
      </BizModal>
    </div>
  );
}

export default function AdminCommunityEventsPage() {
  return (
    <ErrorBoundary componentName="AdminCommunityEventsPage">
      <AdminCommunityEventsContent />
    </ErrorBoundary>
  );
}
