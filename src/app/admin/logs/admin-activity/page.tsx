/**
 * Admin Activity Logs Page
 *
 * GOVERNANCE COMPLIANCE:
 * - Template: AdminTableTemplate (MANDATORY)
 * - Authentication: Admin-only access required
 * - Service Boundary: NO direct database access (API routes only)
 * - Credentials: 'include' for all fetch requests
 * - Complexity: STANDARD tier
 *
 * Features:
 * - Admin activity audit logs table with pagination
 * - Time range filters (7d, 30d, 90d, custom)
 * - Filter by action category, entity type, severity
 * - Expandable rows for before/after data
 * - Click to copy functionality
 * - Export to JSON/CSV
 *
 * @authority CLAUDE.md - Admin Standards
 * @tier STANDARD
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { AdminTableTemplate, TableColumn } from '@/components/admin/templates/AdminTableTemplate';
import { useAuth } from '@core/hooks/useAuth';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ErrorFallback } from '@/components/common/ErrorFallback';
import { TimeRangeFilter, TimeRange, CopyButton, getDateRange } from '@/components/admin/logs';
import { Download, Search, RefreshCw, Trash2, Edit, Shield, FileUp, Settings, ChevronDown, ChevronUp, User } from 'lucide-react';
import { downloadFile, generateTimestampedFilename } from '@core/utils/export';
import { generateAdminActivityCSVExport, generateAdminActivityJSONExport } from '@core/utils/export/logExport';

interface AdminActivityLog {
  id: number;
  admin_user_id: number;
  admin_username?: string;
  target_user_id: number | null;
  target_entity_type: string;
  target_entity_id: number | null;
  action_type: string;
  action_category: string;
  action_description: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
  severity: string;
  requires_approval: boolean;
  approved_by: number | null;
  approved_at: string | null;
  created_at: string;
}

interface LogsResponse {
  logs: AdminActivityLog[];
  actionCategories: string[];
  entityTypes: string[];
  stats: {
    byCategory: Record<string, number>;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const categoryConfig: Record<string, { icon: typeof Trash2; color: string; bgColor: string }> = {
  deletion: { icon: Trash2, color: 'text-red-700', bgColor: 'bg-red-100' },
  batch_deletion: { icon: Trash2, color: 'text-red-700', bgColor: 'bg-red-100' },
  moderation: { icon: Shield, color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  update: { icon: Edit, color: 'text-blue-700', bgColor: 'bg-blue-100' },
  creation: { icon: FileUp, color: 'text-green-700', bgColor: 'bg-green-100' },
  import: { icon: FileUp, color: 'text-purple-700', bgColor: 'bg-purple-100' },
  export: { icon: Download, color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  configuration: { icon: Settings, color: 'text-gray-700', bgColor: 'bg-gray-100' }
};

const severityConfig: Record<string, { color: string; bgColor: string }> = {
  critical: { color: 'text-red-700', bgColor: 'bg-red-100' },
  high: { color: 'text-orange-700', bgColor: 'bg-orange-100' },
  normal: { color: 'text-blue-700', bgColor: 'bg-blue-100' },
  low: { color: 'text-gray-700', bgColor: 'bg-gray-100' }
};

function AdminActivityPageContent() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AdminActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionCategories, setActionCategories] = useState<string[]>([]);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Filters - initialize with actual 7-day date range so the default filter is respected
  const initialRange = getDateRange('7d');
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [dateFrom, setDateFrom] = useState(initialRange.dateFrom);
  const [dateTo, setDateTo] = useState(initialRange.dateTo);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', pageSize.toString());

      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (categoryFilter) params.append('actionCategory', categoryFilter);
      if (entityTypeFilter) params.append('targetEntityType', entityTypeFilter);
      if (severityFilter) params.append('severity', severityFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/admin/logs/admin-activity?${params}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const json = await response.json();
        const data: LogsResponse = json.data;
        setLogs(data.logs || []);
        setActionCategories(data.actionCategories || []);
        setEntityTypes(data.entityTypes || []);
        setStats(data.stats?.byCategory || {});
        setTotalItems(data.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch admin activity logs:', error);
    } finally {
      setLoading(false);
    }
  }, [page, dateFrom, dateTo, categoryFilter, entityTypeFilter, severityFilter, searchQuery]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchLogs();
    }
  }, [user, fetchLogs]);

  const handleTimeRangeChange = useCallback((range: TimeRange, from?: string, to?: string) => {
    setTimeRange(range);
    setDateFrom(from || '');
    setDateTo(to || '');
    setPage(1);
  }, []);

  const handleExport = useCallback((format: 'json' | 'csv') => {
    const exportData = logs.map(log => ({
      id: log.id,
      admin_user_id: log.admin_user_id,
      admin_username: log.admin_username,
      action_type: log.action_type,
      action_category: log.action_category,
      action_description: log.action_description,
      target_entity_type: log.target_entity_type,
      target_entity_id: log.target_entity_id,
      severity: log.severity,
      created_at: log.created_at,
      before_data: log.before_data,
      after_data: log.after_data
    }));

    if (format === 'json') {
      const content = generateAdminActivityJSONExport(exportData);
      downloadFile(content, generateTimestampedFilename('admin-activity', 'json'), 'application/json');
    } else {
      const content = generateAdminActivityCSVExport(exportData);
      downloadFile(content, generateTimestampedFilename('admin-activity', 'csv'), 'text/csv');
    }
  }, [logs]);

  const toggleRowExpand = useCallback((id: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

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

  const columns: TableColumn<AdminActivityLog>[] = [
    {
      key: 'id',
      header: 'ID',
      accessor: (row) => row.id,
      sortable: true,
      width: '60px'
    },
    {
      key: 'admin',
      header: 'Admin',
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#1e3a5f] flex items-center justify-center">
            <User size={12} className="text-white" />
          </div>
          <span className="text-sm font-medium">{row.admin_username}</span>
        </div>
      ),
      sortable: true
    },
    {
      key: 'action_category',
      header: 'Category',
      accessor: (row) => {
        const config = categoryConfig[row.action_category] ?? categoryConfig.update!;
        const Icon = config.icon;
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.color}`}>
            <Icon size={12} />
            {row.action_category.replace('_', ' ')}
          </span>
        );
      },
      sortable: true,
      width: '130px'
    },
    {
      key: 'target_entity_type',
      header: 'Entity',
      accessor: (row) => (
        <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
          {row.target_entity_type}
          {row.target_entity_id && ` #${row.target_entity_id}`}
        </span>
      ),
      sortable: true
    },
    {
      key: 'action_description',
      header: 'Description',
      accessor: (row) => (
        <div className="max-w-xs text-sm truncate" title={row.action_description}>
          {row.action_description}
        </div>
      )
    },
    {
      key: 'severity',
      header: 'Severity',
      accessor: (row) => {
        const config = severityConfig[row.severity] ?? severityConfig.normal!;
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.color}`}>
            {row.severity}
          </span>
        );
      },
      sortable: true,
      width: '80px'
    },
    {
      key: 'created_at',
      header: 'Time',
      accessor: (row) => (
        <span className="text-xs text-gray-500">
          {new Date(row.created_at).toLocaleString()}
        </span>
      ),
      sortable: true
    },
    {
      key: 'expand',
      header: '',
      accessor: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleRowExpand(row.id);
          }}
          className="p-1 hover:bg-gray-100 rounded"
          title={expandedRows.has(row.id) ? 'Collapse' : 'Expand'}
        >
          {expandedRows.has(row.id) ? (
            <ChevronUp size={16} className="text-gray-500" />
          ) : (
            <ChevronDown size={16} className="text-gray-500" />
          )}
        </button>
      ),
      width: '40px'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        {Object.entries(categoryConfig).slice(0, 4).map(([category, config]) => {
          const Icon = config.icon;
          return (
            <div key={category} className={`p-4 rounded-lg ${config.bgColor}`}>
              <div className={`flex items-center gap-2 ${config.color}`}>
                <Icon size={20} />
                <span className="font-medium capitalize">{category.replace('_', ' ')}</span>
              </div>
              <div className={`text-2xl font-bold mt-1 ${config.color}`}>
                {stats[category] || 0}
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-wrap items-center gap-4">
          <TimeRangeFilter
            value={timeRange}
            onChange={handleTimeRangeChange}
            customDateFrom={dateFrom}
            customDateTo={dateTo}
          />

          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
          >
            <option value="">All Categories</option>
            {actionCategories.map(cat => (
              <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
            ))}
          </select>

          <select
            value={entityTypeFilter}
            onChange={(e) => { setEntityTypeFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
          >
            <option value="">All Entity Types</option>
            {entityTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <select
            value={severityFilter}
            onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>

          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Search activity..."
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore="true"
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
            />
          </div>

          <button
            onClick={() => fetchLogs()}
            className="p-2 hover:bg-gray-100 rounded"
            title="Refresh"
          >
            <RefreshCw size={16} className="text-gray-600" />
          </button>

          <div className="flex gap-1">
            <button
              onClick={() => handleExport('csv')}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-[#1e3a5f] text-white rounded hover:bg-[#152a47]"
            >
              <Download size={14} /> CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-gray-50"
            >
              <Download size={14} /> JSON
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <AdminTableTemplate<AdminActivityLog>
        title="Admin Activity Audit Log"
        data={logs}
        columns={columns}
        rowKey={(row) => row.id}
        loading={loading}
        emptyMessage="No admin activity logs found"
        onRowClick={(row) => toggleRowExpand(row.id)}
        pagination={{
          page,
          pageSize,
          total: totalItems,
          onPageChange: setPage
        }}
      />

      {/* Expanded Row Details - Before/After Data */}
      {logs.filter(log => expandedRows.has(log.id)).map(log => (
        <div key={`detail-${log.id}`} className="bg-gray-50 border border-gray-200 rounded-lg p-4 -mt-2">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium text-gray-700 mb-2">Action Description</div>
                <div className="text-sm flex items-start gap-2">
                  <span>{log.action_description}</span>
                  <CopyButton text={log.action_description} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {log.before_data && Object.keys(log.before_data).length > 0 && (
                <div>
                  <div className="font-medium text-gray-700 mb-2">Before Data</div>
                  <div className="relative">
                    <pre className="text-xs bg-red-50 p-3 rounded overflow-auto max-h-48 font-mono">
                      {JSON.stringify(log.before_data, null, 2)}
                    </pre>
                    <div className="absolute top-1 right-1">
                      <CopyButton text={JSON.stringify(log.before_data, null, 2)} iconSize={12} />
                    </div>
                  </div>
                </div>
              )}

              {log.after_data && Object.keys(log.after_data).length > 0 && (
                <div>
                  <div className="font-medium text-gray-700 mb-2">After Data</div>
                  <div className="relative">
                    <pre className="text-xs bg-green-50 p-3 rounded overflow-auto max-h-48 font-mono">
                      {JSON.stringify(log.after_data, null, 2)}
                    </pre>
                    <div className="absolute top-1 right-1">
                      <CopyButton text={JSON.stringify(log.after_data, null, 2)} iconSize={12} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-2 border-t border-gray-200">
              <div>
                <div className="font-medium text-gray-500">IP Address</div>
                <div className="mt-1 text-xs font-mono">{log.ip_address || '-'}</div>
              </div>
              <div>
                <div className="font-medium text-gray-500">Session ID</div>
                <div className="mt-1 text-xs font-mono truncate" title={log.session_id || ''}>
                  {log.session_id || '-'}
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-500">Requires Approval</div>
                <div className="mt-1">{log.requires_approval ? 'Yes' : 'No'}</div>
              </div>
              {log.approved_at && (
                <div>
                  <div className="font-medium text-gray-500">Approved At</div>
                  <div className="mt-1 text-xs">{new Date(log.approved_at).toLocaleString()}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminActivityPage() {
  return (
    <ErrorBoundary fallback={<ErrorFallback title="Admin Activity Error" />}>
      <AdminActivityPageContent />
    </ErrorBoundary>
  );
}
