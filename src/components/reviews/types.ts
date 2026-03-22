/**
 * Shared Review Types
 *
 * @phase Phase 1 - Review System Foundation
 * @governance Build Map v2.1 ENHANCED
 */

import type { RatingDistribution, ReviewStatus } from '@core/services/ReviewService';

/**
 * Entity-agnostic review interface for shared components.
 * Subset of the full Review type that all review UIs need.
 */
export interface SharedReview {
  id: number;
  user_id: number;
  rating: number;
  title: string | null;
  review_text: string | null;
  images: string[] | null;
  helpful_count: number;
  not_helpful_count: number;
  owner_response: string | null;
  owner_response_date: Date | null;
  is_verified_purchase: boolean;
  created_at: Date;
}

export type { RatingDistribution, ReviewStatus };
