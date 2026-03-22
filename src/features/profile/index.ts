/**
 * Profile Feature - Main Exports
 *
 * @authority docs/pages/layouts/home/user/phases/PHASE_4_BRAIN_PLAN.md
 * @generated DNA v11.4.0
 */

// Types
export type {
  PublicProfile,
  ProfileStats,
  ProfileUpdateData,
  PasswordChangeData,
  ProfilePageResponse,
  ProfileUpdateResponse,
  PasswordChangeResponse,
  ProfileVisibilitySettings
} from './types';

// Components
export {
  ProfileHeroBanner,
  ProfileInfoSection,
  ProfileStatsSection,
  UserProfilePage,
  UserProfileEditModal,
  ProfileCompletionIndicator,
  ProfileCompletionChecklist
} from './components';

export type {
  ProfileHeroBannerProps,
  ProfileInfoSectionProps,
  ProfileStatsSectionProps,
  UserProfilePageProps,
  UserProfileEditModalProps,
  ProfileCompletionIndicatorProps,
  ProfileCompletionChecklistProps
} from './components';

// Utilities
export {
  calculateProfileCompletion
} from './utils/calculateProfileCompletion';

export type {
  ProfileCompletionResult,
  ProfileField
} from './utils/calculateProfileCompletion';

// Services
export { ProfileService } from './services/ProfileService';
