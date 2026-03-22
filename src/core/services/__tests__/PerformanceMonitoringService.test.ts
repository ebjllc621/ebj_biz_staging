/**
 * PerformanceMonitoringService Test Suite
 *
 * Tests the Performance Monitoring Service with mocked DatabaseService.
 * Covers all 11 methods with circuit breaker patterns and caching behavior.
 *
 * @see PerformanceMonitoringService.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerformanceMonitoringService, MetricType, PerformanceEnvironment } from '../PerformanceMonitoringService';
import { DatabaseService } from '../DatabaseService';

// Mock DatabaseService
vi.mock('../DatabaseService');

describe('PerformanceMonitoringService', () => {
  let service: PerformanceMonitoringService;
  let mockDb: unknown;

  beforeEach(() => {
    // Create mock database
    mockDb = {
      query: vi.fn()
    };

    service = new PerformanceMonitoringService(mockDb as DatabaseService);
  });

  describe('trackApiResponse', () => {
    it('should track API response without throwing (circuit breaker)', async () => {
      mockDb.query.mockResolvedValueOnce({ insertId: 1 });

      await expect(service.trackApiResponse({
        endpoint: 'GET /api/test',
        duration: 45.23,
        statusCode: 200
      })).resolves.not.toThrow();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO performance_metrics'),
        expect.arrayContaining([
          MetricType.API_RESPONSE,
          'GET /api/test',
          45.23,
          200
        ])
      );
    });

    it('should not throw if database insert fails (circuit breaker)', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('DB Error'));

      await expect(service.trackApiResponse({
        endpoint: 'GET /api/test',
        duration: 45.23,
        statusCode: 200
      })).resolves.not.toThrow();
    });
  });

  describe('trackDbQuery', () => {
    it('should track database query performance', async () => {
      mockDb.query.mockResolvedValueOnce({ insertId: 1 });

      await service.trackDbQuery({
        queryType: 'SELECT_categories',
        duration: 34.56
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO performance_metrics'),
        expect.arrayContaining([
          MetricType.DB_QUERY,
          'SELECT_categories',
          34.56
        ])
      );
    });
  });

  describe('trackSystemResource', () => {
    it('should track memory usage', async () => {
      mockDb.query.mockResolvedValueOnce({ insertId: 1 });

      await service.trackSystemResource('memory', 'heap_used', 512.45);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO performance_metrics'),
        expect.arrayContaining([
          MetricType.MEMORY,
          'heap_used',
          512.45
        ])
      );
    });

    it('should track CPU usage', async () => {
      mockDb.query.mockResolvedValueOnce({ insertId: 1 });

      await service.trackSystemResource('cpu', 'usage_percent', 23.5);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO performance_metrics'),
        expect.arrayContaining([
          MetricType.CPU,
          'usage_percent',
          23.5
        ])
      );
    });
  });

  describe('getMetrics', () => {
    it('should retrieve metrics by type and time range', async () => {
      const mockRows = [
        {
          id: 1,
          metric_type: 'api_response',
          metric_name: 'GET /api/test',
          value: 45.23,
          status_code: 200,
          user_id: null,
          metadata: null,
          environment: 'production',
          created_at: new Date()
        }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockRows });

      const start = new Date('2025-01-01');
      const end = new Date('2025-01-02');
      const metrics = await service.getMetrics(MetricType.API_RESPONSE, { start, end });

      expect(metrics).toHaveLength(1);
      expect(metrics[0].metric_name).toBe('GET /api/test');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE metric_type = ?'),
        expect.arrayContaining([MetricType.API_RESPONSE, start, end])
      );
    });
  });

  describe('getAggregateStats', () => {
    it('should calculate aggregate statistics', async () => {
      const mockRows = [
        { value: 100, status_code: 200 },
        { value: 200, status_code: 200 },
        { value: 300, status_code: 500 }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockRows }); // calculateStats query
      mockDb.query.mockResolvedValueOnce({ rows: [{ total: 3, errors: 1 }] }); // getErrorRate query
      mockDb.query.mockResolvedValueOnce({ rows: [] }); // getSlowestEndpoints query

      const start = new Date('2025-01-01');
      const end = new Date('2025-01-02');
      const stats = await service.getAggregateStats({ start, end });

      expect(stats.avgResponseTime).toBeCloseTo(200);
      expect(stats.totalRequests).toBe(3);
      expect(stats.errorRate).toBeCloseTo(33.33, 1);
    });

    it('should cache statistics for repeated calls', async () => {
      const mockRows = [{ value: 100, status_code: 200 }];

      mockDb.query.mockResolvedValue({ rows: mockRows });
      mockDb.query.mockResolvedValue({ rows: [{ total: 1, errors: 0 }] });
      mockDb.query.mockResolvedValue({ rows: [] });

      const start = new Date('2025-01-01');
      const end = new Date('2025-01-02');

      await service.getAggregateStats({ start, end });
      const cachedStats = await service.getAggregateStats({ start, end });

      // Should use cached result - query called only once
      expect(mockDb.query).toHaveBeenCalledTimes(3); // calculateStats + getErrorRate + getSlowestEndpoints
    });
  });

  describe('getSlowestEndpoints', () => {
    it('should return top N slowest endpoints', async () => {
      const mockRows = [
        { endpoint: 'GET /api/slow', avgTime: 1000, count: 10 },
        { endpoint: 'POST /api/medium', avgTime: 500, count: 5 }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockRows });

      const start = new Date('2025-01-01');
      const end = new Date('2025-01-02');
      const endpoints = await service.getSlowestEndpoints(10, { start, end });

      expect(endpoints).toHaveLength(2);
      expect(endpoints[0].endpoint).toBe('GET /api/slow');
      expect(endpoints[0].avgTime).toBe(1000);
    });
  });

  describe('getErrorRate', () => {
    it('should calculate error rate percentage', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 100, errors: 10 }]
      });

      const start = new Date('2025-01-01');
      const end = new Date('2025-01-02');
      const errorRate = await service.getErrorRate({ start, end });

      expect(errorRate).toBe(10);
    });

    it('should return 0 when no requests', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 0, errors: 0 }]
      });

      const start = new Date('2025-01-01');
      const end = new Date('2025-01-02');
      const errorRate = await service.getErrorRate({ start, end });

      expect(errorRate).toBe(0);
    });
  });

  describe('getMemoryUsageTrend', () => {
    it('should return memory usage data points', async () => {
      const mockRows = [
        { created_at: '2025-01-01T00:00:00Z', value: 512.45 },
        { created_at: '2025-01-01T01:00:00Z', value: 580.12 }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockRows });

      const start = new Date('2025-01-01');
      const end = new Date('2025-01-02');
      const trend = await service.getMemoryUsageTrend({ start, end });

      expect(trend).toHaveLength(2);
      expect(trend[0].value).toBe(512.45);
    });
  });

  describe('clearCache', () => {
    it('should clear statistics cache', async () => {
      const mockRows = [{ value: 100, status_code: 200 }];

      mockDb.query.mockResolvedValue({ rows: mockRows });
      mockDb.query.mockResolvedValue({ rows: [{ total: 1, errors: 0 }] });
      mockDb.query.mockResolvedValue({ rows: [] });

      const start = new Date('2025-01-01');
      const end = new Date('2025-01-02');

      await service.getAggregateStats({ start, end });
      service.clearCache();
      await service.getAggregateStats({ start, end });

      // After clearing cache, should query again
      expect(mockDb.query).toHaveBeenCalledTimes(6); // 3 calls x 2 (before and after cache clear)
    });
  });
});
