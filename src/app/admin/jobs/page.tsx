/**
 * Admin Job Manager Page
 *
 * GOVERNANCE COMPLIANCE:
 * - Authority: docs/components/admin/ADMIN_TABLE_CANONICAL_STANDARD.md
 * - Template: AdminTableTemplate (MANDATORY)
 * - Authentication: Admin-only access required
 * - Service Boundary: JobService via API routes
 * - Credentials: 'include' for all fetch requests
 * - Complexity: STANDARD tier
 *
 * Canonical Features:
 * - Page header with "+ New" and "Import/Export" buttons
 * - Statistics panel with job metrics
 * - Search bar with mode detection
 * - Advanced filters panel
 * - Pagination controls in table header
 * - Bulk actions for batch operations
 * - Password modal for destructive operations
 * - Icon-only action buttons with canonical colors
 * - Server-side sorting
 *
 * @authority docs/components/admin/ADMIN_TABLE_CANONICAL_STANDARD.md
 * @phase Jobs Phase 1 - Core Job CRUD & Display
 * @component
 * @returns {JSX.Element} Admin jobs manager
 */

'use client';

// Force dynamic rendering (required for useAuth() - React Context cannot be used in SSG)
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Eye, Edit2, CheckCircle, XCircle, PauseCircle, Trash2, Star, Clock } from 'lucide-react';
import { AdminTableTemplate, TableColumn, TableAction, BulkAction } from '@/components/admin/templates/AdminTableTemplate';
import {
  AdminPageHeader,
  AdminStatsPanel,
  AdminSearchBar,
  AdminAdvancedFilterPanel,
  AdminPaginationControls,
  AdminPasswordModal,
  commonFilterFields,
  type StatSection,
  type FilterField,
  type MatchMode,
  type SearchMode
} from '@/components/admin/shared';
import { useAuth } from '@core/hooks/useAuth';
import { JobFormModal } from '@features/dashboard/components/managers/jobs/JobFormModal';
import { fetchWithCsrf } from '@core/utils/csrf';

interface Job {
  id: number;
  title: string;
  slug?: string;
  listing_id: number;
  listing_name?: string;
  employment_type: string;
  compensation_type: string;
  work_location_type: string;
  status: string;
  is_featured: boolean;
  agency_posting_for_business_id?: number | null;
  agency_business_name?: string;
  view_count: number;
  application_count: number;
  created_at: string;
  expires_at?: string;
}

interface JobStats {
  total: number;
  active: number;
  draft: number;
  paused: number;
  filled: number;
  expired: number;
  featured: number;
  byEmploymentType: {
    full_time: number;
    part_time: number;
    contract: number;
    temporary: number;
    internship: number;
  };
  byWorkLocation: {
    on_site: number;
    remote: number;
    hybrid: number;
  };
}

interface JobFilters {
  [key: string]: string;
  id: string;
  title: string;
  status: string;
  employment_type: string;
  work_location_type: string;
  is_featured: string;
  is_agency: string;
}

const defaultFilters: JobFilters = {
  id: '',
  title: '',
  status: '',
  employment_type: '',
  work_location_type: '',
  is_featured: '',
  is_agency: ''
};

// Job-specific filter fields
const jobFilterFields: FilterField[] = [
  commonFilterFields.id,
  {
    key: 'title',
    label: 'Job Title',
    type: 'text',
    placeholder: 'e.g., Software Engineer'
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'draft', label: 'Draft' },
      { value: 'paused', label: 'Paused' },
      { value: 'filled', label: 'Filled' },
      { value: 'expired', label: 'Expired' },
      { value: 'pending_moderation', label: 'Pending Moderation' }
    ]
  },
  {
    key: 'employment_type',
    label: 'Employment Type',
    type: 'select',
    options: [
      { value: 'full_time', label: 'Full Time' },
      { value: 'part_time', label: 'Part Time' },
      { value: 'contract', label: 'Contract' },
      { value: 'temporary', label: 'Temporary' },
      { value: 'internship', label: 'Internship' }
    ]
  },
  {
    key: 'work_location_type',
    label: 'Work Location',
    type: 'select',
    options: [
      { value: 'on_site', label: 'On-Site' },
      { value: 'remote', label: 'Remote' },
      { value: 'hybrid', label: 'Hybrid' }
    ]
  },
  {
    key: 'is_featured',
    label: 'Featured',
    type: 'select',
    options: [
      { value: 'true', label: 'Featured Only' },
      { value: 'false', label: 'Not Featured' }
    ]
  },
  {
    key: 'is_agency',
    label: 'Agency Postings',
    type: 'select',
    options: [
      { value: 'true', label: 'Agency Only' },
      { value: 'false', label: 'Non-Agency Only' }
    ]
  }
];

// Status badge colors
const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  draft: 'bg-gray-100 text-gray-800',
  paused: 'bg-yellow-100 text-yellow-800',
  filled: 'bg-blue-100 text-blue-800',
  expired: 'bg-red-100 text-red-800',
  pending_moderation: 'bg-orange-100 text-orange-800'
};

// Employment type badge colors
const employmentTypeColors: Record<string, string> = {
  full_time: 'bg-blue-100 text-blue-800',
  part_time: 'bg-purple-100 text-purple-800',
  contract: 'bg-amber-100 text-amber-800',
  temporary: 'bg-pink-100 text-pink-800',
  internship: 'bg-cyan-100 text-cyan-800'
};

// Work location badge colors
const workLocationColors: Record<string, string> = {
  on_site: 'bg-green-100 text-green-800',
  remote: 'bg-indigo-100 text-indigo-800',
  hybrid: 'bg-teal-100 text-teal-800'
};

export default function AdminJobsPage() {
  const { user } = useAuth();

  // Data state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<JobStats | null>(null);
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
  const [filters, setFilters] = useState<JobFilters>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [matchMode, setMatchMode] = useState<MatchMode>('all');

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportExportModal, setShowImportExportModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingBulkAction, setPendingBulkAction] = useState<{ type: string; jobs: Job[] } | null>(null);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editJobFullData, setEditJobFullData] = useState<Record<string, unknown> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch jobs
  const fetchJobs = useCallback(async () => {
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

      const response = await fetch(`/api/admin/jobs?${params}`, { credentials: 'include' });
      const result = await response.json();

      if (result.success) {
        setJobs(result.data?.jobs || []);
        setPagination(prev => ({
          ...prev,
          total: result.data?.pagination?.total || 0
        }));
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, sortColumn, sortDirection, searchQuery, searchMode, filters, matchMode]);

  // Fetch statistics
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const response = await fetch('/api/admin/jobs/stats', { credentials: 'include' });
      const result = await response.json();

      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch job stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (user?.role === 'admin') {
      fetchJobs();
      fetchStats();
    }
  }, [user, fetchJobs, fetchStats]);

  // Search handler
  const handleSearch = useCallback((query: string, mode: SearchMode) => {
    setSearchQuery(query);
    setSearchMode(mode);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  // Filter handlers
  const handleFiltersChange = useCallback((newFilters: JobFilters) => {
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
      title: 'title',
      employment_type: 'employment_type',
      work_location_type: 'work_location_type',
      status: 'status',
      view_count: 'view_count',
      application_count: 'application_count',
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

  // Action handlers
  const handleFeatureToggle = useCallback(async (job: Job) => {
    try {
      await fetch(`/api/admin/jobs/${job.id}/feature`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_featured: !job.is_featured })
      });
      fetchJobs();
      fetchStats();
    } catch (error) {
      console.error('Failed to toggle feature:', error);
    }
  }, [fetchJobs, fetchStats]);

  const handleStatusChange = useCallback(async (job: Job, newStatus: string) => {
    try {
      await fetch(`/api/admin/jobs/${job.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });
      fetchJobs();
      fetchStats();
    } catch (error) {
      console.error('Failed to change status:', error);
    }
  }, [fetchJobs, fetchStats]);

  // Bulk action handlers
  const handleBulkApprove = useCallback((selectedJobs: Job[]) => {
    // Approve doesn't need password
    executeBulkAction('approve', selectedJobs);
  }, []);

  const handleBulkSuspend = useCallback((selectedJobs: Job[]) => {
    setPendingBulkAction({ type: 'suspend', jobs: selectedJobs });
    setShowPasswordModal(true);
  }, []);

  const handleBulkDelete = useCallback((selectedJobs: Job[]) => {
    setPendingBulkAction({ type: 'delete', jobs: selectedJobs });
    setShowPasswordModal(true);
  }, []);

  const handlePasswordVerified = useCallback(async () => {
    if (!pendingBulkAction) return;

    setShowPasswordModal(false);
    await executeBulkAction(pendingBulkAction.type, pendingBulkAction.jobs);
    setPendingBulkAction(null);
  }, [pendingBulkAction]);

  const executeBulkAction = async (type: string, selectedJobs: Job[]) => {
    try {
      const jobIds = selectedJobs.map(j => j.id);
      await fetch(`/api/admin/jobs/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: type, jobIds })
      });
      fetchJobs();
      fetchStats();
    } catch (error) {
      console.error(`Failed to ${type} jobs:`, error);
    }
  };

  // Edit handler - fetches full job data before opening modal
  const handleEditClick = useCallback(async (job: Job) => {
    try {
      const response = await fetch(`/api/jobs/${job.id}`, { credentials: 'include' });
      const result = await response.json();
      if (!result.success || !result.data?.job) return;
      const j = result.data.job;
      setEditingJob(job);
      setEditJobFullData({
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
        status: j.status
      });
    } catch (error) {
      console.error('Failed to fetch job for editing:', error);
    }
  }, []);

  // Create handler
  const handleCreate = useCallback(async (data: Record<string, unknown>) => {
    setIsSubmitting(true);
    const apiData = { ...data };
    delete apiData._pendingMedia;
    const listingId = typeof apiData.listing_id === 'number' ? apiData.listing_id : 0;
    try {
      const response = await fetchWithCsrf(`/api/listings/${listingId}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData)
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to create job');
      }
      await fetchJobs();
      fetchStats();
      setShowCreateModal(false);
    } catch (err) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [fetchJobs, fetchStats]);

  // Update handler
  const handleUpdate = useCallback(async (data: Record<string, unknown>) => {
    if (!editingJob) return;
    setIsSubmitting(true);
    try {
      const response = await fetchWithCsrf(`/api/jobs/${editingJob.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to update job');
      }
      await fetchJobs();
      fetchStats();
      setEditingJob(null);
      setEditJobFullData(null);
    } catch (err) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [editingJob, fetchJobs, fetchStats]);

  // Build statistics sections
  const statsSections: StatSection[] = useMemo(() => {
    if (!stats) return [];

    return [
      {
        title: 'Totals',
        items: [
          { label: 'Total Jobs', value: stats.total, bold: true },
          { label: 'Active', value: stats.active },
          { label: 'Featured', value: stats.featured }
        ]
      },
      {
        title: 'By Employment Type',
        items: [
          { label: 'Full Time', value: stats.byEmploymentType.full_time },
          { label: 'Part Time', value: stats.byEmploymentType.part_time },
          { label: 'Contract', value: stats.byEmploymentType.contract }
        ]
      },
      {
        title: 'By Status',
        items: [
          { label: 'Active', value: stats.active },
          { label: 'Draft', value: stats.draft },
          { label: 'Paused', value: stats.paused },
          { label: 'Filled', value: stats.filled }
        ]
      }
    ];
  }, [stats]);

  // Build columns
  const columns: TableColumn<Job>[] = useMemo(() => [
    { key: 'id', header: 'ID', accessor: (row: Job) => row.id, sortable: true },
    { key: 'title', header: 'Job Title', accessor: (row: Job) => row.title, sortable: true },
    {
      key: 'listing_name',
      header: 'Business',
      accessor: (row: Job) => row.listing_name || '-'
    },
    {
      key: 'agency',
      header: 'Agency',
      accessor: (row: Job) => row.agency_posting_for_business_id ? (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-orange-100 text-orange-800">
          Agency
        </span>
      ) : (
        <span className="text-gray-400">-</span>
      )
    },
    {
      key: 'employment_type',
      header: 'Type',
      accessor: (row: Job) => (
        <span className={`px-2 py-1 rounded text-xs ${employmentTypeColors[row.employment_type] || 'bg-gray-100 text-gray-800'}`}>
          {row.employment_type.replace(/_/g, ' ')}
        </span>
      ),
      sortable: true
    },
    {
      key: 'work_location_type',
      header: 'Location',
      accessor: (row: Job) => (
        <span className={`px-2 py-1 rounded text-xs ${workLocationColors[row.work_location_type] || 'bg-gray-100 text-gray-800'}`}>
          {row.work_location_type.replace(/_/g, ' ')}
        </span>
      ),
      sortable: true
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (j: Job) => (
        <span className={`px-2 py-1 rounded text-xs ${statusColors[j.status] || 'bg-gray-100 text-gray-800'}`}>
          {j.status.replace(/_/g, ' ')}
        </span>
      )
    },
    {
      key: 'is_featured',
      header: 'Featured',
      accessor: (j: Job) => j.is_featured ? (
        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
      ) : (
        <span className="text-gray-400">-</span>
      )
    },
    {
      key: 'view_count',
      header: 'Views',
      accessor: (row: Job) => row.view_count.toLocaleString(),
      sortable: true
    },
    {
      key: 'application_count',
      header: 'Applications',
      accessor: (row: Job) => row.application_count.toLocaleString(),
      sortable: true
    },
    {
      key: 'created_at',
      header: 'Posted',
      accessor: (j: Job) => new Date(j.created_at).toLocaleDateString()
    }
  ], []);

  // Build actions (icon-only with canonical colors)
  const actions: TableAction<Job>[] = useMemo(() => [
    {
      label: 'View',
      icon: <Eye className="w-4 h-4" />,
      iconOnly: true,
      onClick: (job: Job) => window.open(`/jobs/${job.slug || job.id}`, '_blank'),
      variant: 'primary'
    },
    {
      label: 'Edit',
      icon: <Edit2 className="w-4 h-4" />,
      iconOnly: true,
      onClick: (job: Job) => handleEditClick(job),
      variant: 'primary'
    },
    {
      label: 'Activity',
      icon: <Clock className="w-4 h-4" />,
      iconOnly: true,
      onClick: (job: Job) => window.open(`/admin/jobs/${job.id}/activity`, '_blank'),
      variant: 'primary'
    },
    {
      label: 'Toggle Featured',
      icon: <Star className="w-4 h-4" />,
      iconOnly: true,
      onClick: handleFeatureToggle,
      variant: 'primary'
    },
    {
      label: 'Approve',
      icon: <CheckCircle className="w-4 h-4" />,
      iconOnly: true,
      onClick: (job: Job) => handleStatusChange(job, 'active'),
      isHidden: (job: Job) => job.status !== 'pending_moderation',
      variant: 'primary'
    },
    {
      label: 'Reject',
      icon: <XCircle className="w-4 h-4" />,
      iconOnly: true,
      onClick: (job: Job) => handleStatusChange(job, 'rejected'),
      isHidden: (job: Job) => job.status !== 'pending_moderation',
      variant: 'danger'
    },
    {
      label: 'Suspend',
      icon: <PauseCircle className="w-4 h-4" />,
      iconOnly: true,
      onClick: (job: Job) => handleStatusChange(job, 'paused'),
      isHidden: (job: Job) => job.status === 'paused' || job.status === 'expired',
      variant: 'warning'
    },
    {
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      iconOnly: true,
      onClick: (job: Job) => {
        setPendingBulkAction({ type: 'delete', jobs: [job] });
        setShowPasswordModal(true);
      },
      variant: 'danger'
    }
  ], [handleFeatureToggle, handleStatusChange, handleEditClick]);

  // Build bulk actions
  const bulkActions: BulkAction<Job>[] = useMemo(() => [
    { label: 'Approve Selected', onClick: handleBulkApprove },
    { label: 'Suspend Selected', onClick: handleBulkSuspend },
    { label: 'Delete Selected', onClick: handleBulkDelete }
  ], [handleBulkApprove, handleBulkSuspend, handleBulkDelete]);

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
        title="Jobs Manager"
        onCreateNew={() => setShowCreateModal(true)}
        onImportExport={() => setShowImportExportModal(true)}
      />

      {/* Statistics Panel */}
      <AdminStatsPanel
        title="Job Statistics"
        sections={statsSections}
        loading={statsLoading}
      />

      {/* Search Row */}
      <div className="flex items-center gap-4 mb-4">
        <AdminSearchBar
          placeholder="Search by title, #ID, or business name..."
          onSearch={handleSearch}
        />

        <AdminAdvancedFilterPanel
          isOpen={filtersOpen}
          filters={filters}
          onChange={handleFiltersChange}
          onClear={handleClearFilters}
          onToggle={() => setFiltersOpen(prev => !prev)}
          activeFilterCount={activeFilterCount}
          fields={jobFilterFields}
          matchMode={matchMode}
          onMatchModeChange={setMatchMode}
        />
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Pagination Controls */}
        <AdminPaginationControls
          title="Jobs"
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          loading={loading}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onRefresh={fetchJobs}
        />

        {/* Data Table */}
        <AdminTableTemplate<Job>
          title=""
          data={jobs}
          columns={columns}
          rowKey={(row) => row.id}
          loading={loading}
          actions={actions}
          bulkActions={bulkActions}
          tableId="admin-jobs"
          defaultHiddenColumns={['listing_name']}
          onSort={handleColumnSort}
          sortState={{ column: sortColumn, direction: sortDirection }}
        />
      </div>

      {/* Create Job Modal */}
      <JobFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
        listingTier="premium"
      />

      {/* Edit Job Modal */}
      {editingJob && editJobFullData && (
        <JobFormModal
          isOpen={true}
          onClose={() => { setEditingJob(null); setEditJobFullData(null); }}
          onSubmit={handleUpdate}
          isSubmitting={isSubmitting}
          listingTier="premium"
          listingId={editingJob.listing_id}
          jobId={editingJob.id}
          initialData={editJobFullData}
        />
      )}

      {/* Password Modal for Destructive Operations */}
      <AdminPasswordModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setPendingBulkAction(null);
        }}
        onVerified={handlePasswordVerified}
        operationDescription={
          pendingBulkAction?.type === 'delete'
            ? `delete ${pendingBulkAction.jobs.length} job(s)`
            : pendingBulkAction?.type === 'suspend'
            ? `suspend ${pendingBulkAction.jobs.length} job(s)`
            : `perform action on ${pendingBulkAction?.jobs.length || 0} job(s)`
        }
      />
    </div>
  );
}
