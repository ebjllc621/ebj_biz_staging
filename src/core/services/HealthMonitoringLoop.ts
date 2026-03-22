/**
 * HealthMonitoringLoop - Continuous Health Monitoring Service
 *
 * @module HealthMonitoringLoop
 * @description Background service that continuously monitors service health
 * and triggers alerts when state transitions occur (healthy→unhealthy, recovery).
 *
 * @phase Phase 5 - Service Health Monitoring Enhancement
 * @authority Build Map v2.1 ENHANCED
 * @pattern Singleton pattern via ServiceRegistry
 * @dependencies DatabaseHealthService, HealthAlertService
 *
 * @features
 * - Configurable check interval (default 60 seconds)
 * - State transition detection (healthy→unhealthy, recovery)
 * - Respects HealthAlertService configuration (enabled/disabled)
 * - Error pause mechanism (pause after consecutive errors)
 * - Graceful shutdown support
 * - Thread-safe state management
 */

import { DatabaseHealthService } from './DatabaseHealthService';
import { HealthAlertService, AlertType, AlertLevel, HealthAlertInput } from './HealthAlertService';
import type { DatabaseHealthResponse, AlertLevel as HealthAlertLevel } from '@core/types/health';
import { ErrorService } from '@core/services/ErrorService';

/**
 * Health status levels for state transition tracking
 */
export type ServiceHealthLevel = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Configuration for the monitoring loop
 */
export interface MonitoringLoopConfig {
  /** Interval between health checks in milliseconds (default: 60000 = 1 minute) */
  intervalMs: number;

  /** Whether to send alerts when services recover (default: true) */
  alertOnRecovery: boolean;

  /** Maximum consecutive errors before pausing (default: 5) */
  maxConsecutiveErrors: number;

  /** Duration to pause after max errors in milliseconds (default: 300000 = 5 minutes) */
  errorPauseMs: number;
}

/**
 * Represents a detected health state transition
 */
export interface HealthStateTransition {
  /** Service or component name */
  component: string;

  /** Specific metric that changed (e.g., "pool_active", "service_status") */
  metric: string;

  /** Previous health level */
  previousLevel: ServiceHealthLevel;

  /** Current health level */
  currentLevel: ServiceHealthLevel;

  /** Human-readable message describing the transition */
  message: string;

  /** Timestamp of the transition */
  timestamp: Date;
}

/**
 * Current status of the monitoring loop
 */
export interface MonitoringLoopStatus {
  /** Whether the loop is currently running */
  running: boolean;

  /** Timestamp of the last health check */
  lastCheckTime: Date | null;

  /** Result of the last health check */
  lastCheckResult: 'success' | 'error' | 'none';

  /** Total number of checks completed */
  checksCompleted: number;

  /** Total number of alerts sent */
  alertsSent: number;

  /** Number of consecutive errors */
  consecutiveErrors: number;

  /** Whether the loop is paused due to errors */
  paused: boolean;

  /** Timestamp when pause will end (if paused) */
  pauseEndsAt: Date | null;
}

/**
 * HealthMonitoringLoop - Background service for continuous health monitoring
 *
 * @example
 * ```typescript
 * const loop = new HealthMonitoringLoop(healthService, alertService);
 * loop.start();
 *
 * // Later...
 * const status = loop.getStatus();
 * console.log(`Checks completed: ${status.checksCompleted}`);
 *
 * // Cleanup
 * loop.stop();
 * ```
 */
export class HealthMonitoringLoop {
  private healthService: DatabaseHealthService;
  private alertService: HealthAlertService;
  private config: MonitoringLoopConfig;
  private intervalHandle: NodeJS.Timeout | null = null;
  private previousHealthState: Map<string, ServiceHealthLevel> = new Map();
  private status: MonitoringLoopStatus;

  constructor(
    healthService: DatabaseHealthService,
    alertService: HealthAlertService,
    config: Partial<MonitoringLoopConfig> = {}
  ) {
    this.healthService = healthService;
    this.alertService = alertService;

    // Merge config with defaults
    this.config = {
      intervalMs: config.intervalMs ?? 60000, // 1 minute default
      alertOnRecovery: config.alertOnRecovery ?? true,
      maxConsecutiveErrors: config.maxConsecutiveErrors ?? 5,
      errorPauseMs: config.errorPauseMs ?? 300000, // 5 minutes default
    };

    // Initialize status
    this.status = {
      running: false,
      lastCheckTime: null,
      lastCheckResult: 'none',
      checksCompleted: 0,
      alertsSent: 0,
      consecutiveErrors: 0,
      paused: false,
      pauseEndsAt: null,
    };
  }

  /**
   * Start the monitoring loop
   */
  public start(): void {
    if (this.status.running) {
      console.log('[HealthMonitoringLoop] Already running');
      return;
    }

    console.log(`[HealthMonitoringLoop] Starting with interval ${this.config.intervalMs}ms`);
    this.status.running = true;
    this.status.paused = false;
    this.status.pauseEndsAt = null;

    // Run first check immediately
    this.runCheck().catch(err => {
      ErrorService.capture('[HealthMonitoringLoop] Initial check error:', err);
    });

    // Schedule recurring checks
    this.intervalHandle = setInterval(() => {
      this.runCheck().catch(err => {
        ErrorService.capture('[HealthMonitoringLoop] Check error:', err);
      });
    }, this.config.intervalMs);
  }

  /**
   * Stop the monitoring loop
   */
  public stop(): void {
    if (!this.status.running) {
      console.log('[HealthMonitoringLoop] Not running');
      return;
    }

    console.log('[HealthMonitoringLoop] Stopping');
    this.status.running = false;

    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  /**
   * Get current loop status
   */
  public getStatus(): MonitoringLoopStatus {
    return { ...this.status };
  }

  /**
   * Run a single health check iteration
   */
  public async runCheck(): Promise<void> {
    // Check if paused due to errors
    if (this.status.paused && this.status.pauseEndsAt) {
      if (new Date() < this.status.pauseEndsAt) {
        console.log('[HealthMonitoringLoop] Paused due to consecutive errors');
        return;
      }
      // Resume after pause
      this.status.paused = false;
      this.status.pauseEndsAt = null;
      this.status.consecutiveErrors = 0;
      console.log('[HealthMonitoringLoop] Resuming after error pause');
    }

    // Check if alerts are enabled
    const alertsEnabled = await this.alertService.isAlertEnabled();
    if (!alertsEnabled) {
      console.log('[HealthMonitoringLoop] Alerts disabled, skipping check');
      return;
    }

    try {
      // Run health check
      const healthData = await this.healthService.getDetailedHealth();
      this.status.lastCheckTime = new Date();
      this.status.lastCheckResult = 'success';
      this.status.checksCompleted++;
      this.status.consecutiveErrors = 0;

      // Detect state transitions
      const transitions = this.detectTransitions(healthData);

      if (transitions.length > 0) {
        console.log(`[HealthMonitoringLoop] Detected ${transitions.length} state transition(s)`);
        await this.processTransitions(transitions);
      }

    } catch (error) {
      this.status.lastCheckResult = 'error';
      this.status.consecutiveErrors++;

      ErrorService.capture('[HealthMonitoringLoop] Health check failed:', error);

      // Pause if too many consecutive errors
      if (this.status.consecutiveErrors >= this.config.maxConsecutiveErrors) {
        this.status.paused = true;
        this.status.pauseEndsAt = new Date(Date.now() + this.config.errorPauseMs);
        ErrorService.capture(
          `[HealthMonitoringLoop] Too many consecutive errors (${this.status.consecutiveErrors}), ` +
          `pausing until ${this.status.pauseEndsAt.toISOString()}`
        );
      }
    }
  }

  /**
   * Detect health state transitions by comparing current state to previous state
   */
  private detectTransitions(healthData: DatabaseHealthResponse): HealthStateTransition[] {
    const transitions: HealthStateTransition[] = [];
    const currentTime = new Date();

    // Check overall database health transition
    const dbKey = 'database_overall';
    const previousDbLevel = this.previousHealthState.get(dbKey);
    const currentDbLevel = healthData.status;

    if (previousDbLevel && previousDbLevel !== currentDbLevel) {
      transitions.push({
        component: 'Database',
        metric: 'overall_health',
        previousLevel: previousDbLevel,
        currentLevel: currentDbLevel,
        message: `Database health changed from ${previousDbLevel} to ${currentDbLevel}`,
        timestamp: currentTime,
      });
    }
    this.previousHealthState.set(dbKey, currentDbLevel);

    // Check connection pool metrics
    if (healthData.pool?.stats) {
      const stats = healthData.pool.stats;

      // Active connections threshold check
      const activeKey = 'pool_active';
      const previousActiveLevel = this.previousHealthState.get(activeKey);
      const currentActiveLevel = this.getConnectionLevel(stats.active, stats.total);

      if (previousActiveLevel && previousActiveLevel !== currentActiveLevel) {
        transitions.push({
          component: 'Connection Pool',
          metric: 'active_connections',
          previousLevel: previousActiveLevel,
          currentLevel: currentActiveLevel,
          message: `Active connections: ${stats.active}/${stats.total} (${currentActiveLevel})`,
          timestamp: currentTime,
        });
      }
      this.previousHealthState.set(activeKey, currentActiveLevel);
    }

    // Check each service's health
    if (healthData.services?.details) {
      for (const serviceDetail of healthData.services.details) {
        const serviceKey = `service_${serviceDetail.name}`;
        const previousServiceLevel = this.previousHealthState.get(serviceKey);
        const currentServiceLevel = this.getServiceLevel(serviceDetail);

        if (previousServiceLevel && previousServiceLevel !== currentServiceLevel) {
          transitions.push({
            component: serviceDetail.name,
            metric: 'service_status',
            previousLevel: previousServiceLevel,
            currentLevel: currentServiceLevel,
            message: `${serviceDetail.name} changed from ${previousServiceLevel} to ${currentServiceLevel}`,
            timestamp: currentTime,
          });
        }
        this.previousHealthState.set(serviceKey, currentServiceLevel);
      }
    }

    return transitions;
  }

  /**
   * Process detected transitions and send appropriate alerts
   */
  private async processTransitions(transitions: HealthStateTransition[]): Promise<void> {
    for (const transition of transitions) {
      const isRecovery = this.isRecoveryTransition(transition);
      const isDegradation = this.isDegradationTransition(transition);

      // Skip recovery alerts if not configured
      if (isRecovery && !this.config.alertOnRecovery) {
        console.log(`[HealthMonitoringLoop] Skipping recovery alert for ${transition.component}`);
        continue;
      }

      // Determine alert type and level
      let alertType: AlertType;
      let alertLevel: AlertLevel;

      if (isRecovery) {
        alertType = 'recovered';
        alertLevel = 'warning'; // HealthAlertService uses 'warning' | 'critical'
      } else if (transition.currentLevel === 'unhealthy') {
        alertType = 'unhealthy';
        alertLevel = 'critical';
      } else if (transition.currentLevel === 'degraded') {
        alertType = 'degraded';
        alertLevel = 'warning';
      } else {
        // Skip healthy transitions (shouldn't happen but be safe)
        continue;
      }

      // Send alert using HealthAlertInput structure
      try {
        const sent = await this.alertService.sendHealthAlert({
          serviceName: transition.component,
          alertType,
          alertLevel,
          errorMessage: transition.message,
          errorComponent: transition.metric,
        });

        if (sent) {
          this.status.alertsSent++;
          console.log(
            `[HealthMonitoringLoop] Sent ${alertType} alert for ${transition.component}: ${transition.message}`
          );
        }
      } catch (error) {
        ErrorService.capture(`[HealthMonitoringLoop] Failed to send alert for ${transition.component}:`, error);
      }
    }
  }

  /**
   * Determine if a transition represents a recovery
   */
  private isRecoveryTransition(transition: HealthStateTransition): boolean {
    return (
      (transition.previousLevel === 'unhealthy' || transition.previousLevel === 'degraded') &&
      transition.currentLevel === 'healthy'
    );
  }

  /**
   * Determine if a transition represents a degradation
   */
  private isDegradationTransition(transition: HealthStateTransition): boolean {
    return (
      transition.previousLevel === 'healthy' &&
      (transition.currentLevel === 'degraded' || transition.currentLevel === 'unhealthy')
    );
  }

  /**
   * Calculate health level based on connection count vs limit
   */
  private getConnectionLevel(active: number, limit: number): ServiceHealthLevel {
    const usage = active / limit;

    if (usage >= 0.9) {
      return 'unhealthy'; // 90%+ usage
    } else if (usage >= 0.7) {
      return 'degraded'; // 70-89% usage
    } else {
      return 'healthy'; // < 70% usage
    }
  }

  /**
   * Determine service health level from ServiceHealthDetail
   */
  private getServiceLevel(serviceDetail: { healthy: boolean; initialized: boolean }): ServiceHealthLevel {
    if (!serviceDetail.initialized) {
      return 'unhealthy';
    }
    return serviceDetail.healthy ? 'healthy' : 'unhealthy';
  }
}
