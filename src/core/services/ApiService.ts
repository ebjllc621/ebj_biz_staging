/**
 * ApiService - External API Communication Service
 *
 * Standardized service for making external API calls with:
 * - Built-in retry logic and circuit breaker patterns
 * - Request/response logging and monitoring
 * - Error handling and transformation
 * - Authentication handling
 *
 * Build Map v2.1 ENHANCED compliance: External API management
 */

import { CoreService, ServiceConfig } from './CoreService';
import { BizError } from '../errors/BizError';

export interface ApiConfig extends ServiceConfig {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

export interface ApiRequest {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryCondition?: (error: Error) => boolean;
}

/**
 * Service for external API communication
 * Extends CoreService with HTTP client capabilities
 */
export class ApiService extends CoreService {
  private readonly apiConfig: ApiConfig;
  private readonly defaultHeaders: Record<string, string>;

  constructor(config: ApiConfig) {
    super({
      ...config,
      name: 'ApiService',
      version: '5.0.0'
    });

    this.apiConfig = config;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': `${config.name || 'BizconektApp'}/5.0.0`,
      ...config.headers
    };

    this.logger.info('ApiService initialized', {
      operation: 'constructor',
      metadata: {
        baseUrl: this.apiConfig.baseUrl,
        timeout: this.apiConfig.timeout || 30000,
        retries: this.apiConfig.retries || 3
      }
    });
  }

  /**
   * Make HTTP request with retry logic
   */
  async request<T = unknown>(request: ApiRequest): Promise<ApiResponse<T>> {
    return this.executeOperation('request', async () => {
      const url = this.buildUrl(request.url);
      const headers = { ...this.defaultHeaders, ...request.headers };
      const timeout = request.timeout || this.apiConfig.timeout || 30000;

      this.logger.debug('Making API request', {
        metadata: {
          method: request.method,
          url,
          timeout
        }
      });

      // Apply retry logic
      const retryConfig: RetryConfig = {
        maxRetries: this.apiConfig.retries || 3,
        retryDelay: this.apiConfig.retryDelay || 1000,
        retryCondition: (error: Error) => this.shouldRetry(error)
      };

      return this.executeWithRetry(async () => {
        return this.makeHttpRequest<T>({
          ...request,
          url,
          headers
        }, timeout);
      }, retryConfig);
    });
  }

  /**
   * GET request helper
   */
  async get<T = unknown>(
    url: string,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      url,
      method: 'GET',
      headers
    });
  }

  /**
   * POST request helper
   */
  async post<T = unknown>(
    url: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      url,
      method: 'POST',
      body,
      headers
    });
  }

  /**
   * PUT request helper
   */
  async put<T = unknown>(
    url: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      url,
      method: 'PUT',
      body,
      headers
    });
  }

  /**
   * DELETE request helper
   */
  async delete<T = unknown>(
    url: string,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      url,
      method: 'DELETE',
      headers
    });
  }

  /**
   * Health check for external API availability
   */
  protected async performHealthChecks(): Promise<Record<string, boolean>> {
    const checks = await super.performHealthChecks();

    if (!this.apiConfig.baseUrl) {
      return { ...checks, apiAvailable: true }; // No base URL to check
    }

    try {
      // Try a lightweight health check endpoint or HEAD request
      const response = await this.makeHttpRequest({
        url: this.buildUrl('/health'),
        method: 'GET',
        headers: this.defaultHeaders
      }, 5000);

      return {
        ...checks,
        apiAvailable: response.status >= 200 && response.status < 400
      };
    } catch (error) {
      this.logger.warn('API health check failed', {
        metadata: { baseUrl: this.apiConfig.baseUrl, error: error instanceof Error ? error.message : String(error) }
      });

      return {
        ...checks,
        apiAvailable: false
      };
    }
  }

  /**
   * Build full URL from relative path
   */
  private buildUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    if (!this.apiConfig.baseUrl) {
      throw new BizError({
        code: 'INVALID_CONFIGURATION',
        message: 'Base URL required for relative paths',
        context: { path }
      });
    }

    const baseUrl = this.apiConfig.baseUrl.replace(/\/$/, '');
    const relativePath = path.startsWith('/') ? path : `/${path}`;

    return `${baseUrl}${relativePath}`;
  }

  /**
   * Execute HTTP request (stub implementation)
   */
  private async makeHttpRequest<T>(
    request: ApiRequest & { url: string },
    timeout: number
  ): Promise<ApiResponse<T>> {
    // STUB: Real implementation would use fetch() or http client
    this.logger.debug('HTTP request executed (STUB)', {
      metadata: {
        method: request.method,
        url: request.url,
        hasBody: !!request.body,
        timeout
      }
    });

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // STUB: Return mock successful response
    return {
      data: {} as T,
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': 'application/json'
      }
    };
  }

  /**
   * Execute operation with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig
  ): Promise<T> {
    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt <= config.maxRetries) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt++;

        if (attempt > config.maxRetries || !config.retryCondition?.(lastError)) {
          break;
        }

        this.logger.warn(`Request failed, retrying (${attempt}/${config.maxRetries})`, {
          metadata: {
            error: lastError.message,
            nextRetryIn: config.retryDelay
          }
        });

        // Wait before retry with exponential backoff
        await new Promise(resolve =>
          setTimeout(resolve, config.retryDelay * Math.pow(2, attempt - 1))
        );
      }
    }

    throw new BizError({
      code: 'API_REQUEST_FAILED',
      message: `API request failed after ${config.maxRetries} retries`,
      cause: lastError || new Error('Unknown error'),
      context: { attempts: attempt }
    });
  }

  /**
   * Determine if error should trigger retry
   */
  private shouldRetry(error: Error): boolean {
    // Retry on network errors, timeouts, and 5xx responses
    const retryableErrors = [
      'ECONNRESET',
      'ENOTFOUND',
      'ECONNREFUSED',
      'ETIMEDOUT'
    ];

    return retryableErrors.some(code => error.message.includes(code));
  }
}