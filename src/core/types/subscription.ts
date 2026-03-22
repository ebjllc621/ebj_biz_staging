/**
 * Subscription Types & Enums
 *
 * Shared types extracted from SubscriptionService to allow client-side imports
 * without pulling in server-only dependencies (mariadb, sharp via ServiceRegistry).
 *
 * @authority SubscriptionService.ts - canonical source
 */

export enum ListingTier {
  ESSENTIALS = 'essentials',
  PLUS = 'plus',
  PREFERRED = 'preferred',
  PREMIUM = 'premium'
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended'
}

export enum AddonStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

export enum AddonSuiteName {
  CREATOR = 'creator',
  REALTOR = 'realtor',
  RESTAURANT = 'restaurant',
  SEO_SCRIBE = 'seo_scribe'
}

export interface TierLimits {
  categories: number; // -1 = unlimited
  images: number;
  videos: number;
  offers: number;
  events: number;
  html_descriptions?: boolean;
  attachments?: number;
  featured_placement?: boolean;
  projects?: number;
  job_postings?: number;
  campaign_credit?: number;
  job_images?: number; // -1 = unlimited, per job posting
  job_videos?: number; // -1 = unlimited, per job posting
}

export interface SubscriptionPlan {
  id: number;
  tier: ListingTier;
  version: string;
  name: string;
  pricing_monthly: number | null;
  pricing_annual: number | null;
  features: TierLimits;
  effective_date: Date;
  deprecated_date: Date | null;
  created_at: Date;
}

export interface AddonSuite {
  id: number;
  suite_name: AddonSuiteName;
  version: string;
  display_name: string;
  pricing_monthly: number | null;
  pricing_annual: number | null;
  features: string[];
  effective_date: Date;
  deprecated_date: Date | null;
  created_at: Date;
}

export interface TierCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  unlimited: boolean;
}

export type BillingCycle = 'monthly' | 'annual';

export interface ListingSubscription {
  id: number;
  listing_id: number;
  plan_id: number;
  plan_version: string;
  started_at: Date;
  renews_at: Date | null;
  is_grandfathered: boolean;
  override_features: Partial<TierLimits> | null;
  status: SubscriptionStatus;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  nextBillingDate: Date | null;
  failedPaymentCount: number;
  pendingTierChange: ListingTier | null;
  billingCycle: BillingCycle;
  cancelAtPeriodEnd: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ListingSubscriptionAddon {
  id: number;
  listing_subscription_id: number;
  addon_suite_id: number;
  started_at: Date;
  renews_at: Date | null;
  status: AddonStatus;
  created_at: Date;
}

export interface CreatePlanInput {
  tier: ListingTier;
  version: string;
  name: string;
  pricing_monthly?: number;
  pricing_annual?: number;
  features: TierLimits;
  effective_date: Date;
}

export interface UpgradePath {
  from_tier: ListingTier;
  to_tier: ListingTier;
  is_upgrade: boolean;
  is_downgrade: boolean;
  price_difference_monthly: number;
  price_difference_annual: number;
  proration_required: boolean;
}

// === BILLING EXTENSION TYPES (Phase 1) ===

export interface PaymentMethod {
  id: number;
  userId: number;
  stripePaymentMethodId: string;
  type: 'card' | 'us_bank_account' | 'paypal' | 'link';
  brand: string | null;
  lastFour: string | null;
  expMonth: number | null;
  expYear: number | null;
  isDefault: boolean;
  billingName: string | null;
  billingZip: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StripeSubscriptionConfig {
  customerId: string;
  priceId: string;
  listingId: number;
  billingCycle: BillingCycle;
  paymentMethodId?: string;
}

// === BILLING TRANSACTION TYPES (Phase 2) ===

export type TransactionType =
  | 'subscription_charge'
  | 'addon_charge'
  | 'campaign_bank_deposit'
  | 'campaign_bank_spend'
  | 'refund'
  | 'credit'
  | 'adjustment';

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface BillingTransaction {
  id: number;
  userId: number;
  listingId: number | null;
  transactionType: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  subscriptionId: number | null;
  addonId: number | null;
  stripeChargeId: string | null;
  stripeInvoiceId: string | null;
  stripePaymentIntentId: string | null;
  description: string;
  invoiceNumber: string | null;
  taxAmount: number;
  taxRate: number | null;
  transactionDate: Date;
  dueDate: Date | null;
  paidDate: Date | null;
  receiptUrl: string | null;
  statementMonth: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBillingTransactionInput {
  userId: number;
  listingId?: number;
  transactionType: TransactionType;
  amount: number;
  currency?: string;
  status?: TransactionStatus;
  subscriptionId?: number;
  addonId?: number;
  stripeChargeId?: string;
  stripeInvoiceId?: string;
  stripePaymentIntentId?: string;
  description: string;
  invoiceNumber?: string;
  taxAmount?: number;
  taxRate?: number;
  metadata?: Record<string, unknown>;
}

export interface SubscriptionPurchaseInput {
  listingId: number;
  planId: number;
  billingCycle: BillingCycle;
  paymentMethodId?: string;
}

export interface SubscriptionChangeResult {
  subscription: ListingSubscription;
  transaction: BillingTransaction | null;
  effectiveDate: Date;
  message: string;
}

// === REFUND TYPES (Phase 4) ===

export type RefundEntityType = 'subscription' | 'event_ticket' | 'addon' | 'other';
export type RefundReasonCategory = 'customer_request' | 'service_issue' | 'billing_error' | 'duplicate_charge' | 'cancellation_mid_cycle' | 'other';
export type RefundStatus = 'submitted' | 'under_review' | 'approved' | 'denied' | 'processing' | 'completed' | 'failed';
export type RefundAuditAction = 'submitted' | 'status_changed' | 'review_assigned' | 'reviewed' | 'approved' | 'denied' | 'escalated' | 'processing' | 'completed' | 'failed';

export interface RefundRequest {
  id: number;
  entityType: RefundEntityType;
  entityId: number;
  userId: number;
  listingId: number | null;
  originalAmount: number;
  requestedAmount: number;
  approvedAmount: number | null;
  processedAmount: number | null;
  currency: string;
  reasonCategory: RefundReasonCategory;
  reasonDetails: string | null;
  status: RefundStatus;
  reviewedBy: number | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  approvedBy: number | null;
  approvedAt: Date | null;
  stripeRefundId: string | null;
  stripePaymentIntentId: string | null;
  processedAt: Date | null;
  requiresEscalation: boolean;
  escalatedTo: number | null;
  escalatedAt: Date | null;
  escalationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRefundRequestInput {
  entityType: RefundEntityType;
  entityId: number;
  listingId?: number;
  originalAmount: number;
  requestedAmount: number;
  reasonCategory: RefundReasonCategory;
  reasonDetails?: string;
  stripePaymentIntentId?: string;
}

export interface RefundAuditEntry {
  id: number;
  refundRequestId: number;
  adminUserId: number | null;
  actionType: RefundAuditAction;
  actionDescription: string | null;
  beforeStatus: string | null;
  afterStatus: string | null;
  beforeAmount: number | null;
  afterAmount: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

// === STATEMENT TYPES (Phase 5) ===

export type StatementStatus = 'draft' | 'sent' | 'paid';

export interface MonthlyStatement {
  id: number;
  userId: number;
  statementMonth: string;
  subscriptionCharges: number;
  addonCharges: number;
  campaignBankDeposits: number;
  campaignBankSpend: number;
  refunds: number;
  credits: number;
  adjustments: number;
  totalCharges: number;
  openingBalance: number;
  closingBalance: number;
  amountPaid: number;
  amountDue: number;
  status: StatementStatus;
  pdfUrl: string | null;
  pdfGeneratedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// === CAMPAIGN BANK TYPES (Phase 6) ===

export type CampaignBankStatus = 'active' | 'frozen' | 'depleted';

export interface CampaignBank {
  id: number;
  userId: number;
  listingId: number;
  balance: number;
  totalDeposited: number;
  totalSpent: number;
  lastDepositAt: Date | null;
  lastSpendAt: Date | null;
  status: CampaignBankStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignBankDepositInput {
  listingId: number;
  amount: number;
  paymentMethodId?: string;
  description?: string;
}
