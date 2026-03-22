/**
 * Job Referral API Route
 *
 * POST /api/jobs/refer - Create a job referral
 * GET /api/jobs/refer - Get user's job referrals
 *
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 * @phase Jobs Phase 4 - Platform Growth & Future Features
 * @note Job referrals are tracked via user_referrals table with job_id column
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';

/**
 * Generate unique referral code
 */
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'BIZ-JOB-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * POST /api/jobs/refer
 * Create a job referral
 */
export const POST = apiHandler(async (context: ApiContext) => {
  if (!context.userId) {
    throw BizError.unauthorized('Authentication required');
  }

  const userId = parseInt(context.userId, 10);
  const body = await context.request.json() as {
    job_id: number;
    referred_email: string;
    personal_message?: string;
  };

  if (!body.job_id || !body.referred_email) {
    throw BizError.badRequest('job_id and referred_email are required');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.referred_email)) {
    throw BizError.badRequest('Invalid email format');
  }

  const db = getDatabaseService();

  // Verify job exists
  const jobResult = await db.query<{ id: number; title: string }>(
    'SELECT id, title FROM job_postings WHERE id = ? AND status = ?',
    [body.job_id, 'active']
  );

  if (jobResult.rows.length === 0) {
    throw BizError.notFound('Job posting', String(body.job_id));
  }

  // Check for duplicate referral
  const existingResult = await db.query<{ id: number }>(
    'SELECT id FROM user_referrals WHERE referrer_user_id = ? AND referred_email = ? AND job_id = ?',
    [userId, body.referred_email, body.job_id]
  );

  if (existingResult.rows.length > 0) {
    throw BizError.badRequest('You have already referred this email for this job');
  }

  // Generate referral code
  const referralCode = generateReferralCode();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com';
  const referralLink = `${baseUrl}/jobs?ref=${referralCode}`;

  // Create the referral
  const insertQuery = `
    INSERT INTO user_referrals (
      referrer_user_id,
      referred_email,
      referral_code,
      referral_message,
      referral_link,
      job_id,
      status,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())
  `;

  const insertResult = await db.query(insertQuery, [
    userId,
    body.referred_email,
    referralCode,
    body.personal_message || null,
    referralLink,
    body.job_id
  ]);

  const insertId = bigIntToNumber(insertResult.insertId);

  // Fetch created referral
  const referralResult = await db.query<{
    id: number;
    referrer_user_id: number;
    referred_email: string;
    referral_code: string;
    referral_link: string;
    job_id: number;
    status: string;
    created_at: Date;
  }>('SELECT * FROM user_referrals WHERE id = ?', [insertId]);

  const referral = referralResult.rows[0];

  if (!referral) {
    throw BizError.internalServerError('job_referral', new Error('Failed to create referral'));
  }

  return createSuccessResponse({
    referral: {
      id: referral.id,
      referrer_user_id: referral.referrer_user_id,
      referred_email: referral.referred_email,
      referral_code: referral.referral_code,
      referral_link: referral.referral_link,
      job_id: referral.job_id,
      status: referral.status,
      created_at: new Date(referral.created_at)
    }
  }, context.requestId);
});

/**
 * GET /api/jobs/refer
 * Get user's job referrals
 */
export const GET = apiHandler(async (context: ApiContext) => {
  if (!context.userId) {
    throw BizError.unauthorized('Authentication required');
  }

  const userId = parseInt(context.userId, 10);
  const url = new URL(context.request.url);
  const jobId = url.searchParams.get('job_id');
  const status = url.searchParams.get('status');

  const db = getDatabaseService();

  const conditions: string[] = ['referrer_user_id = ?', 'job_id IS NOT NULL'];
  const params: unknown[] = [userId];

  if (jobId) {
    conditions.push('job_id = ?');
    params.push(parseInt(jobId, 10));
  }

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  const query = `
    SELECT ur.*, jp.title as job_title
    FROM user_referrals ur
    LEFT JOIN job_postings jp ON ur.job_id = jp.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY ur.created_at DESC
  `;

  const result = await db.query<{
    id: number;
    referrer_user_id: number;
    referred_email: string;
    referral_code: string;
    referral_link: string;
    job_id: number;
    status: string;
    created_at: Date;
    job_title: string | null;
  }>(query, params);

  const referrals = result.rows.map(row => ({
    id: row.id,
    referrer_user_id: row.referrer_user_id,
    referred_email: row.referred_email,
    referral_code: row.referral_code,
    referral_link: row.referral_link,
    job_id: row.job_id,
    job_title: row.job_title,
    status: row.status,
    created_at: new Date(row.created_at)
  }));

  return createSuccessResponse({ referrals }, context.requestId);
});
