/**
 * CronJobService - Cron Job Registry and Execution Management
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @pattern Build Map v2.1 ENHANCED - Service Architecture v2.0
 * @tier STANDARD
 *
 * PURPOSE:
 * - CRUD operations for cron job definitions
 * - Manual trigger execution with logging
 * - Execution history tracking
 * - Crontab/Vercel config export
 *
 * USAGE:
 * ```typescript
 * import { getCronJobService } from '@core/services/CronJobService';
 *
 * const cronService = getCronJobService();
 * const jobs = await cronService.getAllJobs();
 * await cronService.triggerJob(jobId, userId);
 * ```
 *
 * GOVERNANCE:
 * - MUST use DatabaseService.query() for all database operations
 * - MUST log all executions to cron_job_runs
 * - MUST log admin activity for mutations
 */

import { DatabaseService, getDatabaseService } from '@core/services/DatabaseService';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { ConsoleLogger } from '@core/logging/Logger';
import { safeJsonParse } from '@core/utils/json';
import { bigIntToNumber } from '@core/utils/bigint';

// ============================================================================
// Type Definitions
// ============================================================================

export interface CronJob {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  endpoint: string;
  method: 'POST' | 'GET';
  schedule: string;
  schedule_description: string | null;
  auth_type: 'admin_rbac' | 'cron_secret' | 'none';
  request_body: Record<string, unknown> | null;
  request_headers: Record<string, string> | null;
  is_active: boolean;
  status: 'implemented' | 'planned' | 'disabled';
  category: string;
  timeout_ms: number;
  last_run_at: string | null;
  last_run_status: 'success' | 'failure' | 'timeout' | null;
  last_run_duration_ms: number | null;
  last_run_result: Record<string, unknown> | null;
  run_count: number;
  failure_count: number;
  created_at: string;
  updated_at: string;
}

export interface CronJobRun {
  id: number;
  cron_job_id: number;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  status: 'running' | 'success' | 'failure' | 'timeout';
  response_status: number | null;
  response_body: Record<string, unknown> | null;
  error_message: string | null;
  triggered_by: 'scheduler' | 'manual' | 'system';
  triggered_by_user_id: number | null;
}

export interface CreateCronJobInput {
  name: string;
  slug: string;
  description?: string;
  endpoint: string;
  method?: 'POST' | 'GET';
  schedule: string;
  schedule_description?: string;
  auth_type?: 'admin_rbac' | 'cron_secret' | 'none';
  request_body?: Record<string, unknown>;
  request_headers?: Record<string, string>;
  is_active?: boolean;
  status?: 'implemented' | 'planned' | 'disabled';
  category?: string;
  timeout_ms?: number;
}

export interface UpdateCronJobInput {
  name?: string;
  description?: string;
  endpoint?: string;
  method?: 'POST' | 'GET';
  schedule?: string;
  schedule_description?: string;
  auth_type?: 'admin_rbac' | 'cron_secret' | 'none';
  request_body?: Record<string, unknown> | null;
  request_headers?: Record<string, string> | null;
  is_active?: boolean;
  status?: 'implemented' | 'planned' | 'disabled';
  category?: string;
  timeout_ms?: number;
}

// Row type for COUNT queries
interface CountRow {
  cnt: bigint | number;
}

// ============================================================================
// Service Implementation
// ============================================================================

export class CronJobService {
  private db: DatabaseService;
  private logger: ConsoleLogger;

  constructor(db: DatabaseService) {
    this.db = db;
    this.logger = new ConsoleLogger({ service: 'CronJobService' });
  }

  /**
   * Get all cron jobs
   */
  async getAllJobs(): Promise<CronJob[]> {
    const result = await this.db.query<CronJob>(
      `SELECT * FROM cron_jobs ORDER BY category, name`
    );
    return result.rows.map(row => this.parseJobRow(row));
  }

  /**
   * Get a single cron job by ID
   */
  async getJobById(id: number): Promise<CronJob | null> {
    const result = await this.db.query<CronJob>(
      `SELECT * FROM cron_jobs WHERE id = ?`,
      [id]
    );
    const row = result.rows[0];
    if (!row) return null;
    return this.parseJobRow(row);
  }

  /**
   * Get a single cron job by slug
   */
  async getJobBySlug(slug: string): Promise<CronJob | null> {
    const result = await this.db.query<CronJob>(
      `SELECT * FROM cron_jobs WHERE slug = ?`,
      [slug]
    );
    const row = result.rows[0];
    if (!row) return null;
    return this.parseJobRow(row);
  }

  /**
   * Create a new cron job
   */
  async createJob(input: CreateCronJobInput, adminUserId: number): Promise<CronJob> {
    const result = await this.db.query(
      `INSERT INTO cron_jobs (name, slug, description, endpoint, method, schedule, schedule_description, auth_type, request_body, request_headers, is_active, status, category, timeout_ms, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.name,
        input.slug,
        input.description || null,
        input.endpoint,
        input.method || 'POST',
        input.schedule,
        input.schedule_description || null,
        input.auth_type || 'admin_rbac',
        input.request_body ? JSON.stringify(input.request_body) : null,
        input.request_headers ? JSON.stringify(input.request_headers) : null,
        input.is_active !== undefined ? input.is_active : true,
        input.status || 'planned',
        input.category || 'general',
        input.timeout_ms || 30000,
        adminUserId
      ]
    );

    const insertId = bigIntToNumber(result.insertId);
    const job = await this.getJobById(insertId);

    const adminActivityService = getAdminActivityService();
    await adminActivityService.logActivity({
      adminUserId,
      targetEntityType: 'cron_job',
      targetEntityId: insertId,
      actionType: 'cron_job_created',
      actionCategory: 'configuration',
      actionDescription: `Created cron job: ${input.name}`,
      afterData: { name: input.name, endpoint: input.endpoint, schedule: input.schedule },
      severity: 'normal'
    });

    return job!;
  }

  /**
   * Update a cron job
   */
  async updateJob(id: number, input: UpdateCronJobInput, adminUserId: number): Promise<CronJob | null> {
    const existing = await this.getJobById(id);
    if (!existing) return null;

    const fields: string[] = [];
    const values: unknown[] = [];

    if (input.name !== undefined) { fields.push('name = ?'); values.push(input.name); }
    if (input.description !== undefined) { fields.push('description = ?'); values.push(input.description); }
    if (input.endpoint !== undefined) { fields.push('endpoint = ?'); values.push(input.endpoint); }
    if (input.method !== undefined) { fields.push('method = ?'); values.push(input.method); }
    if (input.schedule !== undefined) { fields.push('schedule = ?'); values.push(input.schedule); }
    if (input.schedule_description !== undefined) { fields.push('schedule_description = ?'); values.push(input.schedule_description); }
    if (input.auth_type !== undefined) { fields.push('auth_type = ?'); values.push(input.auth_type); }
    if (input.request_body !== undefined) { fields.push('request_body = ?'); values.push(input.request_body ? JSON.stringify(input.request_body) : null); }
    if (input.request_headers !== undefined) { fields.push('request_headers = ?'); values.push(input.request_headers ? JSON.stringify(input.request_headers) : null); }
    if (input.is_active !== undefined) { fields.push('is_active = ?'); values.push(input.is_active); }
    if (input.status !== undefined) { fields.push('status = ?'); values.push(input.status); }
    if (input.category !== undefined) { fields.push('category = ?'); values.push(input.category); }
    if (input.timeout_ms !== undefined) { fields.push('timeout_ms = ?'); values.push(input.timeout_ms); }

    fields.push('updated_by = ?');
    values.push(adminUserId);
    values.push(id);

    if (fields.length > 1) {
      await this.db.query(
        `UPDATE cron_jobs SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }

    const adminActivityService = getAdminActivityService();
    await adminActivityService.logActivity({
      adminUserId,
      targetEntityType: 'cron_job',
      targetEntityId: id,
      actionType: 'cron_job_updated',
      actionCategory: 'configuration',
      actionDescription: `Updated cron job: ${existing.name}`,
      beforeData: { name: existing.name, schedule: existing.schedule, is_active: existing.is_active },
      afterData: { ...input } as Record<string, unknown>,
      severity: 'normal'
    });

    return this.getJobById(id);
  }

  /**
   * Trigger a cron job manually
   */
  async triggerJob(id: number, adminUserId: number): Promise<CronJobRun> {
    const job = await this.getJobById(id);
    if (!job) throw new Error(`Cron job ${id} not found`);

    // Create run record
    const runResult = await this.db.query(
      `INSERT INTO cron_job_runs (cron_job_id, triggered_by, triggered_by_user_id) VALUES (?, 'manual', ?)`,
      [id, adminUserId]
    );
    const runId = bigIntToNumber(runResult.insertId);

    const startTime = Date.now();
    let responseStatus: number | null = null;
    let responseBody: Record<string, unknown> | null = null;
    let errorMessage: string | null = null;
    let status: 'success' | 'failure' | 'timeout' = 'success';

    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const url = `${baseUrl}${job.endpoint}`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(job.request_headers || {})
      };

      if (job.auth_type === 'cron_secret') {
        headers['Authorization'] = `Bearer ${process.env.CRON_SECRET}`;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), job.timeout_ms);

      const fetchOptions: RequestInit = {
        method: job.method,
        headers,
        signal: controller.signal,
      };

      if (job.method === 'POST' && job.request_body) {
        fetchOptions.body = JSON.stringify(job.request_body);
      }

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeout);

      responseStatus = response.status;
      try {
        responseBody = await response.json();
      } catch {
        responseBody = null;
      }

      if (!response.ok) {
        status = 'failure';
        errorMessage = `HTTP ${response.status}`;
      }
    } catch (err: unknown) {
      status = err instanceof Error && err.name === 'AbortError' ? 'timeout' : 'failure';
      errorMessage = err instanceof Error ? err.message : String(err);
    }

    const durationMs = Date.now() - startTime;

    // Update run record
    await this.db.query(
      `UPDATE cron_job_runs SET completed_at = NOW(), duration_ms = ?, status = ?, response_status = ?, response_body = ?, error_message = ? WHERE id = ?`,
      [durationMs, status, responseStatus, responseBody ? JSON.stringify(responseBody) : null, errorMessage, runId]
    );

    // Update job's last run info
    await this.db.query(
      `UPDATE cron_jobs SET last_run_at = NOW(), last_run_status = ?, last_run_duration_ms = ?, last_run_result = ?, run_count = run_count + 1${status === 'failure' || status === 'timeout' ? ', failure_count = failure_count + 1' : ''} WHERE id = ?`,
      [status, durationMs, responseBody ? JSON.stringify(responseBody) : null, id]
    );

    const adminActivityService = getAdminActivityService();
    await adminActivityService.logActivity({
      adminUserId,
      targetEntityType: 'cron_job',
      targetEntityId: id,
      actionType: 'cron_job_triggered',
      actionCategory: 'configuration',
      actionDescription: `Manually triggered cron job: ${job.name} (${status})`,
      afterData: { status, duration_ms: durationMs, response_status: responseStatus },
      severity: status === 'success' ? 'normal' : 'high'
    });

    const run = await this.db.query<CronJobRun>(
      `SELECT * FROM cron_job_runs WHERE id = ?`,
      [runId]
    );

    return this.parseRunRow(run.rows[0]!);
  }

  /**
   * Get execution history for a job
   */
  async getJobRuns(jobId: number, limit: number = 20): Promise<CronJobRun[]> {
    const result = await this.db.query<CronJobRun>(
      `SELECT * FROM cron_job_runs WHERE cron_job_id = ? ORDER BY started_at DESC LIMIT ?`,
      [jobId, limit]
    );
    return result.rows.map(row => this.parseRunRow(row));
  }

  /**
   * Get summary stats
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    implemented: number;
    planned: number;
    disabled: number;
    recent_failures: number;
  }> {
    const totalResult = await this.db.query<CountRow>('SELECT COUNT(*) as cnt FROM cron_jobs');
    const activeResult = await this.db.query<CountRow>('SELECT COUNT(*) as cnt FROM cron_jobs WHERE is_active = 1');
    const implementedResult = await this.db.query<CountRow>("SELECT COUNT(*) as cnt FROM cron_jobs WHERE status = 'implemented'");
    const plannedResult = await this.db.query<CountRow>("SELECT COUNT(*) as cnt FROM cron_jobs WHERE status = 'planned'");
    const disabledResult = await this.db.query<CountRow>("SELECT COUNT(*) as cnt FROM cron_jobs WHERE status = 'disabled'");
    const failureResult = await this.db.query<CountRow>("SELECT COUNT(*) as cnt FROM cron_job_runs WHERE status IN ('failure', 'timeout') AND started_at > NOW() - INTERVAL 24 HOUR");

    return {
      total: bigIntToNumber(totalResult.rows[0]?.cnt),
      active: bigIntToNumber(activeResult.rows[0]?.cnt),
      implemented: bigIntToNumber(implementedResult.rows[0]?.cnt),
      planned: bigIntToNumber(plannedResult.rows[0]?.cnt),
      disabled: bigIntToNumber(disabledResult.rows[0]?.cnt),
      recent_failures: bigIntToNumber(failureResult.rows[0]?.cnt),
    };
  }

  /**
   * Export crontab format
   */
  async exportCrontab(baseUrl: string): Promise<string> {
    const jobs = await this.getAllJobs();
    const activeJobs = jobs.filter(j => j.is_active && j.status === 'implemented');

    const lines = [
      '# Bizconekt Platform Cron Jobs',
      `# Generated: ${new Date().toISOString()}`,
      `# Base URL: ${baseUrl}`,
      '',
    ];

    for (const job of activeJobs) {
      lines.push(`# ${job.name} - ${job.schedule_description || job.schedule}`);
      const curlCmd = job.auth_type === 'cron_secret'
        ? `curl -s -X ${job.method} -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json"${job.request_body ? ` -d '${JSON.stringify(job.request_body)}'` : ''} ${baseUrl}${job.endpoint}`
        : `curl -s -X ${job.method} -H "Content-Type: application/json" -H "Cookie: bk_session=$ADMIN_SESSION"${job.request_body ? ` -d '${JSON.stringify(job.request_body)}'` : ''} ${baseUrl}${job.endpoint}`;
      lines.push(`${job.schedule} ${curlCmd}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Export Vercel cron configuration
   */
  async exportVercelConfig(): Promise<{ crons: Array<{ path: string; schedule: string }> }> {
    const jobs = await this.getAllJobs();
    const activeJobs = jobs.filter(j => j.is_active && j.status === 'implemented');

    return {
      crons: activeJobs.map(job => ({
        path: job.endpoint,
        schedule: job.schedule,
      }))
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private parseJobRow(row: CronJob): CronJob {
    return {
      ...row,
      request_body: typeof row.request_body === 'string' ? safeJsonParse(row.request_body as unknown as string) as Record<string, unknown> | null : row.request_body,
      request_headers: typeof row.request_headers === 'string' ? safeJsonParse(row.request_headers as unknown as string) as Record<string, string> | null : row.request_headers,
      last_run_result: typeof row.last_run_result === 'string' ? safeJsonParse(row.last_run_result as unknown as string) as Record<string, unknown> | null : row.last_run_result,
      run_count: bigIntToNumber(row.run_count as unknown as bigint),
      failure_count: bigIntToNumber(row.failure_count as unknown as bigint),
      timeout_ms: bigIntToNumber(row.timeout_ms as unknown as bigint),
      last_run_duration_ms: row.last_run_duration_ms ? bigIntToNumber(row.last_run_duration_ms as unknown as bigint) : null,
    };
  }

  private parseRunRow(row: CronJobRun): CronJobRun {
    return {
      ...row,
      response_body: typeof row.response_body === 'string' ? safeJsonParse(row.response_body as unknown as string) as Record<string, unknown> | null : row.response_body,
      duration_ms: row.duration_ms ? bigIntToNumber(row.duration_ms as unknown as bigint) : null,
      response_status: row.response_status ? bigIntToNumber(row.response_status as unknown as bigint) : null,
    };
  }
}

// ============================================================================
// Singleton
// ============================================================================

let cronJobServiceInstance: CronJobService | null = null;

export function getCronJobService(): CronJobService {
  if (!cronJobServiceInstance) {
    cronJobServiceInstance = new CronJobService(getDatabaseService());
  }
  return cronJobServiceInstance;
}

export function resetCronJobService(): void {
  if (process.env.NODE_ENV !== 'production') {
    cronJobServiceInstance = null;
  }
}
