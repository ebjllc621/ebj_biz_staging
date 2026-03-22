/**
 * EditListingModal - Data Transformation Functions
 *
 * @authority CLAUDE.md, Phase 7 Brain Plan
 * @tier ENTERPRISE
 * @purpose Convert API responses to ListingFormData and vice versa
 *
 * KEY FUNCTIONS:
 * - apiListingToFormData: API response → form-ready data
 * - formDataToApiUpdate: Form data → API update payload
 * - Helper parsers for JSON fields
 */

import type { ListingFormData, Category, BusinessHours, SocialMediaLinks } from '../../types/listing-form.types';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ApiListingResponse {
  listing: {
    id: number;
    user_id: number | null;
    name: string;
    slug: string;
    description: string | null;
    type: string;
    year_established: number | null;
    slogan: string | null;
    keywords: string | null; // JSON array stored as string
    category_id: number | null;
    business_hours: string | null; // JSON object stored as string
    social_media: string | null; // JSON object stored as string
    address: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
    country: string;
    latitude: number | null;
    longitude: number | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    logo_url: string | null;
    cover_image_url: string | null;
    video_url: string | null;
    audio_url: string | null;
    meta_title: string | null;
    meta_description: string | null;
    meta_keywords: string | null;
    tier: 'essentials' | 'plus' | 'preferred' | 'premium';
    add_ons: string | null; // JSON array stored as string
    mock: boolean;
    contact_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    // Separate DB columns for hours (migration 036)
    hours_status?: string | null;
    timezone?: string | null;
  };
  categories?: {
    active: Category[];
    banked: Category[];
  };
  addons?: Array<'creator' | 'realtor' | 'restaurant' | 'seo_scribe'>;
  userRole?: 'owner' | 'manager' | 'user';
  subscription?: {
    tier: 'essentials' | 'plus' | 'preferred' | 'premium';
    billingCycle: 'monthly' | 'yearly';
    status: 'active' | 'cancelled' | 'past_due';
  };
}

// ============================================================================
// HELPER PARSERS
// ============================================================================

/**
 * Safely parse a value that might be a JSON string or already parsed by MariaDB
 * MariaDB auto-parses JSON columns, so we need to handle both cases
 */
function safeParseJson<T>(value: unknown, defaultValue: T): T {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  // If already an object/array (MariaDB auto-parsed), return as-is
  if (typeof value === 'object') {
    return value as T;
  }
  // If string, try to parse
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return defaultValue;
    }
  }
  return defaultValue;
}

/**
 * Parse keywords JSON string to array
 * Handles both string and already-parsed array (MariaDB auto-parsing)
 */
export function parseKeywords(keywordsJson: string | object | null | undefined): string[] {
  const parsed = safeParseJson<unknown>(keywordsJson, null);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Parse business hours JSON to determine hoursStatus
 * Handles: wrapper object, flat array, string, already-parsed (MariaDB)
 */
export function parseHoursStatus(hoursJson: string | object | null | undefined): 'timetable' | '24/7' | 'closed' {
  const parsed = safeParseJson<unknown>(hoursJson, null);
  if (!parsed) return 'closed';

  // If it's a flat array (canonical DB format), it's a timetable if non-empty
  if (Array.isArray(parsed)) {
    return parsed.length > 0 ? 'timetable' : 'closed';
  }

  // If it's a wrapper object
  if (typeof parsed === 'object' && parsed !== null) {
    const obj = parsed as Record<string, unknown>;
    if (obj.is24_7 === true || obj.is247 === true) return '24/7';
    if (obj.isClosed === true) return 'closed';
    if (Array.isArray(obj.schedule) && obj.schedule.some((item: Record<string, unknown>) => item?.isOpen || item?.is_open)) {
      return 'timetable';
    }
  }
  return 'closed';
}

/**
 * Parse business hours JSON to BusinessHours array
 * Handles: flat array [{day,open,close}], wrapper object {schedule:[...]},
 * legacy boolean [{day,open:true,startTime,endTime}], string, MariaDB auto-parsed
 */
export function parseBusinessHours(hoursJson: string | object | null | undefined): BusinessHours[] {
  type DayName = BusinessHours['day'];
  const DAYS: DayName[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const defaultHours: BusinessHours[] = DAYS.map(day => ({
    day, isOpen: false, openTime: '09:00', closeTime: '17:00',
  }));

  const parsed = safeParseJson<unknown>(hoursJson, null);
  if (!parsed) return defaultHours;

  let entries: unknown[] | null = null;

  // Flat array format (canonical DB format from HoursManager)
  if (Array.isArray(parsed)) {
    entries = parsed;
  }
  // Wrapper object format (legacy modal format)
  else if (typeof parsed === 'object' && parsed !== null) {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.schedule)) {
      entries = obj.schedule;
    }
  }

  if (!entries || entries.length === 0) return defaultHours;

  // Map entries to the 7-day format expected by the form
  return DAYS.map(dayKey => {
    const entry = entries!.find((e: unknown) => {
      const item = e as Record<string, unknown>;
      return item?.day?.toString().toLowerCase() === dayKey;
    }) as Record<string, unknown> | undefined;

    if (!entry) {
      return { day: dayKey, isOpen: false, openTime: '09:00', closeTime: '17:00' };
    }

    // Format 1: { day, open: "09:00", close: "17:00" } (canonical flat array)
    if (typeof entry.open === 'string' && typeof entry.close === 'string') {
      const isClosed = entry.open === 'closed' || entry.close === 'closed'
        || entry.open === '' || entry.close === '';
      return {
        day: dayKey,
        isOpen: !isClosed,
        openTime: isClosed ? '09:00' : entry.open as string,
        closeTime: isClosed ? '17:00' : entry.close as string,
      };
    }

    // Format 2: { day, isOpen, openTime, closeTime } (modal schedule format)
    if ('isOpen' in entry && 'openTime' in entry) {
      return {
        day: dayKey,
        isOpen: Boolean(entry.isOpen),
        openTime: (entry.openTime as string) || '09:00',
        closeTime: (entry.closeTime as string) || '17:00',
      };
    }

    // Format 3: { day, open: true/false, startTime, endTime } (legacy boolean)
    if (typeof entry.open === 'boolean') {
      return {
        day: dayKey,
        isOpen: entry.open,
        openTime: (entry.startTime as string) || (entry.open_time as string) || '09:00',
        closeTime: (entry.endTime as string) || (entry.close_time as string) || '17:00',
      };
    }

    return { day: dayKey, isOpen: false, openTime: '09:00', closeTime: '17:00' };
  });
}

/**
 * Get timezone from business hours JSON or default
 * Handles both string and already-parsed object (MariaDB auto-parsing)
 */
export function parseTimezone(hoursJson: string | object | null | undefined): string {
  const parsed = safeParseJson<Record<string, unknown> | null>(hoursJson, null);
  return (parsed?.timezone as string) || 'America/New_York';
}

/**
 * Parse social media JSON to SocialMediaLinks
 * Handles both string and already-parsed object (MariaDB auto-parsing)
 */
export function parseSocialMedia(socialJson: string | object | null | undefined): SocialMediaLinks {
  const defaultSocial: SocialMediaLinks = {
    facebook: '',
    instagram: '',
    twitter: '',
    linkedin: '',
    tiktok: '',
    youtube: '',
  };

  const parsed = safeParseJson<Record<string, unknown> | null>(socialJson, null);
  if (!parsed || typeof parsed !== 'object') return defaultSocial;

  return {
    facebook: (parsed.facebook as string) || '',
    instagram: (parsed.instagram as string) || '',
    twitter: (parsed.twitter as string) || '',
    linkedin: (parsed.linkedin as string) || '',
    tiktok: (parsed.tiktok as string) || '',
    youtube: (parsed.youtube as string) || '',
  };
}

/**
 * Parse addons JSON string to array
 * Handles both string and already-parsed array (MariaDB auto-parsing)
 */
export function parseAddons(addonsJson: string | object | null | undefined): Array<'creator' | 'realtor' | 'restaurant' | 'seo_scribe'> {
  const parsed = safeParseJson<unknown>(addonsJson, null);
  return Array.isArray(parsed) ? parsed : [];
}

// ============================================================================
// MAIN TRANSFORMERS
// ============================================================================

/**
 * Transform API listing response to ListingFormData for form population
 *
 * @param apiResponse - Complete API response from GET /api/listings/[id]/full
 * @returns Partial<ListingFormData> ready for form state
 */
export function apiListingToFormData(apiResponse: ApiListingResponse): Partial<ListingFormData> {
  const { listing, categories, addons, userRole } = apiResponse;

  return {
    // Section 1: Membership
    tier: apiResponse.subscription?.tier || listing.tier || 'essentials',
    selectedAddons: addons || parseAddons(listing.add_ons),
    isMockListing: listing.mock || false,

    // Section 2: Basic Information
    name: listing.name,
    slug: listing.slug,
    type: listing.type || '',
    yearEstablished: listing.year_established,
    slogan: listing.slogan || '',
    keywords: parseKeywords(listing.keywords),
    activeCategories: categories?.active || [],
    bankCategories: categories?.banked || [],
    description: listing.description || '',

    // Section 3: Hours of Operation
    // Prefer dedicated DB columns (migration 036), fall back to JSON parsing
    hoursStatus: listing.hours_status
      ? (listing.hours_status === '24-7' ? '24/7' : listing.hours_status as 'timetable' | 'closed')
      : parseHoursStatus(listing.business_hours),
    timezone: listing.timezone || parseTimezone(listing.business_hours),
    businessHours: parseBusinessHours(listing.business_hours),

    // Section 4: Contact Information
    address: listing.address || '',
    city: listing.city || '',
    state: listing.state || '',
    zipCode: listing.zip_code || '',
    country: listing.country || 'US',
    // MariaDB returns DECIMAL columns as strings - must convert to numbers
    latitude: listing.latitude !== null && listing.latitude !== undefined
      ? parseFloat(String(listing.latitude))
      : null,
    longitude: listing.longitude !== null && listing.longitude !== undefined
      ? parseFloat(String(listing.longitude))
      : null,
    phone: listing.phone || '',
    email: listing.email || '',
    website: listing.website || '',
    socialMedia: parseSocialMedia(listing.social_media),

    // Section 5: Media
    logoUrl: listing.logo_url,
    coverImageUrl: listing.cover_image_url,
    videoUrl: listing.video_url,
    audioUrl: listing.audio_url,

    // Section 6: SEO
    metaTitle: listing.meta_title || '',
    metaDescription: listing.meta_description || '',
    metaKeywords: listing.meta_keywords || '',

    // Section 7: Role & Authorization (pre-populated from existing data)
    userRole: userRole || 'owner',
    ownerName: listing.contact_name || '',
    ownerEmail: listing.contact_email || '',
    ownerPhone: listing.contact_phone || '',
    termsAccepted: true, // Already accepted on creation
  };
}

/**
 * Transform ListingFormData to API update payload
 *
 * @param formData - Complete form data
 * @returns API-ready update payload
 */
export function formDataToApiUpdate(formData: ListingFormData): Record<string, unknown> {
  // Build business hours as canonical flat array (only open days)
  // hours_status and timezone are saved as separate DB columns
  const businessHoursArray = formData.hoursStatus === 'timetable'
    ? formData.businessHours
        .filter(h => h.isOpen)
        .map(h => ({
          day: h.day,
          open: h.openTime,
          close: h.closeTime,
        }))
    : [];

  // Build social media JSON
  const socialMediaJson = {
    facebook: formData.socialMedia.facebook,
    instagram: formData.socialMedia.instagram,
    twitter: formData.socialMedia.twitter,
    linkedin: formData.socialMedia.linkedin,
    tiktok: formData.socialMedia.tiktok,
    youtube: formData.socialMedia.youtube,
  };

  return {
    // Basic info
    name: formData.name,
    slug: formData.slug,
    type: formData.type,
    year_established: formData.yearEstablished,
    slogan: formData.slogan,
    keywords: JSON.stringify(formData.keywords),
    description: formData.description,

    // Tier & Addons
    tier: formData.tier,
    add_ons: JSON.stringify(formData.selectedAddons),
    mock: formData.isMockListing,

    // Categories (will be handled separately with INSERT/DELETE)
    category_ids: formData.activeCategories.map((c) => c.id),
    bank_category_ids: formData.bankCategories.map((c) => c.id),

    // Hours - flat array for business_hours, separate columns for status/timezone
    business_hours: JSON.stringify(businessHoursArray),
    hours_status: formData.hoursStatus === '24/7' ? '24-7' : formData.hoursStatus,
    timezone: formData.timezone,

    // Contact
    address: formData.address,
    city: formData.city,
    state: formData.state,
    zip_code: formData.zipCode,
    country: formData.country,
    latitude: formData.latitude,
    longitude: formData.longitude,
    phone: formData.phone,
    email: formData.email,
    website: formData.website,
    social_media: JSON.stringify(socialMediaJson),

    // Media - exclude data URLs (file uploads are handled separately by useListingUpdate)
    logo_url: formData.logoUrl?.startsWith('data:') ? undefined : formData.logoUrl,
    cover_image_url: formData.coverImageUrl?.startsWith('data:') ? undefined : formData.coverImageUrl,
    video_url: formData.videoUrl,
    audio_url: formData.audioUrl,

    // SEO
    meta_title: formData.metaTitle,
    meta_description: formData.metaDescription,
    meta_keywords: formData.metaKeywords,

    // Contact info (for listing_users table)
    contact_name: formData.ownerName,
    contact_email: formData.ownerEmail,
    contact_phone: formData.ownerPhone,
  };
}
