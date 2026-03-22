/**
 * Admin Event Types Page
 *
 * GOVERNANCE COMPLIANCE:
 * - Authority: docs/components/admin/ADMIN_TABLE_CANONICAL_STANDARD.md
 * - Template: AdminTableTemplate (MANDATORY)
 * - Authentication: Admin-only access required
 * - Service Boundary: EventService via API routes
 * - Credentials: 'include' for all fetch requests
 * - Complexity: STANDARD tier
 *
 * @authority docs/components/admin/ADMIN_TABLE_CANONICAL_STANDARD.md
 * @reference src/app/admin/events/sponsors/page.tsx - Pattern replication
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Pencil, Trash2, ToggleLeft } from 'lucide-react';
import { AdminTableTemplate, type TableColumn, type TableAction, type BulkAction } from '@/components/admin/templates/AdminTableTemplate';
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
  type SearchMode,
} from '@/components/admin/shared';
import BizModal from '@/components/BizModal/BizModal';
import { useAuth } from '@core/hooks/useAuth';

interface EventType {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean | number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface EventTypeStats {
  total: number;
  active: number;
  inactive: number;
}

interface EventTypeFilters {
  [key: string]: string;
  status: string;
}

const defaultFilters: EventTypeFilters = {
  status: '',
};

const eventTypeFilterFields: FilterField[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ],
  },
];

interface EventTypeFormData {
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  sort_order: number;
}

const defaultFormData: EventTypeFormData = {
  name: '',
  slug: '',
  description: '',
  is_active: true,
  sort_order: 0,
};

export default function AdminEventTypesPage() {
  const { user } = useAuth();

  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [stats, setStats] = useState<EventTypeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortColumn, setSortColumn] = useState<string>('sort_order');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<EventTypeFilters>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [matchMode, setMatchMode] = useState<MatchMode>('all');

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: string; items: EventType[] } | null>(null);

  // Create/Edit modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingType, setEditingType] = useState<EventType | null>(null);
  const [formData, setFormData] = useState<EventTypeFormData>(defaultFormData);
  const [formSaving, setFormSaving] = useState(false);

  const fetchEventTypes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        pageSize: String(pagination.pageSize),
        sortColumn,
        sortDirection,
        search: searchQuery,
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')),
      });

      const response = await fetch(`/api/admin/events/types?${params}`, { credentials: 'include' });
      const result = await response.json();

      if (result.success) {
        setEventTypes(result.data?.eventTypes || []);
        setPagination(prev => ({ ...prev, total: result.data?.pagination?.total || 0 }));
      }
    } catch (error) {
      console.error('Failed to fetch event types:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, sortColumn, sortDirection, searchQuery, filters]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const response = await fetch('/api/admin/events/types?pageSize=1000', { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        const all: EventType[] = result.data?.eventTypes || [];
        const computed: EventTypeStats = {
          total: result.data?.pagination?.total || 0,
          active: all.filter(t => t.is_active === true || t.is_active === 1).length,
          inactive: all.filter(t => t.is_active === false || t.is_active === 0).length,
        };
        setStats(computed);
      }
    } catch (error) {
      console.error('Failed to fetch event type stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchEventTypes();
      fetchStats();
    }
  }, [user, fetchEventTypes, fetchStats]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSearch = useCallback((query: string, _mode: SearchMode) => {
    setSearchQuery(query);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleFiltersChange = useCallback((newFilters: EventTypeFilters) => {
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

  const handleToggleActive = useCallback(async (item: EventType) => {
    try {
      await fetch(`/api/admin/events/types/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_active: !(item.is_active === true || item.is_active === 1) }),
      });
      fetchEventTypes();
      fetchStats();
    } catch (error) {
      console.error('Failed to toggle event type status:', error);
    }
  }, [fetchEventTypes, fetchStats]);

  const handlePasswordVerified = useCallback(async () => {
    if (!pendingAction) return;
    setShowPasswordModal(false);

    try {
      for (const item of pendingAction.items) {
        await fetch(`/api/admin/events/types/${item.id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
      }
      fetchEventTypes();
      fetchStats();
    } catch (error) {
      console.error('Failed to delete event types:', error);
    }
    setPendingAction(null);
  }, [pendingAction, fetchEventTypes, fetchStats]);

  const openCreateModal = useCallback(() => {
    setEditingType(null);
    setFormData(defaultFormData);
    setShowFormModal(true);
  }, []);

  const openEditModal = useCallback((item: EventType) => {
    setEditingType(item);
    setFormData({
      name: item.name,
      slug: item.slug,
      description: item.description || '',
      is_active: item.is_active === true || item.is_active === 1,
      sort_order: item.sort_order,
    });
    setShowFormModal(true);
  }, []);

  const generateSlug = useCallback((name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }, []);

  const handleFormSubmit = useCallback(async () => {
    if (!formData.name || !formData.slug) return;
    setFormSaving(true);

    try {
      const url = editingType
        ? `/api/admin/events/types/${editingType.id}`
        : '/api/admin/events/types';
      const method = editingType ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (result.success) {
        setShowFormModal(false);
        fetchEventTypes();
        fetchStats();
      } else {
        alert(result.error || 'Failed to save event type');
      }
    } catch (error) {
      console.error('Failed to save event type:', error);
    } finally {
      setFormSaving(false);
    }
  }, [formData, editingType, fetchEventTypes, fetchStats]);

  const statsSections: StatSection[] = useMemo(() => {
    if (!stats) return [];
    return [
      {
        title: 'Totals',
        items: [
          { label: 'Total Types', value: stats.total, bold: true },
          { label: 'Active', value: stats.active },
          { label: 'Inactive', value: stats.inactive },
        ],
      },
    ];
  }, [stats]);

  const columns: TableColumn<EventType>[] = useMemo(() => [
    { key: 'id', header: 'ID', accessor: (row) => row.id, sortable: true },
    { key: 'name', header: 'Name', accessor: (row) => row.name, sortable: true },
    { key: 'slug', header: 'Slug', accessor: (row) => (
      <code className="text-sm bg-gray-100 px-2 py-0.5 rounded">{row.slug}</code>
    ), sortable: true },
    { key: 'description', header: 'Description', accessor: (row) => row.description || '-', sortable: false },
    {
      key: 'is_active',
      header: 'Status',
      accessor: (row) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          (row.is_active === true || row.is_active === 1)
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-600'
        }`}>
          {(row.is_active === true || row.is_active === 1) ? 'Active' : 'Inactive'}
        </span>
      ),
      sortable: true,
    },
    { key: 'sort_order', header: 'Sort Order', accessor: (row) => row.sort_order, sortable: true },
    {
      key: 'created_at',
      header: 'Created',
      accessor: (row) => new Date(row.created_at).toLocaleDateString(),
      sortable: true,
    },
  ], []);

  const actions: TableAction<EventType>[] = useMemo(() => [
    {
      label: 'Edit',
      icon: <Pencil className="w-4 h-4" />,
      iconOnly: true,
      onClick: (item) => openEditModal(item),
      variant: 'primary',
    },
    {
      label: 'Toggle Active',
      icon: <ToggleLeft className="w-4 h-4" />,
      iconOnly: true,
      onClick: (item: EventType) => handleToggleActive(item),
      variant: 'primary',
    },
    {
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      iconOnly: true,
      onClick: (item) => {
        setPendingAction({ type: 'delete', items: [item] });
        setShowPasswordModal(true);
      },
      variant: 'danger',
    },
  ], [openEditModal, handleToggleActive]);

  const bulkActions: BulkAction<EventType>[] = useMemo(() => [
    {
      label: 'Delete Selected',
      onClick: (selected) => {
        setPendingAction({ type: 'delete', items: selected });
        setShowPasswordModal(true);
      },
    },
  ], []);

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
        title="Event Types"
        onCreateNew={openCreateModal}
        onImportExport={() => {}}
      />

      <AdminStatsPanel title="Event Type Statistics" sections={statsSections} loading={statsLoading} />

      <div className="flex items-center gap-4 mb-4">
        <AdminSearchBar placeholder="Search by name, slug..." onSearch={handleSearch} />
        <AdminAdvancedFilterPanel
          isOpen={filtersOpen}
          filters={filters}
          onChange={handleFiltersChange}
          onClear={handleClearFilters}
          onToggle={() => setFiltersOpen(p => !p)}
          activeFilterCount={activeFilterCount}
          fields={eventTypeFilterFields}
          matchMode={matchMode}
          onMatchModeChange={setMatchMode}
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <AdminPaginationControls
          title="Event Types"
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          loading={loading}
          onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))}
          onPageSizeChange={(s) => setPagination(prev => ({ ...prev, pageSize: s, page: 1 }))}
          onRefresh={fetchEventTypes}
        />
        <AdminTableTemplate<EventType>
          title=""
          data={eventTypes}
          columns={columns}
          rowKey={(row) => row.id}
          loading={loading}
          actions={actions}
          bulkActions={bulkActions}
          tableId="admin-event-types"
          onSort={handleColumnSort}
          sortState={{ column: sortColumn, direction: sortDirection }}
        />
      </div>

      {/* Create/Edit Modal */}
      <BizModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={editingType ? 'Edit Event Type' : 'Create Event Type'}
        size="medium"
      >
        <div className="space-y-4 p-4">
          <div>
            <label htmlFor="et-name" className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              id="et-name"
              type="text"
              value={formData.name}
              onChange={(e) => {
                const name = e.target.value;
                setFormData(prev => ({
                  ...prev,
                  name,
                  slug: editingType ? prev.slug : generateSlug(name),
                }));
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              placeholder="e.g., Workshop"
            />
          </div>

          <div>
            <label htmlFor="et-slug" className="block text-sm font-medium text-gray-700 mb-1">
              Slug *
            </label>
            <input
              id="et-slug"
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              placeholder="e.g., workshop"
            />
          </div>

          <div>
            <label htmlFor="et-description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              id="et-description"
              type="text"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              placeholder="Optional description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="et-sort" className="block text-sm font-medium text-gray-700 mb-1">
                Sort Order
              </label>
              <input
                id="et-sort"
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 text-[#ed6437] rounded focus:ring-[#ed6437]"
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => setShowFormModal(false)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleFormSubmit}
              disabled={formSaving || !formData.name || !formData.slug}
              className="px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a30] disabled:opacity-50"
            >
              {formSaving ? 'Saving...' : (editingType ? 'Update' : 'Create')}
            </button>
          </div>
        </div>
      </BizModal>

      <AdminPasswordModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setPendingAction(null);
        }}
        onVerified={handlePasswordVerified}
        operationDescription={`delete ${pendingAction?.items.length || 0} event type(s)`}
      />
    </div>
  );
}
