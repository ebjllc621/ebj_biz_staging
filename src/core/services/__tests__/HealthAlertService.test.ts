/**
 * HealthAlertService Integration Tests
 *
 * Tests the complete alert flow including configuration, throttling, and email sending.
 *
 * @phase Phase 5 - Service Health Monitoring Enhancement
 * @authority SERVICE_HEALTH_MONITORING_MASTER_BRAIN_PLAN.md
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { HealthAlertService, AlertType, AlertLevel } from '../HealthAlertService';
import { DatabaseService } from '../DatabaseService';
import { AuthServiceRegistry } from '@core/registry/AuthServiceRegistry';

// Mock AuthServiceRegistry for email service
vi.mock('@core/registry/AuthServiceRegistry', () => ({
  AuthServiceRegistry: {
    getEmailService: vi.fn()
  }
}));

describe('HealthAlertService', () => {
  let service: HealthAlertService;
  let mockDb: { query: Mock };
  let mockEmailService: { send: Mock };

  beforeEach(() => {
    mockDb = { query: vi.fn() };
    mockEmailService = { send: vi.fn().mockResolvedValue({ success: true }) };
    (AuthServiceRegistry.getEmailService as Mock).mockResolvedValue(mockEmailService);
    service = new HealthAlertService(mockDb as unknown as DatabaseService);
  });

  // ============================================================================
  // Configuration Management Tests
  // ============================================================================

  describe('getConfig()', () => {
    it('returns null when no config exists', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const config = await service.getConfig();

      expect(config).toBeNull();
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM health_alert_config')
      );
    });

    it('returns mapped config when exists', async () => {
      const mockRow = {
        id: 1,
        enabled: 1,
        admin_email: 'admin@example.com',
        throttle_minutes: 15,
        alert_on_unhealthy: 1,
        alert_on_recovered: 1,
        alert_on_degraded: 1,
        updated_by: 42,
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-01-02'),
      };
      mockDb.query.mockResolvedValue({ rows: [mockRow] });

      const config = await service.getConfig();

      expect(config).toEqual({
        id: 1,
        enabled: true,
        adminEmail: 'admin@example.com',
        throttleMinutes: 15,
        alertOnUnhealthy: true,
        alertOnRecovered: true,
        alertOnDegraded: true,
        updatedBy: 42,
        createdAt: mockRow.created_at,
        updatedAt: mockRow.updated_at,
      });
    });
  });

  // ============================================================================
  // Alert Enabled Check Tests
  // ============================================================================

  describe('isAlertEnabled()', () => {
    it('returns false when no config exists', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const enabled = await service.isAlertEnabled();

      expect(enabled).toBe(false);
    });

    it('returns true when config enabled', async () => {
      mockDb.query.mockResolvedValue({ rows: [
        { id: 1, enabled: 1, admin_email: 'admin@example.com', throttle_minutes: 15 }
      ]});

      const enabled = await service.isAlertEnabled();

      expect(enabled).toBe(true);
    });

    it('returns false when config disabled', async () => {
      mockDb.query.mockResolvedValue({ rows: [
        { id: 1, enabled: 0, admin_email: 'admin@example.com', throttle_minutes: 15 }
      ]});

      const enabled = await service.isAlertEnabled();

      expect(enabled).toBe(false);
    });
  });

  // ============================================================================
  // Send Health Alert Tests
  // ============================================================================

  describe('sendHealthAlert()', () => {
    const mockConfig = {
      id: 1,
      enabled: 1,
      admin_email: 'admin@example.com',
      throttle_minutes: 15,
      alert_on_unhealthy: 1,
      alert_on_recovered: 1,
      alert_on_degraded: 1,
      updated_by: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('returns false when alerts disabled', async () => {
      const disabledConfig = { ...mockConfig, enabled: 0 };
      mockDb.query.mockResolvedValue({ rows: [disabledConfig] });

      const sent = await service.sendHealthAlert({
        serviceName: 'TestService',
        alertType: 'unhealthy',
        alertLevel: 'critical',
      });

      expect(sent).toBe(false);
      expect(mockEmailService.send).not.toHaveBeenCalled();
    });

    it('returns false when alert type disabled', async () => {
      const configNoUnhealthy = { ...mockConfig, alert_on_unhealthy: 0 };
      mockDb.query.mockResolvedValue({ rows: [configNoUnhealthy] });

      const sent = await service.sendHealthAlert({
        serviceName: 'TestService',
        alertType: 'unhealthy',
        alertLevel: 'critical',
      });

      expect(sent).toBe(false);
      expect(mockEmailService.send).not.toHaveBeenCalled();
    });

    it('returns false when throttled', async () => {
      // First query: getConfig
      // Second query: check last alert (throttle check)
      // Third query: log alert (even when throttled, we still log it)
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockConfig] })
        .mockResolvedValueOnce({ rows: [{ created_at: new Date() }] }) // Recent alert
        .mockResolvedValueOnce({ insertId: 1 }); // Alert logged

      const sent = await service.sendHealthAlert({
        serviceName: 'TestService',
        alertType: 'unhealthy',
        alertLevel: 'critical',
      });

      expect(sent).toBe(false);
      expect(mockEmailService.send).not.toHaveBeenCalled();
    });

    it('returns true when alert sent successfully', async () => {
      // First query: getConfig
      // Second query: check last alert (no recent alerts)
      // Third query: log alert
      // Fourth query: getAlertLog (fetches the logged alert)
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockConfig] })
        .mockResolvedValueOnce({ rows: [] }) // No recent alerts
        .mockResolvedValueOnce({ insertId: 1 }) // Alert logged
        .mockResolvedValueOnce({ rows: [{ id: 1, created_at: new Date() }] }); // Get logged alert

      const sent = await service.sendHealthAlert({
        serviceName: 'TestService',
        alertType: 'unhealthy',
        alertLevel: 'critical',
        errorMessage: 'Database connection failed',
        errorComponent: 'ConnectionPool',
      });

      expect(sent).toBe(true);
      expect(mockEmailService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin@example.com',
          subject: expect.stringContaining('UNHEALTHY'),
        })
      );
    });

    it('sends degraded alert with warning level', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockConfig] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ insertId: 1 });

      const sent = await service.sendHealthAlert({
        serviceName: 'CacheService',
        alertType: 'degraded',
        alertLevel: 'warning',
        errorMessage: 'Cache hit rate below threshold',
      });

      expect(sent).toBe(true);
      expect(mockEmailService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin@example.com',
          subject: expect.stringContaining('DEGRADED'),
        })
      );
    });

    it('sends recovery alert', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockConfig] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ insertId: 1 });

      const sent = await service.sendHealthAlert({
        serviceName: 'DatabaseService',
        alertType: 'recovered',
        alertLevel: 'warning',
        errorMessage: 'Service has recovered',
      });

      expect(sent).toBe(true);
      expect(mockEmailService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin@example.com',
          subject: expect.stringContaining('RECOVERED'),
        })
      );
    });
  });

  // ============================================================================
  // Update Configuration Tests
  // ============================================================================

  describe('updateConfig()', () => {
    const existingConfig = {
      id: 1,
      enabled: 1,
      admin_email: 'admin@example.com',
      throttle_minutes: 15,
      alert_on_unhealthy: 1,
      alert_on_recovered: 1,
      alert_on_degraded: 1,
      updated_by: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('throws when no config exists', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      await expect(
        service.updateConfig({ enabled: false }, 1)
      ).rejects.toThrow('Health alert configuration not found');
    });

    it('validates email format', async () => {
      mockDb.query.mockResolvedValue({ rows: [existingConfig] });

      await expect(
        service.updateConfig({ adminEmail: 'invalid-email' }, 1)
      ).rejects.toThrow('Invalid email format');
    });

    it('validates throttle range', async () => {
      mockDb.query.mockResolvedValue({ rows: [existingConfig] });

      await expect(
        service.updateConfig({ throttleMinutes: 0 }, 1)
      ).rejects.toThrow('Throttle minutes must be between');

      await expect(
        service.updateConfig({ throttleMinutes: 2000 }, 1)
      ).rejects.toThrow('Throttle minutes must be between');
    });

    it('updates config successfully', async () => {
      const updatedConfig = { ...existingConfig, enabled: 0, admin_email: 'newemail@example.com', throttle_minutes: 30, alert_on_recovered: 0 };
      mockDb.query
        .mockResolvedValueOnce({ rows: [existingConfig] }) // First getConfig
        .mockResolvedValueOnce({ rows: [], affectedRows: 1 }) // UPDATE
        .mockResolvedValueOnce({ rows: [updatedConfig] }); // Second getConfig (returns updated)

      const updated = await service.updateConfig(
        {
          enabled: false,
          adminEmail: 'newemail@example.com',
          throttleMinutes: 30,
          alertOnRecovered: false,
        },
        42
      );

      expect(updated.enabled).toBe(false);
      expect(updated.adminEmail).toBe('newemail@example.com');
      expect(updated.throttleMinutes).toBe(30);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE health_alert_config'),
        expect.arrayContaining([0, 'newemail@example.com', 30, 0, 42])
      );
    });

    it('updates only provided fields', async () => {
      const updatedConfig = { ...existingConfig, enabled: 0 };
      mockDb.query
        .mockResolvedValueOnce({ rows: [existingConfig] })
        .mockResolvedValueOnce({ rows: [], affectedRows: 1 })
        .mockResolvedValueOnce({ rows: [updatedConfig] });

      await service.updateConfig({ enabled: false }, 1);

      // Should only update enabled field
      const updateCall = mockDb.query.mock.calls[1];
      expect(updateCall[0]).toContain('enabled = ?');
      expect(updateCall[0]).not.toContain('admin_email = ?');
    });
  });
});
