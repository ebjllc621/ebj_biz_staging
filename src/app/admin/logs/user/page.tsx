/**
 * Admin User Logs Page
 *
 * GOVERNANCE COMPLIANCE:
 * - Template: AdminTableTemplate (MANDATORY)
 * - Authentication: Admin-only access required
 * - Service Boundary: NO direct database access (API routes only)
 * - Credentials: 'include' for all fetch requests
 * - Complexity: STANDARD tier
 *
 * Features:
 * - User activity logs table with pagination
 * - Time range filters (7d, 30d, 90d, custom)
 * - Filter by action type, success/failure
 * - Expandable rows for full message view
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
import { TimeRangeFilter, TimeRange, CopyButton, ExpandableLogRow } from '@/components/admin/logs';
import { Download, Search, RefreshCw, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { downloadFile, generateTimestampedFilename } from '@core/utils/export';
import { generateUserLogCSVExport, generateUserLogJSONExport } from '@core/utils/export/logExport';

interface UserLog {
  id: number;
  user_id: number | null;
  action: string;
  action_type: string;
  description: string;
  ip_address: string | null;
  user_agent: string | null;
  device_type: string | null;
  location: string | null;
  session_id: string | null;
  duration: number | null;
  success: boolean;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface LogsResponse {
  logs: UserLog[];
  actionTypes: string[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function UserLogsPageContent() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<UserLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Filters
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState('');
  const [successFilter, setSuccessFilter] = useState<'all' | 'true' | 'false'>('all');
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
      if (actionTypeFilter) params.append('actionType', actionTypeFilter);
      if (successFilter !== 'all') params.append('success', successFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/admin/logs/user?${params}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const json = await response.json();
        const data: LogsResponse = json.data;
        setLogs(data.logs || []);
        setActionTypes(data.actionTypes || []);
        setTotalItems(data.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch user logs:', error);
    } finally {
      setLoading(false);
    }
  }, [page, dateFrom, dateTo, actionTypeFilter, successFilter, searchQuery]);

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
      user_id: log.user_id,
      action: log.action,
      action_type: log.action_type,
      description: log.description,
      ip_address: log.ip_address,
      device_type: log.device_type,
      location: log.location,
      success: log.success,
      error_message: log.error_message,
      created_at: log.created_at
    }));

    if (format === 'json') {
      const content = generateUserLogJSONExport(exportData);
      downloadFile(content, generateTimestampedFilename('user-logs', 'json'), 'application/json');
    } else {
      const content = generateUserLogCSVExport(exportData);
      downloadFile(content, generateTimestampedFilename('user-logs', 'csv'), 'text/csv');
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

  const columns: TableColumn<UserLog>[] = [
    {
      key: 'id',
      header: 'ID',
      accessor: (row) => row.id,
      sortable: true,
      width: '60px'
    },
    {
      key: 'user_id',
      header: 'User',
      accessor: (row) => row.user_id ?? '-',
      sortable: true,
      width: '80px'
    },
    {
      key: 'action',
      header: 'Action',
      accessor: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
          {row.action}
        </span>
      ),
      sortable: true
    },
    {
      key: 'action_type',
      header: 'Type',
      accessor: (row) => (
        <span className="text-xs text-gray-500">{row.action_type}</span>
      ),
      sortable: true
    },
    {
      key: 'description',
      header: 'Description',
      accessor: (row) => (
        <div className="max-w-xs">
          <ExpandableLogRow content={row.description} maxLength={50} showCopy={false} />
        </div>
      )
    },
    {
      key: 'success',
      header: 'Status',
      accessor: (row) => (
        row.success ? (
          <span className="inline-flex items-center gap-1 text-green-600">
            <CheckCircle size={14} /> Success
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-red-600">
            <XCircle size={14} /> Failed
          </span>
        )
      ),
      sortable: true,
      width: '100px'
    },
    {
      key: 'ip_address',
      header: 'IP',
      accessor: (row) => (
        <span className="text-xs font-mono text-gray-500">
          {row.ip_address ? row.ip_address.substring(0, 16) + '...' : '-'}
        </span>
      )
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
            value={actionTypeFilter}
            onChange={(e) => { setActionTypeFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
          >
            <option value="">All Action Types</option>
            {actionTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <select
            value={successFilter}
            onChange={(e) => { setSuccessFilter(e.target.value as 'all' | 'true' | 'false'); setPage(1); }}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
          >
            <option value="all">All Status</option>
            <option value="true">Success Only</option>
            <option value="false">Failed Only</option>
          </select>

          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Search logs..."
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
      <AdminTableTemplate<UserLog>
        title="User Activity Logs"
        data={logs}
        columns={columns}
        rowKey={(row) => row.id}
        loading={loading}
        emptyMessage="No user logs found"
        onRowClick={(row) => toggleRowExpand(row.id)}
        pagination={{
          page,
          pageSize,
          total: totalItems,
          onPageChange: setPage
        }}
      />

      {/* Expanded Row Details */}
      {logs.filter(log => expandedRows.has(log.id)).map(log => (
        <div key={`detail-${log.id}`} className="bg-gray-50 border border-gray-200 rounded-lg p-4 -mt-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium text-gray-500">Full Description</div>
              <div className="mt-1 flex items-start gap-2">
                <span>{log.description}</span>
                <CopyButton text={log.description} />
              </div>
            </div>
            {log.error_message && (
              <div>
                <div className="font-medium text-gray-500">Error Message</div>
                <div className="mt-1 text-red-600 flex items-start gap-2">
                  <span>{log.error_message}</span>
                  <CopyButton text={log.error_message} />
                </div>
              </div>
            )}
            <div>
              <div className="font-medium text-gray-500">User Agent</div>
              <div className="mt-1 text-xs font-mono truncate" title={log.user_agent || ''}>
                {log.user_agent || '-'}
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-500">Session ID</div>
              <div className="mt-1 text-xs font-mono">{log.session_id || '-'}</div>
            </div>
            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <div className="col-span-2">
                <div className="font-medium text-gray-500">Metadata</div>
                <pre className="mt-1 text-xs bg-white p-2 rounded overflow-auto max-h-32">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function UserLogsPage() {
  return (
    <ErrorBoundary fallback={<ErrorFallback title="User Logs Error" />}>
      <UserLogsPageContent />
    </ErrorBoundary>
  );
}
