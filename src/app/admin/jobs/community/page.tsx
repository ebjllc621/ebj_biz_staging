/**
 * Admin Community Gigs Moderation Page
 *
 * Review and approve/reject community-submitted gigs.
 *
 * @tier STANDARD
 * @phase Jobs Phase 5 - Community Gig Board
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/integrationPointRef/jobs/phases/PHASE_5_PLAN.md
 *
 * @see src/app/admin/events/community/page.tsx - Canon pattern
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
import { JobFormModal } from '@features/dashboard/components/managers/jobs/JobFormModal';
import { AdminImportExportModal } from '@/components/admin/shared';

interface CommunityGig {
  id: number;
  title: string;
  employment_type: string;
  work_location_type: string;
  city: string | null;
  state: string | null;
  creator_user_id: number;
  created_at: string;
  status: string;
}

function AdminCommunityGigsContent() {
  const { user } = useAuth();

  const [gigs, setGigs] = useState<CommunityGig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rejection modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingGigId, setRejectingGigId] = useState<number | null>(null);
  const [rejectingGigTitle, setRejectingGigTitle] = useState('');
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [rejectionError, setRejectionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Create / edit modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGig, setEditingGig] = useState<CommunityGig | null>(null);
  const [editGigFullData, setEditGigFullData] = useState<Record<string, unknown> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Import / export modal state
  const [importExportOpen, setImportExportOpen] = useState(false);

  const fetchPendingGigs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/jobs/moderation', {
        credentials: 'include',
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to load community gigs');
      }

      setGigs(result.data.jobs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load community gigs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingGigs();
  }, [fetchPendingGigs]);

  const handleApprove = async (gig: CommunityGig) => {
    if (!confirm(`Approve "${gig.title}"?`)) return;

    setActionLoading(true);
    try {
      const response = await fetchWithCsrf('/api/admin/jobs/moderation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: gig.id, action: 'approve' }),
        credentials: 'include',
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to approve gig');
      }

      await fetchPendingGigs();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to approve gig');
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (gig: CommunityGig) => {
    setRejectingGigId(gig.id);
    setRejectingGigTitle(gig.title);
    setRejectionNotes('');
    setRejectionError(null);
    setRejectModalOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectingGigId) return;
    if (!rejectionNotes.trim()) {
      setRejectionError('Rejection reason is required.');
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetchWithCsrf('/api/admin/jobs/moderation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: rejectingGigId,
          action: 'reject',
          notes: rejectionNotes.trim(),
        }),
        credentials: 'include',
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to reject gig');
      }

      setRejectModalOpen(false);
      setRejectingGigId(null);
      setRejectingGigTitle('');
      setRejectionNotes('');
      await fetchPendingGigs();
    } catch (err) {
      setRejectionError(err instanceof Error ? err.message : 'Failed to reject gig');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditClick = useCallback(async (gig: CommunityGig) => {
    try {
      const response = await fetch(`/api/jobs/${gig.id}`, { credentials: 'include' });
      const result = await response.json();
      if (!result.success || !result.data?.job) return;
      const j = result.data.job;
      setEditingGig(gig);
      setEditGigFullData({
        title: j.title,
        employment_type: j.employment_type,
        description: j.description || '',
        compensation_type: j.compensation_type,
        compensation_min: j.compensation_min != null ? String(j.compensation_min) : '',
        compensation_max: j.compensation_max != null ? String(j.compensation_max) : '',
        work_location_type: j.work_location_type,
        city: j.city || '',
        state: j.state || '',
        application_method: j.application_method,
        external_application_url: j.external_application_url || '',
        start_date: j.start_date ? String(j.start_date).split('T')[0] : '',
        application_deadline: j.application_deadline ? String(j.application_deadline).split('T')[0] : '',
        status: j.status,
      });
    } catch (error) {
      console.error('Failed to fetch gig for editing:', error);
    }
  }, []);

  const handleCreate = useCallback(async (data: Record<string, unknown>) => {
    setIsSubmitting(true);
    const apiData = { ...data };
    delete apiData._pendingMedia;
    const listingId = typeof apiData.listing_id === 'number' ? apiData.listing_id : 0;
    try {
      const response = await fetchWithCsrf(`/api/listings/${listingId}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to create gig');
      }
      await fetchPendingGigs();
      setShowCreateModal(false);
    } catch (err) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [fetchPendingGigs]);

  const handleUpdate = useCallback(async (data: Record<string, unknown>) => {
    if (!editingGig) return;
    setIsSubmitting(true);
    try {
      const response = await fetchWithCsrf(`/api/jobs/${editingGig.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to update gig');
      }
      await fetchPendingGigs();
      setEditingGig(null);
      setEditGigFullData(null);
    } catch (err) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [editingGig, fetchPendingGigs]);

  // Stats
  const statSections: StatSection[] = [
    {
      title: 'Moderation Queue',
      items: [
        {
          label: 'Pending Review',
          value: loading ? '-' : gigs.length,
        },
      ],
    },
  ];

  // Table columns
  const columns: TableColumn<CommunityGig>[] = [
    {
      key: 'id',
      header: 'ID',
      accessor: (gig) => <span className="text-gray-500 text-sm">#{gig.id}</span>,
    },
    {
      key: 'title',
      header: 'Title',
      accessor: (gig) => (
        <div>
          <div className="font-medium text-gray-900">{gig.title}</div>
          <div className="text-xs text-gray-500 capitalize">
            {gig.employment_type.replace(/_/g, ' ')}
          </div>
        </div>
      ),
    },
    {
      key: 'work_location_type',
      header: 'Location',
      accessor: (gig) => (
        <div className="text-sm">
          <span className="capitalize">{gig.work_location_type.replace(/_/g, ' ')}</span>
          {gig.city && (
            <div className="text-gray-500 text-xs">
              {gig.city}{gig.state ? `, ${gig.state}` : ''}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'creator_user_id',
      header: 'Submitted By',
      accessor: (gig) => (
        <span className="text-gray-600 text-sm">
          User #{gig.creator_user_id}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Submitted',
      accessor: (gig) => (
        <span className="text-gray-500 text-sm">
          {new Date(gig.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  // Table actions
  const actions: TableAction<CommunityGig>[] = [
    {
      label: 'Edit',
      variant: 'primary',
      onClick: handleEditClick,
    },
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
      <AdminPageHeader
        title="Community Gigs Moderation"
        onCreateNew={() => setShowCreateModal(true)}
        onImportExport={() => setImportExportOpen(true)}
      />

      <AdminStatsPanel sections={statSections} loading={loading} />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
          <button
            onClick={fetchPendingGigs}
            className="ml-3 text-sm underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      <AdminTableTemplate
        title="Pending Moderation"
        data={gigs}
        columns={columns}
        actions={actions}
        loading={loading}
        emptyMessage="No community gigs pending moderation."
        rowKey={(gig) => gig.id}
      />

      {/* Create Gig Modal */}
      <JobFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
        listingTier="premium"
      />

      {/* Edit Gig Modal */}
      {editingGig && editGigFullData && (
        <JobFormModal
          isOpen={true}
          onClose={() => { setEditingGig(null); setEditGigFullData(null); }}
          onSubmit={handleUpdate}
          isSubmitting={isSubmitting}
          listingTier="premium"
          jobId={editingGig.id}
          initialData={editGigFullData}
        />
      )}

      {/* Import / Export Modal */}
      <AdminImportExportModal
        isOpen={importExportOpen}
        onClose={() => setImportExportOpen(false)}
        entityType="community_gigs"
        entityLabel="Community Gigs"
        exportEndpoint="/api/admin/jobs/moderation"
        exportDataKey="jobs"
        onImportComplete={fetchPendingGigs}
      />

      {/* Rejection Notes Modal */}
      <BizModal
        isOpen={rejectModalOpen}
        onClose={() => {
          setRejectModalOpen(false);
          setRejectingGigId(null);
          setRejectionNotes('');
          setRejectionError(null);
        }}
        title="Reject Community Gig"
        size="medium"
      >
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            Rejecting:{' '}
            <span className="font-medium text-gray-900">{rejectingGigTitle}</span>
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
              placeholder="Explain why this gig is being rejected..."
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setRejectModalOpen(false);
                setRejectingGigId(null);
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
              {actionLoading ? 'Rejecting...' : 'Reject Gig'}
            </button>
          </div>
        </div>
      </BizModal>
    </div>
  );
}

export default function AdminCommunityGigsPage() {
  return (
    <ErrorBoundary componentName="AdminCommunityGigsPage">
      <AdminCommunityGigsContent />
    </ErrorBoundary>
  );
}
