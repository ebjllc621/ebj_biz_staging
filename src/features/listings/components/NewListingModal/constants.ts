/**
 * NewListingModal - Constants and Default Values
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier ENTERPRISE
 * @phase Phase 1 - Foundation
 */

import type { ListingFormData, BusinessHours, SocialMediaLinks, ListingTier, AddonSuite } from '../../types/listing-form.types';

// ============================================================================
// SECTION DEFINITIONS
// ============================================================================

export const SECTIONS = [
  { number: 1, title: 'Select a Membership', required: true },
  { number: 2, title: 'Basic Information', required: true },
  { number: 3, title: 'Hours of Operation', required: false },
  { number: 4, title: 'Contact Information', required: true },
  { number: 5, title: 'Media Uploads', required: false },
  { number: 6, title: 'SEO Information', required: false },
  { number: 7, title: 'What is your role regarding this listing?', required: true }
] as const;

// ============================================================================
// DAYS OF WEEK
// ============================================================================

export const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
] as const;

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_BUSINESS_HOURS: BusinessHours[] = DAYS_OF_WEEK.map(day => ({
  day,
  isOpen: day !== 'saturday' && day !== 'sunday',
  openTime: '09:00',
  closeTime: '17:00'
}));

export const DEFAULT_SOCIAL_MEDIA: SocialMediaLinks = {
  facebook: '',
  instagram: '',
  twitter: '',
  linkedin: '',
  tiktok: '',
  youtube: ''
};

// ============================================================================
// INITIAL FORM DATA
// ============================================================================

export const INITIAL_FORM_DATA: ListingFormData = {
  // Section 1: Membership
  tier: 'essentials',
  selectedAddons: [],
  isMockListing: false,
  assignedUser: null,

  // Section 2: Basic Information
  name: '',
  slug: '',
  type: '',
  yearEstablished: null,
  slogan: '',
  keywords: [],
  activeCategories: [],
  bankCategories: [],
  description: '',

  // Section 3: Hours of Operation
  hoursStatus: 'timetable',
  timezone: 'America/New_York',
  businessHours: DEFAULT_BUSINESS_HOURS,

  // Section 4: Contact Information
  address: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'US',
  latitude: null,
  longitude: null,
  phone: '',
  email: '',
  website: '',
  socialMedia: DEFAULT_SOCIAL_MEDIA,

  // Section 5: Media
  logoUrl: null,
  coverImageUrl: null,
  videoUrl: null,
  audioUrl: null,
  // UMM: Store actual files for post-creation upload to Cloudinary
  logoFile: null,
  coverFile: null,

  // Section 6: SEO
  metaTitle: '',
  metaDescription: '',
  metaKeywords: '',

  // Section 7: Role & Authorization
  userRole: 'owner',
  ownerName: '',
  ownerEmail: '',
  ownerPhone: '',
  termsAccepted: false
};

// ============================================================================
// TIER FEATURES (For Display)
// ============================================================================

export const TIER_FEATURES: Record<ListingTier, string[]> = {
  essentials: [
    'Basic business listing',
    'Contact information display',
    'Business hours & location',
    'Up to 6 active categories',
    'Basic search visibility'
  ],
  plus: [
    'Everything in Essentials',
    'Enhanced search placement',
    'Up to 12 active categories',
    'Customer reviews & ratings',
    'Photo gallery (12 images)'
  ],
  preferred: [
    'Everything in Plus',
    'Priority search placement',
    'Up to 20 active categories',
    'Video & audio content',
    '100 image gallery',
    'Priority customer support'
  ],
  premium: [
    'Everything in Preferred',
    'Featured listing placement',
    'Advanced analytics & insights',
    'Custom branding options',
    'Choose ANY 2 add-ons FREE',
    'Dedicated account manager'
  ]
};

export const ADDON_FEATURES: Record<AddonSuite, { tag: string; tagColor: string; description: string; features: string[] }> = {
  creator: {
    tag: 'Popular',
    tagColor: 'bg-[#ed6437] text-white',
    description: 'Content creation and publishing tools for businesses',
    features: [
      'Article & blog management',
      'Video & podcast hosting',
      'Content analytics',
      'SEO optimization tools'
    ]
  },
  realtor: {
    tag: 'Professional',
    tagColor: 'bg-[#8d918d] text-white',
    description: 'Real estate tools for property management',
    features: [
      'Property gallery management',
      'Virtual tour integration',
      'MLS connectivity',
      'Client portal & lead tracking'
    ]
  },
  restaurant: {
    tag: 'Industry',
    tagColor: 'bg-amber-500 text-white',
    description: 'Restaurant and food service management',
    features: [
      'Digital menu management',
      'Online ordering integration',
      'Reservation system',
      'Delivery service connections'
    ]
  },
  seo_scribe: {
    tag: 'AI-Powered',
    tagColor: 'bg-[#022641] text-white',
    description: 'AI-powered SEO optimization assistant',
    features: [
      'Keyword research & tracking',
      'Local SEO optimization',
      'Performance analytics',
      'AI content suggestions'
    ]
  }
};

// ============================================================================
// US TIMEZONES
// ============================================================================

export const US_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
  { value: 'America/Phoenix', label: 'Arizona (no DST)' },
] as const;

// ============================================================================
// SOCIAL MEDIA PLATFORMS
// ============================================================================

export const SOCIAL_MEDIA_PLATFORMS = [
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/yourbusiness' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourbusiness' },
  { key: 'twitter', label: 'Twitter', placeholder: 'https://twitter.com/yourbusiness' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/yourbusiness' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@yourbusiness' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/c/yourbusiness' },
] as const;
