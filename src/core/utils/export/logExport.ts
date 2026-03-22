/**
 * Log Export Utilities - Generate JSON and CSV exports for log data
 *
 * @tier STANDARD
 * @authority CLAUDE.md - Export Standards
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface UserLogExportData {
  id: number;
  user_id: number | null;
  action: string;
  action_type: string;
  description: string;
  ip_address: string | null;
  device_type: string | null;
  location: string | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export interface ErrorLogExportData {
  id: number;
  error_type: string;
  error_message: string;
  stack_trace: string | null;
  request_url: string | null;
  request_method: string | null;
  user_id: number | null;
  environment: string;
  severity: string;
  status: string;
  created_at: string;
}

export interface AdminActivityExportData {
  id: number;
  admin_user_id: number;
  admin_username?: string;
  action_type: string;
  action_category: string;
  action_description: string;
  target_entity_type: string;
  target_entity_id: number | null;
  severity: string;
  created_at: string;
  before_data?: Record<string, unknown> | null;
  after_data?: Record<string, unknown> | null;
}

// ============================================================================
// JSON Export Functions
// ============================================================================

/**
 * Generate JSON export for user logs
 */
export function generateUserLogJSONExport(logs: UserLogExportData[]): string {
  const exportData = {
    exportType: 'user_logs',
    exportedAt: new Date().toISOString(),
    totalRecords: logs.length,
    logs
  };
  return JSON.stringify(exportData, null, 2);
}

/**
 * Generate JSON export for error logs
 */
export function generateErrorLogJSONExport(logs: ErrorLogExportData[]): string {
  const exportData = {
    exportType: 'error_logs',
    exportedAt: new Date().toISOString(),
    totalRecords: logs.length,
    logs
  };
  return JSON.stringify(exportData, null, 2);
}

/**
 * Generate JSON export for admin activity logs
 */
export function generateAdminActivityJSONExport(logs: AdminActivityExportData[]): string {
  const exportData = {
    exportType: 'admin_activity',
    exportedAt: new Date().toISOString(),
    totalRecords: logs.length,
    logs
  };
  return JSON.stringify(exportData, null, 2);
}

// ============================================================================
// CSV Export Functions
// ============================================================================

/**
 * Escape CSV value according to RFC 4180
 */
function escapeCSVValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Generate CSV export for user logs
 */
export function generateUserLogCSVExport(logs: UserLogExportData[]): string {
  const BOM = '\uFEFF';

  const headers = [
    'ID',
    'User ID',
    'Action',
    'Action Type',
    'Description',
    'IP Address',
    'Device Type',
    'Location',
    'Success',
    'Error Message',
    'Created At'
  ];

  const headerRow = headers.map(h => escapeCSVValue(h)).join(',');

  const dataRows = logs.map(log => [
    log.id,
    log.user_id ?? '',
    log.action,
    log.action_type,
    log.description,
    log.ip_address ?? '',
    log.device_type ?? '',
    log.location ?? '',
    log.success ? 'TRUE' : 'FALSE',
    log.error_message ?? '',
    log.created_at
  ].map(v => escapeCSVValue(v)).join(','));

  return BOM + [headerRow, ...dataRows].join('\r\n');
}

/**
 * Generate CSV export for error logs
 */
export function generateErrorLogCSVExport(logs: ErrorLogExportData[]): string {
  const BOM = '\uFEFF';

  const headers = [
    'ID',
    'Error Type',
    'Error Message',
    'Stack Trace',
    'Request URL',
    'Request Method',
    'User ID',
    'Environment',
    'Severity',
    'Status',
    'Created At'
  ];

  const headerRow = headers.map(h => escapeCSVValue(h)).join(',');

  const dataRows = logs.map(log => [
    log.id,
    log.error_type,
    log.error_message,
    log.stack_trace ?? '',
    log.request_url ?? '',
    log.request_method ?? '',
    log.user_id ?? '',
    log.environment,
    log.severity,
    log.status,
    log.created_at
  ].map(v => escapeCSVValue(v)).join(','));

  return BOM + [headerRow, ...dataRows].join('\r\n');
}

/**
 * Generate CSV export for admin activity logs
 */
export function generateAdminActivityCSVExport(logs: AdminActivityExportData[]): string {
  const BOM = '\uFEFF';

  const headers = [
    'ID',
    'Admin User ID',
    'Admin Username',
    'Action Type',
    'Action Category',
    'Description',
    'Target Entity Type',
    'Target Entity ID',
    'Severity',
    'Created At'
  ];

  const headerRow = headers.map(h => escapeCSVValue(h)).join(',');

  const dataRows = logs.map(log => [
    log.id,
    log.admin_user_id,
    log.admin_username ?? '',
    log.action_type,
    log.action_category,
    log.action_description,
    log.target_entity_type,
    log.target_entity_id ?? '',
    log.severity,
    log.created_at
  ].map(v => escapeCSVValue(v)).join(','));

  return BOM + [headerRow, ...dataRows].join('\r\n');
}
