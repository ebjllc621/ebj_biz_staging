/**
 * P3.8c REST API - Saved Searches Collection
 * GET /api/saved-searches - List saved searches for current client
 * POST /api/saved-searches - Create new saved search
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: COMPLIANT
 * - Build Map v2.1 ENHANCED patterns
 * - Anonymous by client cookie
 *
 * @authority CLAUDE.md - API Standards
 * @compliance E2.4 - API Route Standards
 */

import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { ensureClientIdOnApi } from '@/lib/ids/client';
import { listSaved, createSaved } from '@/lib/saved/sqlite';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/saved-searches - List all saved searches for current client
 */
export const GET = apiHandler(async (context) => {
  // Establish client identity with cookie management
  const outHeaders = new Headers();
  const clientId = ensureClientIdOnApi(context.request, outHeaders);

  // Retrieve saved searches for client
  const items = listSaved(clientId);

  return createSuccessResponse({ items }, 200);
});

/**
 * POST /api/saved-searches - Create new saved search
 * Body: { name?: string, params: Record<string, unknown> }
 */
export const POST = apiHandler(async (context) => {
  // Establish client identity with cookie management
  const outHeaders = new Headers();
  const clientId = ensureClientIdOnApi(context.request, outHeaders);

  // Parse and validate JSON body
  const body = await context.request.json();
  const { name, params } = body;

  // Validate params is an object
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    throw BizError.badRequest('params must be a valid object');
  }

  // Validate params contains only allowed keys
  const paramsObj = params as Record<string, unknown>;
  const allowedKeys = ['q', 'sort', 'page', 'pageSize', 'tags'];
  const paramKeys = Object.keys(paramsObj);
  const invalidKeys = paramKeys.filter(key => !allowedKeys.includes(key));

  if (invalidKeys.length > 0) {
    throw BizError.badRequest(
      `Invalid parameters: ${invalidKeys.join(', ')}. Allowed: ${allowedKeys.join(', ')}`
    );
  }

  // Coerce to safe object with validation
  const safeParams: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(paramsObj)) {
    if (allowedKeys.includes(key)) {
      safeParams[key] = value;
    }
  }

  // Create the saved search
  const savedSearch = createSaved({
    clientId,
    name: typeof name === 'string' ? name : null,
    params: safeParams
  });

  return createSuccessResponse(savedSearch, 201);
});