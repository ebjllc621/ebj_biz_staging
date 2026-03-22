/**
 * Admin Notification Metrics Endpoint
 *
 * GET /api/admin/notifications/metrics
 * Returns time-series metrics for delivery performance charts
 *
 * Query Parameters:
 * - hours: number (1-24, default: 1) - Time window for history
 *
 * AUTHENTICATED ENDPOINT:
 * - Requires admin authentication
 * - Returns chart-ready data structure
 *
 * @phase Phase 3 - Notification Admin Delivery Metrics
 * @authority docs/notificationService/admin/MASTER_INDEX_BRAIN_PLAN.md
 * @tier ADVANCED
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { jsonMethodNotAllowed } from '@/lib/http/json';
import { bigIntToNumber } from '@core/utils/bigint';
import type {
  NotificationMetricsResponse,
  NotificationMetricsHistoryPoint,
  EventTypeMetric
} from '@core/types/notification-admin';

/**
 * GET /api/admin/notifications/metrics
 * Returns time-series metrics for charts
 */
async function getMetricsHandler(context: ApiContext) {
  const { searchParams } = new URL(context.request.url);
  const hours = Math.min(Math.max(parseInt(searchParams.get('hours') || '1'), 1), 24);

  const db = getDatabaseService();

  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - (hours * 60 * 60 * 1000));

  // 1. Get metrics history from aggregated table (if exists) or compute from source
  const history = await getMetricsHistory(db, windowStart, windowEnd, hours);

  // 2. Calculate current metrics (latest data point)
  const current = calculateCurrentMetrics(history);

  // 3. Get channel distribution
  const channelDistribution = await getChannelDistribution(db, windowStart, windowEnd);

  // 4. Get event type breakdown
  const eventTypeBreakdown = await getEventTypeBreakdown(db, windowStart, windowEnd);

  const response: NotificationMetricsResponse = {
    current,
    history,
    channelDistribution,
    eventTypeBreakdown,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    dataPoints: history.length
  };

  return createSuccessResponse({ ...response }, context.requestId);
}

/**
 * Get metrics history - tries aggregated table first, falls back to computation
 */
async function getMetricsHistory(
  db: ReturnType<typeof getDatabaseService>,
  start: Date,
  end: Date,
  hours: number
): Promise<NotificationMetricsHistoryPoint[]> {
  // Calculate target number of points (1 per minute for 1 hour = 60 points)
  const targetPoints = Math.min(hours * 60, 60);
  const intervalMinutes = Math.max(1, Math.floor((hours * 60) / targetPoints));

  // Try to get from aggregated table first
  try {
    const aggregatedResult = await db.query<{
      timestamp: Date;
      dispatched_count: bigint;
      delivered_count: bigint;
      failed_count: bigint;
      avg_latency_ms: number;
      p95_latency_ms: number;
      p99_latency_ms: number;
      in_app_count: bigint;
      push_count: bigint;
      email_count: bigint;
    }>(
      `SELECT
        timestamp,
        dispatched_count,
        delivered_count,
        failed_count,
        avg_latency_ms,
        p95_latency_ms,
        p99_latency_ms,
        in_app_count,
        push_count,
        email_count
      FROM notification_dispatch_metrics
      WHERE timestamp BETWEEN ? AND ?
        AND period_minutes = ?
      ORDER BY timestamp ASC
      LIMIT ?`,
      [start, end, intervalMinutes, targetPoints]
    );

    if (aggregatedResult.rows.length > 0) {
      return aggregatedResult.rows.map(row => ({
        timestamp: new Date(row.timestamp).getTime(),
        dispatchedPerMinute: bigIntToNumber(row.dispatched_count),
        deliveredPerMinute: bigIntToNumber(row.delivered_count),
        failedPerMinute: bigIntToNumber(row.failed_count),
        avgLatencyMs: row.avg_latency_ms ?? null,
        p95LatencyMs: row.p95_latency_ms ?? null,
        p99LatencyMs: row.p99_latency_ms ?? null,
        channelDistribution: {
          inApp: bigIntToNumber(row.in_app_count),
          push: row.push_count ? bigIntToNumber(row.push_count) : null,
          email: bigIntToNumber(row.email_count)
        }
      }));
    }
  } catch {
    // Table might not exist yet - fall through to computed metrics
  }

  // Fallback: Compute from user_notifications table
  return await computeMetricsFromSource(db, start, end, targetPoints);
}

/**
 * Compute metrics directly from source tables (fallback when no aggregated data)
 */
async function computeMetricsFromSource(
  db: ReturnType<typeof getDatabaseService>,
  start: Date,
  end: Date,
  targetPoints: number
): Promise<NotificationMetricsHistoryPoint[]> {
  const intervalMs = (end.getTime() - start.getTime()) / targetPoints;
  const history: NotificationMetricsHistoryPoint[] = [];

  // Generate time buckets
  for (let i = 0; i < targetPoints; i++) {
    const bucketStart = new Date(start.getTime() + (i * intervalMs));
    const bucketEnd = new Date(start.getTime() + ((i + 1) * intervalMs));

    // Query notification counts for this bucket
    const countResult = await db.query<{
      total: bigint;
      read_count: bigint;
    }>(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_read = 1 THEN 1 ELSE 0 END) as read_count
      FROM user_notifications
      WHERE created_at BETWEEN ? AND ?`,
      [bucketStart, bucketEnd]
    );

    const total = bigIntToNumber(countResult.rows[0]?.total ?? 0n);
    const delivered = total; // In-app notifications are delivered immediately

    // Phase 2: Query push count for this bucket
    const pushBucketResult = await db.query<{ count: bigint }>(
      `SELECT COUNT(*) as count FROM notification_push_logs
       WHERE sent_at BETWEEN ? AND ?
       AND status IN ('sent', 'delivered')`,
      [bucketStart, bucketEnd]
    );
    const pushCount = bigIntToNumber(pushBucketResult.rows[0]?.count ?? 0n);

    // Phase 3: Query email count for this bucket
    const emailBucketResult = await db.query<{ count: bigint }>(
      `SELECT COUNT(*) as count FROM notification_email_logs
       WHERE sent_at BETWEEN ? AND ?`,
      [bucketStart, bucketEnd]
    );
    const emailCount = bigIntToNumber(emailBucketResult.rows[0]?.count ?? 0n);

    // No per-bucket latency in fallback mode - will be filled from last known below
    const trackedLatency = null;

    history.push({
      timestamp: bucketStart.getTime(),
      dispatchedPerMinute: Math.round(total / (intervalMs / 60000)),
      deliveredPerMinute: Math.round(delivered / (intervalMs / 60000)),
      failedPerMinute: 0,
      avgLatencyMs: trackedLatency,
      p95LatencyMs: trackedLatency,
      p99LatencyMs: trackedLatency,
      channelDistribution: {
        inApp: total,
        push: pushCount,
        email: emailCount  // Phase 3: Real data from notification_email_logs
      }
    });
  }

  // If no latency in any bucket, try to fill from last known dispatch metrics
  const hasAnyLatency = history.some(h => h.avgLatencyMs !== null);
  if (!hasAnyLatency) {
    try {
      const lastKnown = await db.query<{
        avg_latency_ms: number;
        p95_latency_ms: number;
        p99_latency_ms: number;
      }>(
        `SELECT avg_latency_ms, p95_latency_ms, p99_latency_ms
         FROM notification_dispatch_metrics
         WHERE avg_latency_ms > 0
         ORDER BY timestamp DESC LIMIT 1`
      );
      const lk = lastKnown.rows[0];
      if (lk) {
        // Apply last-known latency to buckets that have activity
        for (const point of history) {
          if (point.dispatchedPerMinute > 0 || (point.channelDistribution.email ?? 0) > 0) {
            point.avgLatencyMs = lk.avg_latency_ms;
            point.p95LatencyMs = lk.p95_latency_ms;
            point.p99LatencyMs = lk.p99_latency_ms;
          }
        }
      }
    } catch {
      // Table may not exist - continue with null latency
    }
  }

  return history;
}

/**
 * Calculate current metrics from latest history points
 */
function calculateCurrentMetrics(
  history: NotificationMetricsHistoryPoint[]
): NotificationMetricsResponse['current'] {
  if (history.length === 0) {
    return {
      dispatchedPerMinute: 0,
      avgLatencyMs: null,
      p95LatencyMs: null,
      p99LatencyMs: null,
      successRate: 100
    };
  }

  const recent = history.slice(-5); // Last 5 points
  const totalDispatched = recent.reduce((sum, p) => sum + p.dispatchedPerMinute, 0);
  const totalFailed = recent.reduce((sum, p) => sum + p.failedPerMinute, 0);

  const avgDispatch = totalDispatched / recent.length;

  // Calculate average latency, handling null values
  const validLatencies = recent.filter(p => p.avgLatencyMs !== null);
  const avgLatency = validLatencies.length > 0
    ? validLatencies.reduce((sum, p) => sum + (p.avgLatencyMs ?? 0), 0) / validLatencies.length
    : null;

  const validP95 = recent.filter(p => p.p95LatencyMs !== null);
  const avgP95 = validP95.length > 0
    ? validP95.reduce((sum, p) => sum + (p.p95LatencyMs ?? 0), 0) / validP95.length
    : null;

  const validP99 = recent.filter(p => p.p99LatencyMs !== null);
  const avgP99 = validP99.length > 0
    ? validP99.reduce((sum, p) => sum + (p.p99LatencyMs ?? 0), 0) / validP99.length
    : null;

  const successRate = totalDispatched > 0
    ? ((totalDispatched - totalFailed) / totalDispatched) * 100
    : 100;

  return {
    dispatchedPerMinute: Math.round(avgDispatch),
    avgLatencyMs: avgLatency !== null ? Math.round(avgLatency) : null,
    p95LatencyMs: avgP95 !== null ? Math.round(avgP95) : null,
    p99LatencyMs: avgP99 !== null ? Math.round(avgP99) : null,
    successRate: Math.round(successRate * 10) / 10
  };
}

/**
 * Get channel distribution for the time window
 */
async function getChannelDistribution(
  db: ReturnType<typeof getDatabaseService>,
  start: Date,
  end: Date
): Promise<NotificationMetricsResponse['channelDistribution']> {
  // In-app count
  const inAppResult = await db.query<{ count: bigint }>(
    `SELECT COUNT(*) as count FROM user_notifications
     WHERE created_at BETWEEN ? AND ?`,
    [start, end]
  );
  const inApp = bigIntToNumber(inAppResult.rows[0]?.count ?? 0n);

  // Phase 2: Push count from logs (real data)
  const pushResult = await db.query<{ count: bigint }>(
    `SELECT COUNT(*) as count FROM notification_push_logs
     WHERE sent_at BETWEEN ? AND ?
     AND status IN ('sent', 'delivered')`,
    [start, end]
  );
  const push = bigIntToNumber(pushResult.rows[0]?.count ?? 0n);

  // Email count from logs
  const emailResult = await db.query<{ count: bigint }>(
    `SELECT COUNT(*) as count FROM notification_email_logs
     WHERE sent_at BETWEEN ? AND ?`,
    [start, end]
  );
  const email = bigIntToNumber(emailResult.rows[0]?.count ?? 0n);

  return {
    inApp,
    push,
    email,
    total: inApp + push + email
  };
}

/**
 * Get event type breakdown (top 10)
 */
async function getEventTypeBreakdown(
  db: ReturnType<typeof getDatabaseService>,
  start: Date,
  end: Date
): Promise<EventTypeMetric[]> {
  const result = await db.query<{
    notification_type: string;
    count: bigint;
  }>(
    `SELECT
      notification_type,
      COUNT(*) as count
    FROM user_notifications
    WHERE created_at BETWEEN ? AND ?
    GROUP BY notification_type
    ORDER BY count DESC
    LIMIT 10`,
    [start, end]
  );

  const total = result.rows.reduce(
    (sum, row) => sum + bigIntToNumber(row.count),
    0
  );

  return result.rows.map(row => {
    const count = bigIntToNumber(row.count);
    return {
      eventType: row.notification_type,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100 * 10) / 10 : 0
    };
  });
}

export const GET = apiHandler(getMetricsHandler, {
  allowedMethods: ['GET'],
  requireAuth: true,
  rbac: {
    action: 'read',
    resource: 'notification_admin'
  },
  rateLimit: {
    requests: 30,
    windowMs: 60000
  }
});

// Method guards
const ALLOWED_METHODS = ['GET'];

export async function POST() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function PUT() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function DELETE() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function PATCH() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}
