/**
 * AlertingService - Performance & Error Alert Management
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: Extends BizError for custom errors
 * - Build Map v2.1 ENHANCED patterns
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @authority PHASE_6.2_BRAIN_PLAN.md - Alerting System Implementation
 * @phase Phase 6.2 - Performance & Monitoring
 * @complexity STANDARD tier (~350 lines, ≤4 dependencies)
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { DbResult } from '@core/types/db';
import { AlertRow } from '@core/types/db-rows';

// ============================================================================
// TypeScript Interfaces & Enums
// ============================================================================

export enum AlertType {
  RESPONSE_TIME = 'response_time',
  ERROR_RATE = 'error_rate',
  CPU_USAGE = 'cpu_usage',
  MEMORY_USAGE = 'memory_usage'
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical'
}

export interface Alert {
  id: number;
  alert_type: AlertType;
  alert_name: string;
  threshold_value: number | null;
  current_value: number | null;
  severity: AlertSeverity;
  message: string;
  action_taken: string | null;
  acknowledged: boolean;
  acknowledged_by: number | null;
  acknowledged_at: Date | null;
  resolved: boolean;
  resolved_at: Date | null;
  metadata: Record<string, unknown> | null;
  environment: string;
  created_at: Date;
}

export interface CreateAlertInput {
  alertType: AlertType;
  alertName: string;
  thresholdValue?: number;
  currentValue?: number;
  severity?: AlertSeverity;
  message: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Service Class
// ============================================================================

export class AlertingService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // ==========================================================================
  // ALERT MANAGEMENT
  // ==========================================================================

  /**
   * Create a new alert
   *
   * @param data - Alert creation data
   * @returns Promise<Alert>
   *
   * @example
   * ```typescript
   * await alertingService.createAlert({
   *   alertType: AlertType.RESPONSE_TIME,
   *   alertName: 'API Response Time Exceeded',
   *   thresholdValue: 1000,
   *   currentValue: 1456.78,
   *   severity: AlertSeverity.WARNING,
   *   message: 'GET /api/listings exceeded 1000ms threshold (1456.78ms)'
   * });
   * ```
   */
  async createAlert(data: CreateAlertInput): Promise<Alert> {
    const environment = process.env.NODE_ENV || 'development';

    const result: DbResult<AlertRow> = await this.db.query(
      `INSERT INTO alerts (
        alert_type, alert_name, threshold_value, current_value,
        severity, message, metadata, environment
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.alertType,
        data.alertName,
        data.thresholdValue || null,
        data.currentValue || null,
        data.severity || AlertSeverity.WARNING,
        data.message,
        data.metadata ? JSON.stringify(data.metadata) : null,
        environment
      ]
    );

    if (!result.insertId) {
      throw BizError.databaseError(
        'create alert',
        new Error('No insert ID returned')
      );
    }

    const created = await this.getAlertById(result.insertId);
    if (!created) {
      throw BizError.databaseError(
        'create alert',
        new Error('Failed to retrieve created alert')
      );
    }

    return created;
  }

  /**
   * Get alert by ID
   *
   * @param id - Alert ID
   * @returns Promise<Alert | null>
   */
  async getAlertById(id: number): Promise<Alert | null> {
    const result: DbResult<AlertRow> = await this.db.query(
      'SELECT * FROM alerts WHERE id = ?',
      [id]
    );

    const row = result.rows[0];
    if (!row) return null;
    return this.mapRowToAlert(row);
  }

  /**
   * Get all alerts with optional filters
   *
   * @param filters - Optional filters
   * @returns Promise<Alert[]>
   */
  async getAllAlerts(filters?: {
    severity?: AlertSeverity;
    acknowledged?: boolean;
    resolved?: boolean;
    limit?: number;
  }): Promise<Alert[]> {
    let query = 'SELECT * FROM alerts WHERE 1=1';
    const params: (string | number)[] = [];

    if (filters?.severity) {
      query += ' AND severity = ?';
      params.push(filters.severity);
    }

    if (filters?.acknowledged !== undefined) {
      query += ' AND acknowledged = ?';
      params.push(filters.acknowledged ? 1 : 0);
    }

    if (filters?.resolved !== undefined) {
      query += ' AND resolved = ?';
      params.push(filters.resolved ? 1 : 0);
    }

    query += ' ORDER BY created_at DESC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const result: DbResult<AlertRow> = await this.db.query(query, params);

    return result.rows.map(this.mapRowToAlert);
  }

  /**
   * Acknowledge an alert
   *
   * @param id - Alert ID
   * @param acknowledgedBy - User ID who acknowledged
   * @returns Promise<Alert>
   */
  async acknowledgeAlert(id: number, acknowledgedBy?: number): Promise<Alert> {
    const existing = await this.getAlertById(id);
    if (!existing) {
      throw new BizError({
        code: 'ALERT_NOT_FOUND',
        message: `Alert not found: ${id}`,
        context: { id },
        userMessage: 'Alert not found'
      });
    }

    const params: number[] = [1]; // acknowledged = true
    let query = 'UPDATE alerts SET acknowledged = ?, acknowledged_at = NOW()';

    if (acknowledgedBy) {
      query += ', acknowledged_by = ?';
      params.push(acknowledgedBy);
    }

    query += ' WHERE id = ?';
    params.push(id);

    await this.db.query(query, params);

    const updated = await this.getAlertById(id);
    if (!updated) {
      throw BizError.databaseError(
        'acknowledge alert',
        new Error('Failed to retrieve updated alert')
      );
    }

    return updated;
  }

  /**
   * Resolve an alert
   *
   * @param id - Alert ID
   * @param actionTaken - Description of action taken to resolve
   * @returns Promise<Alert>
   */
  async resolveAlert(id: number, actionTaken?: string): Promise<Alert> {
    const existing = await this.getAlertById(id);
    if (!existing) {
      throw new BizError({
        code: 'ALERT_NOT_FOUND',
        message: `Alert not found: ${id}`,
        context: { id },
        userMessage: 'Alert not found'
      });
    }

    const params: (number | string)[] = [1]; // resolved = true
    let query = 'UPDATE alerts SET resolved = ?, resolved_at = NOW()';

    if (actionTaken) {
      query += ', action_taken = ?';
      params.push(actionTaken);
    }

    query += ' WHERE id = ?';
    params.push(id);

    await this.db.query(query, params);

    const updated = await this.getAlertById(id);
    if (!updated) {
      throw BizError.databaseError(
        'resolve alert',
        new Error('Failed to retrieve updated alert')
      );
    }

    return updated;
  }

  /**
   * Send email alert notification
   *
   * @param alert - Alert to send
   * @param recipientEmail - Email address to send to
   * @returns Promise<void>
   *
   * NOTE: This is a placeholder. In production, integrate with MailSender from Phase 2.4
   */
  async sendEmailAlert(alert: Alert, recipientEmail: string): Promise<void> {
    // TODO: Integrate with MailSender service
    console.log(`[AlertingService] Email alert sent to ${recipientEmail}:`, {
      subject: `${alert.severity.toUpperCase()}: ${alert.alert_name}`,
      message: alert.message,
      alertId: alert.id
    });
  }

  /**
   * Send Slack webhook alert notification
   *
   * @param alert - Alert to send
   * @param webhookUrl - Slack webhook URL
   * @returns Promise<void>
   *
   * NOTE: This is a placeholder. In production, implement Slack API integration
   */
  async sendSlackAlert(alert: Alert, webhookUrl: string): Promise<void> {
    // TODO: Implement Slack webhook integration
  }

  /**
   * Delete a single alert
   *
   * @param id - Alert ID to delete
   * @returns Promise<boolean> - true if deleted, false if not found
   */
  async deleteAlert(id: number): Promise<boolean> {
    const result = await this.db.query(
      'DELETE FROM alerts WHERE id = ?',
      [id]
    );
    return result.rowCount > 0;
  }

  /**
   * Delete all unacknowledged alerts
   *
   * @returns Promise<number> - Number of deleted records
   */
  async deleteAllAlerts(): Promise<number> {
    const result = await this.db.query(
      'DELETE FROM alerts WHERE acknowledged = 0'
    );
    return result.rowCount;
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private mapRowToAlert(row: AlertRow): Alert {
    return {
      id: row.id,
      alert_type: row.alert_type as AlertType,
      alert_name: row.alert_name,
      threshold_value: row.threshold_value !== null ? Number(row.threshold_value) : null,
      current_value: row.current_value !== null ? Number(row.current_value) : null,
      severity: row.severity as AlertSeverity,
      message: row.message,
      action_taken: row.action_taken,
      acknowledged: Boolean(row.acknowledged),
      acknowledged_by: row.acknowledged_by,
      acknowledged_at: row.acknowledged_at ? new Date(row.acknowledged_at) : null,
      resolved: Boolean(row.resolved),
      resolved_at: row.resolved_at ? new Date(row.resolved_at) : null,
      metadata: row.metadata && typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      environment: row.environment,
      created_at: new Date(row.created_at)
    };
  }
}
