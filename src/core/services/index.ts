/**
 * Core services module exports
 *
 * GOVERNANCE: Centralized exports for service layer
 * Phase 1 Implementation
 */

// Export DatabaseService and related types
export { DatabaseService, getDatabaseService, type DatabaseServiceConfig } from './DatabaseService';

// Export CoreService base class
export { CoreService, type ServiceConfig } from './CoreService';

// Export CookieSessionService and related types
export {
  CookieSessionService,
  getCookieSessionService,
  type SessionConfig,
  type SessionCreationResult
} from './CookieSessionService';

// Export CategoryService and related types
export {
  CategoryService,
  CategoryNotFoundError,
  DuplicateSlugError,
  InvalidHierarchyError,
  OrphanCategoriesError,
  type Category,
  type CreateCategoryInput,
  type UpdateCategoryInput,
  type CategoryFilters
} from './CategoryService';

// Export ListingService and related types
export {
  ListingService,
  ListingNotFoundError,
  UnauthorizedAccessError,
  TierLimitExceededError,
  CategoryLimitExceededError,
  MediaLimitExceededError,
  InvalidListingStatusError,
  type Listing,
  type CreateListingInput,
  type UpdateListingInput,
  type ListingFilters,
  type PaginationParams,
  type PaginatedResult,
  type ListingLimits,
  type TierCheckResult,
  type ListingStats,
  type BusinessHour,
  type SocialMedia,
  type DateRange,
  ListingStatus,
  ApprovalStatus
} from './ListingService';

// Export OfferService and related types
export {
  OfferService,
  OfferNotFoundError,
  OfferExpiredError,
  OfferSoldOutError,
  RedemptionLimitExceededError,
  InvalidOfferDatesError,
  InvalidPricingError,
  type Offer,
  type CreateOfferInput,
  type UpdateOfferInput,
  type OfferFilters,
  type Redemption,
  type RedemptionCheck,
  OfferType,
  OfferStatus
} from './OfferService';

// Export EventService and related types
export {
  EventService,
  EventNotFoundError,
  EventFullError,
  EventPastError,
  EventCancelledError,
  DuplicateRsvpError,
  InvalidEventDatesError,
  type Event,
  type CreateEventInput,
  type UpdateEventInput,
  type EventFilters,
  type RSVP,
  type TicketTier,
  LocationType,
  EventStatus,
  RSVPStatus
} from './EventService';

// Export ReviewService and related types
export {
  ReviewService,
  ReviewNotFoundError,
  DuplicateReviewError,
  UnauthorizedReviewError,
  InvalidRatingError,
  ReviewAlreadyModeratedError,
  type Review,
  type CreateReviewInput,
  type UpdateReviewInput,
  type ReviewFilters,
  type RatingDistribution,
  ReviewStatus
} from './ReviewService';

// Export SubscriptionService and related types
export {
  SubscriptionService,
  PlanNotFoundError,
  SubscriptionNotFoundError,
  InvalidUpgradePathError,
  FeatureLimitExceededError,
  AddonNotFoundError,
  DuplicateSubscriptionError,
  type SubscriptionPlan,
  type AddonSuite,
  type ListingSubscription,
  type ListingSubscriptionAddon,
  type TierLimits,
  // Note: TierCheckResult is exported from ListingService to avoid duplicate
  type CreatePlanInput,
  type UpgradePath,
  ListingTier,
  SubscriptionStatus,
  AddonStatus,
  AddonSuiteName
} from './SubscriptionService';

// Export UserManagementService and related types
export {
  UserManagementService,
  UserNotFoundError,
  DuplicateEmailError,
  UserSuspendedError,
  InvalidAccountTypeError,
  DuplicateUsernameError,
  type User,
  type UpdateUserInput,
  type UserFilters,
  type UserTag,
  type Activity,
  type ActivityInput,
  type LoginRecord,
  type UserStats,
  type PlatformStats,
  AccountType,
  UserStatus
} from './UserManagementService';

// Export ListingApprovalService and related types
export {
  ListingApprovalService,
  getListingApprovalService,
  ListingNotPendingError,
  ApprovalFailedError,
  type ApprovalOptions,
  type RejectionOptions,
  type ApprovalResult,
  type ApproveListingInput,
  type RejectListingInput
} from './ListingApprovalService';

// Export ServiceRegistry singleton getters (Phase R2.1)
export {
  getCategoryService,
  getListingService,
  getOfferService,
  getEventService,
  getReviewService,
  getSubscriptionService,
  getUserManagementService,
  getMediaService,
  getSessionService,
  getPerformanceMonitoringService,
  getErrorTrackingService,
  getAlertingService,
  getSEOService,
  getFeatureFlagService,
  getMenuService,
  getCampaignService,
  getDiscountService,
  getServiceHealth,
  resetServiceRegistry
} from './ServiceRegistry';
