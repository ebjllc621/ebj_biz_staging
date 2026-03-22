/**
 * Admin Listing Templates Manager
 *
 * GOVERNANCE COMPLIANCE:
 * - Authority: docs/components/admin/ADMIN_TABLE_CANONICAL_STANDARD.md
 * - Template: AdminTableTemplate (MANDATORY)
 * - Authentication: Admin-only access required
 * - Service Boundary: ListingTemplateService via API routes
 * - Credentials: 'include' for all fetch requests
 * - fetchWithCsrf for POST/PATCH/DELETE
 * - BizModal for create/edit/delete modals (MANDATORY)
 * - Complexity: STANDARD tier
 *
 * @authority Phase 4C Brain Plan - 4.10 ListingTemplateAdmin
 * @component
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Edit2, Trash2, Plus } from 'lucide-react';
import { AdminTableTemplate, TableColumn, TableAction, BulkAction } from '@/components/admin/templates/AdminTableTemplate';
import {
  AdminPageHeader,
  AdminStatsPanel,
  AdminSearchBar,
  AdminAdvancedFilterPanel,
  AdminPaginationControls,
  type StatSection,
  type FilterField,
  type MatchMode,
  type SearchMode,
} from '@/components/admin/shared';
import BizModal, { BizModalButton } from '@/components/BizModal';
import { useAuth } from '@core/hooks/useAuth';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { ListingTemplate } from '@core/services/ListingTemplateService';

// ============================================================================
// Types
// ============================================================================

interface TemplateFilters {
  [key: string]: string;
  industry: string;
  is_system: string;
  is_active: string;
}

const defaultFilters: TemplateFilters = {
  industry: '',
  is_system: '',
  is_active: '',
};

const templateFilterFields: FilterField[] = [
  {
    key: 'industry',
    label: 'Industry',
    type: 'select',
    options: [
      { value: 'restaurant', label: 'Restaurant' },
      { value: 'retail', label: 'Retail' },
      { value: 'professional_services', label: 'Professional Services' },
      { value: 'home_services', label: 'Home Services' },
      { value: 'healthcare', label: 'Healthcare' },
      { value: 'automotive', label: 'Automotive' },
      { value: 'beauty_salon', label: 'Beauty & Salon' },
      { value: 'fitness', label: 'Fitness' },
      { value: 'real_estate', label: 'Real Estate' },
      { value: 'technology', label: 'Technology' },
      { value: 'education', label: 'Education' },
      { value: 'entertainment', label: 'Entertainment' },
      { value: 'custom', label: 'Custom' },
    ],
  },
  {
    key: 'is_system',
    label: 'Type',
    type: 'select',
    options: [
      { value: 'true', label: 'System Templates' },
      { value: 'false', label: 'Custom Templates' },
    ],
  },
  {
    key: 'is_active',
    label: 'Active',
    type: 'select',
    options: [
      { value: 'true', label: 'Active Only' },
      { value: 'false', label: 'Inactive Only' },
    ],
  },
];

const INDUSTRY_LABELS: Record<string, string> = {
  restaurant: 'Restaurant',
  retail: 'Retail',
  professional_services: 'Professional Services',
  home_services: 'Home Services',
  healthcare: 'Healthcare',
  automotive: 'Automotive',
  beauty_salon: 'Beauty & Salon',
  fitness: 'Fitness',
  real_estate: 'Real Estate',
  technology: 'Technology',
  education: 'Education',
  entertainment: 'Entertainment',
  custom: 'Custom',
};

// ============================================================================
// Template form (create/edit)
// ============================================================================

interface TemplateFormState {
  name: string;
  industry: string;
  description: string;
  default_type: string;
  default_tier: string;
  icon: string;
  is_system: boolean;
  is_active: boolean;
}

const emptyForm: TemplateFormState = {
  name: '',
  industry: 'custom',
  description: '',
  default_type: '',
  default_tier: '',
  icon: '',
  is_system: true,
  is_active: true,
};

function templateToForm(t: ListingTemplate): TemplateFormState {
  return {
    name: t.name,
    industry: t.industry,
    description: t.description ?? '',
    default_type: t.default_type ?? '',
    default_tier: t.default_tier ?? '',
    icon: t.icon ?? '',
    is_system: t.is_system,
    is_active: t.is_active,
  };
}

// ============================================================================
// Component
// ============================================================================

export default function AdminListingTemplatesPage() {
  const { user } = useAuth();

  const [templates, setTemplates] = useState<ListingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortColumn, setSortColumn] = useState<string>('usage_count');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('all');
  const [filters, setFilters] = useState<TemplateFilters>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [matchMode, setMatchMode] = useState<MatchMode>('all');

  // Stats
  const [totalCount, setTotalCount] = useState(0);
  const [systemCount, setSystemCount] = useState(0);
  const [customCount, setCustomCount] = useState(0);
  const [totalUsage, setTotalUsage] = useState(0);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<TemplateFormState>(emptyForm);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit modal
  const [editTarget, setEditTarget] = useState<ListingTemplate | null>(null);
  const [editForm, setEditForm] = useState<TemplateFormState>(emptyForm);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<ListingTemplate | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // ============================================================================
  // Data fetching
  // ============================================================================

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        pageSize: String(pagination.pageSize),
      });
      if (filters.industry) params.set('industry', filters.industry);
      if (filters.is_system) params.set('is_system', filters.is_system);
      if (filters.is_active) params.set('is_active', filters.is_active);

      const res = await fetch(`/api/admin/listing-templates?${params}`, { credentials: 'include' });
      const result = await res.json();

      if (result.success) {
        const items: ListingTemplate[] = result.data?.templates ?? [];
        setTemplates(items);
        setPagination(prev => ({ ...prev, total: result.data?.pagination?.total ?? 0 }));

        // Derive stats from results
        const sys = items.filter(t => t.is_system).length;
        const cus = items.filter(t => !t.is_system).length;
        const usage = items.reduce((sum, t) => sum + t.usage_count, 0);
        setTotalCount(result.data?.pagination?.total ?? items.length);
        setSystemCount(sys);
        setCustomCount(cus);
        setTotalUsage(usage);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, filters]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchTemplates();
    }
  }, [user, fetchTemplates]);

  // ============================================================================
  // Create
  // ============================================================================

  const handleCreate = useCallback(async () => {
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      const res = await fetchWithCsrf('/api/admin/listing-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name,
          industry: createForm.industry,
          description: createForm.description || null,
          default_type: createForm.default_type || null,
          default_tier: createForm.default_tier || null,
          icon: createForm.icon || null,
          is_system: createForm.is_system,
          is_active: createForm.is_active,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setShowCreateModal(false);
        setCreateForm(emptyForm);
        fetchTemplates();
      } else {
        setCreateError(result.message ?? 'Failed to create template');
      }
    } catch {
      setCreateError('An error occurred. Please try again.');
    } finally {
      setCreateSubmitting(false);
    }
  }, [createForm, fetchTemplates]);

  // ============================================================================
  // Edit
  // ============================================================================

  const openEdit = useCallback((template: ListingTemplate) => {
    setEditTarget(template);
    setEditForm(templateToForm(template));
    setEditError(null);
  }, []);

  const handleEdit = useCallback(async () => {
    if (!editTarget) return;
    setEditSubmitting(true);
    setEditError(null);
    try {
      const res = await fetchWithCsrf(`/api/admin/listing-templates/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          industry: editForm.industry,
          description: editForm.description || null,
          default_type: editForm.default_type || null,
          default_tier: editForm.default_tier || null,
          icon: editForm.icon || null,
          is_system: editForm.is_system,
          is_active: editForm.is_active,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setEditTarget(null);
        fetchTemplates();
      } else {
        setEditError(result.message ?? 'Failed to update template');
      }
    } catch {
      setEditError('An error occurred. Please try again.');
    } finally {
      setEditSubmitting(false);
    }
  }, [editTarget, editForm, fetchTemplates]);

  // ============================================================================
  // Delete
  // ============================================================================

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      await fetchWithCsrf(`/api/admin/listing-templates/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      setDeleteTarget(null);
      fetchTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
    } finally {
      setDeleteSubmitting(false);
    }
  }, [deleteTarget, fetchTemplates]);

  // ============================================================================
  // Sort / filter handlers
  // ============================================================================

  const handleColumnSort = useCallback((columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [sortColumn]);

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(v => v !== '').length,
    [filters]
  );

  // ============================================================================
  // Stats sections
  // ============================================================================

  const statsSections: StatSection[] = useMemo(() => [
    {
      title: 'Templates',
      items: [
        { label: 'Total Templates', value: totalCount, bold: true },
        { label: 'System', value: systemCount },
        { label: 'Custom', value: customCount },
        { label: 'Total Usage', value: totalUsage },
      ],
    },
  ], [totalCount, systemCount, customCount, totalUsage]);

  // ============================================================================
  // Table columns
  // ============================================================================

  const columns: TableColumn<ListingTemplate>[] = useMemo(() => [
    {
      key: 'id',
      header: 'ID',
      accessor: (row) => row.id,
      sortable: true,
    },
    {
      key: 'name',
      header: 'Name',
      accessor: (row) => <span className="font-medium text-gray-900">{row.name}</span>,
      sortable: true,
    },
    {
      key: 'industry',
      header: 'Industry',
      accessor: (row) => (
        <span className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded-full">
          {INDUSTRY_LABELS[row.industry] ?? row.industry}
        </span>
      ),
    },
    {
      key: 'is_system',
      header: 'Type',
      accessor: (row) => (
        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${row.is_system ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
          {row.is_system ? 'System' : 'Custom'}
        </span>
      ),
    },
    {
      key: 'usage_count',
      header: 'Usage',
      accessor: (row) => <span className="text-sm text-gray-700">{row.usage_count}</span>,
      sortable: true,
    },
    {
      key: 'is_active',
      header: 'Active',
      accessor: (row) => (
        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${row.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      accessor: (row) => (
        <span className="text-sm text-gray-500">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
      sortable: true,
    },
  ], []);

  // ============================================================================
  // Table actions
  // ============================================================================

  const actions: TableAction<ListingTemplate>[] = useMemo(() => [
    {
      label: 'Edit',
      icon: <Edit2 className="w-4 h-4" />,
      iconOnly: true,
      onClick: openEdit,
      variant: 'primary',
    },
    {
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      iconOnly: true,
      onClick: (row) => setDeleteTarget(row),
      variant: 'danger',
    },
  ], [openEdit]);

  const bulkActions: BulkAction<ListingTemplate>[] = useMemo(() => [], []);

  // ============================================================================
  // Form field component
  // ============================================================================

  function renderFormFields(
    form: TemplateFormState,
    setForm: (f: TemplateFormState) => void
  ) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="e.g., Restaurant Starter"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
          <select
            value={form.industry}
            onChange={(e) => setForm({ ...form, industry: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {Object.entries(INDUSTRY_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Brief description shown in template selector"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Type</label>
            <input
              type="text"
              value={form.default_type}
              onChange={(e) => setForm({ ...form, default_type: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="e.g., restaurant"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Tier</label>
            <select
              value={form.default_tier}
              onChange={(e) => setForm({ ...form, default_tier: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">None</option>
              <option value="essentials">Essentials</option>
              <option value="plus">Plus</option>
              <option value="preferred">Preferred</option>
              <option value="premium">Premium</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Icon (Lucide name)</label>
          <input
            type="text"
            value={form.icon}
            onChange={(e) => setForm({ ...form, icon: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="e.g., store, shopping-bag"
          />
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_system}
              onChange={(e) => setForm({ ...form, is_system: e.target.checked })}
              className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
            />
            System Template (visible to all users)
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
            />
            Active
          </label>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Guard
  // ============================================================================

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
        <div className="text-red-600 font-medium">Access Denied</div>
      </div>
    );
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="p-6">
      <AdminPageHeader
        title="Listing Templates"
        onCreateNew={() => { setCreateForm(emptyForm); setCreateError(null); setShowCreateModal(true); }}
        onImportExport={() => {}}
      />

      <AdminStatsPanel
        title="Template Statistics"
        sections={statsSections}
        loading={loading}
      />

      <div className="flex items-center gap-4 mb-4">
        <AdminSearchBar
          placeholder="Search templates..."
          onSearch={(query, mode) => {
            setSearchQuery(query);
            setSearchMode(mode);
            setPagination(prev => ({ ...prev, page: 1 }));
          }}
        />
        <AdminAdvancedFilterPanel
          isOpen={filtersOpen}
          filters={filters}
          onChange={(f) => { setFilters(f); setPagination(prev => ({ ...prev, page: 1 })); }}
          onClear={() => { setFilters(defaultFilters); setPagination(prev => ({ ...prev, page: 1 })); }}
          onToggle={() => setFiltersOpen(p => !p)}
          activeFilterCount={activeFilterCount}
          fields={templateFilterFields}
          matchMode={matchMode}
          onMatchModeChange={setMatchMode}
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <AdminPaginationControls
          title="Templates"
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          loading={loading}
          onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))}
          onPageSizeChange={(s) => setPagination(prev => ({ ...prev, pageSize: s, page: 1 }))}
          onRefresh={fetchTemplates}
        />
        <AdminTableTemplate<ListingTemplate>
          title=""
          data={templates}
          columns={columns}
          rowKey={(row) => row.id}
          loading={loading}
          actions={actions}
          bulkActions={bulkActions}
          tableId="admin-listing-templates"
          onSort={handleColumnSort}
          sortState={{ column: sortColumn, direction: sortDirection }}
        />
      </div>

      {/* Create Template Modal */}
      <BizModal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setCreateError(null); }}
        title="New Listing Template"
        maxWidth="lg"
        footer={
          <div className="flex flex-col gap-2">
            {createError && (
              <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                {createError}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <BizModalButton
                variant="secondary"
                onClick={() => { setShowCreateModal(false); setCreateError(null); }}
                disabled={createSubmitting}
              >
                Cancel
              </BizModalButton>
              <BizModalButton
                variant="primary"
                onClick={handleCreate}
                disabled={!createForm.name || createSubmitting}
              >
                {createSubmitting ? 'Creating...' : 'Create Template'}
              </BizModalButton>
            </div>
          </div>
        }
      >
        {renderFormFields(createForm, setCreateForm)}
      </BizModal>

      {/* Edit Template Modal */}
      <BizModal
        isOpen={editTarget !== null}
        onClose={() => { setEditTarget(null); setEditError(null); }}
        title="Edit Listing Template"
        maxWidth="lg"
        footer={
          <div className="flex flex-col gap-2">
            {editError && (
              <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                {editError}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <BizModalButton
                variant="secondary"
                onClick={() => { setEditTarget(null); setEditError(null); }}
                disabled={editSubmitting}
              >
                Cancel
              </BizModalButton>
              <BizModalButton
                variant="primary"
                onClick={handleEdit}
                disabled={!editForm.name || editSubmitting}
              >
                {editSubmitting ? 'Saving...' : 'Save Changes'}
              </BizModalButton>
            </div>
          </div>
        }
      >
        {renderFormFields(editForm, setEditForm)}
      </BizModal>

      {/* Delete Confirmation Modal */}
      <BizModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete Template"
        maxWidth="sm"
        footer={
          <div className="flex justify-end gap-3">
            <BizModalButton
              variant="secondary"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteSubmitting}
            >
              Cancel
            </BizModalButton>
            <BizModalButton
              variant="danger"
              onClick={handleDelete}
              disabled={deleteSubmitting}
            >
              {deleteSubmitting ? 'Deleting...' : 'Delete Template'}
            </BizModalButton>
          </div>
        }
      >
        <p className="text-sm text-gray-700">
          Are you sure you want to delete the template{' '}
          <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
        </p>
      </BizModal>
    </div>
  );
}
