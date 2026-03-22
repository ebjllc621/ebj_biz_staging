/**
 * Notification Service Barrel Export
 */

export * from './types';
export * from './push-types';
export * from './email-types';
export { FCMPushProvider, PushNotificationError, DeviceRegistrationError } from './FCMPushProvider';
export { PushDeviceService } from './PushDeviceService';
export { EmailNotificationService, EmailNotificationError } from './EmailNotificationService';
export { EmailTemplateRenderer } from './EmailTemplateRenderer';

// Listing Approval System Phase 5 - Notification System
export { ListingNotificationService } from './ListingNotificationService';
export type { ListingEmailResult } from './ListingNotificationService';
export { ListingEmailTemplateRenderer } from './ListingEmailTemplateRenderer';
export type {
  ListingSubmittedTemplateData,
  ListingApprovedTemplateData,
  ListingRejectedTemplateData,
  AdminListingAlertData
} from './ListingEmailTemplateRenderer';

// BizWire Notification Service
export { BizWireNotificationService } from './BizWireNotificationService';
export type { BizWireNotificationResult } from './BizWireNotificationService';

// Job Notification Service (Phase 2)
export { JobNotificationService } from './JobNotificationService';
export type { JobNotificationResult } from './JobNotificationService';
