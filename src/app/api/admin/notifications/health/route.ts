/**
 * Admin Notification Health Endpoint
 *
 * GET /api/admin/notifications/health
 * Returns comprehensive notification service health metrics
 *
 * AUTHENTICATED ENDPOINT:
 * - Requires admin authentication
 * - Full health metrics for dashboard display
 *
 * @phase Phase 1 - Notification Admin Foundation
 * @authority docs/notificationService/admin/MASTER_INDEX_BRAIN_PLAN.md
 * @tier STANDARD
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { jsonMethodNotAllowed } from '@/lib/http/json';
import { bigIntToNumber, safeJsonParse } from '@core/utils/bigint';
import type { NotificationHealthResponse } from '@core/types/notification-admin';

/**
 * Get channel status from notification_admin_config table
 */
async function getChannelStatusFromConfig(
  db: ReturnType<typeof getDatabaseService>
): Promise<Record<'inApp' | 'push' | 'email', 'active' | 'paused'>> {
  const result = await db.query<{ config_value: string | object }>(
    `SELECT config_value FROM notification_admin_config WHERE config_key = 'channel_status'`
  );

  if (result.rows.length === 0) {
    // Default to active if no config exists
    return { inApp: 'active', push: 'active', email: 'active' };
  }

  const row = result.rows[0];
  if (!row) {
    return { inApp: 'active', push: 'active', email: 'active' };
  }

  const value = typeof row.config_value === 'string'
    ? safeJsonParse(row.config_value, { inApp: 'active', push: 'active', email: 'active' })
    : row.config_value;

  return value as Record<'inApp' | 'push' | 'email', 'active' | 'paused'>;
}

/**
 * GET /api/admin/notifications/health
 * Returns comprehensive notification service health
 */
async function getHealthHandler(context: ApiContext) {
  const db = getDatabaseService();

  // 1. Get channel status from config
  const channelConfig = await getChannelStatusFromConfig(db);

  // 2. Get in-app notification stats (24h)
  const inAppStats = await getInAppStats(db);

  // 3. Get push device stats
  const pushStats = await getPushStats(db);

  // 4. Get email queue stats
  const emailStats = await getEmailStats(db);

  // Phase 4: Get recent dispatch latency
  const latencyResult = await db.query<{ avg_latency: number | null }>(
    `SELECT AVG(avg_latency_ms) as avg_latency
     FROM notification_dispatch_metrics
     WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
     AND avg_latency_ms > 0`
  );
  const recentAvgLatency = latencyResult.rows[0]?.avg_latency
    ? Math.round(latencyResult.rows[0].avg_latency)
    : null;

  // 5. Calculate overall status
  const status = calculateOverallStatus(inAppStats, pushStats, emailStats);

  // 6. Build alerts array
  const activeAlerts = buildActiveAlerts(inAppStats, pushStats, emailStats, recentAvgLatency);

  const health: NotificationHealthResponse = {
    status,
    timestamp: new Date().toISOString(),

    channels: {
      inApp: {
        status: channelConfig.inApp,
        lastSuccess: inAppStats.lastCreated,
        lastFailure: null,
        errorCount24h: 0,
        created24h: inAppStats.created24h,
        readRate: inAppStats.readRate,
        typeDistribution: inAppStats.typeDistribution
      },
      push: {
        status: channelConfig.push === 'paused' ? 'paused' :
                (pushStats.circuitBreakerOpen ? 'degraded' : 'active'),
        lastSuccess: null,
        lastFailure: null,
        errorCount24h: pushStats.deliveryStats.failedCount,
        circuitBreaker: pushStats.circuitBreaker,
        devices: pushStats.devices,
        deliveryStats24h: pushStats.deliveryStats
      },
      email: {
        status: channelConfig.email,
        lastSuccess: emailStats.lastSent,
        lastFailure: emailStats.lastFailure,
        errorCount24h: emailStats.failedCount24h,
        immediate24h: emailStats.immediateSent24h,
        digestQueueSize: emailStats.digestQueueSize,
        bounceRate: emailStats.bounceRate,
        nextDigestScheduled: emailStats.nextDigestScheduled,
        // Phase 3: Unsubscribe analytics
        unsubscribes24h: emailStats.unsubscribes24h,
        totalUnsubscribes: emailStats.totalUnsubscribes,
        unsubscribesByCategory: emailStats.unsubscribesByCategory,
        digestQueueAgeHours: emailStats.digestQueueAgeHours
      }
    },

    // Phase 4: Aggregate metrics across all channels
    metrics24h: (() => {
      const totalDispatched = inAppStats.created24h
        + pushStats.deliveryStats.totalAttempts
        + emailStats.immediateSent24h;
      const totalFailed = (inAppStats.failed24h || 0)
        + pushStats.deliveryStats.failedCount
        + emailStats.failedCount24h;
      return {
        dispatched: totalDispatched,
        delivered: totalDispatched - totalFailed,
        failed: totalFailed,
        successRate: totalDispatched > 0
          ? ((totalDispatched - totalFailed) / totalDispatched) * 100
          : 100
      };
    })(),

    activeAlerts,

    queues: {
      digestPending: emailStats.digestQueueSize,
      pushRetryPending: 0 // Phase 4 will add retry queue tracking
    }
  };

  return createSuccessResponse({ ...health }, context.requestId);
}

// Helper functions for data gathering
async function getInAppStats(db: ReturnType<typeof getDatabaseService>) {
  // Get 24h notification count
  const countResult = await db.query<{ count: bigint }>(
    `SELECT COUNT(*) as count FROM user_notifications
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`
  );
  const created24h = bigIntToNumber(countResult.rows[0]?.count ?? 0n);

  // Get read rate
  const readResult = await db.query<{ total: bigint; read_count: bigint }>(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN is_read = 1 THEN 1 ELSE 0 END) as read_count
     FROM user_notifications
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`
  );
  const total = bigIntToNumber(readResult.rows[0]?.total ?? 0n);
  const readCount = bigIntToNumber(readResult.rows[0]?.read_count ?? 0n);
  const readRate = total > 0 ? (readCount / total) * 100 : 0;

  // Get type distribution
  const typeResult = await db.query<{ notification_type: string; count: bigint }>(
    `SELECT notification_type, COUNT(*) as count
     FROM user_notifications
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
     GROUP BY notification_type`
  );
  const typeDistribution: Record<string, number> = {};
  for (const row of typeResult.rows) {
    typeDistribution[row.notification_type] = bigIntToNumber(row.count);
  }

  // Get last created timestamp
  const lastResult = await db.query<{ created_at: Date }>(
    `SELECT created_at FROM user_notifications ORDER BY created_at DESC LIMIT 1`
  );
  const lastCreated = lastResult.rows[0]?.created_at?.toISOString() ?? null;

  return {
    created24h,
    readRate,
    typeDistribution,
    lastCreated,
    failed24h: 0 // No failure tracking in current schema
  };
}

async function getPushStats(db: ReturnType<typeof getDatabaseService>) {
  // Get device counts
  const deviceResult = await db.query<{
    total: bigint;
    active: bigint;
    web: bigint;
    ios: bigint;
    android: bigint;
  }>(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
       SUM(CASE WHEN platform = 'web' AND is_active = 1 THEN 1 ELSE 0 END) as web,
       SUM(CASE WHEN platform = 'ios' AND is_active = 1 THEN 1 ELSE 0 END) as ios,
       SUM(CASE WHEN platform = 'android' AND is_active = 1 THEN 1 ELSE 0 END) as android
     FROM user_push_devices`
  );

  const row = deviceResult.rows[0];
  const devices = {
    total: bigIntToNumber(row?.total ?? 0n),
    active: bigIntToNumber(row?.active ?? 0n),
    byPlatform: {
      web: bigIntToNumber(row?.web ?? 0n),
      ios: bigIntToNumber(row?.ios ?? 0n),
      android: bigIntToNumber(row?.android ?? 0n)
    }
  };

  // Phase 2: Get push delivery stats from logs (24h)
  const pushStatsResult = await db.query<{
    total: bigint;
    success_count: bigint;
    failed_count: bigint;
    invalid_count: bigint;
    avg_latency: number | null;
  }>(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as success_count,
       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
       SUM(CASE WHEN status = 'invalid_token' THEN 1 ELSE 0 END) as invalid_count,
       AVG(latency_ms) as avg_latency
     FROM notification_push_logs
     WHERE sent_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`
  );

  const pushStats = pushStatsResult.rows[0];
  const totalAttempts = bigIntToNumber(pushStats?.total ?? 0n);
  const successCount = bigIntToNumber(pushStats?.success_count ?? 0n);
  const failedCount = bigIntToNumber(pushStats?.failed_count ?? 0n);
  const invalidCount = bigIntToNumber(pushStats?.invalid_count ?? 0n);

  // Phase 2: Get circuit breaker state from database (persisted)
  const cbResult = await db.query<{ config_value: string | object }>(
    `SELECT config_value FROM notification_admin_config WHERE config_key = 'circuit_breaker_state'`
  );

  const circuitBreaker = {
    state: 'closed' as 'closed' | 'open' | 'half-open',
    failures: 0,
    maxFailures: 5,
    resetTimeoutMs: 60000,
    nextRetryAt: null as string | null
  };

  if (cbResult.rows.length > 0 && cbResult.rows[0]) {
    const cbState = typeof cbResult.rows[0].config_value === 'string'
      ? JSON.parse(cbResult.rows[0].config_value)
      : cbResult.rows[0].config_value;

    circuitBreaker.state = cbState.isOpen ? 'open' : 'closed';
    circuitBreaker.failures = cbState.failures || 0;
    if (cbState.isOpen && cbState.lastFailureTime) {
      circuitBreaker.nextRetryAt = new Date(
        new Date(cbState.lastFailureTime).getTime() + 60000
      ).toISOString();
    }
  }

  return {
    devices,
    circuitBreaker,
    circuitBreakerOpen: circuitBreaker.state === 'open',
    deliveryStats: {
      totalAttempts,
      successCount,
      failedCount,
      invalidTokenCount: invalidCount,
      deliveryRate: totalAttempts > 0
        ? Math.round((successCount / totalAttempts) * 100 * 10) / 10
        : 100,
      avgLatencyMs: pushStats?.avg_latency
        ? Math.round(pushStats.avg_latency)
        : null,
      p95LatencyMs: null
    }
  };
}

async function getEmailStats(db: ReturnType<typeof getDatabaseService>) {
  // Get immediate sent count (24h)
  const immediateResult = await db.query<{ count: bigint }>(
    `SELECT COUNT(*) as count FROM notification_email_logs
     WHERE email_type = 'immediate'
     AND sent_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`
  );
  const immediateSent24h = bigIntToNumber(immediateResult.rows[0]?.count ?? 0n);

  // Get digest queue size
  const queueResult = await db.query<{ count: bigint }>(
    `SELECT COUNT(*) as count FROM notification_email_queue
     WHERE processed_at IS NULL`
  );
  const digestQueueSize = bigIntToNumber(queueResult.rows[0]?.count ?? 0n);

  // Get failed count (24h)
  const failedResult = await db.query<{ count: bigint }>(
    `SELECT COUNT(*) as count FROM notification_email_logs
     WHERE status = 'failed'
     AND sent_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`
  );
  const failedCount24h = bigIntToNumber(failedResult.rows[0]?.count ?? 0n);

  // Get bounce rate
  const bounceResult = await db.query<{ total: bigint; bounced: bigint }>(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) as bounced
     FROM notification_email_logs
     WHERE sent_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`
  );
  const totalEmails = bigIntToNumber(bounceResult.rows[0]?.total ?? 0n);
  const bouncedEmails = bigIntToNumber(bounceResult.rows[0]?.bounced ?? 0n);
  const bounceRate = totalEmails > 0 ? (bouncedEmails / totalEmails) * 100 : 0;

  // Get last sent timestamp
  const lastResult = await db.query<{ sent_at: Date }>(
    `SELECT sent_at FROM notification_email_logs
     WHERE status = 'sent' ORDER BY sent_at DESC LIMIT 1`
  );
  const lastSent = lastResult.rows[0]?.sent_at?.toISOString() ?? null;

  // Phase 3: Get last failure timestamp
  const lastFailureResult = await db.query<{ sent_at: Date }>(
    `SELECT sent_at FROM notification_email_logs
     WHERE status IN ('failed', 'bounced')
     ORDER BY sent_at DESC LIMIT 1`
  );
  const lastFailure = lastFailureResult.rows[0]?.sent_at?.toISOString() ?? null;

  // Get next scheduled digest
  const nextResult = await db.query<{ scheduled_for: Date }>(
    `SELECT MIN(scheduled_for) as scheduled_for FROM notification_email_queue
     WHERE processed_at IS NULL`
  );
  const nextDigestScheduled = nextResult.rows[0]?.scheduled_for?.toISOString() ?? null;

  // Phase 3: Get unsubscribe analytics
  const unsubResult = await db.query<{
    total_tokens: bigint;
    consumed_tokens: bigint;
    consumed_24h: bigint;
  }>(
    `SELECT
       COUNT(*) as total_tokens,
       SUM(CASE WHEN consumed_at IS NOT NULL THEN 1 ELSE 0 END) as consumed_tokens,
       SUM(CASE WHEN consumed_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 ELSE 0 END) as consumed_24h
     FROM notification_unsubscribe_tokens
     WHERE expires_at > NOW() OR consumed_at IS NOT NULL`
  );
  const unsubscribes24h = bigIntToNumber(unsubResult.rows[0]?.consumed_24h ?? 0n);
  const totalUnsubscribes = bigIntToNumber(unsubResult.rows[0]?.consumed_tokens ?? 0n);

  // Phase 3: Get unsubscribe by category breakdown
  const unsubCategoryResult = await db.query<{
    category: string | null;
    count: bigint;
  }>(
    `SELECT category, COUNT(*) as count
     FROM notification_unsubscribe_tokens
     WHERE consumed_at IS NOT NULL
     GROUP BY category
     ORDER BY count DESC`
  );
  const unsubscribesByCategory: Record<string, number> = {};
  for (const row of unsubCategoryResult.rows) {
    const key = row.category || 'all_categories';
    unsubscribesByCategory[key] = bigIntToNumber(row.count);
  }

  // Phase 3: Calculate digest queue age (oldest pending entry)
  const ageResult = await db.query<{ oldest: Date | null }>(
    `SELECT MIN(created_at) as oldest FROM notification_email_queue
     WHERE processed_at IS NULL`
  );
  const oldestPending = ageResult.rows[0]?.oldest;
  const digestQueueAgeHours = oldestPending
    ? Math.round((Date.now() - new Date(oldestPending).getTime()) / (1000 * 60 * 60) * 10) / 10
    : 0;

  return {
    immediateSent24h,
    digestQueueSize,
    failedCount24h,
    bounceRate,
    lastSent,
    lastFailure,
    nextDigestScheduled,
    unsubscribes24h,
    totalUnsubscribes,
    unsubscribesByCategory,
    digestQueueAgeHours
  };
}

function calculateOverallStatus(
  inAppStats: Awaited<ReturnType<typeof getInAppStats>>,
  pushStats: Awaited<ReturnType<typeof getPushStats>>,
  emailStats: Awaited<ReturnType<typeof getEmailStats>>
): 'healthy' | 'degraded' | 'unhealthy' {
  // Unhealthy if circuit breaker is open
  if (pushStats.circuitBreakerOpen) return 'unhealthy';

  // Degraded if high failure rate
  const totalSent = inAppStats.created24h + emailStats.immediateSent24h;
  const failureRate = totalSent > 0
    ? ((inAppStats.failed24h || 0) + emailStats.failedCount24h) / totalSent * 100
    : 0;

  if (failureRate > 5) return 'unhealthy';
  if (failureRate > 2) return 'degraded';

  // Degraded if bounce rate high
  if (emailStats.bounceRate > 5) return 'degraded';

  return 'healthy';
}

function buildActiveAlerts(
  inAppStats: Awaited<ReturnType<typeof getInAppStats>>,
  pushStats: Awaited<ReturnType<typeof getPushStats>>,
  emailStats: Awaited<ReturnType<typeof getEmailStats>>,
  recentAvgLatency: number | null
): NotificationHealthResponse['activeAlerts'] {
  const alerts: NotificationHealthResponse['activeAlerts'] = [];

  // Check circuit breaker
  if (pushStats.circuitBreakerOpen) {
    alerts.push({
      component: 'push',
      metric: 'circuitBreaker',
      level: 'critical',
      message: 'FCM Circuit Breaker is OPEN - Push notifications blocked'
    });
  }

  // Check bounce rate
  if (emailStats.bounceRate > 5) {
    alerts.push({
      component: 'email',
      metric: 'bounceRate',
      level: 'critical',
      message: `Email bounce rate critical: ${emailStats.bounceRate.toFixed(1)}%`
    });
  } else if (emailStats.bounceRate > 2) {
    alerts.push({
      component: 'email',
      metric: 'bounceRate',
      level: 'warning',
      message: `Email bounce rate elevated: ${emailStats.bounceRate.toFixed(1)}%`
    });
  }

  // Phase 3: Check digest queue age alert
  const digestQueueAgeWarning = 24;
  const digestQueueAgeCritical = 48;
  if (emailStats.digestQueueAgeHours > digestQueueAgeCritical) {
    alerts.push({
      component: 'email',
      metric: 'digestQueueAge',
      level: 'critical',
      message: `Digest queue has entries ${emailStats.digestQueueAgeHours.toFixed(1)}h old (threshold: ${digestQueueAgeCritical}h)`
    });
  } else if (emailStats.digestQueueAgeHours > digestQueueAgeWarning) {
    alerts.push({
      component: 'email',
      metric: 'digestQueueAge',
      level: 'warning',
      message: `Digest queue has entries ${emailStats.digestQueueAgeHours.toFixed(1)}h old (threshold: ${digestQueueAgeWarning}h)`
    });
  }

  // Phase 4: Check dispatch latency
  if (recentAvgLatency !== null) {
    if (recentAvgLatency > 500) {
      alerts.push({
        component: 'dispatch',
        metric: 'latency',
        level: 'critical',
        message: `Average dispatch latency critical: ${recentAvgLatency}ms (threshold: 500ms)`
      });
    } else if (recentAvgLatency > 100) {
      alerts.push({
        component: 'dispatch',
        metric: 'latency',
        level: 'warning',
        message: `Average dispatch latency elevated: ${recentAvgLatency}ms (threshold: 100ms)`
      });
    }
  }

  return alerts;
}

export const GET = apiHandler(getHealthHandler, {
  allowedMethods: ['GET'],
  requireAuth: true,
  rbac: {
    action: 'read',
    resource: 'notification_admin'
  },
  rateLimit: {
    requests: 60,
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
