/**
 * NewListingModal - Form Data Types
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier ENTERPRISE - Complex multi-section form
 * @phase Phase 1 - Foundation
 */

// ============================================================================
// TIER AND ADDON TYPES
// ============================================================================

export type ListingTier = 'essentials' | 'plus' | 'preferred' | 'premium';
export type AddonSuite = 'creator' | 'realtor' | 'restaurant' | 'seo_scribe';

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

/**
 * Assigned user for admin-created listings
 * When admin creates listing, they can assign it to a specific user
 */
export interface AssignedUser {
  id: number;
  username: string;
  email: string;
  displayName: string | null;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  fullPath: string;
  keywords?: string[]; // Keywords from database categories table
}

export interface BusinessHours {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  isOpen: boolean;
  openTime: string; // HH:MM format
  closeTime: string; // HH:MM format
}

export interface SocialMediaLinks {
  facebook: string;
  instagram: string;
  twitter: string;
  linkedin: string;
  tiktok: string;
  youtube: string;
}

export interface TierLimits {
  categories: number;
  bankCategories: number;
  images: number;
  videos: number;
  descriptionLength: number;
  freeAddons: number;
}

// ============================================================================
// MAIN FORM DATA INTERFACE
// ============================================================================

export interface ListingFormData {
  // Section 1: Membership
  tier: ListingTier;
  selectedAddons: AddonSuite[];
  isMockListing: boolean; // Admin only
  assignedUser: AssignedUser | null; // Admin only - user to assign listing to

  // Section 2: Basic Information
  name: string;
  slug: string;
  type: string; // Type NAME (e.g., "Service Provider", "Business")
  yearEstablished: number | null;
  slogan: string;
  keywords: string[];
  activeCategories: Category[];
  bankCategories: Category[];
  description: string;

  // Section 3: Hours of Operation
  hoursStatus: 'timetable' | '24/7' | 'closed';
  timezone: string;
  businessHours: BusinessHours[];

  // Section 4: Contact Information
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  phone: string;
  email: string;
  website: string;
  socialMedia: SocialMediaLinks;

  // Section 5: Media
  logoUrl: string | null;
  coverImageUrl: string | null;
  videoUrl: string | null;
  audioUrl: string | null;
  // UMM: Store actual files for post-creation upload to Cloudinary
  logoFile: File | null;
  coverFile: File | null;

  // Section 6: SEO
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;

  // Section 7: Role & Authorization
  userRole: 'owner' | 'manager' | 'user';
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  termsAccepted: boolean;
}

// ============================================================================
// TIER LIMITS CONSTANTS
// ============================================================================

export const TIER_LIMITS: Record<ListingTier, TierLimits> = {
  essentials: {
    categories: 6,
    bankCategories: 18, // 24 total - 6 active
    images: 6,
    videos: 1,
    descriptionLength: 700,
    freeAddons: 0
  },
  plus: {
    categories: 12,
    bankCategories: 12, // 24 total - 12 active
    images: 12,
    videos: 10,
    descriptionLength: 1500,
    freeAddons: 0
  },
  preferred: {
    categories: 20,
    bankCategories: 4, // 24 total - 20 active
    images: 100,
    videos: 50,
    descriptionLength: 3000,
    freeAddons: 0
  },
  premium: {
    categories: 20,
    bankCategories: 4, // 24 total - 20 active
    images: 100,
    videos: 50,
    descriptionLength: 5000,
    freeAddons: 2
  }
};

