/**
 * Trust Score API Route
 * GET /api/users/[username]/trust-score - Get trust score for a user
 *
 * @authority docs/pages/layouts/home/user/phases/troubleshooting/connect/fixes/connectP2/phases/PHASE_3_TRUST_QUALITY_BRAIN_PLAN.md
 * @tier SIMPLE
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @phase Connect P2 Phase 3
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getConnectionService } from '@core/services/ServiceRegistry';
import { getDatabaseService } from '@core/services/DatabaseService';
import { DbResult } from '@core/types/db';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/users/[username]/trust-score
 * Get trust score for a user by username
 * Can be viewed by anyone (public trust scores)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const service = getConnectionService();

  // Extract username from URL
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const usernameIndex = pathParts.indexOf('users') + 1;
  const username = pathParts[usernameIndex];

  if (!username) {
    throw BizError.badRequest('Username is required');
  }

  // Look up user by username
  const userResult: DbResult<{ id: number }> = await db.query(
    `SELECT id FROM users WHERE username = ?`,
    [username]
  );

  if (!userResult.rows[0]) {
    throw BizError.notFound('User not found');
  }

  const userId = userResult.rows[0].id;

  // Calculate trust score
  const trustScore = await service.calculateTrustScore(userId);

  return createSuccessResponse(trustScore, context.requestId);
}, {
  requireAuth: false // Public endpoint - anyone can view trust scores
});
