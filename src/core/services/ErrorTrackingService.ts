/**
 * ErrorTrackingService - Centralized Error Logging & Grouping
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: Extends BizError for custom errors
 * - Build Map v2.1 ENHANCED patterns
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @authority PHASE_6.2_BRAIN_PLAN.md - Error Tracking Implementation
 * @phase Phase 6.2 - Performance & Monitoring
 * @complexity STANDARD tier (~400 lines, ≤4 dependencies)
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { DbResult } from '@core/types/db';
import { ErrorLogRow } from '@core/types/db-rows';
import { bigIntToNumber, safeJsonParse } from '@core/utils/bigint';

// ============================================================================
// TypeScript Interfaces & Enums
// ============================================================================

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorStatus {
  UNRESOLVED = 'unresolved',
  INVESTIGATING = 'investigating',
  RESOLVED = 'resolved'
}

export interface ErrorLog {
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
  severity: ErrorSeverity;
  status: ErrorStatus;
  resolved_at: Date | null;
  resolved_by: number | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

export interface LogErrorData {
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  requestUrl?: string;
  requestMethod?: string;
  userId?: number;
  userAgent?: string;
  ipAddress?: string;
  severity?: ErrorSeverity;
  metadata?: Record<string, unknown>;
}

export interface ErrorStats {
  totalErrors: number;
  errorsByType: Array<{ type: string; count: number }>;
  errorsBySeverity: Array<{ severity: ErrorSeverity; count: number }>;
  unresolvedCount: number;
}

// ============================================================================
// Service Class
// ============================================================================

export class ErrorTrackingService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // ==========================================================================
  // LOGGING METHODS
  // ==========================================================================

  /**
   * Log error to database (fire-and-forget)
   *
   * @param data - Error logging data
   * @returns Promise<ErrorLog | null> - Returns error log if successful, null if failed
   *
   * @example
   * ```typescript
   * await errorTracker.logError({
   *   errorType: 'TypeError',
   *   errorMessage: 'Cannot read property "id" of undefined',
   *   stackTrace: error.stack,
   *   requestUrl: req.url,
   *   severity: ErrorSeverity.HIGH
   * });
   * ```
   */
  async logError(data: LogErrorData): Promise<ErrorLog | null> {
    try {
      const environment = process.env.NODE_ENV || 'development';

      const result: DbResult = await this.db.query(
        `INSERT INTO error_logs (
          error_type, error_message, stack_trace, request_url, request_method,
          user_id, user_agent, ip_address, environment, severity, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.errorType,
          data.errorMessage,
          data.stackTrace || null,
          data.requestUrl || null,
          data.requestMethod || null,
          data.userId || null,
          data.userAgent || null,
          data.ipAddress || null,
          environment,
          data.severity || ErrorSeverity.MEDIUM,
          data.metadata ? JSON.stringify(data.metadata) : null
        ]
      );

      if (!result.insertId) {
        return null;
      }

      return await this.getErrorById(result.insertId);

    } catch (error) {
      // Circuit breaker: Don't fail original request if error logging fails
      console.error('[ErrorTrackingService] Failed to log error:', error);
      return null;
    }
  }

  // ==========================================================================
  // RETRIEVAL METHODS
  // ==========================================================================

  /**
   * Get error log by ID
   *
   * @param id - Error log ID
   * @returns Promise<ErrorLog | null>
   */
  async getErrorById(id: number): Promise<ErrorLog | null> {
    const result: DbResult<ErrorLogRow> = await this.db.query(
      'SELECT * FROM error_logs WHERE id = ?',
      [id]
    );

    const row = result.rows[0];
    if (!row) return null;
    return this.mapRowToErrorLog(row);
  }

  /**
   * Get all error logs with optional filters
   *
   * @param filters - Optional filters
   * @returns Promise<ErrorLog[]>
   */
  async getAllErrors(filters?: {
    severity?: ErrorSeverity;
    status?: ErrorStatus;
    limit?: number;
  }): Promise<ErrorLog[]> {
    let query = 'SELECT * FROM error_logs WHERE 1=1';
    const params: (string | number)[] = [];

    if (filters?.severity) {
      query += ' AND severity = ?';
      params.push(filters.severity);
    }

    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY created_at DESC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const result: DbResult<ErrorLogRow> = await this.db.query(query, params);

    return result.rows.map(this.mapRowToErrorLog);
  }

  /**
   * Get error statistics
   *
   * @returns Promise<ErrorStats>
   */
  async getErrorStats(): Promise<ErrorStats> {
    // Total errors
    const totalResult: DbResult<{total: bigint | number}> = await this.db.query(
      'SELECT COUNT(*) as total FROM error_logs'
    );
    const totalErrors = bigIntToNumber((totalResult.rows[0] as {total: bigint | number} | undefined)?.total);

    // Errors by type
    const typeResult: DbResult<{type: string; count: bigint | number}> = await this.db.query(
      `SELECT error_type as type, COUNT(*) as count
       FROM error_logs
       GROUP BY error_type
       ORDER BY count DESC
       LIMIT 10`
    );
    const errorsByType = typeResult.rows.map((row) => ({
      type: row.type,
      count: bigIntToNumber(row.count)
    }));

    // Errors by severity
    const severityResult: DbResult<{severity: string; count: bigint | number}> = await this.db.query(
      `SELECT severity, COUNT(*) as count
       FROM error_logs
       GROUP BY severity`
    );
    const errorsBySeverity = severityResult.rows.map((row) => ({
      severity: row.severity as ErrorSeverity,
      count: bigIntToNumber(row.count)
    }));

    // Unresolved count
    const unresolvedResult: DbResult<{count: bigint | number}> = await this.db.query(
      'SELECT COUNT(*) as count FROM error_logs WHERE status = ?',
      [ErrorStatus.UNRESOLVED]
    );
    const unresolvedCount = bigIntToNumber((unresolvedResult.rows[0] as {count: bigint | number} | undefined)?.count);

    return {
      totalErrors,
      errorsByType,
      errorsBySeverity,
      unresolvedCount
    };
  }

  /**
   * Update error status
   *
   * @param id - Error log ID
   * @param status - New status
   * @param resolvedBy - User ID who resolved (if status is 'resolved')
   * @returns Promise<ErrorLog>
   */
  async updateErrorStatus(
    id: number,
    status: ErrorStatus,
    resolvedBy?: number
  ): Promise<ErrorLog> {
    const existing = await this.getErrorById(id);
    if (!existing) {
      throw new BizError({
        code: 'ERROR_NOT_FOUND',
        message: `Error log not found: ${id}`,
        context: { id },
        userMessage: 'Error log not found'
      });
    }

    const updates: string[] = ['status = ?'];
    const params: (string | number)[] = [status];

    if (status === ErrorStatus.RESOLVED) {
      updates.push('resolved_at = NOW()');
      if (resolvedBy) {
        updates.push('resolved_by = ?');
        params.push(resolvedBy);
      }
    }

    params.push(id);

    await this.db.query(
      `UPDATE error_logs SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await this.getErrorById(id);
    if (!updated) {
      throw new BizError({
        code: 'UPDATE_FAILED',
        message: 'Failed to retrieve updated error log',
        context: { id },
        userMessage: 'Failed to update error log'
      });
    }

    return updated;
  }

  /**
   * Delete a single error log
   *
   * @param id - Error log ID to delete
   * @returns Promise<boolean> - true if deleted, false if not found
   */
  async deleteError(id: number): Promise<boolean> {
    const result = await this.db.query(
      'DELETE FROM error_logs WHERE id = ?',
      [id]
    );
    return result.rowCount > 0;
  }

  /**
   * Delete all error logs
   *
   * @returns Promise<number> - Number of deleted records
   */
  async deleteAllErrors(): Promise<number> {
    const result = await this.db.query('DELETE FROM error_logs');
    return result.rowCount;
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private mapRowToErrorLog(row: ErrorLogRow): ErrorLog {
    return {
      id: row.id,
      error_type: row.error_type,
      error_message: row.error_message,
      stack_trace: row.stack_trace,
      request_url: row.request_url,
      request_method: row.request_method,
      user_id: row.user_id,
      user_agent: row.user_agent,
      ip_address: row.ip_address,
      environment: row.environment,
      severity: row.severity as ErrorSeverity,
      status: row.status as ErrorStatus,
      resolved_at: row.resolved_at ? new Date(row.resolved_at) : null,
      resolved_by: row.resolved_by,
      metadata: safeJsonParse(row.metadata, null),
      created_at: new Date(row.created_at)
    };
  }
}
