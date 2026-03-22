/**
 * Quote System Type Definitions
 *
 * @phase Phase 3A - Quote System Foundation
 * @generated DNA v11.4.0
 */

// =============================================================================
// Core Types
// =============================================================================

export type QuoteStatus = 'draft' | 'open' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
export type QuoteTimeline = 'asap' | '1_week' | '2_weeks' | '1_month' | 'flexible';
export type QuoteVisibility = 'public' | 'group' | 'direct';
export type QuoteTargetType = 'listing' | 'group' | 'user';
export type QuoteRequestStatus = 'pending' | 'viewed' | 'responded' | 'declined' | 'expired';
export type QuoteResponseStatus = 'pending' | 'viewed' | 'accepted' | 'rejected' | 'withdrawn';

// =============================================================================
// Quote Interfaces
// =============================================================================

export interface Quote {
  id: number;
  requesterUserId: number | null;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string | null;
  title: string;
  description: string;
  serviceCategory: string | null;
  timeline: QuoteTimeline;
  budgetMin: number | null;
  budgetMax: number | null;
  preferredStartDate: Date | null;
  locationAddress: string | null;
  locationCity: string | null;
  locationState: string | null;
  locationZip: string | null;
  status: QuoteStatus;
  visibility: QuoteVisibility;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Computed/joined
  requestCount?: number;
  responseCount?: number;
}

export interface QuoteRequest {
  id: number;
  quoteId: number;
  targetType: QuoteTargetType;
  targetListingId: number | null;
  targetGroupId: number | null;
  targetUserId: number | null;
  invitedAt: Date;
  viewedAt: Date | null;
  status: QuoteRequestStatus;
  // Joined data
  targetName?: string;
  targetAvatarUrl?: string | null;
}

export interface QuoteResponse {
  id: number;
  quoteId: number;
  quoteRequestId: number | null;
  responderUserId: number;
  responderListingId: number | null;
  bidAmount: number | null;
  bidDescription: string;
  estimatedDuration: string | null;
  validUntil: Date | null;
  attachments: QuoteAttachment[] | null;
  status: QuoteResponseStatus;
  createdAt: Date;
  updatedAt: Date;
  // Joined data
  responderName?: string;
  responderAvatarUrl?: string | null;
  listingName?: string | null;
}

export interface QuoteAttachment {
  name: string;
  url: string;
  type: string;
}

export interface QuoteMessage {
  id: number;
  quoteId: number;
  quoteResponseId: number | null;
  senderUserId: number;
  content: string;
  createdAt: Date;
  // Joined data
  senderName?: string;
  senderAvatarUrl?: string | null;
}

// =============================================================================
// Input Types
// =============================================================================

export interface CreateQuoteInput {
  title: string;
  description: string;
  serviceCategory?: string;
  timeline?: QuoteTimeline;
  budgetMin?: number;
  budgetMax?: number;
  preferredStartDate?: string; // ISO date string
  locationAddress?: string;
  locationCity?: string;
  locationState?: string;
  locationZip?: string;
  visibility?: QuoteVisibility;
  expiresAt?: string; // ISO date string
}

export interface UpdateQuoteInput {
  title?: string;
  description?: string;
  serviceCategory?: string;
  timeline?: QuoteTimeline;
  budgetMin?: number;
  budgetMax?: number;
  preferredStartDate?: string;
  status?: QuoteStatus;
  expiresAt?: string;
}

export interface CreateQuoteRequestInput {
  quoteId: number;
  targetType: QuoteTargetType;
  targetListingId?: number;
  targetGroupId?: number;
  targetUserId?: number;
}

export interface CreateQuoteResponseInput {
  quoteId: number;
  quoteRequestId?: number;
  bidAmount?: number;
  bidDescription: string;
  estimatedDuration?: string;
  validUntil?: string; // ISO date string
  responderListingId?: number;
}

export interface UpdateQuoteResponseInput {
  bidAmount?: number;
  bidDescription?: string;
  estimatedDuration?: string;
  validUntil?: string;
  status?: QuoteResponseStatus;
}

// =============================================================================
// Query Options
// =============================================================================

export interface GetQuotesOptions {
  status?: QuoteStatus | QuoteStatus[];
  serviceCategory?: string;
  visibility?: QuoteVisibility;
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'updated_at' | 'expires_at';
  orderDir?: 'ASC' | 'DESC';
}

export interface GetQuoteResponsesOptions {
  status?: QuoteResponseStatus | QuoteResponseStatus[];
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'bid_amount';
  orderDir?: 'ASC' | 'DESC';
}

// =============================================================================
// Dashboard Summary Types
// =============================================================================

export interface QuoteDashboardSummary {
  sentQuotes: {
    total: number;
    open: number;
    inProgress: number;
    completed: number;
  };
  receivedRequests: {
    total: number;
    pending: number;
    responded: number;
  };
  myResponses: {
    total: number;
    pending: number;
    accepted: number;
  };
}
