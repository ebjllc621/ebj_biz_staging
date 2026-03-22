/**
 * ServiceRegistry - Application-wide Service Singleton Manager
 *
 * GOVERNANCE: All services accessed via getService() pattern
 * - Lazy initialization for performance
 * - Connection pooling via shared DatabaseService
 * - Health monitoring capabilities
 * - Prevents per-request instantiation anti-pattern
 *
 * @authority service-architecture-standards.mdc
 * @remediation Phase R2.1 - Service Singleton Pattern
 * @tier STANDARD
 * @phase Phase R2
 */

import { DatabaseService, getDatabaseService } from './DatabaseService';
import { CategoryService } from './CategoryService';
import { ListingService } from './ListingService';
import { OfferService } from './OfferService';
import { EventService } from './EventService';
import { ReviewService } from './ReviewService';
import { SubscriptionService } from './SubscriptionService';
import { UserManagementService } from './UserManagementService';
import { MediaService } from './media/MediaService';
import { SessionService } from './auth/SessionService';
import { PerformanceMonitoringService } from './PerformanceMonitoringService';
import { ErrorTrackingService } from './ErrorTrackingService';
import { AlertingService } from './AlertingService';
import { SEOService } from './SEOService';
import { FeatureFlagService } from './FeatureFlagService';
import { MenuService } from './MenuService';
import { CampaignService } from './CampaignService';
import { DiscountService } from './DiscountService';
import { ConnectionService } from '@features/connections/services/ConnectionService';
import { ConnectionGroupService } from '@features/connections/services/ConnectionGroupService';
import { RecommendationService } from '@features/connections/services/RecommendationService';
import { TemplateService } from '@features/connections/services/TemplateService';
import { ConnectionAnalyticsService } from '@features/connections/services/ConnectionAnalyticsService';
import { RecommendationAnalyticsService } from '@features/connections/services/RecommendationAnalyticsService';
import { NotificationPreferencesService } from './NotificationPreferencesService';
import { PushDeviceService } from './notification/PushDeviceService';
import { EmailNotificationService } from './notification/EmailNotificationService';
import { getConnectionPoolManager, PoolStats, ErrorPersistenceCallback } from './ConnectionPoolManager';
import { getCacheManager, CacheManagerStats } from '@core/cache';
import { getDatabaseHealthService, DatabaseHealthService } from './DatabaseHealthService';
import { AdminActivityService, getAdminActivityService } from './AdminActivityService';
import { ErrorSeverity } from './ErrorTrackingService';
// Phase 2 Core Services Registration
import { NotificationService } from './NotificationService';
import { ActivityLoggingService, getActivityLoggingService as getExternalActivityLoggingService } from './ActivityLoggingService';
import { ContentService } from './ContentService';
import { InternalAnalyticsService } from './InternalAnalyticsService';
// Phase 3 Health Alert Email System
import { HealthAlertService } from './HealthAlertService';
// Phase 5 Continuous Monitoring
import { HealthMonitoringLoop } from './HealthMonitoringLoop';
// Claim Listing Service
import { ClaimListingService } from './ClaimListingService';
import { ListingApprovalService, getListingApprovalService as getExternalListingApprovalService } from './ListingApprovalService';
import { ErrorService } from '@core/services/ErrorService';
import { TeamMemberService } from './TeamMemberService';
import { ListingMessageService } from './ListingMessageService';
import { ListingNotificationService } from './notification/ListingNotificationService';
import { JobService } from './JobService';
import { QuoteService } from '@features/quotes/services/QuoteService';
import { ContentFollowService } from './ContentFollowService';
import { ContentNotificationService, getContentNotificationService } from './notification/ContentNotificationService';
// Social Media Manager - Tier 5A Phase 1
import { SocialMediaService } from './SocialMediaService';

// Singleton instances
let categoryServiceInstance: CategoryService | null = null;
let listingServiceInstance: ListingService | null = null;
let offerServiceInstance: OfferService | null = null;
let eventServiceInstance: EventService | null = null;
let reviewServiceInstance: ReviewService | null = null;
let subscriptionServiceInstance: SubscriptionService | null = null;
let userManagementServiceInstance: UserManagementService | null = null;
let mediaServiceInstance: MediaService | null = null;
let sessionServiceInstance: SessionService | null = null;
let performanceMonitoringServiceInstance: PerformanceMonitoringService | null = null;
let errorTrackingServiceInstance: ErrorTrackingService | null = null;
let alertingServiceInstance: AlertingService | null = null;
let seoServiceInstance: SEOService | null = null;
let featureFlagServiceInstance: FeatureFlagService | null = null;
let menuServiceInstance: MenuService | null = null;
let campaignServiceInstance: CampaignService | null = null;
let discountServiceInstance: DiscountService | null = null;
let connectionServiceInstance: ConnectionService | null = null;
let connectionGroupServiceInstance: ConnectionGroupService | null = null;
let recommendationServiceInstance: RecommendationService | null = null;
let templateServiceInstance: TemplateService | null = null;
let connectionAnalyticsServiceInstance: ConnectionAnalyticsService | null = null;
let recommendationAnalyticsServiceInstance: RecommendationAnalyticsService | null = null;
let notificationPreferencesServiceInstance: NotificationPreferencesService | null = null;
let pushDeviceServiceInstance: PushDeviceService | null = null;
let emailNotificationServiceInstance: EmailNotificationService | null = null;
let adminActivityServiceInstance: AdminActivityService | null = null;
// Phase 2 Core Services Registration
let notificationServiceInstance: NotificationService | null = null;
let contentServiceInstance: ContentService | null = null;
let internalAnalyticsServiceInstance: InternalAnalyticsService | null = null;
// Phase 3 Health Alert Email System
let healthAlertServiceInstance: HealthAlertService | null = null;
// Phase 5 Continuous Monitoring
let healthMonitoringLoopInstance: HealthMonitoringLoop | null = null;
// Claim Listing Service
let claimListingServiceInstance: ClaimListingService | null = null;
// Listing Approval Service
let listingApprovalServiceInstance: ListingApprovalService | null = null;
// Team Member Service
let teamMemberServiceInstance: TeamMemberService | null = null;
// Listing Message Service
let listingMessageServiceInstance: ListingMessageService | null = null;
// Listing Notification Service
let listingNotificationServiceInstance: ListingNotificationService | null = null;
// Job Service
let jobServiceInstance: JobService | null = null;
// Quote Service
let quoteServiceInstance: QuoteService | null = null;
// Content Follow Service
let contentFollowServiceInstance: ContentFollowService | null = null;
// Content Notification Service - Tier 4 Phase 6
let contentNotificationServiceInstance: ContentNotificationService | null = null;
// Social Media Manager - Tier 5A Phase 1
let socialMediaServiceInstance: SocialMediaService | null = null;

/**
 * Get CategoryService singleton
 * Depends on DatabaseService singleton
 */
export function getCategoryService(): CategoryService {
  if (!categoryServiceInstance) {
    const db = getDatabaseService();
    categoryServiceInstance = new CategoryService(db);
  }
  return categoryServiceInstance;
}

/**
 * Get MediaService singleton
 * No dependencies
 */
export function getMediaService(): MediaService {
  if (!mediaServiceInstance) {
    mediaServiceInstance = new MediaService();
  }
  return mediaServiceInstance;
}

/**
 * Get ListingService singleton
 * Depends on DatabaseService, MediaService, CategoryService
 */
export function getListingService(): ListingService {
  if (!listingServiceInstance) {
    const db = getDatabaseService();
    const mediaService = getMediaService();
    const categoryService = getCategoryService();
    listingServiceInstance = new ListingService(db, mediaService, categoryService);
  }
  return listingServiceInstance;
}

/**
 * Get OfferService singleton
 * Depends on DatabaseService, ListingService
 */
export function getOfferService(): OfferService {
  if (!offerServiceInstance) {
    const db = getDatabaseService();
    const listingService = getListingService();
    offerServiceInstance = new OfferService(db, listingService);
  }
  return offerServiceInstance;
}

/**
 * Get EventService singleton
 * Depends on DatabaseService, ListingService
 */
export function getEventService(): EventService {
  if (!eventServiceInstance) {
    const db = getDatabaseService();
    const listingService = getListingService();
    eventServiceInstance = new EventService(db, listingService);
  }
  return eventServiceInstance;
}

/**
 * Get TeamMemberService singleton
 * Depends on DatabaseService
 */
export function getTeamMemberService(): TeamMemberService {
  if (!teamMemberServiceInstance) {
    const db = getDatabaseService();
    teamMemberServiceInstance = new TeamMemberService(db);
  }
  return teamMemberServiceInstance;
}

/**
 * Get ListingMessageService singleton
 * Depends on DatabaseService
 * @phase Phase 9 - Communication/Reputation Pages
 */
export function getListingMessageService(): ListingMessageService {
  if (!listingMessageServiceInstance) {
    const db = getDatabaseService();
    listingMessageServiceInstance = new ListingMessageService(db);
  }
  return listingMessageServiceInstance;
}

/**
 * Get ReviewService singleton
 * Depends on DatabaseService, ListingService
 */
export function getReviewService(): ReviewService {
  if (!reviewServiceInstance) {
    const db = getDatabaseService();
    const listingService = getListingService();
    reviewServiceInstance = new ReviewService(db, listingService);
  }
  return reviewServiceInstance;
}

/**
 * Get SubscriptionService singleton
 * Depends on DatabaseService
 */
export function getSubscriptionService(): SubscriptionService {
  if (!subscriptionServiceInstance) {
    const db = getDatabaseService();
    subscriptionServiceInstance = new SubscriptionService(db);
  }
  return subscriptionServiceInstance;
}

/**
 * Get UserManagementService singleton
 * Depends on DatabaseService
 */
export function getUserManagementService(): UserManagementService {
  if (!userManagementServiceInstance) {
    const db = getDatabaseService();
    userManagementServiceInstance = new UserManagementService(db);
  }
  return userManagementServiceInstance;
}

/**
 * Get SessionService singleton
 * Depends on DatabaseService config
 */
export function getSessionService(): SessionService {
  if (!sessionServiceInstance) {
    sessionServiceInstance = new SessionService({
      name: 'SessionService',
      version: '1.0.0',
      database: getDatabaseService()
    });
  }
  return sessionServiceInstance;
}

/**
 * Get PerformanceMonitoringService singleton
 * Depends on DatabaseService
 */
export function getPerformanceMonitoringService(): PerformanceMonitoringService {
  if (!performanceMonitoringServiceInstance) {
    const db = getDatabaseService();
    performanceMonitoringServiceInstance = new PerformanceMonitoringService(db);
  }
  return performanceMonitoringServiceInstance;
}

/**
 * Get ErrorTrackingService singleton
 * Depends on DatabaseService
 */
export function getErrorTrackingService(): ErrorTrackingService {
  if (!errorTrackingServiceInstance) {
    const db = getDatabaseService();
    errorTrackingServiceInstance = new ErrorTrackingService(db);
  }
  return errorTrackingServiceInstance;
}

/**
 * Get AlertingService singleton
 * Depends on DatabaseService
 */
export function getAlertingService(): AlertingService {
  if (!alertingServiceInstance) {
    const db = getDatabaseService();
    alertingServiceInstance = new AlertingService(db);
  }
  return alertingServiceInstance;
}

/**
 * Get SEOService singleton
 * Depends on DatabaseService
 */
export function getSEOService(): SEOService {
  if (!seoServiceInstance) {
    const db = getDatabaseService();
    seoServiceInstance = new SEOService(db);
  }
  return seoServiceInstance;
}

/**
 * Get FeatureFlagService singleton
 * Depends on DatabaseService
 */
export function getFeatureFlagService(): FeatureFlagService {
  if (!featureFlagServiceInstance) {
    const db = getDatabaseService();
    featureFlagServiceInstance = new FeatureFlagService(db);
  }
  return featureFlagServiceInstance;
}

/**
 * Get MenuService singleton
 * No dependencies (uses getDatabaseService internally)
 */
export function getMenuService(): MenuService {
  if (!menuServiceInstance) {
    menuServiceInstance = new MenuService();
  }
  return menuServiceInstance;
}

/**
 * Get CampaignService singleton
 * Depends on DatabaseService
 */
export function getCampaignService(): CampaignService {
  if (!campaignServiceInstance) {
    const db = getDatabaseService();
    campaignServiceInstance = new CampaignService(db);
  }
  return campaignServiceInstance;
}

/**
 * Get DiscountService singleton
 * Depends on DatabaseService
 */
export function getDiscountService(): DiscountService {
  if (!discountServiceInstance) {
    const db = getDatabaseService();
    discountServiceInstance = new DiscountService(db);
  }
  return discountServiceInstance;
}

/**
 * Get ConnectionService singleton
 * Depends on DatabaseService
 * @phase ConnectP2 Phase 0
 */
export function getConnectionService(): ConnectionService {
  if (!connectionServiceInstance) {
    const db = getDatabaseService();
    connectionServiceInstance = new ConnectionService(db);
  }
  return connectionServiceInstance;
}

/**
 * Get ConnectionGroupService singleton
 * Depends on DatabaseService
 * @phase Connection Groups Phase 1
 */
export function getConnectionGroupService(): ConnectionGroupService {
  if (!connectionGroupServiceInstance) {
    const db = getDatabaseService();
    connectionGroupServiceInstance = new ConnectionGroupService(db);
  }
  return connectionGroupServiceInstance;
}

/**
 * Get TemplateService singleton
 * Depends on DatabaseService
 */
export function getTemplateService(): TemplateService {
  if (!templateServiceInstance) {
    const db = getDatabaseService();
    templateServiceInstance = new TemplateService(db);
  }
  return templateServiceInstance;
}

/**
 * Get ConnectionAnalyticsService singleton
 * Depends on DatabaseService
 */
export function getConnectionAnalyticsService(): ConnectionAnalyticsService {
  if (!connectionAnalyticsServiceInstance) {
    const db = getDatabaseService();
    connectionAnalyticsServiceInstance = new ConnectionAnalyticsService(db);
  }
  return connectionAnalyticsServiceInstance;
}

/**
 * Get RecommendationAnalyticsService singleton
 * Depends on DatabaseService
 * @phase Phase 8F
 */
export function getRecommendationAnalyticsService(): RecommendationAnalyticsService {
  if (!recommendationAnalyticsServiceInstance) {
    const db = getDatabaseService();
    recommendationAnalyticsServiceInstance = new RecommendationAnalyticsService(db);
  }
  return recommendationAnalyticsServiceInstance;
}

/**
 * Get RecommendationService singleton
 * Depends on DatabaseService
 * @phase ConnectP2 Phase 2
 */
export function getRecommendationService(): RecommendationService {
  if (!recommendationServiceInstance) {
    const db = getDatabaseService();
    recommendationServiceInstance = new RecommendationService(db);
  }
  return recommendationServiceInstance;
}

/**
 * Get NotificationPreferencesService singleton
 * Depends on DatabaseService
 * @phase NotificationService Phase 2
 */
export function getNotificationPreferencesService(): NotificationPreferencesService {
  if (!notificationPreferencesServiceInstance) {
    const db = getDatabaseService();
    notificationPreferencesServiceInstance = new NotificationPreferencesService(db);
  }
  return notificationPreferencesServiceInstance;
}

/**
 * Get PushDeviceService singleton
 * Depends on DatabaseService
 * @phase NotificationService Phase 3
 */
export function getPushDeviceService(): PushDeviceService {
  if (!pushDeviceServiceInstance) {
    const db = getDatabaseService();
    pushDeviceServiceInstance = new PushDeviceService(db);
  }
  return pushDeviceServiceInstance;
}

/**
 * Get EmailNotificationService singleton
 * Depends on DatabaseService
 * @phase NotificationService Phase 4
 */
export function getEmailNotificationService(): EmailNotificationService {
  if (!emailNotificationServiceInstance) {
    const db = getDatabaseService();
    emailNotificationServiceInstance = new EmailNotificationService(db);
  }
  return emailNotificationServiceInstance;
}

// ============================================================================
// Phase 2 Core Services Registration
// ============================================================================

/**
 * Get NotificationService singleton
 * Depends on DatabaseService, NotificationPreferencesService, PushDeviceService, EmailNotificationService
 * @phase Phase 2 - Service Health Monitoring Enhancement
 */
export function getNotificationService(): NotificationService {
  if (!notificationServiceInstance) {
    const db = getDatabaseService();
    // Use Phase 1 services for optional dependencies
    const preferencesService = getNotificationPreferencesService();
    const pushService = getPushDeviceService();
    const emailService = getEmailNotificationService();
    notificationServiceInstance = new NotificationService(db, preferencesService, pushService, emailService);
  }
  return notificationServiceInstance;
}

/**
 * Get ActivityLoggingService singleton
 * Re-exports existing singleton from ActivityLoggingService module
 * @phase Phase 2 - Service Health Monitoring Enhancement
 */
export function getActivityLoggingService(): ActivityLoggingService {
  // Delegate to the service's own singleton manager
  return getExternalActivityLoggingService();
}

/**
 * Get ContentService singleton
 * Depends on DatabaseService
 * @phase Phase 2 - Service Health Monitoring Enhancement
 */
export function getContentService(): ContentService {
  if (!contentServiceInstance) {
    const db = getDatabaseService();
    contentServiceInstance = new ContentService(db);
  }
  return contentServiceInstance;
}

/**
 * Get InternalAnalyticsService singleton
 * Depends on DatabaseService
 * @phase Phase 2 - Service Health Monitoring Enhancement
 */
export function getInternalAnalyticsService(): InternalAnalyticsService {
  if (!internalAnalyticsServiceInstance) {
    const db = getDatabaseService();
    internalAnalyticsServiceInstance = new InternalAnalyticsService(db);
  }
  return internalAnalyticsServiceInstance;
}

// ============================================================================
// Phase 3 Health Alert Email System
// ============================================================================

/**
 * Get HealthAlertService singleton
 * Depends on DatabaseService
 * @phase Phase 3 - Service Health Monitoring Enhancement
 */
export function getHealthAlertService(): HealthAlertService {
  if (!healthAlertServiceInstance) {
    const db = getDatabaseService();
    healthAlertServiceInstance = new HealthAlertService(db);
  }
  return healthAlertServiceInstance;
}

/**
 * Get HealthMonitoringLoop singleton
 * @phase Phase 5 - Service Health Monitoring Enhancement
 */
export function getHealthMonitoringLoop(): HealthMonitoringLoop {
  if (!healthMonitoringLoopInstance) {
    const healthService = getDatabaseHealthService();
    const alertService = getHealthAlertService();
    healthMonitoringLoopInstance = new HealthMonitoringLoop(healthService, alertService);
  }
  return healthMonitoringLoopInstance;
}

/**
 * Get ClaimListingService singleton
 * Depends on DatabaseService
 * @phase Claim Listing Phase 1
 */
export function getClaimListingService(): ClaimListingService {
  if (!claimListingServiceInstance) {
    const db = getDatabaseService();
    claimListingServiceInstance = new ClaimListingService(db);
  }
  return claimListingServiceInstance;
}

/**
 * Get ListingApprovalService singleton
 * Depends on DatabaseService, ListingService, UserManagementService
 * @phase Listing Approval System Phase 3
 */
export function getListingApprovalService(): ListingApprovalService {
  // Delegate to the service's own singleton manager
  return getExternalListingApprovalService();
}

/**
 * Get ListingNotificationService singleton
 * Depends on DatabaseService
 * @phase Listing Approval System Phase 5
 */
export function getListingNotificationService(): ListingNotificationService {
  if (!listingNotificationServiceInstance) {
    const db = getDatabaseService();
    listingNotificationServiceInstance = new ListingNotificationService(db);
  }
  return listingNotificationServiceInstance;
}

/**
 * Get JobService singleton
 * Depends on DatabaseService, ListingService
 * @phase Jobs Phase 1 - Core Job CRUD & Display
 */
export function getJobService(): JobService {
  if (!jobServiceInstance) {
    const db = getDatabaseService();
    const listingService = getListingService();
    jobServiceInstance = new JobService(db, listingService);
  }
  return jobServiceInstance;
}

/**
 * Get QuoteService singleton
 * Depends on DatabaseService
 * @phase Phase 3A - Quote System Foundation
 */
export function getQuoteService(): QuoteService {
  if (!quoteServiceInstance) {
    const db = getDatabaseService();
    quoteServiceInstance = new QuoteService(db);
  }
  return quoteServiceInstance;
}

/**
 * Get ContentFollowService singleton
 * Depends on DatabaseService
 * @phase Tier 4 - Content Subscription Phase 2
 */
export function getContentFollowService(): ContentFollowService {
  if (!contentFollowServiceInstance) {
    const db = getDatabaseService();
    contentFollowServiceInstance = new ContentFollowService(db);
  }
  return contentFollowServiceInstance;
}

/**
 * Get ContentNotificationService singleton
 * Depends on DatabaseService, NotificationService, ContentFollowService, InternalAnalyticsService
 * @phase Tier 4 - Content Subscription Phase 6
 */
export function getContentNotificationServiceSingleton(): ContentNotificationService {
  if (!contentNotificationServiceInstance) {
    contentNotificationServiceInstance = getContentNotificationService();
  }
  return contentNotificationServiceInstance;
}

/**
 * Get SocialMediaService singleton
 * Depends on DatabaseService
 * @phase Tier 5A Social Media Manager - Phase 1
 */
export function getSocialMediaService(): SocialMediaService {
  if (!socialMediaServiceInstance) {
    const db = getDatabaseService();
    socialMediaServiceInstance = new SocialMediaService(db);
  }
  return socialMediaServiceInstance;
}

/**
 * Health check for all initialized services
 * Returns service initialization status
 */
export function getServiceHealth(): Record<string, boolean> {
  return {
    database: getDatabaseService() !== null,
    category: categoryServiceInstance !== null,
    listing: listingServiceInstance !== null,
    offer: offerServiceInstance !== null,
    event: eventServiceInstance !== null,
    review: reviewServiceInstance !== null,
    subscription: subscriptionServiceInstance !== null,
    userManagement: userManagementServiceInstance !== null,
    media: mediaServiceInstance !== null,
    session: sessionServiceInstance !== null,
    performance: performanceMonitoringServiceInstance !== null,
    errorTracking: errorTrackingServiceInstance !== null,
    alerting: alertingServiceInstance !== null,
    seo: seoServiceInstance !== null,
    featureFlag: featureFlagServiceInstance !== null,
    menu: menuServiceInstance !== null,
    campaign: campaignServiceInstance !== null,
    discount: discountServiceInstance !== null,
    connection: connectionServiceInstance !== null,
    recommendation: recommendationServiceInstance !== null,
    // Phase 1 Quick Wins: TIER 1 services with existing getters
    template: templateServiceInstance !== null,
    connectionAnalytics: connectionAnalyticsServiceInstance !== null,
    recommendationAnalytics: recommendationAnalyticsServiceInstance !== null,
    notificationPreferences: notificationPreferencesServiceInstance !== null,
    pushDevice: pushDeviceServiceInstance !== null,
    emailNotification: emailNotificationServiceInstance !== null,
    adminActivity: adminActivityServiceInstance !== null,
    // Phase 2 Core Services Registration
    notification: notificationServiceInstance !== null,
    activityLogging: getExternalActivityLoggingService() !== null,
    content: contentServiceInstance !== null,
    internalAnalytics: internalAnalyticsServiceInstance !== null,
    // Phase 3 Health Alert Email System
    healthAlert: healthAlertServiceInstance !== null,
    // Claim Listing Service
    claimListing: claimListingServiceInstance !== null,
    // Listing Approval Service
    listingApproval: listingApprovalServiceInstance !== null,
    // Listing Notification Service
    listingNotification: listingNotificationServiceInstance !== null,
    // Phase 9 Communication/Reputation
    listingMessage: listingMessageServiceInstance !== null,
    // Jobs System Phase 1
    job: jobServiceInstance !== null,
    // Quote System Phase 3A
    quote: quoteServiceInstance !== null,
    // Content Follow Service - Tier 4 Phase 2
    contentFollow: contentFollowServiceInstance !== null,
    // Content Notification Service - Tier 4 Phase 6
    contentNotification: contentNotificationServiceInstance !== null,
    // Social Media Manager - Tier 5A Phase 1
    socialMedia: socialMediaServiceInstance !== null
  };
}

/**
 * Get connection pool statistics
 * GOVERNANCE: Centralized pool monitoring access
 */
export function getPoolStats(): PoolStats {
  return getConnectionPoolManager().getPoolStats();
}

/**
 * Get cache statistics
 * GOVERNANCE: Centralized cache monitoring access
 * @phase Phase 3 - Caching Strategy
 */
export function getCacheStats(): CacheManagerStats {
  return getCacheManager().getStats();
}

/**
 * Get DatabaseService singleton
 * GOVERNANCE: Centralized database access
 */
export { getDatabaseService };

/**
 * Get DatabaseHealthService singleton
 * GOVERNANCE: Centralized health monitoring access
 * @phase Phase 4 - Database Health Monitoring
 */
export { getDatabaseHealthService };

/**
 * Get AdminActivityService singleton
 * GOVERNANCE: Centralized admin audit logging
 * @phase Categories Admin Audit Logging
 */
export { getAdminActivityService };

/**
 * Detailed service health information
 */
export interface ServiceHealthDetail {
  name: string;
  initialized: boolean;
  healthy: boolean;
  lastError?: string;
}

// Cache for service health results (prevents object accumulation)
let serviceHealthCache: ServiceHealthDetail[] | null = null;
let serviceHealthCacheTime: number = 0;
const SERVICE_HEALTH_CACHE_TTL = 10000; // 10 seconds

/**
 * Get detailed health for all services
 * GOVERNANCE: Used by Phase 4 health monitoring endpoint
 * OPTIMIZATION: Cached for 10 seconds to prevent memory accumulation
 */
export async function getDetailedServiceHealth(): Promise<ServiceHealthDetail[]> {
  // Return cached result if still valid
  const now = Date.now();
  if (serviceHealthCache && (now - serviceHealthCacheTime) < SERVICE_HEALTH_CACHE_TTL) {
    return serviceHealthCache;
  }

  const health: ServiceHealthDetail[] = [];

  // Check each service
  const services = [
    { name: 'database', instance: getDatabaseService(), getter: getDatabaseService },
    { name: 'category', instance: categoryServiceInstance, getter: getCategoryService },
    { name: 'listing', instance: listingServiceInstance, getter: getListingService },
    { name: 'offer', instance: offerServiceInstance, getter: getOfferService },
    { name: 'event', instance: eventServiceInstance, getter: getEventService },
    { name: 'review', instance: reviewServiceInstance, getter: getReviewService },
    { name: 'subscription', instance: subscriptionServiceInstance, getter: getSubscriptionService },
    { name: 'userManagement', instance: userManagementServiceInstance, getter: getUserManagementService },
    { name: 'media', instance: mediaServiceInstance, getter: getMediaService },
    { name: 'session', instance: sessionServiceInstance, getter: getSessionService },
    { name: 'performance', instance: performanceMonitoringServiceInstance, getter: getPerformanceMonitoringService },
    { name: 'errorTracking', instance: errorTrackingServiceInstance, getter: getErrorTrackingService },
    { name: 'alerting', instance: alertingServiceInstance, getter: getAlertingService },
    { name: 'seo', instance: seoServiceInstance, getter: getSEOService },
    { name: 'featureFlag', instance: featureFlagServiceInstance, getter: getFeatureFlagService },
    { name: 'menu', instance: menuServiceInstance, getter: getMenuService },
    { name: 'campaign', instance: campaignServiceInstance, getter: getCampaignService },
    { name: 'discount', instance: discountServiceInstance, getter: getDiscountService },
    { name: 'connection', instance: connectionServiceInstance, getter: getConnectionService },
    { name: 'recommendation', instance: recommendationServiceInstance, getter: getRecommendationService },
    // Phase 1 Quick Wins: TIER 1 services with existing getters
    { name: 'template', instance: templateServiceInstance, getter: getTemplateService },
    { name: 'connectionAnalytics', instance: connectionAnalyticsServiceInstance, getter: getConnectionAnalyticsService },
    { name: 'recommendationAnalytics', instance: recommendationAnalyticsServiceInstance, getter: getRecommendationAnalyticsService },
    { name: 'notificationPreferences', instance: notificationPreferencesServiceInstance, getter: getNotificationPreferencesService },
    { name: 'pushDevice', instance: pushDeviceServiceInstance, getter: getPushDeviceService },
    { name: 'emailNotification', instance: emailNotificationServiceInstance, getter: getEmailNotificationService },
    { name: 'adminActivity', instance: adminActivityServiceInstance, getter: getAdminActivityService },
    // Phase 2 Core Services Registration
    { name: 'notification', instance: notificationServiceInstance, getter: getNotificationService },
    { name: 'activityLogging', instance: getExternalActivityLoggingService(), getter: getActivityLoggingService },
    { name: 'content', instance: contentServiceInstance, getter: getContentService },
    { name: 'internalAnalytics', instance: internalAnalyticsServiceInstance, getter: getInternalAnalyticsService },
    // Phase 3 Health Alert Email System
    { name: 'healthAlert', instance: healthAlertServiceInstance, getter: getHealthAlertService },
    // Claim Listing Service
    { name: 'claimListing', instance: claimListingServiceInstance, getter: getClaimListingService },
    // Listing Approval Service
    { name: 'listingApproval', instance: listingApprovalServiceInstance, getter: getListingApprovalService },
    // Listing Notification Service
    { name: 'listingNotification', instance: listingNotificationServiceInstance, getter: getListingNotificationService },
    // Phase 9 Communication/Reputation
    { name: 'listingMessage', instance: listingMessageServiceInstance, getter: getListingMessageService },
    // Jobs System Phase 1
    { name: 'job', instance: jobServiceInstance, getter: getJobService },
    // Quote System Phase 3A
    { name: 'quote', instance: quoteServiceInstance, getter: getQuoteService },
    // Content Follow Service - Tier 4 Phase 2
    { name: 'contentFollow', instance: contentFollowServiceInstance, getter: getContentFollowService },
    // Content Notification Service - Tier 4 Phase 6
    { name: 'contentNotification', instance: contentNotificationServiceInstance, getter: getContentNotificationServiceSingleton },
    // Social Media Manager - Tier 5A Phase 1
    { name: 'socialMedia', instance: socialMediaServiceInstance, getter: getSocialMediaService },
  ];

  for (const { name, instance } of services) {
    // Services that haven't been initialized yet are not unhealthy
    // Lazy loading is intentional - uninitialized !== broken
    if (!instance) {
      health.push({
        name,
        initialized: false,
        healthy: true,  // Not initialized ≠ unhealthy
        lastError: undefined
      });
      continue;
    }

    let healthy = false;
    let lastError: string | undefined;

    try {
      if (typeof (instance as any).health === 'function') {
        const result = await (instance as any).health();
        healthy = result?.healthy ?? true;
      } else {
        healthy = true;  // No health method = assume healthy if initialized
      }
    } catch (error) {
      healthy = false;
      lastError = error instanceof Error ? error.message : 'Unknown error';
    }

    health.push({
      name,
      initialized: true,
      healthy,
      lastError
    });
  }

  // Cache result
  serviceHealthCache = health;
  serviceHealthCacheTime = now;

  return health;
}

/**
 * Gracefully shutdown all initialized services
 * GOVERNANCE: Must be called during application termination
 * @param drainTimeoutMs - Time to wait for active operations (default: 5000ms)
 */
export async function shutdownAllServices(drainTimeoutMs: number = 5000): Promise<void> {
  console.log('[ServiceRegistry] Initiating graceful shutdown of all services...');

  // Shutdown services in reverse dependency order
  // Dependent services first, then base services

  // 1. Services with no dependents
  if (alertingServiceInstance) {
    await (alertingServiceInstance as any).destroy?.();
    alertingServiceInstance = null;
  }
  if (seoServiceInstance) {
    await (seoServiceInstance as any).destroy?.();
    seoServiceInstance = null;
  }
  if (featureFlagServiceInstance) {
    await (featureFlagServiceInstance as any).destroy?.();
    featureFlagServiceInstance = null;
  }
  if (performanceMonitoringServiceInstance) {
    await (performanceMonitoringServiceInstance as any).destroy?.();
    performanceMonitoringServiceInstance = null;
  }
  if (errorTrackingServiceInstance) {
    await (errorTrackingServiceInstance as any).destroy?.();
    errorTrackingServiceInstance = null;
  }

  // 2. Services that depend on ListingService
  if (reviewServiceInstance) {
    await (reviewServiceInstance as any).destroy?.();
    reviewServiceInstance = null;
  }
  if (eventServiceInstance) {
    await (eventServiceInstance as any).destroy?.();
    eventServiceInstance = null;
  }
  if (offerServiceInstance) {
    await (offerServiceInstance as any).destroy?.();
    offerServiceInstance = null;
  }

  // 3. Services that depend on DatabaseService only
  if (subscriptionServiceInstance) {
    await (subscriptionServiceInstance as any).destroy?.();
    subscriptionServiceInstance = null;
  }
  if (userManagementServiceInstance) {
    await (userManagementServiceInstance as any).destroy?.();
    userManagementServiceInstance = null;
  }
  if (campaignServiceInstance) {
    await (campaignServiceInstance as any).destroy?.();
    campaignServiceInstance = null;
  }
  if (discountServiceInstance) {
    await (discountServiceInstance as any).destroy?.();
    discountServiceInstance = null;
  }
  if (connectionServiceInstance) {
    await (connectionServiceInstance as any).destroy?.();
    connectionServiceInstance = null;
  }
  if (recommendationServiceInstance) {
    await (recommendationServiceInstance as any).shutdown?.();
    recommendationServiceInstance = null;
  }

  // Phase 1 Quick Wins: TIER 1 services shutdown
  if (templateServiceInstance) {
    await (templateServiceInstance as any).destroy?.();
    templateServiceInstance = null;
  }
  if (connectionAnalyticsServiceInstance) {
    await (connectionAnalyticsServiceInstance as any).destroy?.();
    connectionAnalyticsServiceInstance = null;
  }
  if (recommendationAnalyticsServiceInstance) {
    await (recommendationAnalyticsServiceInstance as any).destroy?.();
    recommendationAnalyticsServiceInstance = null;
  }
  if (notificationPreferencesServiceInstance) {
    await (notificationPreferencesServiceInstance as any).destroy?.();
    notificationPreferencesServiceInstance = null;
  }
  if (pushDeviceServiceInstance) {
    await (pushDeviceServiceInstance as any).destroy?.();
    pushDeviceServiceInstance = null;
  }
  if (emailNotificationServiceInstance) {
    await (emailNotificationServiceInstance as any).destroy?.();
    emailNotificationServiceInstance = null;
  }
  if (adminActivityServiceInstance) {
    await (adminActivityServiceInstance as any).destroy?.();
    adminActivityServiceInstance = null;
  }

  // Phase 2 Core Services Registration shutdown
  if (notificationServiceInstance) {
    await (notificationServiceInstance as any).destroy?.();
    notificationServiceInstance = null;
  }
  if (contentServiceInstance) {
    await (contentServiceInstance as any).destroy?.();
    contentServiceInstance = null;
  }
  if (internalAnalyticsServiceInstance) {
    await (internalAnalyticsServiceInstance as any).destroy?.();
    internalAnalyticsServiceInstance = null;
  }

  // Phase 5 Continuous Monitoring shutdown
  if (healthMonitoringLoopInstance) {
    healthMonitoringLoopInstance.stop();
    healthMonitoringLoopInstance = null;
    console.log('[ServiceRegistry] Stopped healthMonitoringLoop');
  }

  // Phase 3 Health Alert Email System shutdown
  if (healthAlertServiceInstance) {
    await (healthAlertServiceInstance as any).destroy?.();
    healthAlertServiceInstance = null;
  }

  // Claim Listing Service shutdown
  if (claimListingServiceInstance) {
    await (claimListingServiceInstance as any).destroy?.();
    claimListingServiceInstance = null;
  }

  // Quote System Phase 3A shutdown
  if (quoteServiceInstance) {
    await (quoteServiceInstance as any).destroy?.();
    quoteServiceInstance = null;
  }

  // Content Follow Service shutdown
  if (contentFollowServiceInstance) {
    await (contentFollowServiceInstance as any).destroy?.();
    contentFollowServiceInstance = null;
  }

  // Content Notification Service - Tier 4 Phase 6 shutdown
  if (contentNotificationServiceInstance) {
    await (contentNotificationServiceInstance as any).destroy?.();
    contentNotificationServiceInstance = null;
  }

  // Social Media Manager - Tier 5A Phase 1 shutdown
  if (socialMediaServiceInstance) {
    await (socialMediaServiceInstance as any).destroy?.();
    socialMediaServiceInstance = null;
  }

  // 4. Core services
  if (listingServiceInstance) {
    await (listingServiceInstance as any).destroy?.();
    listingServiceInstance = null;
  }
  if (categoryServiceInstance) {
    await (categoryServiceInstance as any).destroy?.();
    categoryServiceInstance = null;
  }
  if (menuServiceInstance) {
    await (menuServiceInstance as any).destroy?.();
    menuServiceInstance = null;
  }
  if (mediaServiceInstance) {
    await (mediaServiceInstance as any).destroy?.();
    mediaServiceInstance = null;
  }

  // 5. Session service (has its own pool)
  if (sessionServiceInstance) {
    await (sessionServiceInstance as any).destroy?.();
    sessionServiceInstance = null;
  }

  // 6. Cache Manager (before auth services and connection pool)
  const cacheManager = getCacheManager();
  await cacheManager.shutdown();
  console.log('[ServiceRegistry] CacheManager shut down');

  // 7. AuthServiceRegistry (separate singleton registry for auth services)
  try {
    const AuthServiceRegistry = (await import('@/core/registry/AuthServiceRegistry')).default;
    await AuthServiceRegistry.destroy();
    console.log('[ServiceRegistry] AuthServiceRegistry destroyed');
  } catch (error) {
    ErrorService.capture('[ServiceRegistry] Error destroying AuthServiceRegistry:', error);
  }

  // 8. Connection pool manager (last - all services depend on it)
  await getConnectionPoolManager().shutdown(drainTimeoutMs);

  console.log('[ServiceRegistry] All services shut down successfully');
}

// Track whether error persistence has been initialized
let errorPersistenceInitialized = false;

/**
 * Initialize error persistence integration
 * Wires ConnectionPoolManager to persist errors to ErrorTrackingService
 *
 * SAFEGUARDS:
 * - Rate limiting: Max 30 errors/min total, 10 per error type
 * - Circuit breaker: Failures don't block original operations
 * - Fire-and-forget: Async with no blocking
 *
 * @phase Database Error Persistence Integration
 */
export function initializeErrorPersistence(): void {
  if (errorPersistenceInitialized) {
    return; // Already initialized
  }

  const poolManager = getConnectionPoolManager();

  // Create the persistence callback that uses ErrorTrackingService
  const persistenceCallback: ErrorPersistenceCallback = async (data) => {
    console.log('[ServiceRegistry] Error persistence callback invoked:', {
      errorType: data.errorType,
      severity: data.severity
    });

    try {
      // Lazy-load ErrorTrackingService to avoid circular dependency at startup
      const errorTrackingService = getErrorTrackingService();

      // Map severity string to ErrorSeverity enum
      const severityMap: Record<string, ErrorSeverity> = {
        'low': ErrorSeverity.LOW,
        'medium': ErrorSeverity.MEDIUM,
        'high': ErrorSeverity.HIGH,
        'critical': ErrorSeverity.CRITICAL
      };

      const result = await errorTrackingService.logError({
        errorType: data.errorType,
        errorMessage: data.errorMessage,
        severity: severityMap[data.severity] || ErrorSeverity.MEDIUM,
        metadata: data.metadata
      });

      console.log('[ServiceRegistry] Error persisted to database:', result ? `ID ${result.id}` : 'failed (null returned)');
    } catch (error) {
      // Circuit breaker: Log but don't propagate
      // This prevents error logging failures from causing cascading issues
      ErrorService.capture('[ServiceRegistry] Error persistence failed (circuit breaker):', error);
    }
  };

  // Wire up the callback with default rate limiting
  poolManager.setErrorPersistenceCallback(persistenceCallback);
  errorPersistenceInitialized = true;

  console.log('[ServiceRegistry] Error persistence integration initialized');
}

/**
 * Reset all service instances (for testing)
 * WARNING: Use only in test environments
 */
export function resetServiceRegistry(): void {
  errorPersistenceInitialized = false; // Reset persistence flag
  categoryServiceInstance = null;
  listingServiceInstance = null;
  offerServiceInstance = null;
  eventServiceInstance = null;
  reviewServiceInstance = null;
  subscriptionServiceInstance = null;
  userManagementServiceInstance = null;
  mediaServiceInstance = null;
  sessionServiceInstance = null;
  performanceMonitoringServiceInstance = null;
  errorTrackingServiceInstance = null;
  alertingServiceInstance = null;
  seoServiceInstance = null;
  featureFlagServiceInstance = null;
  menuServiceInstance = null;
  campaignServiceInstance = null;
  discountServiceInstance = null;
  connectionServiceInstance = null;
  recommendationServiceInstance = null;
  templateServiceInstance = null;
  connectionAnalyticsServiceInstance = null;
  recommendationAnalyticsServiceInstance = null;
  notificationPreferencesServiceInstance = null;
  pushDeviceServiceInstance = null;
  emailNotificationServiceInstance = null;
  adminActivityServiceInstance = null;
  // Phase 2 Core Services Registration reset
  notificationServiceInstance = null;
  contentServiceInstance = null;
  internalAnalyticsServiceInstance = null;
  // Phase 3 Health Alert Email System reset
  healthAlertServiceInstance = null;
  // Phase 5 Continuous Monitoring reset
  healthMonitoringLoopInstance = null;
  // Claim Listing Service reset
  claimListingServiceInstance = null;
  // Listing Approval Service reset
  listingApprovalServiceInstance = null;
  // Listing Notification Service reset
  listingNotificationServiceInstance = null;
  // Phase 9 Communication/Reputation reset
  listingMessageServiceInstance = null;
  // Jobs System Phase 1 reset
  jobServiceInstance = null;
  // Quote System Phase 3A reset
  quoteServiceInstance = null;
  // Content Follow Service - Tier 4 Phase 2 reset
  contentFollowServiceInstance = null;
  // Content Notification Service - Tier 4 Phase 6 reset
  contentNotificationServiceInstance = null;
  // Social Media Manager - Tier 5A Phase 1 reset
  socialMediaServiceInstance = null;
}
