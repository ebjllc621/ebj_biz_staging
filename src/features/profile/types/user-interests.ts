/**
 * User Interests Types
 *
 * @authority docs/pages/layouts/userProfile/phases/PHASE_3A_BRAIN_PLAN.md
 * @tier ADVANCED
 * @generated DNA v11.4.0
 */

/**
 * Interest type enumeration
 */
export type InterestType = 'category' | 'custom' | 'group' | 'membership';

/**
 * Category interest with hierarchy information
 */
export interface CategoryInterest {
  /** Interest record ID */
  id: number;
  /** User ID */
  user_id: number;
  /** Interest type */
  interest_type: 'category';
  /** Category ID */
  category_id: number;
  /** Category name */
  category_name: string;
  /** Category slug */
  category_slug: string;
  /** Full category path (e.g., "Business > Marketing > Digital") */
  category_path: string;
  /** Parent category names for badge generation */
  parent_categories: string[];
  /** Display order */
  display_order: number;
  /** Visibility flag */
  is_visible: boolean;
  /** Creation timestamp */
  created_at: Date;
}

/**
 * Custom interest (text-based, Phase 3B)
 */
export interface CustomInterest {
  id: number;
  user_id: number;
  interest_type: 'custom';
  custom_value: string;
  display_order: number;
  is_visible: boolean;
  created_at: Date;
}

/**
 * Group membership (Phase 3C)
 */
export interface GroupInterest {
  id: number;
  user_id: number;
  interest_type: 'group';
  group_name: string;
  group_purpose: string | null;
  group_role: string | null;
  display_order: number;
  is_visible: boolean;
  created_at: Date;
}

/**
 * Professional membership/certification (Phase 3C)
 */
export interface MembershipInterest {
  id: number;
  user_id: number;
  interest_type: 'membership';
  membership_name: string;
  membership_description: string | null;
  display_order: number;
  is_visible: boolean;
  created_at: Date;
}

/**
 * Union type for all interest types
 */
export type UserInterest = CategoryInterest | CustomInterest | GroupInterest | MembershipInterest;

/**
 * Request to add a category interest
 */
export interface AddCategoryInterestRequest {
  category_id: number;
  display_order?: number;
}

/**
 * Request to add a custom interest
 */
export interface AddCustomInterestRequest {
  custom_value: string;
  display_order?: number;
}

/**
 * Request to add a group interest
 */
export interface AddGroupRequest {
  group_name: string;
  group_purpose?: string;
  group_role?: string;
  display_order?: number;
}

/**
 * Request to update a group interest
 */
export interface UpdateGroupRequest {
  group_name?: string;
  group_purpose?: string;
  group_role?: string;
}

/**
 * Request to add a membership interest
 */
export interface AddMembershipRequest {
  membership_name: string;
  membership_description?: string;
  display_order?: number;
}

/**
 * Request to update a membership interest
 */
export interface UpdateMembershipRequest {
  membership_name?: string;
  membership_description?: string;
}

/**
 * Database row type for user_interests table
 */
export interface UserInterestRow {
  id: number;
  user_id: number;
  interest_type: InterestType;
  category_id: number | null;
  custom_value: string | null;
  group_name: string | null;
  group_purpose: string | null;
  group_role: string | null;
  membership_name: string | null;
  membership_description: string | null;
  display_order: number;
  is_visible: number; // MariaDB returns 0/1 for TINYINT
  created_at: Date;
  updated_at: Date;
}

/**
 * Category search result with path
 */
export interface CategorySearchResult {
  id: number;
  name: string;
  slug: string;
  fullPath: string;
  parent_id: number | null;
}
