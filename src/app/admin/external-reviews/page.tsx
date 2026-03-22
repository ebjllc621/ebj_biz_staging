/**
 * Admin External Reviews Page
 *
 * GOVERNANCE COMPLIANCE:
 * - Authority: docs/components/admin/external-reviews/ADMIN_EXTERNAL_REVIEWS_BRAIN_PLAN.md
 * - Template: AdminTableTemplate (MANDATORY)
 * - Authentication: Admin-only access required
 * - Service Boundary: External review sources via API routes
 * - Credentials: 'include' for all fetch requests
 * - Complexity: STANDARD tier
 *
 * Features:
 * - Feature flag toggles panel (Master, Google, Yelp, Facebook)
 * - Statistics panel with connection metrics
 * - Search bar with advanced filter panel
 * - Pagination controls
 * - Connections table with provider, status, sync info
 *
 * @authority docs/components/admin/external-reviews/ADMIN_EXTERNAL_REVIEWS_BRAIN_PLAN.md
 * @component
 * @returns {JSX.Element} Admin external reviews management
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Globe, ExternalLink, RefreshCw, Power, PowerOff } from 'lucide-react';
import { AdminTableTemplate, TableColumn, TableAction } from '@/components/admin/templates/AdminTableTemplate';
import {
  AdminPageHeader,
  AdminStatsPanel,
  AdminSearchBar,
  AdminAdvancedFilterPanel,
  AdminPaginationControls,
  type StatSection,
  type FilterField,
  type SearchMode
} from '@/components/admin/shared';
import { useAuth } from '@core/hooks/useAuth';

interface ExternalReviewConnection {
  id: number;
  listing_id: number | null;
  listing_name: string | null;
  owner_name: string | null;
  provider: string;
  provider_entity_id: string | null;
  canonical_url: string | null;
  rating_summary: number | null;
  review_count: number;
  last_sync_at: string | null;
  status: string;
  created_at: string;
}

interface ExternalReviewSettings {
  feature_external_reviews_enabled: boolean;
  feature_external_reviews_google: boolean;
  feature_external_reviews_yelp: boolean;
  feature_external_reviews_facebook: boolean;
}

interface ConnectionFilters {
  [key: string]: string;
  provider: string;
  status: string;
}

const defaultFilters: ConnectionFilters = {
  provider: '',
  status: ''
};

const filterFields: FilterField[] = [
  {
    key: 'provider',
    label: 'Provider',
    type: 'select',
    options: [
      { value: 'google', label: 'Google' },
      { value: 'yelp', label: 'Yelp' },
      { value: 'facebook', label: 'Facebook' }
    ]
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'connected', label: 'Connected' },
      { value: 'disconnected', label: 'Disconnected' },
      { value: 'error', label: 'Error' }
    ]
  }
];

const statusColors: Record<string, string> = {
  connected: 'bg-green-100 text-green-800',
  disconnected: 'bg-gray-100 text-gray-600',
  error: 'bg-red-100 text-red-800'
};

const providerColors: Record<string, string> = {
  google: 'bg-blue-100 text-blue-800',
  yelp: 'bg-red-100 text-red-800',
  facebook: 'bg-indigo-100 text-indigo-800'
};

const defaultSettings: ExternalReviewSettings = {
  feature_external_reviews_enabled: false,
  feature_external_reviews_google: false,
  feature_external_reviews_yelp: false,
  feature_external_reviews_facebook: false
};

export default function AdminExternalReviewsPage() {
  const { user } = useAuth();

  const [connections, setConnections] = useState<ExternalReviewConnection[]>([]);
  const [loading, setLoading] = useState(true);

  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('all');
  const [filters, setFilters] = useState<ConnectionFilters>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [settings, setSettings] = useState<ExternalReviewSettings>(defaultSettings);
  const [pendingSettings, setPendingSettings] = useState<ExternalReviewSettings>(defaultSettings);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const fetchConnections = useCallback(async (includeSettings = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        pageSize: String(pagination.pageSize),
        sortColumn,
        sortDirection,
        search: searchQuery,
        searchMode,
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))
      });

      if (includeSettings) {
        params.set('include', 'settings');
      }

      const response = await fetch(`/api/admin/external-reviews?${params}`, {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        setConnections(result.data?.connections || []);
        setPagination(prev => ({
          ...prev,
          total: result.data?.pagination?.total || 0
        }));
        if (result.data?.settings) {
          setSettings(result.data.settings);
          setPendingSettings(result.data.settings);
        }
      }
    } catch (error) {
      console.error('Failed to fetch external review connections:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, sortColumn, sortDirection, searchQuery, searchMode, filters]);

  useEffect(() => {
    if (user?.role === 'admin') {
      setSettingsLoading(true);
      fetchConnections(true).finally(() => setSettingsLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchConnections(false);
    }
  }, [user, fetchConnections]);

  const handleSearch = useCallback((query: string, mode: SearchMode) => {
    setSearchQuery(query);
    setSearchMode(mode);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleFiltersChange = useCallback((newFilters: ConnectionFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(defaultFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(v => v !== '').length,
    [filters]
  );

  const handleColumnSort = useCallback((columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [sortColumn]);

  const handleSettingToggle = useCallback((key: keyof ExternalReviewSettings) => {
    setPendingSettings(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSaveSettings = useCallback(async () => {
    setSettingsSaving(true);
    try {
      // Fetch CSRF token
      const csrfRes = await fetch('/api/auth/csrf', { credentials: 'include' });
      const csrfData = await csrfRes.json();
      const csrfToken = csrfData?.data?.token || csrfData?.token || '';

      const response = await fetch('/api/admin/external-reviews/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({ settings: pendingSettings })
      });
      const result = await response.json();
      if (result.success && result.data?.settings) {
        setSettings(result.data.settings);
        setPendingSettings(result.data.settings);
      }
    } catch (error) {
      console.error('Failed to save external review settings:', error);
    } finally {
      setSettingsSaving(false);
    }
  }, [pendingSettings]);

  const statsSections: StatSection[] = useMemo(() => {
    const total = connections.length;
    const connected = connections.filter(c => c.status === 'connected').length;
    const disconnected = connections.filter(c => c.status === 'disconnected').length;
    const errors = connections.filter(c => c.status === 'error').length;
    const google = connections.filter(c => c.provider === 'google').length;
    const yelp = connections.filter(c => c.provider === 'yelp').length;
    const facebook = connections.filter(c => c.provider === 'facebook').length;

    const synced = connections.filter(c => c.last_sync_at);
    const lastSync = synced.length > 0
      ? synced.reduce((a, b) =>
          new Date(a.last_sync_at!) > new Date(b.last_sync_at!) ? a : b
        ).last_sync_at
      : null;

    const avgReviewCount = connections.length > 0
      ? Math.round(connections.reduce((sum, c) => sum + (c.review_count || 0), 0) / connections.length)
      : 0;

    return [
      {
        title: 'Totals',
        items: [
          { label: 'Total Connections', value: pagination.total, bold: true },
          { label: 'Connected', value: connected },
          { label: 'Disconnected', value: disconnected },
          { label: 'Errors', value: errors }
        ]
      },
      {
        title: 'By Provider',
        items: [
          { label: 'Google', value: google },
          { label: 'Yelp', value: yelp },
          { label: 'Facebook', value: facebook }
        ]
      },
      {
        title: 'Sync',
        items: [
          { label: 'Last Sync', value: lastSync ? new Date(lastSync).toLocaleDateString() : 'Never' },
          { label: 'Avg Reviews', value: avgReviewCount }
        ]
      }
    ];
  }, [connections, pagination.total]);

  const columns: TableColumn<ExternalReviewConnection>[] = useMemo(() => [
    { key: 'id', header: 'ID', accessor: (row) => row.id, sortable: true },
    {
      key: 'listing_id',
      header: 'Listing',
      accessor: (row) => row.listing_name || `#${row.listing_id}`,
      sortable: true
    },
    {
      key: 'provider',
      header: 'Provider',
      accessor: (row) => (
        <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${providerColors[row.provider] || 'bg-gray-100 text-gray-800'}`}>
          {row.provider}
        </span>
      ),
      sortable: true
    },
    {
      key: 'provider_entity_id',
      header: 'Provider ID',
      accessor: (row) => (
        <span className="text-xs font-mono text-gray-600 truncate max-w-[120px] block" title={row.provider_entity_id || ''}>
          {row.provider_entity_id || '-'}
        </span>
      )
    },
    {
      key: 'rating_summary',
      header: 'Rating',
      accessor: (row) =>
        row.rating_summary != null ? Number(row.rating_summary).toFixed(1) : '-',
      sortable: true
    },
    {
      key: 'review_count',
      header: 'Reviews',
      accessor: (row) => row.review_count ?? 0,
      sortable: true
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => (
        <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${statusColors[row.status] || 'bg-gray-100 text-gray-800'}`}>
          {row.status}
        </span>
      ),
      sortable: true
    },
    {
      key: 'last_sync_at',
      header: 'Last Sync',
      accessor: (row) =>
        row.last_sync_at ? new Date(row.last_sync_at).toLocaleDateString() : 'Never',
      sortable: true
    },
    {
      key: 'created_at',
      header: 'Connected',
      accessor: (row) => new Date(row.created_at).toLocaleDateString(),
      sortable: true
    }
  ], []);

  const actions: TableAction<ExternalReviewConnection>[] = useMemo(() => [
    {
      label: 'View Source',
      icon: <ExternalLink className="w-4 h-4" />,
      iconOnly: true,
      onClick: (row) => {
        if (row.canonical_url) window.open(row.canonical_url, '_blank');
      },
      variant: 'primary',
      isHidden: (row) => !row.canonical_url
    },
    {
      label: 'Refresh Sync',
      icon: <RefreshCw className="w-4 h-4" />,
      iconOnly: true,
      onClick: () => {
        // Sync trigger placeholder — extend when sync endpoint is implemented
      },
      variant: 'primary',
      isHidden: (row) => row.status !== 'connected'
    },
    {
      label: 'Disconnect',
      icon: <PowerOff className="w-4 h-4" />,
      iconOnly: true,
      onClick: () => {
        // Disconnect placeholder — extend when disconnect endpoint is implemented
      },
      variant: 'danger',
      isHidden: (row) => row.status !== 'connected'
    },
    {
      label: 'Reconnect',
      icon: <Power className="w-4 h-4" />,
      iconOnly: true,
      onClick: () => {
        // Reconnect placeholder — extend when reconnect endpoint is implemented
      },
      variant: 'primary',
      isHidden: (row) => row.status === 'connected'
    }
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
        <div className="text-red-600 font-medium">Access Denied</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <AdminPageHeader title="External Reviews" onImportExport={() => {}} />

      {/* Feature Flag Toggles Panel */}
      <div className="bg-white rounded-lg shadow p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-semibold text-gray-800">External Reviews Feature Flags</h2>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={settingsSaving || settingsLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {settingsSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Master Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p className="text-sm font-medium text-gray-800">Master Enable</p>
              <p className="text-xs text-gray-500">Enable all external reviews</p>
            </div>
            <button
              onClick={() => handleSettingToggle('feature_external_reviews_enabled')}
              disabled={settingsLoading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                pendingSettings.feature_external_reviews_enabled ? 'bg-blue-600' : 'bg-gray-300'
              } disabled:opacity-50`}
              aria-label="Toggle master external reviews"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  pendingSettings.feature_external_reviews_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Google Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p className="text-sm font-medium text-gray-800">Google Reviews</p>
              <p className="text-xs text-gray-500">Show Google review data</p>
            </div>
            <button
              onClick={() => handleSettingToggle('feature_external_reviews_google')}
              disabled={settingsLoading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                pendingSettings.feature_external_reviews_google ? 'bg-blue-600' : 'bg-gray-300'
              } disabled:opacity-50`}
              aria-label="Toggle Google reviews"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  pendingSettings.feature_external_reviews_google ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Yelp Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p className="text-sm font-medium text-gray-800">Yelp Reviews</p>
              <p className="text-xs text-gray-500">Show Yelp review data</p>
            </div>
            <button
              onClick={() => handleSettingToggle('feature_external_reviews_yelp')}
              disabled={settingsLoading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                pendingSettings.feature_external_reviews_yelp ? 'bg-blue-600' : 'bg-gray-300'
              } disabled:opacity-50`}
              aria-label="Toggle Yelp reviews"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  pendingSettings.feature_external_reviews_yelp ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Facebook Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p className="text-sm font-medium text-gray-800">Facebook Reviews</p>
              <p className="text-xs text-gray-500">Show Facebook review data</p>
            </div>
            <button
              onClick={() => handleSettingToggle('feature_external_reviews_facebook')}
              disabled={settingsLoading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                pendingSettings.feature_external_reviews_facebook ? 'bg-blue-600' : 'bg-gray-300'
              } disabled:opacity-50`}
              aria-label="Toggle Facebook reviews"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  pendingSettings.feature_external_reviews_facebook ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <AdminStatsPanel title="Connection Statistics" sections={statsSections} loading={loading} />

      <div className="flex items-center gap-4 mb-4">
        <AdminSearchBar
          placeholder="Search by listing, provider, provider ID..."
          onSearch={handleSearch}
        />
        <AdminAdvancedFilterPanel
          isOpen={filtersOpen}
          filters={filters}
          onChange={handleFiltersChange}
          onClear={handleClearFilters}
          onToggle={() => setFiltersOpen(p => !p)}
          activeFilterCount={activeFilterCount}
          fields={filterFields}
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <AdminPaginationControls
          title="Connections"
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          loading={loading}
          onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))}
          onPageSizeChange={(s) => setPagination(prev => ({ ...prev, pageSize: s, page: 1 }))}
          onRefresh={() => fetchConnections(false)}
        />
        <AdminTableTemplate<ExternalReviewConnection>
          title=""
          data={connections}
          columns={columns}
          rowKey={(row) => row.id}
          loading={loading}
          actions={actions}
          tableId="admin-external-reviews"
          onSort={handleColumnSort}
          sortState={{ column: sortColumn, direction: sortDirection }}
        />
      </div>
    </div>
  );
}
