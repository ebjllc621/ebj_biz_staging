/**
 * Admin Types Management Page
 *
 * GOVERNANCE COMPLIANCE:
 * - Authority: docs/components/admin/ADMIN_TABLE_CANONICAL_STANDARD.md
 * - Template: AdminTableTemplate (MANDATORY)
 * - Authentication: Admin-only access required
 * - Service Boundary: NO direct database access (API routes only)
 * - Credentials: 'include' for all fetch requests
 * - Complexity: STANDARD tier (error boundaries required)
 *
 * Canonical Features:
 * - Page header with "+ New" and "Import/Export" buttons
 * - Statistics panel with type metrics
 * - Search bar with mode detection
 * - Advanced filters panel
 * - Pagination controls in table header
 * - Icon-only action buttons with canonical colors
 * - Server-side sorting
 * - Create/Edit modal for types
 * - Password modal for destructive operations
 *
 * @authority docs/components/admin/ADMIN_TABLE_CANONICAL_STANDARD.md
 * @component
 * @returns {JSX.Element} Admin types management interface
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { AdminTableTemplate, TableColumn, TableAction, BulkAction } from '@/components/admin/templates/AdminTableTemplate';
import { BizModal, BizModalButton } from '@/components/ui/BizModal';
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
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ErrorFallback } from '@/components/common/ErrorFallback';
import { fetchWithCsrf } from '@core/utils/csrf';

interface Type {
  id: number;
  name: string;
  slug: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface TypeStats {
  total: number;
  recentlyAdded: number;
  recentlyUpdated: number;
}

interface TypeFilters {
  [key: string]: string;
  id: string;
  name: string;
  slug: string;
}

interface TypeFormData {
  name: string;
  slug: string;
  description: string;
}

const defaultFilters: TypeFilters = {
  id: '',
  name: '',
  slug: ''
};

const typeFilterFields: FilterField[] = [
  { key: 'id', label: 'Type ID', type: 'number', placeholder: 'e.g., 123' },
  { key: 'name', label: 'Name', type: 'text', placeholder: 'e.g., Business' },
  { key: 'slug', label: 'Slug', type: 'text', placeholder: 'e.g., business' }
];

function generateSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function TypeFormModal({
  isOpen,
  onClose,
  type,
  onSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  type: Type | null;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState<TypeFormData>({ name: '', slug: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!type;

  useEffect(() => {
    if (isOpen && type) {
      setFormData({ name: type.name, slug: type.slug, description: type.description || '' });
    } else if (isOpen) {
      setFormData({ name: '', slug: '', description: '' });
    }
    setError(null);
  }, [isOpen, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const url = isEditMode ? `/api/admin/types/${type.id}` : '/api/admin/types';
      const method = isEditMode ? 'PATCH' : 'POST';

      const response = await fetchWithCsrf(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await response.json();
        setError(data.error?.message || 'Failed to save type');
      }
    } catch {
      setError('An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BizModal isOpen={isOpen} onClose={onClose} title={isEditMode ? `Edit Type: ${type.name}` : 'Create New Type'} size="medium">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => {
              const newName = e.target.value;
              setFormData(prev => ({
                ...prev,
                name: newName,
                slug: !isEditMode ? generateSlugFromName(newName) : prev.slug
              }));
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            required
            placeholder="e.g., Business, Non-Profit"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Slug <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            required
            placeholder="e.g., business, non-profit"
          />
          <p className="text-xs text-gray-500 mt-1">URL-friendly identifier (auto-generated from name for new types)</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            rows={3}
            placeholder="Optional description of this type"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <BizModalButton variant="secondary" onClick={onClose} disabled={saving}>Cancel</BizModalButton>
          <BizModalButton type="submit" disabled={saving}>{saving ? 'Saving...' : isEditMode ? 'Update Type' : 'Create Type'}</BizModalButton>
        </div>
      </form>
    </BizModal>
  );
}

function AdminTypesPageContent() {
  const { user } = useAuth();

  const [types, setTypes] = useState<Type[]>([]);
  const [stats, setStats] = useState<TypeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortColumn, setSortColumn] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('all');
  const [filters, setFilters] = useState<TypeFilters>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [matchMode, setMatchMode] = useState<MatchMode>('all');

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<Type | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<Type | null>(null);

  const fetchTypes = useCallback(async () => {
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

      const response = await fetch(`/api/admin/types?${params}`, { credentials: 'include' });

      if (response.ok) {
        const data = await response.json();
        setTypes(data.data?.items ?? data.items ?? []);
        setPagination(prev => ({ ...prev, total: data.data?.pagination?.total ?? data.pagination?.total ?? 0 }));
      }
    } catch (error) {
      console.error('Failed to fetch types:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, sortColumn, sortDirection, searchQuery, searchMode, filters, matchMode]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const response = await fetch('/api/admin/types/stats', { credentials: 'include' });
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
      fetchTypes();
      fetchStats();
    }
  }, [user, fetchTypes, fetchStats]);

  const handleSearch = useCallback((query: string, mode: SearchMode) => {
    setSearchQuery(query);
    setSearchMode(mode);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleFiltersChange = useCallback((newFilters: TypeFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(defaultFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const activeFilterCount = useMemo(() => Object.values(filters).filter(v => v !== '').length, [filters]);

  const handleColumnSort = useCallback((columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [sortColumn]);

  const handleCreateType = useCallback(() => {
    setSelectedType(null);
    setFormModalOpen(true);
  }, []);

  const handleEditType = useCallback((type: Type) => {
    setSelectedType(type);
    setFormModalOpen(true);
  }, []);

  const handleDeleteType = useCallback((type: Type) => {
    setTypeToDelete(type);
    setShowPasswordModal(true);
  }, []);

  const handlePasswordVerified = useCallback(async () => {
    if (!typeToDelete) return;

    try {
      const response = await fetchWithCsrf(`/api/admin/types/${typeToDelete.id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchTypes();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to delete type:', error);
    } finally {
      setTypeToDelete(null);
    }
  }, [typeToDelete, fetchTypes, fetchStats]);

  const handleBulkDelete = useCallback((selectedTypes: Type[]) => {
    const firstType = selectedTypes[0];
    if (firstType) {
      setTypeToDelete(firstType);
      setShowPasswordModal(true);
    }
  }, []);

  const handleFormSuccess = useCallback(() => {
    fetchTypes();
    fetchStats();
  }, [fetchTypes, fetchStats]);

  const statsSections: StatSection[] = useMemo(() => {
    if (!stats) return [];
    return [
      {
        title: 'Totals',
        items: [
          { label: 'Total Types', value: stats.total, bold: true },
          { label: 'Recently Added', value: stats.recentlyAdded || 0 },
          { label: 'Recently Updated', value: stats.recentlyUpdated || 0 }
        ]
      }
    ];
  }, [stats]);

  const columns: TableColumn<Type>[] = useMemo(() => [
    { key: 'id', header: 'ID', accessor: (row) => row.id, sortable: true },
    { key: 'name', header: 'Name', accessor: (type) => <div className="font-medium">{type.name}</div>, sortable: true },
    {
      key: 'slug',
      header: 'Slug',
      accessor: (type) => <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm font-mono">{type.slug}</span>,
      sortable: true
    },
    {
      key: 'description',
      header: 'Description',
      accessor: (type) => <div className="text-gray-600 text-sm max-w-xs truncate">{type.description || '-'}</div>
    },
    { key: 'created_at', header: 'Created', accessor: (type) => new Date(type.created_at).toLocaleDateString(), sortable: true },
    { key: 'updated_at', header: 'Updated', accessor: (type) => new Date(type.updated_at).toLocaleDateString(), sortable: true }
  ], []);

  const actions: TableAction<Type>[] = useMemo(() => [
    { label: 'Edit', icon: <Edit2 className="w-4 h-4" />, iconOnly: true, onClick: handleEditType, variant: 'primary' },
    { label: 'Delete', icon: <Trash2 className="w-4 h-4" />, iconOnly: true, onClick: handleDeleteType, variant: 'danger' }
  ], [handleEditType, handleDeleteType]);

  const bulkActions: BulkAction<Type>[] = useMemo(() => [
    { label: 'Delete Selected', onClick: handleBulkDelete }
  ], [handleBulkDelete]);

  if (!user) return <div className="flex items-center justify-center min-h-[400px]"><div className="text-gray-500">Loading...</div></div>;
  if (user.role !== 'admin') return <div className="flex items-center justify-center min-h-[400px]"><div className="text-red-600 font-medium">Access Denied: Admin privileges required</div></div>;

  return (
    <div className="p-6">
      <AdminPageHeader title="Types Manager" onCreateNew={handleCreateType} onImportExport={() => {}} />
      <AdminStatsPanel title="Type Statistics" sections={statsSections} loading={statsLoading} />

      <div className="flex items-center gap-4 mb-4">
        <AdminSearchBar placeholder="Search by name, slug, #ID..." onSearch={handleSearch} />
        <AdminAdvancedFilterPanel isOpen={filtersOpen} filters={filters} onChange={handleFiltersChange} onClear={handleClearFilters} onToggle={() => setFiltersOpen(p => !p)} activeFilterCount={activeFilterCount} fields={typeFilterFields} matchMode={matchMode} onMatchModeChange={setMatchMode} />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <AdminPaginationControls title="Types" page={pagination.page} pageSize={pagination.pageSize} total={pagination.total} loading={loading} onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))} onPageSizeChange={(s) => setPagination(prev => ({ ...prev, pageSize: s, page: 1 }))} onRefresh={fetchTypes} />
        <AdminTableTemplate<Type> title="" data={types} columns={columns} rowKey={(row) => row.id} actions={actions} bulkActions={bulkActions} loading={loading} emptyMessage="No types found" tableId="admin-types" onSort={handleColumnSort} sortState={{ column: sortColumn, direction: sortDirection }} />
      </div>

      <TypeFormModal isOpen={formModalOpen} onClose={() => { setFormModalOpen(false); setSelectedType(null); }} type={selectedType} onSuccess={handleFormSuccess} />
      <AdminPasswordModal isOpen={showPasswordModal} onClose={() => { setShowPasswordModal(false); setTypeToDelete(null); }} onVerified={handlePasswordVerified} operationDescription={`delete type "${typeToDelete?.name}"`} />
    </div>
  );
}

export default function AdminTypesPage() {
  return (
    <ErrorBoundary fallback={<ErrorFallback title="Types Management Error" message="Unable to load types management interface. Please try again." />} isolate={true} componentName="AdminTypesPage">
      <AdminTypesPageContent />
    </ErrorBoundary>
  );
}
