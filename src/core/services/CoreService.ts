/**
 * CoreService - Abstract Base Service Class
 *
 * Abstract base for all services in Build v5.0 architecture.
 * Replaces BaseService with enhanced patterns.
 *
 * Build Map v2.1 ENHANCED compliance:
 * - Structured error handling with BizError
 * - Contextual logging with Logger
 * - Service lifecycle management
 * - Performance monitoring hooks
 */

import { BizError } from '@core/errors/BizError';
import { Logger, LogContext, ConsoleLogger } from '@core/logging/Logger';

export interface ServiceConfig {
  name: string;
  version?: string;
  environment?: string;
  timeout?: number;
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  checks: Record<string, boolean>;
  metrics?: Record<string, number>;
}

/**
 * Abstract base class for all services
 *
 * Provides:
 * - Structured logging with service context
 * - Error handling and wrapping
 * - Health checking framework
 * - Service lifecycle hooks
 * - Performance monitoring
 */
export abstract class CoreService {
  protected readonly logger: Logger;
  protected readonly config: ServiceConfig;
  private startTime: Date;

  constructor(config: ServiceConfig) {
    this.config = config;
    this.startTime = new Date();

    // Create service-specific logger with context
    const logContext: LogContext = {
      service: config.name,
      metadata: {
        version: config.version,
        environment: config.environment
      }
    };
    this.logger = new ConsoleLogger(logContext);

    this.logger.info('Service initialized', { operation: 'constructor' });
  }

  /**
   * Get service configuration
   */
  getConfig(): Readonly<ServiceConfig> {
    return Object.freeze({ ...this.config });
  }

  /**
   * Get service uptime in milliseconds
   */
  getUptime(): number {
    return Date.now() - this.startTime.getTime();
  }

  /**
   * Perform health check
   * Override in derived classes for specific health checks
   */
  async healthCheck(): Promise<ServiceHealth> {
    try {
      const customChecks = await this.performHealthChecks();

      return {
        status: Object.values(customChecks).every(Boolean) ? 'healthy' : 'degraded',
        timestamp: new Date(),
        checks: {
          uptime: this.getUptime() > 0,
          ...customChecks
        },
        metrics: {
          uptimeMs: this.getUptime()
        }
      };
    } catch (error) {
      this.logger.error('Health check failed', error instanceof Error ? error : new Error(String(error)));

      return {
        status: 'unhealthy',
        timestamp: new Date(),
        checks: { error: false }
      };
    }
  }

  /**
   * Override in derived classes for specific health checks
   */
  protected async performHealthChecks(): Promise<Record<string, boolean>> {
    return { initialized: true };
  }

  /**
   * Wrap operations with error handling and logging
   */
  protected async executeOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    const startTime = Date.now();
    const opContext = { ...context, operation: operationName };

    this.logger.debug(`Starting operation: ${operationName}`, opContext);

    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      this.logger.debug(`Operation completed: ${operationName}`, {
        ...opContext,
        metadata: { durationMs: duration }
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Wrap unknown errors in BizError
      const bizError = error instanceof BizError
        ? error
        : new BizError({
            code: 'OPERATION_FAILED',
            message: `Operation ${operationName} failed: ${error instanceof Error ? error.message : String(error)}`,
            context: { operation: operationName, service: this.config.name },
            cause: error instanceof Error ? error : undefined
          });

      this.logger.error(`Operation failed: ${operationName}`, bizError, {
        ...opContext,
        metadata: { durationMs: duration }
      });

      throw bizError;
    }
  }

  /**
   * Service initialization hook
   * Override in derived classes for initialization logic
   */
  protected async initialize(): Promise<void> {
    this.logger.info('Service initialization started');
    // Override in derived classes
  }

  /**
   * Service shutdown hook
   * Override in derived classes for cleanup logic
   */
  protected async shutdown(): Promise<void> {
    this.logger.info('Service shutdown started');
    // Override in derived classes
  }
}