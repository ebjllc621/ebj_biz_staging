/**
 * Database Metrics Help Knowledge Base
 *
 * Centralized help content for all database monitoring metrics.
 * Provides descriptions, baselines, warnings, and troubleshooting guidance.
 *
 * @authority Build Map v2.1 ENHANCED
 * @phase Database Manager Charts Enhancement
 */

export interface MetricHelp {
  /** Human-readable description of what this metric measures */
  description: string;
  /** Expected baseline values for healthy operation */
  baseline: string;
  /** What it means when this metric is elevated/abnormal */
  warning: string;
  /** Step-by-step troubleshooting guidance */
  troubleshooting: string[];
}

export const DATABASE_METRICS_HELP: Record<string, MetricHelp> = {
  queriesPerMinute: {
    description: "Average number of database queries executed per minute over the last 5 minutes.",
    baseline: "Typical: 10-100 for low traffic, 100-1000 for moderate, 1000+ for high traffic sites.",
    warning: "Sudden spikes may indicate inefficient queries, N+1 patterns, or potential DDoS. Sudden drops may indicate connection issues or application errors.",
    troubleshooting: [
      "Check for N+1 query patterns in recent code changes",
      "Review slow query logs for inefficient queries",
      "Verify connection pool isn't exhausted",
      "Check application logs for errors preventing queries",
      "Monitor for unusual traffic patterns"
    ]
  },

  avgLatencyMs: {
    description: "Average time to execute a database query, from request to response. Includes network time, query execution, and result transfer.",
    baseline: "Healthy: <50ms, Acceptable: 50-200ms, Concerning: >200ms, Critical: >500ms",
    warning: "High latency directly impacts user experience. Page loads become slow, API responses timeout, and users may abandon the site.",
    troubleshooting: [
      "Check for missing indexes on frequently queried columns (run EXPLAIN on slow queries)",
      "Review queries for full table scans - add appropriate WHERE clauses",
      "Consider query caching for repeated identical queries",
      "Check database server CPU/memory utilization",
      "Verify network latency between app server and database",
      "Look for lock contention from concurrent transactions"
    ]
  },

  p95LatencyMs: {
    description: "95th percentile latency - 95% of queries complete faster than this value. Shows the 'worst case' experience for most users.",
    baseline: "Should be <3x average latency. If p95 is 10x average, investigate outlier queries.",
    warning: "Large gap between average and p95 indicates inconsistent performance. Some users are experiencing significantly worse performance than others.",
    troubleshooting: [
      "Identify the specific slow queries causing tail latency",
      "Check for lock contention during peak usage times",
      "Review transaction isolation levels - lower isolation may help",
      "Look for queries that scan large tables without indexes",
      "Check if certain query types (reports, aggregations) are disproportionately slow"
    ]
  },

  poolUtilization: {
    description: "Percentage of the connection pool capacity currently in use. The pool has a fixed number of connections shared by all requests.",
    baseline: "Normal: 10-40%, Busy: 40-70%, High: 70-90%, Critical: >90%",
    warning: "High utilization means requests may have to wait for available connections. At 100%, new requests will queue or timeout.",
    troubleshooting: [
      "IMMEDIATE: Increase DB_CONNECTION_LIMIT in .env if consistently high",
      "Check for connection leaks - ensure all connections are released after use",
      "Review long-running transactions that hold connections",
      "Optimize slow queries that keep connections busy longer",
      "Consider read replicas to distribute load",
      "For extreme cases, consider a connection pooler like PgBouncer or ProxySQL"
    ]
  },

  activeConnections: {
    description: "Number of connections currently executing queries. Most queries are fast (<50ms), so this is usually low.",
    baseline: "Usually 0-5 during normal operation. Queries complete too fast to catch many active. Spikes during bulk operations or slow queries.",
    warning: "Consistently high active connections indicate slow queries holding connections, or a sudden surge in traffic.",
    troubleshooting: [
      "Profile your slowest queries - they're holding connections longest",
      "Check for missing connection.release() calls in error handlers",
      "Review transaction boundaries - are transactions too large?",
      "Look for bulk operations that should be batched or run async"
    ]
  },

  idleConnections: {
    description: "Connections in the pool that are ready for use but not currently executing queries. These are pre-established to reduce connection overhead.",
    baseline: "Having idle connections is good - it means quick connection acquisition. The pool maintains these for performance.",
    warning: "Zero idle connections during high traffic means the pool is at capacity. All connections are busy.",
    troubleshooting: [
      "If idle is always 0, increase pool size",
      "If idle is always high, you may have more connections than needed (wastes database resources)",
      "Tune DB_MAX_IDLE based on your typical concurrent query patterns"
    ]
  },

  waitingQueue: {
    description: "Number of requests waiting for an available connection from the pool. These requests are blocked until a connection is released.",
    baseline: "Should be 0 in normal operation. Any waiting indicates pool exhaustion.",
    warning: "Queue > 0 means pool is completely exhausted. Requests are delayed, potentially timing out. This is a critical performance issue.",
    troubleshooting: [
      "IMMEDIATE: Increase connection pool size (DB_CONNECTION_LIMIT)",
      "SHORT-TERM: Identify and optimize the slowest queries",
      "LONG-TERM: Consider read replicas, caching, or query optimization",
      "Check for connection leaks in error handling paths",
      "Review if all database operations are necessary"
    ]
  },

  connectionErrors: {
    description: "Database connection failures or query errors in the last 5 minutes. Includes network errors, authentication failures, and query syntax errors.",
    baseline: "Should be 0. Any errors require investigation.",
    warning: "Errors indicate database connectivity problems, query issues, or application bugs. Users may see error pages or missing data.",
    troubleshooting: [
      "Check database server is running and accessible",
      "Review application logs for specific error messages",
      "Verify network connectivity between app and database servers",
      "Check database user permissions",
      "Look for query syntax errors from recent code changes",
      "Verify database disk space isn't full"
    ]
  },

  memoryUsage: {
    description: "Application's total memory footprint (RSS - Resident Set Size) as a percentage of server capacity. RSS includes heap, stack, and native modules.",
    baseline: "Healthy: 20-50%, Normal: 50-70%, High: 70-85%, Critical: >85%",
    warning: "High memory usage can cause OOM (Out of Memory) kills, application crashes, and degraded performance as the system swaps to disk.",
    troubleshooting: [
      "Check for memory leaks using Node.js heap snapshots",
      "Review large data structures held in memory (caches, buffers)",
      "Ensure pagination is used for large data sets",
      "Check for event listener leaks (listeners not removed)",
      "Review streaming vs loading entire files into memory",
      "Restart application periodically if leak is hard to find (temporary fix)"
    ]
  },

  peakUtilization: {
    description: "Highest connection pool utilization recorded since server start. Shows the maximum load the pool has experienced.",
    baseline: "Should stay below 90%. If peak is high but current is low, you had a temporary spike. If consistently high, pool is undersized.",
    warning: "Peak near 100% means you've been at or near pool exhaustion. Even if current is low, future spikes may cause problems.",
    troubleshooting: [
      "Correlate peak time with application events (deployments, traffic spikes)",
      "Consider if pool size should accommodate peak rather than average",
      "Set up alerting for when utilization exceeds 80%",
      "Review auto-scaling configuration if in cloud environment"
    ]
  },

  totalQueries: {
    description: "Total number of database queries executed since the server started. A cumulative counter that shows overall database activity.",
    baseline: "Varies by application. Useful for comparing before/after optimization or identifying unusual patterns.",
    warning: "Rapid growth may indicate inefficient code or runaway processes.",
    troubleshooting: [
      "Compare with previous periods to identify anomalies",
      "Look for sudden jumps after deployments",
      "Check for infinite loops or runaway scheduled tasks"
    ]
  },

  totalErrors: {
    description: "Total database errors since server start. Includes connection failures, query errors, and timeouts.",
    baseline: "Should be 0 or very low. Any errors accumulated over time warrant investigation.",
    warning: "Accumulating errors indicate ongoing issues that may be affecting users intermittently.",
    troubleshooting: [
      "Check error logs for specific error messages",
      "Look for patterns - do errors happen at specific times?",
      "Review recent code changes for introduced bugs",
      "Check database server logs for server-side issues"
    ]
  }
};

/**
 * Get help for a specific metric
 */
export function getMetricHelp(metricKey: string): MetricHelp | undefined {
  return DATABASE_METRICS_HELP[metricKey];
}

/**
 * Threshold configurations for metrics
 * Used to determine warning/critical status
 */
export const METRIC_THRESHOLDS = {
  queriesPerMinute: { warning: null, critical: null }, // No threshold - informational
  avgLatencyMs: { warning: 100, critical: 200 },
  p95LatencyMs: { warning: 200, critical: 500 },
  poolUtilization: { warning: 70, critical: 90 },
  activeConnections: { warning: null, critical: null }, // Context-dependent
  waitingQueue: { warning: 1, critical: 5 },
  connectionErrors: { warning: 1, critical: 5 },
  memoryUsage: { warning: 60, critical: 80 }
};
