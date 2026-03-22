/**
 * Admin Listing Management Page (Basic/Preserved Version)
 *
 * PRESERVATION NOTE:
 * This is the preserved original implementation from Phase 0-3.
 * Maintained as fallback and for reference.
 *
 * Primary implementation: /admin/listings (shell-integrated)
 * This version: /admin/listings-basic (standalone)
 *
 * @authority PHASE_4_LISTINGS_PRESERVATION_BRAIN_PLAN.md
 *
 * GOVERNANCE COMPLIANCE:
 * - Template: AdminTableTemplate (MANDATORY)
 * - Authentication: Admin-only access required
 * - Service Boundary: NO direct database access (API routes only)
 * - Credentials: 'include' for all fetch requests
 * - Complexity: STANDARD tier
 *
 * Features:
 * - Listing table with pagination (20 per page)
 * - Filters: tier, status
 * - Search: listing name, owner
 * - Moderation workflow: Approve, Reject
 * - CRUD operations: View, Edit, Delete
 * - Bulk actions: Approve, Reject, Delete
 *
 * @component
 * @returns {JSX.Element} Admin listing management interface
 */

'use client';


// Force dynamic rendering (required for useAuth() - React Context cannot be used in SSG)
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { AdminTableTemplate, TableColumn, TableAction, BulkAction } from '@/components/admin/templates/AdminTableTemplate';
import { BizModal, BizModalButton } from '@/components/ui/BizModal';
import { useAuth } from '@core/hooks/useAuth';
import { fetchWithCsrf } from '@core/utils/csrf';
import { ErrorService } from '@core/services/ErrorService';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Listing {
  id: number;
  name: string;
  type: string;
  tier: 'free' | 'creator' | 'preferred' | 'premium';
  status: 'pending' | 'approved' | 'rejected';
  user_id: number;
  user_email: string;
  user_name: string;
  created_at: string;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Moderation Modal Component
 * Handles approve/reject actions with optional reason
 */
function ModerationModal({
  listing,
  action,
  isOpen,
  onClose,
  onConfirm
}: {
  listing: Listing;
  action: 'approve' | 'reject';
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = () => {
    if (action === 'reject' && !reason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    setSubmitting(true);
    onConfirm(reason);
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={`${action === 'approve' ? 'Approve' : 'Reject'} Listing`}
      size="small"
    >
      <div className="space-y-4">
        <p>
          {action === 'approve' ? 'Approve' : 'Reject'} listing <strong>{listing.name}</strong>?
        </p>

        {action === 'reject' && (
          <div>
            <label className="block text-sm font-medium mb-1">Rejection Reason *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              rows={3}
              placeholder="Explain why this listing is being rejected..."
              required
            />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <BizModalButton variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </BizModalButton>
          <BizModalButton
            variant={action === 'approve' ? 'primary' : 'danger'}
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? 'Processing...' : action === 'approve' ? 'Approve' : 'Reject'}
          </BizModalButton>
        </div>
      </div>
    </BizModal>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * AdminListingsPage - Listing management interface for platform administrators
 *
 * Provides moderation workflow and CRUD operations for listings.
 * Requires admin role for access.
 *
 * @component
 * @returns {JSX.Element} Admin listing management interface
 */
export default function AdminListingsPage() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({
    tier: '',
    status: '',
    search: ''
  });
  const [moderationModalOpen, setModerationModalOpen] = useState(false);
  const [moderationAction, setModerationAction] = useState<'approve' | 'reject'>('approve');
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  // ============================================================================
  // DATA FETCHING - HOOKS MUST BE BEFORE CONDITIONAL RETURNS
  // ============================================================================

  // GOVERNANCE FIX: useEffect MUST be called before any early returns
  // React Rules of Hooks require hooks to be called in the same order every render
  useEffect(() => {
    // Only fetch if user is admin - conditional logic INSIDE the hook, not outside
    if (user?.role === 'admin') {
      fetchListings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filters, pagination.page]);

  // ============================================================================
  // ACTION HANDLERS - Define before conditional returns so they're available
  // ============================================================================

  const fetchListings = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.pageSize.toString(),
        ...(filters.tier && { tier: filters.tier }),
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { q: filters.search })
      });

      const response = await fetch(`/api/admin/listings?${queryParams}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setListings(data.data?.listings ?? data.listings ?? []);
        setPagination(prev => ({
          ...prev,
          total: data.data?.pagination?.total ?? data.pagination?.total ?? 0
        }));
      }
    } catch (error) {
      ErrorService.capture('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  // GOVERNANCE: Admin-only access enforcement - AFTER all hooks
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-600 font-medium">Access Denied: Admin privileges required</div>
      </div>
    );
  }

  // ============================================================================
  // ACTION HANDLERS
  // ============================================================================

  const handleModerate = async (listingId: number, action: 'approve' | 'reject', reason?: string) => {
    try {
      const response = await fetch(`/api/admin/listings/${listingId}/moderate`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason })
      });

      if (response.ok) {
        await fetchListings();
        setModerationModalOpen(false);
        setSelectedListing(null);
      } else {
        const error = await response.json();
        alert(error.message ?? 'Failed to moderate listing');
      }
    } catch (error) {
      alert('Error moderating listing');
    }
  };

  const handleReject = (listing: Listing) => {
    setSelectedListing(listing);
    setModerationAction('reject');
    setModerationModalOpen(true);
  };

  const handleApprove = (listing: Listing) => {
    setSelectedListing(listing);
    setModerationAction('approve');
    setModerationModalOpen(true);
  };

  const handleDelete = async (listing: Listing) => {
    if (!confirm(`Delete listing "${listing.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      // @governance MANDATORY - CSRF protection for DELETE requests
      // Source: osi-production-compliance.mdc, Layer 7 Security
      const response = await fetchWithCsrf(`/api/admin/listings/${listing.id}`, {method: 'DELETE'});

      if (response.ok) {
        await fetchListings();
      } else {
        const error = await response.json();
        alert(error.message ?? 'Failed to delete listing');
      }
    } catch (error) {
      alert('Error deleting listing');
    }
  };

  const handleBulkModerate = async (listings: Listing[], action: 'approve' | 'reject') => {
    if (!confirm(`${action === 'approve' ? 'Approve' : 'Reject'} ${listings.length} selected listings?`)) {
      return;
    }

    const listingIds = listings.map(l => l.id);

    try {
      const response = await fetch('/api/admin/listings/bulk-moderate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingIds, action })
      });

      if (response.ok) {
        await fetchListings();
      } else {
        const error = await response.json();
        alert(error.message ?? 'Failed to bulk moderate listings');
      }
    } catch (error) {
      alert('Error bulk moderating listings');
    }
  };

  const handleBulkDelete = async (listings: Listing[]) => {
    if (!confirm(`Delete ${listings.length} selected listings? This cannot be undone.`)) {
      return;
    }

    const listingIds = listings.map(l => l.id);

    try {
      const response = await fetch('/api/admin/listings/bulk-delete', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingIds })
      });

      if (response.ok) {
        await fetchListings();
      } else {
        const error = await response.json();
        alert(error.message ?? 'Failed to bulk delete listings');
      }
    } catch (error) {
      alert('Error bulk deleting listings');
    }
  };

  // ============================================================================
  // TABLE CONFIGURATION
  // ============================================================================

  const columns: TableColumn<Listing>[] = [
    {
      key: 'name',
      header: 'Listing Name',
      accessor: (listing: Listing) => (
        <div>
          <div className="font-medium">{listing.name}</div>
          <div className="text-xs text-gray-500">{listing.type}</div>
        </div>
      ),
      sortable: true
    },
    {
      key: 'user',
      header: 'Owner',
      accessor: (listing: Listing) => (
        <div>
          <div>{listing.user_name}</div>
          <div className="text-xs text-gray-500">{listing.user_email}</div>
        </div>
      ),
      sortable: true
    },
    {
      key: 'tier',
      header: 'Tier',
      accessor: (listing: Listing) => {
        const tierColors: Record<string, string> = {
          free: 'bg-gray-100 text-gray-800',
          creator: 'bg-blue-100 text-blue-800',
          preferred: 'bg-purple-100 text-purple-800',
          premium: 'bg-yellow-100 text-yellow-800'
        };

        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${tierColors[listing.tier] ?? 'bg-gray-100 text-gray-800'}`}>
            {listing.tier.toUpperCase()}
          </span>
        );
      },
      sortable: true
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (listing: Listing) => {
        const statusColors: Record<string, string> = {
          pending: 'bg-yellow-100 text-yellow-800',
          approved: 'bg-green-100 text-green-800',
          rejected: 'bg-red-100 text-red-800'
        };

        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[listing.status] ?? 'bg-gray-100 text-gray-800'}`}>
            {listing.status.toUpperCase()}
          </span>
        );
      },
      sortable: true
    },
    {
      key: 'created_at',
      header: 'Created',
      accessor: (listing: Listing) => new Date(listing.created_at).toLocaleDateString(),
      sortable: true
    }
  ];

  const actions: TableAction<Listing>[] = [
    {
      label: 'View',
      onClick: (listing: Listing) => window.open(`/listings/${listing.id}`, '_blank')
    },
    {
      label: 'Approve',
      onClick: handleApprove,
      variant: 'primary'
    },
    {
      label: 'Reject',
      onClick: handleReject,
      variant: 'danger'
    },
    {
      label: 'Delete',
      onClick: handleDelete,
      variant: 'danger'
    }
  ];

  const bulkActions: BulkAction<Listing>[] = [
    { label: 'Approve Selected', onClick: (selected: Listing[]) => handleBulkModerate(selected, 'approve') },
    { label: 'Reject Selected', onClick: (selected: Listing[]) => handleBulkModerate(selected, 'reject') },
    { label: 'Delete Selected', onClick: handleBulkDelete }
  ];

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="p-6">
      <AdminTableTemplate<Listing>
        title="Listing Management"
        data={listings}
        columns={columns}
        rowKey={(row: Listing) => row.id}
        actions={actions}
        bulkActions={bulkActions}
        loading={loading}
        searchable={true}
        pagination={{
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onPageChange: (page: number) => setPagination({ ...pagination, page })
        }}
        emptyMessage="No listings found"
      />

      {/* Moderation Modal */}
      {selectedListing && (
        <ModerationModal
          listing={selectedListing}
          action={moderationAction}
          isOpen={moderationModalOpen}
          onClose={() => {
            setModerationModalOpen(false);
            setSelectedListing(null);
          }}
          onConfirm={(reason) => handleModerate(selectedListing.id, moderationAction, reason)}
        />
      )}
    </div>
  );
}
