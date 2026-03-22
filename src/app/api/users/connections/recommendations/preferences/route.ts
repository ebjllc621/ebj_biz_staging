import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getRecommendationService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { UpdateRecommendationPreferencesInput, RecommendationWeights, RecommendationPresetProfile } from '@features/connections/types';

/**
 * GET /api/users/connections/recommendations/preferences
 *
 * Get the authenticated user's recommendation preferences
 * Returns default weights if no custom preferences are stored
 *
 * @phase ConnectP2 Enhancement
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const userId = parseInt(context.userId!, 10);
  const recommendationService = getRecommendationService();

  const preferences = await recommendationService.getUserPreferences(userId);

  return createSuccessResponse(preferences, context.requestId);
}, {
  requireAuth: true
});

/**
 * PUT /api/users/connections/recommendations/preferences
 *
 * Update the authenticated user's recommendation preferences
 *
 * Body:
 * {
 *   weights?: { ...all 13 factors... },
 *   minScoreThreshold?: number,
 *   presetProfile?: 'balanced' | 'professional' | 'personal' | 'alumni' | 'local'
 * }
 *
 * IMPORTANT: If weights are provided, they MUST sum to 100
 * If presetProfile is provided, weights are ignored and preset weights are applied
 *
 * @phase Phase 8D - Extended for 13 factors + presets
 */
export const PUT = apiHandler(async (context: ApiContext) => {
  const userId = parseInt(context.userId!, 10);
  const body = await context.request.json();

  const recommendationService = getRecommendationService();

  // If preset is provided, apply preset weights
  if (body.presetProfile !== undefined) {
    const validPresets = ['balanced', 'professional', 'personal', 'alumni', 'local'];
    if (!validPresets.includes(body.presetProfile)) {
      throw BizError.badRequest(`Invalid preset profile. Must be one of: ${validPresets.join(', ')}`);
    }

    const updatedPreferences = await recommendationService.applyPreset(userId, body.presetProfile);
    return createSuccessResponse(updatedPreferences, context.requestId);
  }

  // Otherwise, handle custom weight updates
  const input: UpdateRecommendationPreferencesInput = {};

  if (body.weights !== undefined) {
    if (typeof body.weights !== 'object' || body.weights === null) {
      throw BizError.badRequest('weights must be an object');
    }

    // All 13 weight keys (Phase 8C complete)
    const weightKeys: (keyof RecommendationWeights)[] = [
      'mutualConnections',
      'industryMatch',
      'location',
      'engagement',
      'reputation',
      'profileCompleteness',
      'skillsOverlap',
      'goalsAlignment',
      'interestOverlap',
      'hobbiesAlignment',
      'educationMatch',
      'hometownMatch',
      'groupOverlap'
    ];

    const weights: Partial<RecommendationWeights> = {};

    for (const key of weightKeys) {
      if (body.weights[key] !== undefined) {
        const value = body.weights[key];
        if (typeof value !== 'number' || !Number.isInteger(value)) {
          throw BizError.badRequest(`${key} must be an integer`);
        }
        if (value < 0 || value > 100) {
          throw BizError.badRequest(`${key} must be between 0 and 100`);
        }
        weights[key] = value;
      }
    }

    input.weights = weights;
  }

  if (body.minScoreThreshold !== undefined) {
    const threshold = body.minScoreThreshold;
    if (typeof threshold !== 'number' || !Number.isInteger(threshold)) {
      throw BizError.badRequest('minScoreThreshold must be an integer');
    }
    if (threshold < 0 || threshold > 100) {
      throw BizError.badRequest('minScoreThreshold must be between 0 and 100');
    }
    input.minScoreThreshold = threshold;
  }

  // Check that at least one field is being updated
  if (!input.weights && input.minScoreThreshold === undefined) {
    throw BizError.badRequest('At least one of weights or minScoreThreshold must be provided');
  }

  const updatedPreferences = await recommendationService.updateUserPreferences(userId, input);

  return createSuccessResponse(updatedPreferences, context.requestId);
}, {
  requireAuth: true
});

/**
 * DELETE /api/users/connections/recommendations/preferences
 *
 * Reset the authenticated user's recommendation preferences to defaults
 *
 * @phase ConnectP2 Enhancement
 */
export const DELETE = apiHandler(async (context: ApiContext) => {
  const userId = parseInt(context.userId!, 10);
  const recommendationService = getRecommendationService();

  const defaultPreferences = await recommendationService.resetUserPreferences(userId);

  return createSuccessResponse(defaultPreferences, context.requestId);
}, {
  requireAuth: true
});
