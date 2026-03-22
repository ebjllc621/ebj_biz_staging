/**
 * API Response Type Definitions
 *
 * All API routes MUST return one of these typed responses using discriminated union pattern.
 * This enables type-safe API responses across the entire application.
 *
 * @tier STANDARD
 * @buildmap v2.1 - API Standards
 * @authority PHASE_R5_BRAIN_PLAN.md - R5.2: API Response Typing
 * @governance Type-safe API responses mandatory for all 70+ routes
 */

import type {
  ListingRow,
  UserRow,
  CategoryRow,
  EventRow,
  OfferRow,
  ReviewRow,
  SubscriptionPlanRow,
  ListingSubscriptionRow,
  AddonSuiteRow,
  CampaignRow,
  DiscountCodeRow,
  SiteMenuRow,
  MediaFileRow,
  PerformanceMetricRow,
  FeatureFlagRow,
  SEOMetadataRow
} from './db-rows';

// ============================================================================
// BASE RESPONSE TYPES (Discriminated Union Pattern)
// ============================================================================

/**
 * Successful API response
 * @template T - The data type being returned
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: ResponseMeta;
}

/**
 * Error API response
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    stack?: string; // Only in development
  };
  meta?: ResponseMeta;
}

/**
 * Response metadata
 */
export interface ResponseMeta {
  timestamp?: Date | string;
  requestId?: string;
  version?: string;
  pagination?: PaginationMeta;
  count?: number;
  [key: string]: unknown;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Discriminated union for all API responses
 * Use this for type-safe API response handling
 */
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

// ============================================================================
// DOMAIN-SPECIFIC RESPONSE TYPES
// ============================================================================

// --- Listing Responses ---
export type ListingResponse = SuccessResponse<ListingRow>;
export type ListingsResponse = SuccessResponse<ListingRow[]>;
export type PaginatedListingsResponse = SuccessResponse<{
  listings: ListingRow[];
  pagination: PaginationMeta;
}>;

// --- User Responses ---
export type UserResponse = SuccessResponse<UserRow>;
export type UsersResponse = SuccessResponse<UserRow[]>;
export type PaginatedUsersResponse = SuccessResponse<{
  users: UserRow[];
  pagination: PaginationMeta;
}>;

// --- Category Responses ---
export type CategoryResponse = SuccessResponse<CategoryRow>;
export type CategoriesResponse = SuccessResponse<CategoryRow[]>;

// --- Event Responses ---
export type EventResponse = SuccessResponse<EventRow>;
export type EventsResponse = SuccessResponse<EventRow[]>;
export type PaginatedEventsResponse = SuccessResponse<{
  events: EventRow[];
  pagination: PaginationMeta;
}>;

// --- Offer Responses ---
export type OfferResponse = SuccessResponse<OfferRow>;
export type OffersResponse = SuccessResponse<OfferRow[]>;
export type PaginatedOffersResponse = SuccessResponse<{
  offers: OfferRow[];
  pagination: PaginationMeta;
}>;

// --- Review Responses ---
export type ReviewResponse = SuccessResponse<ReviewRow>;
export type ReviewsResponse = SuccessResponse<ReviewRow[]>;
export type PaginatedReviewsResponse = SuccessResponse<{
  reviews: ReviewRow[];
  pagination: PaginationMeta;
}>;

// --- Subscription Responses ---
export type SubscriptionPlanResponse = SuccessResponse<SubscriptionPlanRow>;
export type SubscriptionPlansResponse = SuccessResponse<SubscriptionPlanRow[]>;
export type SubscriptionResponse = SuccessResponse<ListingSubscriptionRow>;
export type SubscriptionsResponse = SuccessResponse<ListingSubscriptionRow[]>;

// Composite subscription response with plan and addons
export type SubscriptionWithDetailsResponse = SuccessResponse<{
  subscription: ListingSubscriptionRow;
  plan: SubscriptionPlanRow;
  addons: AddonSuiteRow[];
}>;

// --- Addon Responses ---
export type AddonResponse = SuccessResponse<AddonSuiteRow>;
export type AddonsResponse = SuccessResponse<AddonSuiteRow[]>;

// --- Campaign Responses ---
export type CampaignResponse = SuccessResponse<CampaignRow>;
export type CampaignsResponse = SuccessResponse<CampaignRow[]>;
export type PaginatedCampaignsResponse = SuccessResponse<{
  campaigns: CampaignRow[];
  pagination: PaginationMeta;
}>;

// --- Discount Responses ---
export type DiscountResponse = SuccessResponse<DiscountCodeRow>;
export type DiscountsResponse = SuccessResponse<DiscountCodeRow[]>;

// --- Menu Responses ---
export type MenuResponse = SuccessResponse<SiteMenuRow>;
export type MenusResponse = SuccessResponse<SiteMenuRow[]>;

// --- Media Responses ---
export type MediaFileResponse = SuccessResponse<MediaFileRow>;
export type MediaFilesResponse = SuccessResponse<MediaFileRow[]>;

// --- Performance Responses ---
export type PerformanceMetricResponse = SuccessResponse<PerformanceMetricRow>;
export type PerformanceMetricsResponse = SuccessResponse<PerformanceMetricRow[]>;

// --- Feature Flag Responses ---
export type FeatureFlagResponse = SuccessResponse<FeatureFlagRow>;
export type FeatureFlagsResponse = SuccessResponse<FeatureFlagRow[]>;

// --- SEO Responses ---
export type SEOMetadataResponse = SuccessResponse<SEOMetadataRow>;
export type SEOMetadatasResponse = SuccessResponse<SEOMetadataRow[]>;

// --- Generic CRUD Operation Responses ---
export type CreateResponse = SuccessResponse<{ id: number; message?: string }>;
export type UpdateResponse = SuccessResponse<{ success: true; message?: string }>;
export type DeleteResponse = SuccessResponse<{ success: true; message?: string }>;

// ============================================================================
// TYPE GUARDS (for discriminated union narrowing)
// ============================================================================

/**
 * Type guard to check if response is successful
 * @param response - API response to check
 * @returns true if response is SuccessResponse
 */
export function isSuccessResponse<T>(
  response: ApiResponse<T>
): response is SuccessResponse<T> {
  return response.success === true;
}

/**
 * Type guard to check if response is error
 * @param response - API response to check
 * @returns true if response is ErrorResponse
 */
export function isErrorResponse(
  response: ApiResponse<unknown>
): response is ErrorResponse {
  return response.success === false;
}

// ============================================================================
// RESPONSE BUILDER HELPERS
// ============================================================================

/**
 * Create a type-safe success response
 * @param data - The data to return
 * @param meta - Optional metadata
 * @returns Typed success response
 */
export function createSuccessResponse<T>(
  data: T,
  meta?: Partial<ResponseMeta>
): SuccessResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: '5.0.0',
      ...meta
    }
  };
}

/**
 * Create a type-safe error response
 * @param code - Error code
 * @param message - Error message
 * @param details - Optional error details
 * @returns Typed error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: unknown
): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      stack: process.env.NODE_ENV === 'development'
        ? new Error().stack
        : undefined
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: '5.0.0'
    }
  };
}

/**
 * Create a paginated success response
 * @param data - Array of data items
 * @param page - Current page number (1-indexed)
 * @param limit - Items per page
 * @param total - Total number of items
 * @returns Typed paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): SuccessResponse<{ data: T[]; pagination: PaginationMeta }> {
  return createSuccessResponse({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
}

/**
 * Helper to extract data from success response or throw on error
 * Useful for client-side code that wants to handle errors at a higher level
 * @param response - API response
 * @returns The data from success response
 * @throws Error if response is error
 */
export function unwrapResponse<T>(response: ApiResponse<T>): T {
  if (isSuccessResponse(response)) {
    return response.data;
  }
  throw new Error(`${response.error.code}: ${response.error.message}`);
}
