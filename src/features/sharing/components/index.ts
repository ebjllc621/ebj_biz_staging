/**
 * Sharing Components Exports
 * Phase 1 - Core Recommendation Flow
 * Phase 3 - Recommendations Inbox
 * Phase 4 - Feedback Loop
 * Phase 12 - Recommend Button Deployment
 *
 * @phase User Recommendations - Phases 1-12
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

// Phase 1 & 12 Components - Core Recommendation (Renamed for clarity)
export { EntityPreviewCard } from './EntityPreviewCard';
export { RecommendationRecipientSelector } from './RecommendationRecipientSelector';
export type { RecipientUser } from './RecommendationRecipientSelector';

// Phase 12 - New names (canonical)
export { RecommendButton } from './RecommendButton';
export type { RecommendButtonProps } from './RecommendButton';
export { RecommendModal } from './RecommendModal';
export { MobileRecommendSheet } from './MobileRecommendSheet';
export { ContentRecommendButton } from './ContentRecommendButton';

// Phase 1 - Backward compatibility aliases (deprecated)
export { ShareEntityButton } from './RecommendButton';
export { ShareEntityModal } from './RecommendModal';
export { MobileShareSheet } from './MobileRecommendSheet';
export { ContentShareButton } from './ContentRecommendButton';

// Phase 3 Components - Inbox
export { RecommendationInboxFilters } from './RecommendationInboxFilters';
export { RecommendationInboxItem } from './RecommendationInboxItem';
export { RecommendationInboxList } from './RecommendationInboxList';
export { RecommendationInboxPagination } from './RecommendationInboxPagination';

// Phase 4 Components - Feedback Loop
export { HelpfulRatingButtons } from './HelpfulRatingButtons';
export { ThankYouModal } from './ThankYouModal';
export { SenderImpactCard } from './SenderImpactCard';

// Phase 5 Components - Unified Gamification
export { UnifiedGamificationCard } from './UnifiedGamificationCard';

// Phase 8 Components - Content Types
export { ContentCreatorImpactCard } from './ContentCreatorImpactCard';

// Phase 9 Components - Mobile Optimization
export { SwipeableRecommendationCard } from './SwipeableRecommendationCard';
export { MobileRecommendationInbox } from './MobileRecommendationInbox';
export { MobileRecipientSelector } from './MobileRecipientSelector';
export { MobileInboxFilters } from './MobileInboxFilters';
