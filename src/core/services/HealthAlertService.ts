/**
 * HealthAlertService - Health Alert Email Management
 *
 * Manages health alert email configuration and sending with throttling.
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: BizError-based custom errors
 * - Build Map v2.1 ENHANCED patterns
 *
 * @authority SERVICE_HEALTH_MONITORING_MASTER_BRAIN_PLAN.md
 * @phase Phase 3 - Service Health Monitoring Enhancement
 * @tier ADVANCED
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { AuthServiceRegistry } from '@core/registry/AuthServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { ErrorService } from '@core/services/ErrorService';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface HealthAlertConfig {
  id: number;
  enabled: boolean;
  adminEmail: string;
  throttleMinutes: number;
  alertOnUnhealthy: boolean;
  alertOnRecovered: boolean;
  alertOnDegraded: boolean;
  updatedBy: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface HealthAlertConfigUpdate {
  enabled?: boolean;
  adminEmail?: string;
  throttleMinutes?: number;
  alertOnUnhealthy?: boolean;
  alertOnRecovered?: boolean;
  alertOnDegraded?: boolean;
}

export type AlertType = 'unhealthy' | 'recovered' | 'degraded';
export type AlertLevel = 'warning' | 'critical';

export interface HealthAlertInput {
  serviceName: string;
  alertType: AlertType;
  alertLevel: AlertLevel;
  errorMessage?: string;
  errorComponent?: string;
}

export interface HealthAlertLogEntry {
  id: number;
  serviceName: string;
  alertType: AlertType;
  alertLevel: AlertLevel;
  emailSent: boolean;
  recipientEmail: string;
  errorMessage: string | null;
  errorComponent: string | null;
  wasThrottled: boolean;
  createdAt: Date;
}

interface ConfigRow {
  id: number;
  enabled: number;
  admin_email: string;
  throttle_minutes: number;
  alert_on_unhealthy: number;
  alert_on_recovered: number;
  alert_on_degraded: number;
  updated_by: number | null;
  created_at: Date;
  updated_at: Date;
}

interface AlertLogRow {
  created_at: Date;
}

// ============================================================================
// Service Class
// ============================================================================

export class HealthAlertService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // ==========================================================================
  // CONFIGURATION MANAGEMENT
  // ==========================================================================

  /**
   * Get current health alert configuration
   */
  async getConfig(): Promise<HealthAlertConfig | null> {
    const result = await this.db.query<ConfigRow>(
      'SELECT * FROM health_alert_config LIMIT 1'
    );

    const row = result.rows[0];
    if (!row) return null;

    return this.mapConfigRow(row);
  }

  /**
   * Check if health alerts are enabled
   */
  async isAlertEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return config?.enabled ?? false;
  }

  /**
   * Update health alert configuration
   */
  async updateConfig(
    updates: HealthAlertConfigUpdate,
    updatedBy?: number
  ): Promise<HealthAlertConfig> {
    const config = await this.getConfig();

    if (!config) {
      throw new BizError({
        code: 'CONFIG_NOT_FOUND',
        message: 'Health alert configuration not found',
        userMessage: 'Configuration not initialized'
      });
    }

    // Build update query dynamically
    const fields: string[] = [];
    const values: (string | number | boolean)[] = [];

    if (updates.enabled !== undefined) {
      fields.push('enabled = ?');
      values.push(updates.enabled ? 1 : 0);
    }
    if (updates.adminEmail !== undefined) {
      // Validate email format
      if (!this.isValidEmail(updates.adminEmail)) {
        throw new BizError({
          code: 'INVALID_EMAIL',
          message: 'Invalid email format',
          userMessage: 'Please provide a valid email address'
        });
      }
      fields.push('admin_email = ?');
      values.push(updates.adminEmail);
    }
    if (updates.throttleMinutes !== undefined) {
      if (updates.throttleMinutes < 1 || updates.throttleMinutes > 60) {
        throw new BizError({
          code: 'INVALID_THROTTLE',
          message: 'Throttle minutes must be between 1 and 60',
          userMessage: 'Throttle must be between 1 and 60 minutes'
        });
      }
      fields.push('throttle_minutes = ?');
      values.push(updates.throttleMinutes);
    }
    if (updates.alertOnUnhealthy !== undefined) {
      fields.push('alert_on_unhealthy = ?');
      values.push(updates.alertOnUnhealthy ? 1 : 0);
    }
    if (updates.alertOnRecovered !== undefined) {
      fields.push('alert_on_recovered = ?');
      values.push(updates.alertOnRecovered ? 1 : 0);
    }
    if (updates.alertOnDegraded !== undefined) {
      fields.push('alert_on_degraded = ?');
      values.push(updates.alertOnDegraded ? 1 : 0);
    }

    if (fields.length === 0) {
      return config; // No changes
    }

    // Add updated_by
    if (updatedBy) {
      fields.push('updated_by = ?');
      values.push(updatedBy);
    }

    // Add config id for WHERE clause
    values.push(config.id);

    await this.db.query(
      `UPDATE health_alert_config SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const updated = await this.getConfig();
    if (!updated) {
      throw BizError.databaseError('update config', new Error('Config not found after update'));
    }

    return updated;
  }

  // ==========================================================================
  // ALERT SENDING
  // ==========================================================================

  /**
   * Send health alert email with throttling
   *
   * @returns true if email was sent, false if throttled or disabled
   */
  async sendHealthAlert(input: HealthAlertInput): Promise<boolean> {
    const config = await this.getConfig();

    if (!config || !config.enabled) {
      return false;
    }

    // Check if this alert type is enabled
    if (input.alertType === 'unhealthy' && !config.alertOnUnhealthy) return false;
    if (input.alertType === 'recovered' && !config.alertOnRecovered) return false;
    if (input.alertType === 'degraded' && !config.alertOnDegraded) return false;

    // Check throttling
    const isThrottled = await this.checkThrottle(
      input.serviceName,
      input.alertType,
      config.throttleMinutes
    );

    // Log the alert attempt
    const logEntry = await this.logAlert({
      ...input,
      recipientEmail: config.adminEmail,
      emailSent: false,
      wasThrottled: isThrottled
    });

    if (isThrottled) {
      console.log(`[HealthAlertService] Alert throttled for ${input.serviceName}`);
      return false;
    }

    // Send email
    try {
      const emailService = await AuthServiceRegistry.getEmailService();

      const subject = this.buildEmailSubject(input);
      const { html, text } = this.buildEmailContent(input, config.adminEmail);

      const result = await emailService.send({
        to: config.adminEmail,
        subject,
        html,
        text
      });

      // Update log entry with send result
      await this.db.query(
        'UPDATE health_alert_log SET email_sent = ? WHERE id = ?',
        [result.success ? 1 : 0, logEntry.id]
      );

      if (!result.success) {
        ErrorService.capture('[HealthAlertService] Email send failed:', result.error);
        return false;
      }

      console.log(`[HealthAlertService] Alert email sent to ${config.adminEmail} for ${input.serviceName}`);
      return true;

    } catch (error) {
      ErrorService.capture('[HealthAlertService] Failed to send alert email:', error);
      return false;
    }
  }

  // ==========================================================================
  // TEST ALERT SENDING (Phase 6.1)
  // ==========================================================================

  /**
   * Send a test health alert email (bypasses throttling)
   *
   * Used by admin UI to verify email configuration and delivery.
   * Logs the alert with isTest flag for audit differentiation.
   *
   * @returns Detailed result for UI feedback
   */
  async sendTestAlert(input: HealthAlertInput): Promise<{
    success: boolean;
    logId: number;
    recipientEmail: string;
    emailSent: boolean;
    error?: string;
  }> {
    const config = await this.getConfig();

    if (!config) {
      return {
        success: false,
        logId: 0,
        recipientEmail: '',
        emailSent: false,
        error: 'Health alert configuration not found'
      };
    }

    // Note: We do NOT check enabled status for test emails
    // This allows testing even when alerts are disabled
    // Note: We do NOT check throttle for test emails

    // Log the test alert attempt
    const logEntry = await this.logTestAlert({
      ...input,
      recipientEmail: config.adminEmail,
      emailSent: false
    });

    // Send email
    try {
      const emailService = await AuthServiceRegistry.getEmailService();

      const subject = `[TEST] ${this.buildEmailSubject(input)}`;
      const { html, text } = this.buildEmailContent(input, config.adminEmail);

      // Insert TEST banner after body tag
      const testHtmlWithBanner = html.replace(
        /<body[^>]*>/,
        (match) => `${match}<div style="background:#fef3c7;padding:10px;text-align:center;font-weight:bold;color:#92400e;">⚠️ TEST EMAIL - This is a test alert, not a real health issue</div>`
      );

      // Add TEST prefix to text
      const testText = `⚠️ TEST EMAIL - This is a test alert, not a real health issue\n\n${text}`;

      const result = await emailService.send({
        to: config.adminEmail,
        subject,
        html: testHtmlWithBanner,
        text: testText
      });

      // Update log entry with send result
      await this.db.query(
        'UPDATE health_alert_log SET email_sent = ? WHERE id = ?',
        [result.success ? 1 : 0, logEntry.id]
      );

      if (!result.success) {
        ErrorService.capture('[HealthAlertService] Test email send failed:', result.error);
        return {
          success: false,
          logId: logEntry.id,
          recipientEmail: config.adminEmail,
          emailSent: false,
          error: result.error || 'Email service returned failure'
        };
      }

      console.log(`[HealthAlertService] Test alert email sent to ${config.adminEmail}`);
      return {
        success: true,
        logId: logEntry.id,
        recipientEmail: config.adminEmail,
        emailSent: true
      };

    } catch (error) {
      ErrorService.capture('[HealthAlertService] Failed to send test alert email:', error);
      return {
        success: false,
        logId: logEntry.id,
        recipientEmail: config.adminEmail,
        emailSent: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Log test alert attempt (similar to logAlert but with [TEST] prefix in service name)
   */
  private async logTestAlert(data: {
    serviceName: string;
    alertType: AlertType;
    alertLevel: AlertLevel;
    errorMessage?: string;
    errorComponent?: string;
    recipientEmail: string;
    emailSent: boolean;
  }): Promise<{ id: number }> {
    const result = await this.db.query<{ insertId: bigint }>(
      `INSERT INTO health_alert_log
       (service_name, alert_type, alert_level, error_message, error_component, recipient_email, email_sent, was_throttled)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        `[TEST] ${data.serviceName}`,
        data.alertType,
        data.alertLevel,
        data.errorMessage || 'Test alert - No actual error',
        data.errorComponent || null,
        data.recipientEmail,
        data.emailSent ? 1 : 0
      ]
    );

    return { id: Number(result.insertId) };
  }

  // ==========================================================================
  // ALERT LOG MANAGEMENT
  // ==========================================================================

  /**
   * Get recent alert logs
   */
  async getRecentAlerts(limit: number = 50): Promise<HealthAlertLogEntry[]> {
    const result = await this.db.query<HealthAlertLogEntry & { email_sent: number; was_throttled: number; service_name: string; alert_type: string; alert_level: string; recipient_email: string; error_message: string | null; error_component: string | null; created_at: Date }>(
      `SELECT * FROM health_alert_log ORDER BY created_at DESC LIMIT ?`,
      [limit]
    );

    return result.rows.map(row => ({
      id: row.id,
      serviceName: row.service_name,
      alertType: row.alert_type as AlertType,
      alertLevel: row.alert_level as AlertLevel,
      emailSent: Boolean(row.email_sent),
      recipientEmail: row.recipient_email,
      errorMessage: row.error_message,
      errorComponent: row.error_component,
      wasThrottled: Boolean(row.was_throttled),
      createdAt: new Date(row.created_at)
    }));
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Check if alert should be throttled
   */
  private async checkThrottle(
    serviceName: string,
    alertType: AlertType,
    throttleMinutes: number
  ): Promise<boolean> {
    const cutoff = new Date(Date.now() - throttleMinutes * 60 * 1000);

    const result = await this.db.query<AlertLogRow>(
      `SELECT created_at FROM health_alert_log
       WHERE service_name = ?
         AND alert_type = ?
         AND email_sent = 1
         AND created_at > ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [serviceName, alertType, cutoff]
    );

    return result.rows.length > 0;
  }

  /**
   * Log alert attempt
   */
  private async logAlert(data: {
    serviceName: string;
    alertType: AlertType;
    alertLevel: AlertLevel;
    errorMessage?: string;
    errorComponent?: string;
    recipientEmail: string;
    emailSent: boolean;
    wasThrottled: boolean;
  }): Promise<{ id: number }> {
    const result = await this.db.query<{ insertId: bigint }>(
      `INSERT INTO health_alert_log
       (service_name, alert_type, alert_level, error_message, error_component, recipient_email, email_sent, was_throttled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.serviceName,
        data.alertType,
        data.alertLevel,
        data.errorMessage || null,
        data.errorComponent || null,
        data.recipientEmail,
        data.emailSent ? 1 : 0,
        data.wasThrottled ? 1 : 0
      ]
    );

    return { id: Number(result.insertId) };
  }

  /**
   * Build email subject line
   */
  private buildEmailSubject(input: HealthAlertInput): string {
    const emoji = input.alertType === 'recovered' ? '✅' :
                  input.alertLevel === 'critical' ? '🚨' : '⚠️';
    const action = input.alertType === 'recovered' ? 'RECOVERED' :
                   input.alertType === 'unhealthy' ? 'UNHEALTHY' : 'DEGRADED';

    return `${emoji} [Bizconekt] Service ${action}: ${input.serviceName}`;
  }

  /**
   * Build email content (HTML and text)
   */
  private buildEmailContent(
    input: HealthAlertInput,
    _recipientEmail: string
  ): { html: string; text: string } {
    const timestamp = new Date().toISOString();
    const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com';

    const statusColor = input.alertType === 'recovered' ? '#22c55e' :
                        input.alertLevel === 'critical' ? '#ef4444' : '#f59e0b';

    const statusText = input.alertType === 'recovered' ? 'Recovered' :
                       input.alertType === 'unhealthy' ? 'Unhealthy' : 'Degraded';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: ${statusColor}; padding: 20px; color: white;">
      <h1 style="margin: 0; font-size: 24px;">Service Health Alert</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">${statusText}</p>
    </div>
    <div style="padding: 20px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Service</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${input.serviceName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Status</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="background: ${statusColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${statusText.toUpperCase()}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Level</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${input.alertLevel}</td>
        </tr>
        ${input.errorComponent ? `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Component</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${input.errorComponent}</td>
        </tr>` : ''}
        ${input.errorMessage ? `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Error</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #ef4444;">${input.errorMessage}</td>
        </tr>` : ''}
        <tr>
          <td style="padding: 10px 0; font-weight: 600;">Timestamp</td>
          <td style="padding: 10px 0;">${timestamp}</td>
        </tr>
      </table>
      <div style="margin-top: 20px;">
        <a href="${dashboardUrl}/admin/database-manager" style="display: inline-block; background: #3b82f6; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500;">View Dashboard</a>
      </div>
    </div>
    <div style="background: #f9fafb; padding: 15px 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
      This is an automated alert from Bizconekt Service Health Monitoring.
    </div>
  </div>
</body>
</html>`;

    const text = `
Service Health Alert - ${statusText}

Service: ${input.serviceName}
Status: ${statusText.toUpperCase()}
Level: ${input.alertLevel}
${input.errorComponent ? `Component: ${input.errorComponent}\n` : ''}${input.errorMessage ? `Error: ${input.errorMessage}\n` : ''}
Timestamp: ${timestamp}

View Dashboard: ${dashboardUrl}/admin/database-manager

---
This is an automated alert from Bizconekt Service Health Monitoring.
`;

    return { html, text };
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Map database row to HealthAlertConfig
   */
  private mapConfigRow(row: ConfigRow): HealthAlertConfig {
    return {
      id: row.id,
      enabled: Boolean(row.enabled),
      adminEmail: row.admin_email,
      throttleMinutes: row.throttle_minutes,
      alertOnUnhealthy: Boolean(row.alert_on_unhealthy),
      alertOnRecovered: Boolean(row.alert_on_recovered),
      alertOnDegraded: Boolean(row.alert_on_degraded),
      updatedBy: row.updated_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

export default HealthAlertService;
