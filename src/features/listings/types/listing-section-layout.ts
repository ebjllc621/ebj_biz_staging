/**
 * Listing Section Layout Type Definitions
 * Defines section and feature layout preferences for listing details pages
 */

import {
  LayoutGrid,
  Sparkles,
  Settings,
  LayoutDashboard
} from 'lucide-react';

// Section identifiers for main layout areas
export type SectionId =
  | 'details'       // Basic info, description, categories
  | 'features'      // Business hours, amenities, attributes
  | 'communication' // Contact info, social media, website
  | 'advanced'      // SEO, custom fields, analytics
  | 'sidebar';      // Map, media gallery, quick actions

// Feature identifiers for granular control
export type FeatureId =
  // Details section features
  | 'branding'
  | 'quick-facts'
  | 'categories'
  | 'keywords'
  | 'video-embed'
  | 'audio-embed'
  | 'description'
  | 'memberships'
  | 'contact-info'
  | 'website'
  | 'location'
  | 'hours'
  | 'social-links'
  | 'testimonials'

  // Features section features
  | 'gallery'
  | 'video-gallery'
  | 'projects'
  | 'offers'
  | 'events'
  | 'jobs'
  | 'products'
  | 'team'
  | 'attachments'
  | 'other-locations'
  | 'affiliated'

  // Communication section features
  | 'messages'
  | 'bizwire'
  | 'reviews'
  | 'followers'
  | 'recommendations'
  | 'notifications'

  // Advanced section features
  | 'announcements'
  | 'services'
  | 'quotes'
  | 'slogan'

  // Sidebar features (separate namespace)
  | 'sidebar-categories'
  | 'sidebar-memberships'
  | 'sidebar-location'
  | 'sidebar-contact'
  | 'sidebar-hours'
  | 'sidebar-social'
  | 'sidebar-testimonials'
  | 'sidebar-quote'
  | 'sidebar-announcements'
  | 'sidebar-calendar'
  | 'sidebar-services'
  | 'sidebar-reviews';

/**
 * Features that should NEVER appear on public listing pages
 * These are dashboard-only features for listing management
 */
export const DASHBOARD_ONLY_FEATURES: FeatureId[] = [
  'messages',
  'bizwire',
  'followers',
  'recommendations',
  'notifications',
  'keywords'  // SEO indexing only, not public display
];

/**
 * Sections that should appear in the main content area
 * Excludes sidebar (handled separately) and communication (dashboard-only except reviews)
 */
export const MAIN_CONTENT_SECTIONS: SectionId[] = [
  'details',
  'features',
  'advanced'
];

/**
 * Sections that are dashboard-only (not displayed in main content area)
 * These are managed through the listing manager in the user's dashboard
 */
export const DASHBOARD_ONLY_SECTIONS: SectionId[] = [
  'communication',  // Messages, notifications, followers - all dashboard features
  'sidebar'         // Handled separately in the sidebar column
];

/**
 * Check if a section should be displayed in the main content area
 */
export function isMainContentSection(sectionId: SectionId): boolean {
  return MAIN_CONTENT_SECTIONS.includes(sectionId);
}

/**
 * Check if a feature should be displayed on public pages
 */
export function isPublicFeature(featureId: FeatureId): boolean {
  return !DASHBOARD_ONLY_FEATURES.includes(featureId);
}

// Listing tier levels (from subscription system)
export type ListingTier = 'essentials' | 'plus' | 'preferred' | 'premium';

// View mode for listing details page
export type ListingViewMode = 'edit' | 'published';

// Feature configuration
export interface FeatureConfig {
  id: FeatureId;
  order: number;
  visible: boolean;
  collapsed?: boolean; // Optional, for collapsible features
}

// Section configuration
export interface SectionConfig {
  id: SectionId;
  order: number;
  visible: boolean;
  collapsed?: boolean; // Optional, for collapsible sections
  features: FeatureConfig[];
}

// Complete listing section layout
export interface ListingSectionLayout {
  sections: SectionConfig[];
  version: number;
  updatedAt: string;
}

// Feature metadata for tier availability and requirements
export interface FeatureMetadata {
  id: FeatureId;
  label: string;
  description: string;
  minTier: ListingTier;
  section: SectionId;
  defaultOrder: number;
  defaultVisible: boolean;
  defaultCollapsed?: boolean;
}

// Default listing section layout
export const DEFAULT_LISTING_SECTION_LAYOUT: ListingSectionLayout = {
  sections: [
    {
      id: 'details',
      order: 0,
      visible: true,
      features: [
        { id: 'quick-facts', order: 0, visible: true },
        { id: 'categories', order: 1, visible: true },
        { id: 'keywords', order: 2, visible: true },
        { id: 'video-embed', order: 3, visible: true },
        { id: 'audio-embed', order: 4, visible: true },
        { id: 'description', order: 6, visible: true },
        { id: 'memberships', order: 7, visible: true },
        { id: 'contact-info', order: 8, visible: true },
        { id: 'location', order: 9, visible: true },
        { id: 'hours', order: 10, visible: true },
        { id: 'social-links', order: 11, visible: true },
        { id: 'testimonials', order: 12, visible: true }
      ]
    },
    {
      id: 'features',
      order: 1,
      visible: true,
      features: [
        { id: 'gallery', order: 0, visible: true },
        { id: 'video-gallery', order: 1, visible: true },
        { id: 'projects', order: 2, visible: true },
        { id: 'offers', order: 3, visible: true },
        { id: 'events', order: 4, visible: true },
        { id: 'jobs', order: 4.5, visible: true },
        { id: 'products', order: 5, visible: true },
        { id: 'team', order: 6, visible: true },
        { id: 'attachments', order: 7, visible: true },
        { id: 'other-locations', order: 8, visible: true },
        { id: 'affiliated', order: 9, visible: true }
      ]
    },
    {
      id: 'communication',
      order: 2,
      visible: true,
      features: [
        { id: 'messages', order: 0, visible: true },
        { id: 'reviews', order: 1, visible: true },
        { id: 'followers', order: 2, visible: true },
        { id: 'recommendations', order: 3, visible: true },
        { id: 'notifications', order: 4, visible: true }
      ]
    },
    {
      id: 'advanced',
      order: 3,
      visible: true,
      features: [
        { id: 'announcements', order: 0, visible: true },
        { id: 'services', order: 1, visible: true },
        { id: 'quotes', order: 2, visible: true }
      ]
    },
    {
      id: 'sidebar',
      order: 4,
      visible: true,
      features: [
        { id: 'sidebar-memberships', order: 0, visible: true },
        { id: 'sidebar-categories', order: 1, visible: true },
        { id: 'sidebar-location', order: 2, visible: true },
        { id: 'sidebar-contact', order: 3, visible: true },
        { id: 'sidebar-hours', order: 4, visible: true },
        { id: 'sidebar-social', order: 5, visible: true },
        { id: 'sidebar-testimonials', order: 5, visible: true },
        { id: 'sidebar-quote', order: 6, visible: true },
        { id: 'sidebar-announcements', order: 7, visible: true },
        { id: 'sidebar-calendar', order: 8, visible: false },
        { id: 'sidebar-services', order: 9, visible: true },
        { id: 'sidebar-reviews', order: 10, visible: true }
      ]
    }
  ],
  version: 2,
  updatedAt: new Date().toISOString()
};

// Feature metadata mapping
export const FEATURE_METADATA: Record<FeatureId, Omit<FeatureMetadata, 'id'>> = {
  // Details section
  'branding': {
    label: 'Branding',
    description: 'Logo, cover image, and visual branding',
    minTier: 'essentials',
    section: 'details',
    defaultOrder: 0,
    defaultVisible: true
  },
  'quick-facts': {
    label: 'Quick Facts',
    description: 'Business statistics and quick information',
    minTier: 'essentials',
    section: 'details',
    defaultOrder: 0,
    defaultVisible: true
  },
  'categories': {
    label: 'Categories',
    description: 'Business categories and classification',
    minTier: 'essentials',
    section: 'details',
    defaultOrder: 1,
    defaultVisible: true
  },
  'keywords': {
    label: 'Keywords',
    description: 'Searchable tags and keywords',
    minTier: 'plus',
    section: 'details',
    defaultOrder: 2,
    defaultVisible: true
  },
  'video-embed': {
    label: 'Video Embed',
    description: 'Embedded video content',
    minTier: 'essentials',
    section: 'details',
    defaultOrder: 4,
    defaultVisible: true
  },
  'audio-embed': {
    label: 'Audio Embed',
    description: 'Embedded audio content (podcasts, music, interviews)',
    minTier: 'essentials',
    section: 'details',
    defaultOrder: 5,
    defaultVisible: true
  },
  'description': {
    label: 'Description',
    description: 'Full business description and overview',
    minTier: 'essentials',
    section: 'details',
    defaultOrder: 6,
    defaultVisible: true
  },
  'memberships': {
    label: 'Memberships & Accolades',
    description: 'Professional memberships and achievements',
    minTier: 'plus',
    section: 'details',
    defaultOrder: 6,
    defaultVisible: true
  },
  'contact-info': {
    label: 'Contact Information',
    description: 'Phone, email, and contact methods',
    minTier: 'essentials',
    section: 'details',
    defaultOrder: 7,
    defaultVisible: true
  },
  'website': {
    label: 'Website Link',
    description: 'Business website URL display',
    minTier: 'plus',
    section: 'details',
    defaultOrder: 7.5,
    defaultVisible: true
  },
  'location': {
    label: 'Location',
    description: 'Address and location details',
    minTier: 'essentials',
    section: 'details',
    defaultOrder: 8,
    defaultVisible: true
  },
  'hours': {
    label: 'Business Hours',
    description: 'Operating hours and schedule',
    minTier: 'essentials',
    section: 'details',
    defaultOrder: 9,
    defaultVisible: true
  },
  'social-links': {
    label: 'Social Links',
    description: 'Social media profiles and links',
    minTier: 'essentials',
    section: 'details',
    defaultOrder: 10,
    defaultVisible: true
  },
  'testimonials': {
    label: 'Testimonials',
    description: 'Customer testimonials and reviews',
    minTier: 'preferred',
    section: 'details',
    defaultOrder: 11,
    defaultVisible: true
  },

  // Features section
  'gallery': {
    label: 'Gallery',
    description: 'Photo and media gallery',
    minTier: 'essentials',
    section: 'features',
    defaultOrder: 0,
    defaultVisible: true
  },
  'video-gallery': {
    label: 'Video Gallery',
    description: 'Video collection showcase (tier-limited: 1/10/50/50)',
    minTier: 'essentials',
    section: 'features',
    defaultOrder: 1,
    defaultVisible: true
  },
  'projects': {
    label: 'Projects',
    description: 'Portfolio and project showcase',
    minTier: 'plus',
    section: 'features',
    defaultOrder: 1,
    defaultVisible: true
  },
  'offers': {
    label: 'Offers',
    description: 'Special offers and promotions',
    minTier: 'essentials',
    section: 'features',
    defaultOrder: 2,
    defaultVisible: true
  },
  'events': {
    label: 'Events',
    description: 'Upcoming events and activities',
    minTier: 'essentials',
    section: 'features',
    defaultOrder: 3,
    defaultVisible: true
  },
  'jobs': {
    label: 'Jobs',
    description: 'Active job postings from this business',
    minTier: 'essentials',
    section: 'features',
    defaultOrder: 3.5,
    defaultVisible: true
  },
  'products': {
    label: 'Products/Price List',
    description: 'Product listings and pricing',
    minTier: 'preferred',
    section: 'features',
    defaultOrder: 4,
    defaultVisible: true
  },
  'team': {
    label: 'Meet the Team',
    description: 'Team members and staff profiles',
    minTier: 'plus',
    section: 'features',
    defaultOrder: 5,
    defaultVisible: true
  },
  'attachments': {
    label: 'Attachments',
    description: 'Downloadable files and documents',
    minTier: 'plus',
    section: 'features',
    defaultOrder: 6,
    defaultVisible: true
  },
  'other-locations': {
    label: 'Other Locations',
    description: 'Additional business locations',
    minTier: 'preferred',
    section: 'features',
    defaultOrder: 7,
    defaultVisible: true
  },
  'affiliated': {
    label: 'Affiliated Listings',
    description: 'Related or affiliated businesses',
    minTier: 'preferred',
    section: 'features',
    defaultOrder: 8,
    defaultVisible: true
  },

  // Communication section
  'messages': {
    label: 'Messages',
    description: 'Direct messaging system',
    minTier: 'plus',
    section: 'communication',
    defaultOrder: 0,
    defaultVisible: true
  },
  'bizwire': {
    label: 'BizWire',
    description: 'Contact listing messaging system',
    minTier: 'essentials',
    section: 'communication',
    defaultOrder: 0.5,
    defaultVisible: true
  },
  'reviews': {
    label: 'Reviews',
    description: 'Customer reviews and ratings',
    minTier: 'essentials',
    section: 'communication',
    defaultOrder: 1,
    defaultVisible: true
  },
  'followers': {
    label: 'Followers/Bookmarked',
    description: 'Follower count and bookmarks',
    minTier: 'essentials',
    section: 'communication',
    defaultOrder: 2,
    defaultVisible: true
  },
  'recommendations': {
    label: 'Recommendations',
    description: 'Business recommendations',
    minTier: 'plus',
    section: 'communication',
    defaultOrder: 3,
    defaultVisible: true
  },
  'notifications': {
    label: 'Email & Notifications',
    description: 'Email and notification preferences',
    minTier: 'essentials',
    section: 'communication',
    defaultOrder: 4,
    defaultVisible: true
  },

  // Advanced section
  'announcements': {
    label: 'Announcements (CTA)',
    description: 'Promotional announcements and calls-to-action',
    minTier: 'preferred',
    section: 'advanced',
    defaultOrder: 0,
    defaultVisible: true
  },
  'services': {
    label: 'Services',
    description: 'Service offerings with booking',
    minTier: 'plus',
    section: 'advanced',
    defaultOrder: 1,
    defaultVisible: true
  },
  'quotes': {
    label: 'Quotes',
    description: 'Quote request system',
    minTier: 'preferred',
    section: 'advanced',
    defaultOrder: 2,
    defaultVisible: true
  },
  'slogan': {
    label: 'Slogan',
    description: 'Business tagline or slogan',
    minTier: 'essentials',
    section: 'details',
    defaultOrder: 5,
    defaultVisible: true
  },

  // Sidebar section
  'sidebar-categories': {
    label: 'Categories',
    description: 'Categories and tags in sidebar',
    minTier: 'essentials',
    section: 'sidebar',
    defaultOrder: 0,
    defaultVisible: true
  },
  'sidebar-memberships': {
    label: 'Memberships',
    description: 'Membership badges in sidebar',
    minTier: 'plus',
    section: 'sidebar',
    defaultOrder: 0,
    defaultVisible: true
  },
  'sidebar-location': {
    label: 'Location',
    description: 'Map and address in sidebar',
    minTier: 'essentials',
    section: 'sidebar',
    defaultOrder: 1,
    defaultVisible: true
  },
  'sidebar-contact': {
    label: 'Contact Info',
    description: 'Quick contact in sidebar',
    minTier: 'essentials',
    section: 'sidebar',
    defaultOrder: 2,
    defaultVisible: true
  },
  'sidebar-hours': {
    label: 'Business Hours',
    description: 'Hours summary in sidebar',
    minTier: 'essentials',
    section: 'sidebar',
    defaultOrder: 3,
    defaultVisible: true
  },
  'sidebar-social': {
    label: 'Social Links',
    description: 'Social media icons in sidebar',
    minTier: 'essentials',
    section: 'sidebar',
    defaultOrder: 4,
    defaultVisible: true
  },
  'sidebar-testimonials': {
    label: 'Testimonials',
    description: 'Featured testimonial in sidebar',
    minTier: 'preferred',
    section: 'sidebar',
    defaultOrder: 5,
    defaultVisible: true
  },
  'sidebar-quote': {
    label: 'Request Quote',
    description: 'Quote request button in sidebar',
    minTier: 'plus',
    section: 'sidebar',
    defaultOrder: 6,
    defaultVisible: true
  },
  'sidebar-announcements': {
    label: 'CTA/Announcements',
    description: 'Call-to-action announcement button in sidebar',
    minTier: 'preferred',
    section: 'sidebar',
    defaultOrder: 7,
    defaultVisible: true
  },
  'sidebar-calendar': {
    label: 'Calendar',
    description: 'Event and offer dates calendar in sidebar',
    minTier: 'plus',
    section: 'sidebar',
    defaultOrder: 8,
    defaultVisible: true
  },
  'sidebar-reviews': {
    label: 'Reviews Carousel',
    description: 'Rotating review highlights in sidebar',
    minTier: 'essentials',
    section: 'sidebar',
    defaultOrder: 10,
    defaultVisible: true
  },
  'sidebar-services': {
    label: 'Services',
    description: 'Services list in sidebar',
    minTier: 'plus',
    section: 'sidebar',
    defaultOrder: 9,
    defaultVisible: true
  }
};

// ============================================================================
// SECTION METADATA (Phase 12.2)
// ============================================================================

/**
 * Section icons for UI rendering
 */
export const SECTION_ICONS: Record<SectionId, React.ComponentType<{ className?: string }>> = {
  'details': LayoutGrid,
  'features': Sparkles,
  'communication': MessageSquare,
  'advanced': Settings,
  'sidebar': LayoutDashboard
};

/**
 * Section display titles
 */
export const SECTION_TITLES: Record<SectionId, string> = {
  'details': 'Details & Overview',
  'features': 'Features & Amenities',
  'communication': 'Contact & Social',
  'advanced': 'Advanced Features',
  'sidebar': 'Sidebar'
};

/**
 * Section descriptions for edit mode
 */
export const SECTION_DESCRIPTIONS: Record<SectionId, string> = {
  'details': 'Business overview, stats, and categories',
  'features': 'Business hours, amenities, and attributes',
  'communication': 'Contact info and social media links',
  'advanced': 'Announcements, services, and advanced features',
  'sidebar': 'Map, quick contact, and availability'
};

// ============================================================================
// FEATURE ICONS & TITLES (Phase 12.3)
// ============================================================================

import {
  FileText, Tag, Hash, Quote, Video, Music, AlignLeft, Award,
  Phone, MapPin, Clock, Share2, MessageSquareQuote, Palette,
  Image, Film, FolderKanban, Gift, Calendar, ShoppingCart, Users,
  Paperclip, MapPinned, Link2,
  MessageSquare, Star, Heart, ThumbsUp, Mail,
  Megaphone, Briefcase, FileQuestion, Globe
} from 'lucide-react';

/**
 * Feature icons for UI rendering
 */
export const FEATURE_ICONS: Record<FeatureId, React.ComponentType<{ className?: string }>> = {
  // Details section
  'branding': Palette,
  'quick-facts': FileText,
  'categories': Tag,
  'keywords': Hash,
  'video-embed': Video,
  'audio-embed': Music,
  'description': AlignLeft,
  'memberships': Award,
  'contact-info': Phone,
  'website': Globe,
  'location': MapPin,
  'hours': Clock,
  'social-links': Share2,
  'testimonials': MessageSquareQuote,

  // Features section
  'gallery': Image,
  'video-gallery': Film,
  'projects': FolderKanban,
  'offers': Gift,
  'events': Calendar,
  'jobs': Briefcase,
  'products': ShoppingCart,
  'team': Users,
  'attachments': Paperclip,
  'other-locations': MapPinned,
  'affiliated': Link2,

  // Communication section
  'messages': MessageSquare,
  'bizwire': MessageSquare,
  'reviews': Star,
  'followers': Heart,
  'recommendations': ThumbsUp,
  'notifications': Mail,

  // Advanced section
  'announcements': Megaphone,
  'services': Briefcase,
  'quotes': FileQuestion,
  'slogan': Quote,

  // Sidebar section
  'sidebar-categories': Tag,
  'sidebar-memberships': Award,
  'sidebar-location': MapPin,
  'sidebar-contact': Phone,
  'sidebar-hours': Clock,
  'sidebar-social': Share2,
  'sidebar-testimonials': MessageSquareQuote,
  'sidebar-quote': FileQuestion,
  'sidebar-announcements': Megaphone,
  'sidebar-calendar': Calendar,
  'sidebar-services': Briefcase,
  'sidebar-reviews': Star
};

/**
 * Feature display titles (short form for edit UI)
 */
export const FEATURE_TITLES: Record<FeatureId, string> = {
  // Details section
  'branding': 'Branding',
  'quick-facts': 'Quick Facts',
  'categories': 'Categories',
  'keywords': 'Keywords',
  'video-embed': 'Video',
  'audio-embed': 'Audio',
  'description': 'Description',
  'memberships': 'Memberships',
  'contact-info': 'Contact Info',
  'website': 'Website',
  'location': 'Location',
  'hours': 'Hours',
  'social-links': 'Social Links',
  'testimonials': 'Testimonials',

  // Features section
  'gallery': 'Gallery',
  'video-gallery': 'Video Gallery',
  'projects': 'Projects',
  'offers': 'Offers',
  'events': 'Events',
  'jobs': 'Jobs',
  'products': 'Products',
  'team': 'Team',
  'attachments': 'Attachments',
  'other-locations': 'Other Locations',
  'affiliated': 'Affiliated',

  // Communication section
  'messages': 'Messages',
  'bizwire': 'BizWire',
  'reviews': 'Reviews',
  'followers': 'Followers',
  'recommendations': 'Recommendations',
  'notifications': 'Notifications',

  // Advanced section
  'announcements': 'Announcements',
  'services': 'Services',
  'quotes': 'Quotes',
  'slogan': 'Slogan',

  // Sidebar section
  'sidebar-categories': 'Categories',
  'sidebar-memberships': 'Memberships',
  'sidebar-location': 'Location',
  'sidebar-contact': 'Contact',
  'sidebar-hours': 'Hours',
  'sidebar-social': 'Social',
  'sidebar-testimonials': 'Testimonials',
  'sidebar-quote': 'Request Quote',
  'sidebar-announcements': 'Announcements',
  'sidebar-calendar': 'Calendar',
  'sidebar-services': 'Services',
  'sidebar-reviews': 'Reviews'
};

/**
 * Get DnD ID for a feature (prefixed to avoid collisions)
 */
export function getFeatureDndId(sectionId: SectionId, featureId: FeatureId): string {
  return `${sectionId}:${featureId}`;
}

/**
 * Parse DnD ID back to section and feature IDs
 */
export function parseFeatureDndId(dndId: string): { sectionId: SectionId; featureId: FeatureId } | null {
  const parts = dndId.split(':');
  if (parts.length !== 2) return null;
  return {
    sectionId: parts[0] as SectionId,
    featureId: parts[1] as FeatureId
  };
}

/**
 * Merge user layout with default layout to handle new features/sections
 * This ensures backward compatibility when new features are added
 */
export function mergeWithDefaultListingLayout(
  userLayout: ListingSectionLayout | null | undefined
): ListingSectionLayout {
  if (!userLayout) {
    return { ...DEFAULT_LISTING_SECTION_LAYOUT, updatedAt: new Date().toISOString() };
  }

  const defaultSectionIds = DEFAULT_LISTING_SECTION_LAYOUT.sections.map(s => s.id);
  const userSectionIds = userLayout.sections.map(s => s.id);

  // Find missing sections
  const missingSectionIds = defaultSectionIds.filter(id => !userSectionIds.includes(id));

  if (missingSectionIds.length === 0) {
    // Check for missing features within existing sections
    const updatedSections = userLayout.sections.map(userSection => {
      const defaultSection = DEFAULT_LISTING_SECTION_LAYOUT.sections.find(s => s.id === userSection.id);
      if (!defaultSection) return userSection;

      const defaultFeatureIds = defaultSection.features.map(f => f.id);
      const userFeatureIds = userSection.features.map(f => f.id);
      const missingFeatureIds = defaultFeatureIds.filter(id => !userFeatureIds.includes(id));

      if (missingFeatureIds.length === 0) return userSection;

      // Add missing features
      const maxOrder = Math.max(...userSection.features.map(f => f.order), -1);
      const missingFeatures = missingFeatureIds.map((id, idx) => {
        const defaultFeature = defaultSection.features.find(f => f.id === id);
        return defaultFeature
          ? { ...defaultFeature, order: maxOrder + 1 + idx }
          : { id, order: maxOrder + 1 + idx, visible: true };
      });

      return {
        ...userSection,
        features: [...userSection.features, ...missingFeatures]
      };
    });

    return { ...userLayout, sections: updatedSections, updatedAt: new Date().toISOString() };
  }

  // Add missing sections
  const maxOrder = Math.max(...userLayout.sections.map(s => s.order), -1);
  const missingSections = missingSectionIds.map((id, idx) => {
    const defaultSection = DEFAULT_LISTING_SECTION_LAYOUT.sections.find(s => s.id === id);
    return defaultSection
      ? { ...defaultSection, order: maxOrder + 1 + idx }
      : { id, order: maxOrder + 1 + idx, visible: true, features: [] };
  });

  return {
    ...userLayout,
    sections: [...userLayout.sections, ...missingSections],
    updatedAt: new Date().toISOString()
  };
}

/**
 * Check if a feature is available for a given tier
 */
export function isFeatureAvailable(featureId: FeatureId, tier: ListingTier): boolean {
  const metadata = FEATURE_METADATA[featureId];
  if (!metadata) return false;

  const tierLevels: Record<ListingTier, number> = {
    essentials: 0,
    plus: 1,
    preferred: 2,
    premium: 3
  };

  return tierLevels[tier] >= tierLevels[metadata.minTier];
}

/**
 * Get tier level as a number for comparison
 */
export function getTierLevel(tier: ListingTier): number {
  const tierLevels: Record<ListingTier, number> = {
    essentials: 0,
    plus: 1,
    preferred: 2,
    premium: 3
  };

  return tierLevels[tier];
}
