/**
 * Admin Claims Review Page
 *
 * GOVERNANCE COMPLIANCE:
 * - Authority: docs/components/admin/ADMIN_TABLE_CANONICAL_STANDARD.md
 * - Template: AdminTableTemplate (MANDATORY)
 * - Authentication: Admin-only access required
 * - Service Boundary: NO direct database access (API routes only)
 * - Credentials: 'include' for all fetch requests
 * - Complexity: ADVANCED tier
 *
 * Canonical Features:
 * - Page header with "Import/Export" button
 * - Statistics panel with claim metrics
 * - Search bar with mode detection
 * - Advanced filters panel
 * - Pagination controls in table header
 * - Icon-only action buttons with canonical colors
 * - Server-side sorting
 * - Detail panel modal for claim review
 *
 * @authority docs/components/admin/ADMIN_TABLE_CANONICAL_STANDARD.md
 * @phase Phase 4 Brain Plan - Admin Claims Review Dashboard
 * @component
 * @returns {JSX.Element} Admin claims review interface
 */

'use client';

// Force dynamic rendering (required for useAuth() - React Context cannot be used in SSG)
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Eye, CheckCircle, XCircle, Shield, AlertTriangle, Edit2, Clock } from 'lucide-react';
import { AdminTableTemplate, TableColumn, TableAction, BulkAction } from '@/components/admin/templates/AdminTableTemplate';
import BizModal, { BizModalButton } from '@/components/BizModal/BizModal';
import {
  AdminPageHeader,
  AdminStatsPanel,
  AdminSearchBar,
  AdminAdvancedFilterPanel,
  AdminPaginationControls,
  type StatSection,
  type FilterField,
  type MatchMode,
  type SearchMode
} from '@/components/admin/shared';
import { useAuth } from '@core/hooks/useAuth';
import { fetchWithCsrf } from '@core/utils/csrf';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type ClaimStatus = 'initiated' | 'verification_pending' | 'under_review' | 'approved' | 'rejected' | 'expired';
type ClaimType = 'owner' | 'manager' | 'authorized_representative';

interface AdminClaimRow {
  id: number;
  listing_id: number;
  listing_name: string;
  claimant_user_id: number;
  claimant_name: string;
  claimant_email: string;
  claim_type: ClaimType;
  status: ClaimStatus;
  verification_score: number | null;
  claimant_description: string | null;
  admin_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface AdminClaimDetail {
  claim: AdminClaimRow;
  verifications: {
    id: number;
    method: string;
    status: string;
    score: number | null;
    created_at: string;
    completed_at: string | null;
  }[];
}

interface ClaimStats {
  total: number;
  pending: number;
  under_review: number;
  approved: number;
  rejected: number;
  expired: number;
  byType: {
    owner: number;
    manager: number;
    authorized_representative: number;
  };
}

interface ClaimFilters {
  [key: string]: string;
  id: string;
  listing_name: string;
  claimant_name: string;
  status: string;
  claim_type: string;
}

const defaultFilters: ClaimFilters = {
  id: '',
  listing_name: '',
  claimant_name: '',
  status: '',
  claim_type: ''
};

// Claim-specific filter fields
const claimFilterFields: FilterField[] = [
  {
    key: 'id',
    label: 'Claim ID',
    type: 'number',
    placeholder: 'e.g., 123'
  },
  {
    key: 'listing_name',
    label: 'Business Name',
    type: 'text',
    placeholder: 'e.g., Acme Corp'
  },
  {
    key: 'claimant_name',
    label: 'Claimant Name',
    type: 'text',
    placeholder: 'e.g., John Doe'
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'initiated', label: 'Initiated' },
      { value: 'verification_pending', label: 'Pending Verification' },
      { value: 'under_review', label: 'Under Review' },
      { value: 'approved', label: 'Approved' },
      { value: 'rejected', label: 'Rejected' },
      { value: 'expired', label: 'Expired' }
    ]
  },
  {
    key: 'claim_type',
    label: 'Claim Type',
    type: 'select',
    options: [
      { value: 'owner', label: 'Owner' },
      { value: 'manager', label: 'Manager' },
      { value: 'authorized_representative', label: 'Authorized Rep' }
    ]
  }
];

// Status badge colors
const statusColors: Record<string, string> = {
  initiated: 'bg-gray-100 text-gray-800',
  verification_pending: 'bg-blue-100 text-blue-800',
  under_review: 'bg-orange-100 text-orange-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-gray-100 text-gray-600'
};

const statusLabels: Record<string, string> = {
  initiated: 'Initiated',
  verification_pending: 'Pending Verification',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  expired: 'Expired'
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function AdminClaimsPage() {
  const { user } = useAuth();

  // Data state
  const [claims, setClaims] = useState<AdminClaimRow[]>([]);
  const [stats, setStats] = useState<ClaimStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0
  });

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('all');
  const [filters, setFilters] = useState<ClaimFilters>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [matchMode, setMatchMode] = useState<MatchMode>('all');

  // Modal state
  const [showImportExportModal, setShowImportExportModal] = useState(false);

  // Detail panel state
  const [selectedClaim, setSelectedClaim] = useState<AdminClaimDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'rejected'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Fetch claims list
  const fetchClaims = useCallback(async () => {
    if (!user || user.role !== 'admin') return;
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
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== '')
        )
      });

      const response = await fetch(`/api/admin/claims?${params}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setClaims(data.data?.claims || []);
        setPagination(prev => ({
          ...prev,
          total: data.data?.pagination?.total || 0
        }));
      }
    } catch {
      // Error handled via empty state
    } finally {
      setLoading(false);
    }
  }, [user, pagination.page, pagination.pageSize, sortColumn, sortDirection, searchQuery, searchMode, filters, matchMode]);

  // Fetch statistics
  const fetchStats = useCallback(async () => {
    if (!user || user.role !== 'admin') return;
    setStatsLoading(true);
    try {
      const response = await fetch('/api/admin/claims/stats', { credentials: 'include' });
      const result = await response.json();

      if (result.success) {
        setStats(result.data);
      }
    } catch {
      // Error silenced
    } finally {
      setStatsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchClaims();
      fetchStats();
    }
  }, [user, fetchClaims, fetchStats]);

  // Search handler
  const handleSearch = useCallback((query: string, mode: SearchMode) => {
    setSearchQuery(query);
    setSearchMode(mode);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  // Filter handlers
  const handleFiltersChange = useCallback((newFilters: ClaimFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(defaultFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(v => v !== '').length;
  }, [filters]);

  // Pagination handlers
  const handlePageChange = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setPagination(prev => ({ ...prev, pageSize, page: 1 }));
  }, []);

  // Sort handler
  const handleColumnSort = useCallback((columnKey: string) => {
    const columnMapping: Record<string, string> = {
      id: 'id',
      listing_name: 'listing_name',
      claimant_name: 'claimant_name',
      claim_type: 'claim_type',
      verification_score: 'verification_score',
      status: 'status',
      created_at: 'created_at'
    };

    const dbColumn = columnMapping[columnKey];
    if (!dbColumn) return;

    if (sortColumn === dbColumn) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(dbColumn);
      setSortDirection('asc');
    }
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [sortColumn]);

  // Fetch claim detail
  const handleViewClaim = useCallback(async (claim: AdminClaimRow) => {
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/admin/claims/${claim.id}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setSelectedClaim(data.data);
      }
    } catch {
      // Error silenced
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // Open review modal
  const handleOpenReview = useCallback((decision: 'approved' | 'rejected') => {
    setReviewDecision(decision);
    setReviewNotes('');
    setRejectionReason('');
    setReviewError(null);
    setReviewModalOpen(true);
  }, []);

  // Submit review
  const handleSubmitReview = useCallback(async () => {
    if (!selectedClaim) return;
    setReviewSubmitting(true);
    setReviewError(null);
    try {
      const response = await fetchWithCsrf(`/api/admin/claims/${selectedClaim.claim.id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: reviewDecision,
          admin_notes: reviewNotes || undefined,
          rejection_reason: reviewDecision === 'rejected' ? rejectionReason : undefined,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setReviewModalOpen(false);
        setSelectedClaim(null);
        fetchClaims();
        fetchStats();
      } else {
        setReviewError(data.error?.message || 'Failed to submit review');
      }
    } catch {
      setReviewError('Network error. Please try again.');
    } finally {
      setReviewSubmitting(false);
    }
  }, [selectedClaim, reviewDecision, reviewNotes, rejectionReason, fetchClaims, fetchStats]);

  // Bulk action handlers
  const handleBulkApprove = useCallback(async (selectedClaims: AdminClaimRow[]) => {
    const ids = selectedClaims.filter(c => c.status === 'under_review').map(c => c.id);
    if (ids.length === 0) return;

    try {
      await fetchWithCsrf('/api/admin/claims/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', claimIds: ids })
      });
      fetchClaims();
      fetchStats();
    } catch {
      // Error silenced
    }
  }, [fetchClaims, fetchStats]);

  const handleBulkReject = useCallback(async (selectedClaims: AdminClaimRow[]) => {
    const ids = selectedClaims.filter(c => c.status === 'under_review').map(c => c.id);
    if (ids.length === 0) return;

    try {
      await fetchWithCsrf('/api/admin/claims/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', claimIds: ids, rejection_reason: 'bulk_rejection' })
      });
      fetchClaims();
      fetchStats();
    } catch {
      // Error silenced
    }
  }, [fetchClaims, fetchStats]);

  // Build statistics sections
  const statsSections: StatSection[] = useMemo(() => {
    if (!stats) return [];

    return [
      {
        title: 'Totals',
        items: [
          { label: 'Total Claims', value: stats.total, bold: true },
          { label: 'Pending Review', value: stats.under_review },
          { label: 'Approved', value: stats.approved }
        ]
      },
      {
        title: 'By Type',
        items: [
          { label: 'Owner', value: stats.byType.owner },
          { label: 'Manager', value: stats.byType.manager },
          { label: 'Auth Rep', value: stats.byType.authorized_representative }
        ]
      },
      {
        title: 'By Status',
        items: [
          { label: 'Under Review', value: stats.under_review },
          { label: 'Rejected', value: stats.rejected },
          { label: 'Expired', value: stats.expired }
        ]
      }
    ];
  }, [stats]);

  // Column definitions
  const columns: TableColumn<AdminClaimRow>[] = useMemo(() => [
    {
      key: 'id',
      header: 'ID',
      accessor: (row) => row.id,
      sortable: true,
      width: '60px',
    },
    {
      key: 'listing_name',
      header: 'Business',
      accessor: (row) => (
        <div>
          <div className="font-medium text-gray-900">{row.listing_name}</div>
          <div className="text-xs text-gray-500">ID: {row.listing_id}</div>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'claimant_name',
      header: 'Claimant',
      accessor: (row) => (
        <div>
          <div className="font-medium text-gray-900">{row.claimant_name}</div>
          <div className="text-xs text-gray-500">{row.claimant_email}</div>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'claim_type',
      header: 'Type',
      accessor: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
          {row.claim_type === 'owner' ? 'Owner' : row.claim_type === 'manager' ? 'Manager' : 'Auth Rep'}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'verification_score',
      header: 'Score',
      accessor: (row) => {
        if (row.verification_score === null) {
          return <span className="text-gray-400">-</span>;
        }
        const score = row.verification_score;
        const color = score >= 0.8 ? 'text-green-600' : score >= 0.6 ? 'text-yellow-600' : 'text-red-600';
        return <span className={`font-medium ${color}`}>{(score * 100).toFixed(0)}%</span>;
      },
      sortable: true,
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[row.status] || 'bg-gray-100 text-gray-800'}`}>
          {statusLabels[row.status] || row.status}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'created_at',
      header: 'Submitted',
      accessor: (row) => new Date(row.created_at).toLocaleDateString(),
      sortable: true,
    },
  ], []);

  // Table actions (icon-only with canonical colors)
  const actions: TableAction<AdminClaimRow>[] = useMemo(() => [
    {
      label: 'View Details',
      icon: <Eye className="w-4 h-4" />,
      iconOnly: true,
      onClick: handleViewClaim,
      variant: 'primary',
    },
    {
      label: 'Quick Approve',
      icon: <CheckCircle className="w-4 h-4" />,
      iconOnly: true,
      onClick: (claim) => {
        setSelectedClaim({ claim, verifications: [] });
        handleOpenReview('approved');
      },
      isHidden: (row) => row.status !== 'under_review',
      variant: 'primary',
    },
    {
      label: 'Quick Reject',
      icon: <XCircle className="w-4 h-4" />,
      iconOnly: true,
      onClick: (claim) => {
        setSelectedClaim({ claim, verifications: [] });
        handleOpenReview('rejected');
      },
      isHidden: (row) => row.status !== 'under_review',
      variant: 'danger',
    },
  ], [handleViewClaim, handleOpenReview]);

  // Bulk actions
  const bulkActions: BulkAction<AdminClaimRow>[] = useMemo(() => [
    { label: 'Approve Selected', onClick: handleBulkApprove },
    { label: 'Reject Selected', onClick: handleBulkReject },
  ], [handleBulkApprove, handleBulkReject]);

  // Auth checks (after all hooks)
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
      {/* Page Header */}
      <AdminPageHeader
        title="Claims Manager"
        onImportExport={() => setShowImportExportModal(true)}
      />

      {/* Statistics Panel */}
      <AdminStatsPanel
        title="Claims Statistics"
        sections={statsSections}
        loading={statsLoading}
      />

      {/* Search Row */}
      <div className="flex items-center gap-4 mb-4">
        <AdminSearchBar
          placeholder="Search by business name, claimant, or #ID..."
          onSearch={handleSearch}
        />

        <AdminAdvancedFilterPanel
          isOpen={filtersOpen}
          filters={filters}
          onChange={handleFiltersChange}
          onClear={handleClearFilters}
          onToggle={() => setFiltersOpen(prev => !prev)}
          activeFilterCount={activeFilterCount}
          fields={claimFilterFields}
          matchMode={matchMode}
          onMatchModeChange={setMatchMode}
        />
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Pagination Controls */}
        <AdminPaginationControls
          title="Claims"
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          loading={loading}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onRefresh={fetchClaims}
        />

        {/* Data Table */}
        <AdminTableTemplate<AdminClaimRow>
          title=""
          data={claims}
          columns={columns}
          rowKey={(row) => String(row.id)}
          actions={actions}
          bulkActions={bulkActions}
          loading={loading}
          emptyMessage="No claims submitted yet"
          tableId="admin-claims"
          onSort={handleColumnSort}
          sortState={{ column: sortColumn, direction: sortDirection }}
        />
      </div>

      {/* Detail Panel Modal */}
      {selectedClaim && !reviewModalOpen && (
        <BizModal
          isOpen={true}
          onClose={() => setSelectedClaim(null)}
          title={`Claim #${selectedClaim.claim.id}`}
          maxWidth="2xl"
        >
          {detailLoading ? (
            <div className="py-8 text-center text-gray-500">Loading claim details...</div>
          ) : (
            <div className="space-y-6">
              {/* Claim Info */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Business:</span>{' '}
                    <span className="font-medium">{selectedClaim.claim.listing_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Claimant:</span>{' '}
                    <span className="font-medium">{selectedClaim.claim.claimant_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>{' '}
                    <span className="font-medium">{selectedClaim.claim.claimant_email}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Type:</span>{' '}
                    <span className="font-medium">{selectedClaim.claim.claim_type}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Score:</span>{' '}
                    <span className="font-medium">
                      {selectedClaim.claim.verification_score !== null
                        ? `${(selectedClaim.claim.verification_score * 100).toFixed(0)}%`
                        : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Submitted:</span>{' '}
                    <span className="font-medium">
                      {new Date(selectedClaim.claim.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {selectedClaim.claim.claimant_description && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600 font-medium mb-1">Description:</p>
                    <p className="text-sm text-gray-900">{selectedClaim.claim.claimant_description}</p>
                  </div>
                )}
              </div>

              {/* Verifications */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Verification Evidence</h3>
                {selectedClaim.verifications.length === 0 ? (
                  <p className="text-sm text-gray-500">No verifications submitted</p>
                ) : (
                  <div className="space-y-2">
                    {selectedClaim.verifications.map((v) => (
                      <div key={v.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div className="flex items-center space-x-3">
                          <Shield className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium capitalize">{v.method}</span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              v.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {v.status}
                          </span>
                        </div>
                        {v.score !== null && (
                          <span className="text-sm font-medium text-gray-700">
                            Score: {(v.score * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recommendation */}
              <div
                className={`p-4 rounded-lg ${
                  (selectedClaim.claim.verification_score || 0) >= 0.7
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-orange-50 border border-orange-200'
                }`}
              >
                <p className="text-sm font-medium mb-1">
                  {(selectedClaim.claim.verification_score || 0) >= 0.7 ? (
                    <>
                      <CheckCircle className="w-4 h-4 inline mr-1 text-green-600" />
                      Recommendation: Approve
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 inline mr-1 text-orange-600" />
                      Recommendation: Manual Review Required
                    </>
                  )}
                </p>
                <p className="text-xs text-gray-600">
                  {(selectedClaim.claim.verification_score || 0) >= 0.7
                    ? 'Verification score meets threshold for automatic approval.'
                    : 'Verification score is below automatic approval threshold. Review evidence carefully.'}
                </p>
              </div>

              {/* Action Buttons */}
              {selectedClaim.claim.status === 'under_review' && (
                <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => handleOpenReview('rejected')}
                    className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200"
                  >
                    <XCircle className="w-4 h-4 inline mr-1" />
                    Reject
                  </button>
                  <button
                    onClick={() => handleOpenReview('approved')}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 inline mr-1" />
                    Approve
                  </button>
                </div>
              )}
            </div>
          )}
        </BizModal>
      )}

      {/* Review Modal */}
      <BizModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title={reviewDecision === 'approved' ? 'Approve Claim' : 'Reject Claim'}
        maxWidth="md"
        footer={
          <>
            <BizModalButton variant="secondary" onClick={() => setReviewModalOpen(false)} disabled={reviewSubmitting}>
              Cancel
            </BizModalButton>
            <BizModalButton
              variant={reviewDecision === 'approved' ? 'primary' : 'danger'}
              onClick={handleSubmitReview}
              disabled={reviewSubmitting || (reviewDecision === 'rejected' && !rejectionReason.trim())}
            >
              {reviewSubmitting ? 'Submitting...' : reviewDecision === 'approved' ? 'Approve' : 'Reject'}
            </BizModalButton>
          </>
        }
      >
        <div className="space-y-4">
          {reviewError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">{reviewError}</div>
          )}

          {reviewDecision === 'approved' ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded">
              <p className="text-sm font-medium text-green-900 mb-2">This will:</p>
              <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
                <li>Mark the listing as claimed and assign to the claimant</li>
                <li>Set listing tier to Essentials and status to Active</li>
                <li>Promote user to Listing Member role (if currently General)</li>
                <li>Send approval confirmation email to claimant</li>
              </ul>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                disabled={reviewSubmitting}
              >
                <option value="">Select reason...</option>
                <option value="insufficient_verification">Insufficient Verification</option>
                <option value="fraudulent_claim">Fraudulent Claim</option>
                <option value="duplicate_claim">Duplicate Claim</option>
                <option value="business_not_eligible">Business Not Eligible</option>
                <option value="other">Other</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin Notes <span className="text-gray-500">(optional)</span>
            </label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add internal notes about this decision..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              disabled={reviewSubmitting}
            />
          </div>
        </div>
      </BizModal>
    </div>
  );
}
