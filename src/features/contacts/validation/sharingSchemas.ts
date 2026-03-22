import { z } from 'zod';

/**
 * SHARING VALIDATION SCHEMAS
 *
 * Zod schemas for sharing/recommendation API routes with comprehensive validation.
 * Follows canonical pattern from src/lib/validation/authSchemas.ts.
 *
 * @tier SIMPLE
 * @phase User Recommendations - TD Phase 3 (TD-008)
 * @authority docs/components/connections/userrecommendations/phases/TD_PHASE_3_BRAIN_PLAN.md
 * @reference src/lib/validation/authSchemas.ts - Validation pattern
 */

// =============================================================================
// Entity Type Enums
// =============================================================================

/**
 * All supported entity types across the platform
 * Includes platform_invite for referrals + content entities for recommendations
 */
export const EntityTypeEnum = z.enum([
  'platform_invite',
  'user',
  'listing',
  'event',
  'article',
  'newsletter',
  'podcast',
  'video',
  'job_posting',
  'product',
  'service',
  'offer'
]);
export type EntityType = z.infer<typeof EntityTypeEnum>;

/**
 * Entity types that can be recommended (excludes platform_invite)
 * platform_invite is for referrals only, not recommendations
 */
export const RecommendationEntityTypeEnum = z.enum([
  'user',
  'listing',
  'event',
  'article',
  'newsletter',
  'podcast',
  'video',
  'job_posting',
  'product',
  'service',
  'offer'
]);
export type RecommendationEntityType = z.infer<typeof RecommendationEntityTypeEnum>;

/**
 * Category filter options for leaderboards and analytics
 */
export const CategoryFilterEnum = z.enum([
  'all',
  'listing',
  'event',
  'user',
  'offer',
  'article',
  'newsletter',
  'podcast',
  'video'
]);
export type CategoryFilter = z.infer<typeof CategoryFilterEnum>;

/**
 * Time period filters for leaderboards and stats
 */
export const PeriodFilterEnum = z.enum([
  'all_time',
  'this_month',
  'this_week'
]);
export type PeriodFilter = z.infer<typeof PeriodFilterEnum>;

// =============================================================================
// Recommendation Schemas
// =============================================================================

/**
 * POST /api/sharing/recommendations - Create recommendation
 */
export const CreateRecommendationSchema = z.object({
  entity_type: RecommendationEntityTypeEnum,
  entity_id: z.union([z.string(), z.number()]).transform(String),
  recipient_user_id: z.number().int().positive(),
  message: z.string().max(500).optional(),
  contact_id: z.number().int().positive().optional()
});
export type CreateRecommendationInput = z.infer<typeof CreateRecommendationSchema>;

/**
 * GET /api/sharing/recommendations - Get recommendations with filters
 * Note: Uses preprocess to handle null/empty from query params before coercion
 */
export const GetRecommendationsQuerySchema = z.object({
  type: z.preprocess(
    (val) => (val === null || val === '' ? undefined : val),
    z.enum(['sent', 'received']).default('sent')
  ),
  entity_type: z.preprocess(
    (val) => (val === null || val === '' ? undefined : val),
    EntityTypeEnum.optional()
  ),
  status: z.preprocess(
    (val) => (val === null || val === '' ? undefined : val),
    z.enum(['all', 'unread', 'saved', 'helpful', 'thanked']).optional()
  ),
  page: z.preprocess(
    (val) => (val === null || val === '' ? undefined : val),
    z.coerce.number().int().positive().default(1)
  ),
  per_page: z.preprocess(
    (val) => (val === null || val === '' ? undefined : val),
    z.coerce.number().int().positive().max(100).default(20)
  )
});
export type GetRecommendationsQuery = z.infer<typeof GetRecommendationsQuerySchema>;

/**
 * PATCH /api/sharing/recommendations/[id] - Update recommendation
 */
export const UpdateRecommendationSchema = z.object({
  action: z.enum(['view', 'toggle_saved'])
});
export type UpdateRecommendationInput = z.infer<typeof UpdateRecommendationSchema>;

/**
 * POST /api/sharing/recommendations/[id]/helpful - Mark as helpful
 */
export const MarkHelpfulSchema = z.object({
  is_helpful: z.boolean()
});
export type MarkHelpfulInput = z.infer<typeof MarkHelpfulSchema>;

/**
 * POST /api/sharing/recommendations/[id]/thank - Send thank you message
 */
export const SendThankYouSchema = z.object({
  message: z.string().min(1).max(500)
});
export type SendThankYouInput = z.infer<typeof SendThankYouSchema>;

/**
 * Recommendation ID from path parameter
 */
export const RecommendationIdSchema = z.object({
  id: z.coerce.number().int().positive()
});
export type RecommendationId = z.infer<typeof RecommendationIdSchema>;

// =============================================================================
// Entity Preview Schema
// =============================================================================

/**
 * GET /api/sharing/entity-preview - Get entity preview data
 * Note: Uses preprocess to convert null to undefined for required fields (error on missing)
 */
export const EntityPreviewQuerySchema = z.object({
  entity_type: z.preprocess(
    (val) => (val === null ? undefined : val),
    EntityTypeEnum
  ),
  entity_id: z.preprocess(
    (val) => (val === null ? undefined : val),
    z.string().min(1)
  )
});
export type EntityPreviewQuery = z.infer<typeof EntityPreviewQuerySchema>;

// =============================================================================
// Admin Metrics Schemas
// =============================================================================

/**
 * Date range filter for admin metrics endpoints
 * Validates from_date <= to_date
 * Note: Uses preprocess to handle null/empty from query params
 */
export const DateRangeQuerySchema = z.object({
  from_date: z.preprocess(
    (val) => (val === null || val === '' ? undefined : val),
    z.string().datetime().optional()
  ),
  to_date: z.preprocess(
    (val) => (val === null || val === '' ? undefined : val),
    z.string().datetime().optional()
  )
}).refine(
  (data) => {
    if (!data.from_date || !data.to_date) return true;
    return new Date(data.from_date) <= new Date(data.to_date);
  },
  {
    message: 'from_date must be before or equal to to_date',
    path: ['from_date']
  }
);
export type DateRangeQuery = z.infer<typeof DateRangeQuerySchema>;

/**
 * POST /api/admin/sharing/spam/[id]/action - Take action on spam
 */
export const SpamActionSchema = z.object({
  action: z.enum(['warn_user', 'suspend_user', 'ban_user', 'rate_limit']),
  notes: z.string().max(500).optional()
});
export type SpamActionInput = z.infer<typeof SpamActionSchema>;

// =============================================================================
// Validation Helper Functions
// =============================================================================

/**
 * Validates input against a Zod schema
 * Returns success with validated data or error with ZodError
 *
 * @template T - The type of the validated data
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @returns Success object with validated data or error object with ZodError
 *
 * @example
 * const validation = validateInput(CreateRecommendationSchema, body);
 * if (!validation.success) {
 *   return createErrorResponse(
 *     new BizError({
 *       code: 'VALIDATION_ERROR',
 *       message: formatValidationErrors(validation.error)
 *     }),
 *     requestId
 *   );
 * }
 * const input = validation.data;
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error };
    }
    throw error;
  }
}

/**
 * Formats Zod validation errors into a human-readable string
 * Combines multiple field errors into a single message
 *
 * @param error - The ZodError to format
 * @returns Formatted error message string
 *
 * @example
 * formatValidationErrors(zodError)
 * // Returns: "entity_type: Invalid enum value; recipient_user_id: Required"
 */
export function formatValidationErrors(error: z.ZodError<unknown>): string {
  return error.issues
    .map((err: z.ZodIssue) => {
      const path = err.path.join('.');
      return path ? `${path}: ${err.message}` : err.message;
    })
    .join('; ');
}
