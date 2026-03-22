/**
 * Contacts Services Export
 * Phase 3 - Referral System Foundation
 * Phase 3.5 - Unified Sharing & Recommendations Foundation
 * Phase 4 - Referral Gamification & Rewards
 * Phase 5 - Contact-to-User Matching
 * Phase 5.5 - Contact Becomes Member Notifications
 *
 * @tier SIMPLE
 * @generated ComponentBuilder
 */

export { ContactService } from './ContactService';
export { ReferralService, ReferralNotFoundError, DuplicateReferralError } from './ReferralService';
export {
  SharingService,
  InvalidEntityTypeError,
  EntityNotFoundError,
  RecipientNotFoundError,
  DuplicateRecommendationError,
  NotImplementedError
} from './SharingService';
export { RewardService } from './RewardService';
export { ContactMatchService } from './ContactMatchService';
export { ContactMemberMatchService } from './ContactMemberMatchService';
export { SharingAnalyticsService } from './SharingAnalyticsService';
