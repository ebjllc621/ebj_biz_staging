/**
 * Server Resource Configuration
 * Configures server-level resource limits for monitoring
 *
 * @authority Build Map v2.1 ENHANCED
 * @phase Database Manager Finalization
 * @tier SIMPLE
 */

export interface ServerConfig {
  /** Server memory limit in MB (default: 3800 for ~4GB server) */
  memoryLimitMB: number;
  /** Warning threshold percentage (default: 60) */
  memoryWarningPercent: number;
  /** Critical threshold percentage (default: 80) */
  memoryCriticalPercent: number;
}

/**
 * Get server resource configuration from environment variables
 * with sensible defaults for cloud deployments
 *
 * @returns {ServerConfig} Validated server configuration
 */
export function getServerConfig(): ServerConfig {
  return {
    memoryLimitMB: parseInt(process.env.SERVER_MEMORY_LIMIT_MB || '3800', 10),
    memoryWarningPercent: parseInt(process.env.SERVER_MEMORY_WARNING_PERCENT || '60', 10),
    memoryCriticalPercent: parseInt(process.env.SERVER_MEMORY_CRITICAL_PERCENT || '80', 10),
  };
}
