/**
 * Admin Error Logs Page
 *
 * GOVERNANCE COMPLIANCE:
 * - Template: AdminTableTemplate (MANDATORY)
 * - Authentication: Admin-only access required
 * - Service Boundary: NO direct database access (API routes only)
 * - Credentials: 'include' for all fetch requests
 * - Complexity: STANDARD tier
 *
 * Features:
 * - Error logs table with pagination
 * - Time range filters (7d, 30d, 90d, custom)
 * - Filter by severity, status, error type
 * - Expandable rows for stack trace
 * - Click to copy functionality
 * - Export to JSON/CSV
 *
 * @authority CLAUDE.md - Admin Standards
 * @tier STANDARD
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AdminTableTemplate, TableColumn } from '@/components/admin/templates/AdminTableTemplate';
import { useAuth } from '@core/hooks/useAuth';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ErrorFallback } from '@/components/common/ErrorFallback';
import { TimeRangeFilter, TimeRange, CopyButton, ExpandableLogRow } from '@/components/admin/logs';
import { Download, Search, RefreshCw, AlertTriangle, AlertCircle, Info, XCircle, ChevronDown, ChevronUp, Check, Eye, Clock } from 'lucide-react';
import { downloadFile, generateTimestampedFilename } from '@core/utils/export';
import { generateErrorLogCSVExport, generateErrorLogJSONExport } from '@core/utils/export/logExport';
import { fetchWithCsrf } from '@core/utils/csrf';

interface ErrorLog {
  id: number;
  error_type: string;
  error_message: string;
  stack_trace: string | null;
  request_url: string | null;
  request_method: string | null;
  user_id: number | null;
  user_agent: string | null;
  ip_address: string | null;
  environment: string;
  severity: string;
  status: string;
  resolved_at: string | null;
  resolved_by: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface LogsResponse {
  logs: ErrorLog[];
  errorTypes: string[];
  stats: {
    bySeverity: Record<string, number>;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const severityConfig: Record<string, { icon: typeof AlertCircle; color: string; bgColor: string }> = {
  critical: { icon: XCircle, color: 'text-red-700', bgColor: 'bg-red-100' },
  high: { icon: AlertTriangle, color: 'text-orange-700', bgColor: 'bg-orange-100' },
  medium: { icon: AlertCircle, color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  low: { icon: Info, color: 'text-blue-700', bgColor: 'bg-blue-100' }
};

const STATUS_OPTIONS = ['unresolved', 'under_review', 'resolved'] as const;

const statusConfig: Record<string, { color: string; bgColor: string; hoverBg: string; icon: typeof Clock; label: string }> = {
  unresolved: { color: 'text-red-700', bgColor: 'bg-red-100', hoverBg: 'hover:bg-red-200', icon: Clock, label: 'Unresolved' },
  under_review: { color: 'text-yellow-700', bgColor: 'bg-yellow-100', hoverBg: 'hover:bg-yellow-200', icon: Eye, label: 'Under Review' },
  investigating: { color: 'text-yellow-700', bgColor: 'bg-yellow-100', hoverBg: 'hover:bg-yellow-200', icon: Eye, label: 'Under Review' },
  resolved: { color: 'text-green-700', bgColor: 'bg-green-100', hoverBg: 'hover:bg-green-200', icon: Check, label: 'Resolved' }
};

function ErrorLogsPageContent() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorTypes, setErrorTypes] = useState<string[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Filters
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [errorTypeFilter, setErrorTypeFilter] = useState('');
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
      if (severityFilter) params.append('severity', severityFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (errorTypeFilter) params.append('errorType', errorTypeFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/admin/logs/error?${params}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const json = await response.json();
        const data: LogsResponse = json.data;
        setLogs(data.logs || []);
        setErrorTypes(data.errorTypes || []);
        setStats(data.stats?.bySeverity || {});
        setTotalItems(data.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch error logs:', error);
    } finally {
      setLoading(false);
    }
  }, [page, dateFrom, dateTo, severityFilter, statusFilter, errorTypeFilter, searchQuery]);

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
      error_type: log.error_type,
      error_message: log.error_message,
      stack_trace: log.stack_trace,
      request_url: log.request_url,
      request_method: log.request_method,
      user_id: log.user_id,
      environment: log.environment,
      severity: log.severity,
      status: log.status,
      created_at: log.created_at
    }));

    if (format === 'json') {
      const content = generateErrorLogJSONExport(exportData);
      downloadFile(content, generateTimestampedFilename('error-logs', 'json'), 'application/json');
    } else {
      const content = generateErrorLogCSVExport(exportData);
      downloadFile(content, generateTimestampedFilename('error-logs', 'csv'), 'text/csv');
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

  const [statusDropdownId, setStatusDropdownId] = useState<number | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);

  const handleStatusChange = useCallback(async (logId: number, newStatus: string) => {
    setUpdatingStatus(logId);
    setStatusDropdownId(null);
    try {
      const response = await fetchWithCsrf('/api/admin/logs/error', {
        method: 'PATCH',
        body: JSON.stringify({ id: logId, status: newStatus })
      });

      if (response.ok) {
        setLogs(prev => prev.map(log =>
          log.id === logId ? { ...log, status: newStatus } : log
        ));
      }
    } catch (error) {
      console.error('Failed to update error status:', error);
    } finally {
      setUpdatingStatus(null);
    }
  }, []);

  // Close status dropdown on outside click
  useEffect(() => {
    if (statusDropdownId === null) return;
    const handleClick = () => setStatusDropdownId(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [statusDropdownId]);

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

  const columns: TableColumn<ErrorLog>[] = [
    {
      key: 'id',
      header: 'ID',
      accessor: (row) => row.id,
      sortable: true,
      width: '60px'
    },
    {
      key: 'severity',
      header: 'Severity',
      accessor: (row) => {
        const config = severityConfig[row.severity] ?? severityConfig.medium!;
        const Icon = config.icon;
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.color}`}>
            <Icon size={12} />
            {row.severity}
          </span>
        );
      },
      sortable: true,
      width: '100px'
    },
    {
      key: 'error_type',
      header: 'Type',
      accessor: (row) => (
        <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
          {row.error_type}
        </span>
      ),
      sortable: true
    },
    {
      key: 'error_message',
      header: 'Message',
      accessor: (row) => (
        <div className="max-w-md">
          <ExpandableLogRow content={row.error_message} maxLength={80} showCopy={false} />
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => {
        const config = statusConfig[row.status] ?? statusConfig.unresolved!;
        const StatusIcon = config.icon;
        const isUpdating = updatingStatus === row.id;
        const isDropdownOpen = statusDropdownId === row.id;

        return (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setStatusDropdownId(isDropdownOpen ? null : row.id);
              }}
              disabled={isUpdating}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.color} ${config.hoverBg} cursor-pointer transition-colors ${isUpdating ? 'opacity-50' : ''}`}
              title="Click to change status"
            >
              <StatusIcon size={12} />
              {isUpdating ? 'Updating...' : config.label}
            </button>

            {isDropdownOpen && (
              <div className="absolute z-50 mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px]">
                {STATUS_OPTIONS.map(statusOption => {
                  const optConfig = statusConfig[statusOption]!;
                  const OptIcon = optConfig.icon;
                  const isCurrent = row.status === statusOption || (row.status === 'investigating' && statusOption === 'under_review');
                  return (
                    <button
                      key={statusOption}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isCurrent) {
                          handleStatusChange(row.id, statusOption);
                        } else {
                          setStatusDropdownId(null);
                        }
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-gray-50 ${isCurrent ? 'font-bold bg-gray-50' : ''}`}
                    >
                      <OptIcon size={12} className={optConfig.color} />
                      <span className={optConfig.color}>{optConfig.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      },
      sortable: true,
      width: '140px'
    },
    {
      key: 'environment',
      header: 'Env',
      accessor: (row) => (
        <span className="text-xs text-gray-500">{row.environment}</span>
      ),
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
        {Object.entries(severityConfig).map(([severity, config]) => {
          const Icon = config.icon;
          return (
            <div key={severity} className={`p-4 rounded-lg ${config.bgColor}`}>
              <div className={`flex items-center gap-2 ${config.color}`}>
                <Icon size={20} />
                <span className="font-medium capitalize">{severity}</span>
              </div>
              <div className={`text-2xl font-bold mt-1 ${config.color}`}>
                {stats[severity] || 0}
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
            value={severityFilter}
            onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
          >
            <option value="">All Status</option>
            <option value="unresolved">Unresolved</option>
            <option value="under_review">Under Review</option>
            <option value="resolved">Resolved</option>
          </select>

          <select
            value={errorTypeFilter}
            onChange={(e) => { setErrorTypeFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
          >
            <option value="">All Error Types</option>
            {errorTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Search errors..."
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
      <AdminTableTemplate<ErrorLog>
        title="Error Logs"
        data={logs}
        columns={columns}
        rowKey={(row) => row.id}
        loading={loading}
        emptyMessage="No error logs found"
        onRowClick={(row) => toggleRowExpand(row.id)}
        pagination={{
          page,
          pageSize,
          total: totalItems,
          onPageChange: setPage
        }}
      />

      {/* Expanded Row Details - Stack Trace */}
      {logs.filter(log => expandedRows.has(log.id)).map(log => (
        <div key={`detail-${log.id}`} className="bg-gray-50 border border-gray-200 rounded-lg p-4 -mt-2">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-700">Error Message</span>
                <CopyButton text={log.error_message} />
              </div>
              <div className="text-sm bg-red-50 text-red-800 p-3 rounded font-mono">
                {log.error_message}
              </div>
            </div>

            {log.stack_trace && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-700">Stack Trace</span>
                  <CopyButton text={log.stack_trace} />
                </div>
                <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-auto max-h-64 font-mono">
                  {log.stack_trace}
                </pre>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-500">Request URL</div>
                <div className="mt-1 text-xs font-mono truncate" title={log.request_url || ''}>
                  {log.request_url || '-'}
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-500">Method</div>
                <div className="mt-1">{log.request_method || '-'}</div>
              </div>
              <div>
                <div className="font-medium text-gray-500">User ID</div>
                <div className="mt-1">{log.user_id || '-'}</div>
              </div>
              <div>
                <div className="font-medium text-gray-500">IP Address</div>
                <div className="mt-1 text-xs font-mono">{log.ip_address || '-'}</div>
              </div>
            </div>

            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <div>
                <div className="font-medium text-gray-500 mb-2">Metadata</div>
                <pre className="text-xs bg-white p-2 rounded overflow-auto max-h-32 border">
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

export default function ErrorLogsPage() {
  return (
    <ErrorBoundary fallback={<ErrorFallback title="Error Logs Error" />}>
      <ErrorLogsPageContent />
    </ErrorBoundary>
  );
}
