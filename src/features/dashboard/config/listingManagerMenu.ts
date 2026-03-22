/**
 * Listing Manager Menu Configuration
 *
 * @authority docs/pages/layouts/listings/details/userdash/MASTER_INDEX_BRAIN_PLAN.md
 * @phase Phase 2 - Listing Manager Menu Structure
 *
 * GOVERNANCE: All menu items map to future dashboard/listings routes
 * GOVERNANCE: Icons from lucide-react only
 * GOVERNANCE: Follows AdminMenu nested children pattern
 */

import {
  // Dashboard
  LayoutDashboard,

  // Listing Section
  FileText,
  Palette,
  Tag,
  AlignLeft,
  Award,
  MapPin,
  Clock,
  Share2,
  MessageSquareQuote,
  Phone,
  Search,

  // Features Section
  Image,
  Film,
  FolderKanban,
  Gift,
  DollarSign,
  Calendar,
  Users as UsersIcon,
  ShoppingCart,
  Paperclip,
  MapPinned,
  Link2,
  Store,

  // Communication/Reputation
  MessageSquare,
  Star,
  Heart,
  ThumbsUp,
  Mail,
  Globe,

  // Advanced Features
  Megaphone,
  Briefcase,
  CalendarCheck,
  CalendarRange,
  FileQuestion,
  Send,
  Layers,
  Target,
  ScrollText,
  BookOpen,

  // My Networks
  Network,
  Contact,

  // Marketing
  BarChart3,
  Rocket,
  CreditCard,
  Receipt,
  RotateCcw,

  // Additional icons for sub-menu items
  Handshake,
  UserCog,
  ClipboardList
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ListingManagerMenuItem {
  /** Unique identifier */
  key: string;
  /** Display label */
  label: string;
  /** Route path (relative to /dashboard/listings/[listingId]/) */
  href?: string;
  /** Lucide icon component */
  icon?: LucideIcon;
  /** Nested child items */
  children?: ListingManagerMenuItem[];
  /** Badge count (for notifications) */
  badge?: number | string;
  /** Whether item is disabled (for future features) */
  disabled?: boolean;
}

export interface ListingManagerMenuSection {
  /** Section identifier */
  id: string;
  /** Section title */
  title: string;
  /** Section icon */
  icon?: LucideIcon;
  /** Menu items in this section */
  items: ListingManagerMenuItem[];
}

// ============================================================================
// MENU CONFIGURATION
// ============================================================================

export const listingManagerMenuSections: ListingManagerMenuSection[] = [
  // ========== DASHBOARD (TOP-LEVEL) ==========
  {
    id: 'dashboard',
    title: 'Overview',
    icon: LayoutDashboard,
    items: [
      { key: 'dashboard', label: 'Dashboard', href: '/dashboard/listings', icon: LayoutDashboard }
    ]
  },

  // ========== LISTING SECTION ==========
  {
    id: 'listing',
    title: 'Listing Details',
    icon: FileText,
    items: [
      { key: 'branding', label: 'Branding', href: 'branding', icon: Palette },
      { key: 'quick-facts', label: 'Quick Facts', href: 'quick-facts', icon: FileText },
      { key: 'categories', label: 'Categories & Keywords', href: 'categories', icon: Tag },
      { key: 'description', label: 'Description', href: 'description', icon: AlignLeft },
      { key: 'memberships', label: 'Memberships & Accolades', href: 'memberships', icon: Award },
      { key: 'contact-info', label: 'Contact Info', href: 'contact-info', icon: Phone },
      { key: 'location', label: 'Location', href: 'location', icon: MapPin },
      { key: 'hours', label: 'Business Hours', href: 'hours', icon: Clock },
      { key: 'social', label: 'Social Links', href: 'social', icon: Share2 },
      { key: 'testimonials', label: 'Testimonials', href: 'testimonials', icon: MessageSquareQuote }
    ]
  },

  // ========== FEATURES SECTION ==========
  {
    id: 'features',
    title: 'Features',
    icon: Image,
    items: [
      { key: 'gallery', label: 'Gallery', href: 'gallery', icon: Image },
      { key: 'video-gallery', label: 'Video Gallery', href: 'video-gallery', icon: Film },
      { key: 'projects', label: 'Projects', href: 'projects', icon: FolderKanban },
      {
        key: 'offers',
        label: 'Offers',
        href: 'offers',
        icon: Gift,
        children: [
          { key: 'offers-sell', label: 'Sell', href: 'offers/sell', icon: DollarSign }
        ]
      },
      {
        key: 'events',
        label: 'Events',
        href: 'events',
        icon: Calendar,
        children: [
          { key: 'event-attendees', label: 'Event Attendees', href: 'events/attendees', icon: UsersIcon },
          { key: 'event-sponsors', label: 'Event Sponsors', href: 'events/sponsors', icon: Award },
          { key: 'event-co-hosts', label: 'Co-Hosts', href: 'events/co-hosts', icon: Handshake },
          { key: 'event-exhibitors', label: 'Exhibitors', href: 'events/exhibitors', icon: Store },
          { key: 'event-service-requests', label: 'Service Requests', href: 'events/service-requests', icon: FileText },
          { key: 'event-analytics', label: 'Event Analytics', href: 'events/analytics', icon: BarChart3 },
          { key: 'event-check-in', label: 'Check-In', href: 'events/check-in', icon: CalendarCheck },
          { key: 'event-ticket-sales', label: 'Ticket Sales', href: 'events/ticket-sales', icon: DollarSign }
        ]
      },
      {
        key: 'products',
        label: 'Products/Price List',
        href: 'products',
        icon: ShoppingCart,
        children: [
          { key: 'products-sell', label: 'Sell', href: 'products/sell', icon: DollarSign }
        ]
      },
      { key: 'team', label: 'Meet the Team', href: 'team', icon: UsersIcon },
      { key: 'attachments', label: 'Attachments', href: 'attachments', icon: Paperclip },
      { key: 'other-locations', label: 'Other Locations', href: 'locations', icon: MapPinned },
      { key: 'affiliates', label: 'Affiliated Listings', href: 'affiliates', icon: Link2 },
      { key: 'jobs', label: 'Jobs', href: 'jobs', icon: Briefcase },
      { key: 'content', label: 'Content', href: 'content', icon: ScrollText },
      { key: 'newsletters', label: 'Newsletters', href: 'newsletters', icon: Mail },
      { key: 'guides', label: 'Guides', href: 'guides', icon: BookOpen },
      { key: 'creator-profiles', label: 'Creator Profiles', href: 'creator-profiles', icon: UsersIcon }
    ]
  },

  // ========== COMMUNICATION/REPUTATION SECTION ==========
  {
    id: 'communication',
    title: 'Communication/Reputation',
    icon: MessageSquare,
    items: [
      { key: 'bizwire', label: 'BizWire', href: 'bizwire', icon: MessageSquare },
      { key: 'reviews', label: 'Reviews', href: 'reviews', icon: Star },
      { key: 'external-reviews', label: 'External Reviews', href: 'external-reviews', icon: Globe },
      { key: 'followers', label: 'Followers/Bookmarked', href: 'followers', icon: Heart },
      { key: 'recommendations', label: 'Recommendations', href: 'recommendations', icon: ThumbsUp },
      { key: 'email-notifications', label: 'Email & Notifications', href: 'notifications', icon: Mail }
    ]
  },

  // ========== ADVANCED FEATURES SECTION ==========
  {
    id: 'advanced',
    title: 'Advanced Features',
    icon: Briefcase,
    items: [
      { key: 'announcements', label: 'Announcements (CTA)', href: 'announcements', icon: Megaphone },
      {
        key: 'services',
        label: 'Services',
        icon: Briefcase,
        children: [
          {
            key: 'service-providers',
            label: 'Service Providers',
            href: 'services/providers',
            icon: UserCog,
            children: [
              { key: 'service-booking', label: 'Service Booking', href: 'services/providers/booking', icon: CalendarCheck },
              { key: 'booking-calendar', label: 'Booking Calendar', href: 'services/providers/calendar', icon: CalendarRange }
            ]
          }
        ]
      },
      {
        key: 'quotes',
        label: 'Quotes',
        icon: FileQuestion,
        children: [
          { key: 'direct-quotes', label: 'Direct Quotes', href: 'quotes/direct', icon: Send },
          {
            key: 'bulk-quotes',
            label: 'Bulk Quotes',
            href: 'quotes/bulk',
            icon: ClipboardList,
            children: [
              { key: 'quote-pools', label: 'Quote Pools', href: 'quotes/bulk/pools', icon: Layers }
            ]
          }
        ]
      },
      { key: 'lead-generator', label: 'Lead Generator', href: 'leads', icon: Target }
    ]
  },

  // ========== MY NETWORKS SECTION ==========
  {
    id: 'networks',
    title: 'My Networks',
    icon: Network,
    items: [
      { key: 'network-groups', label: 'Network Groups', href: 'networks', icon: Network },
      { key: 'crm', label: 'CRM', href: 'crm', icon: Contact },
      { key: 'lead-gen', label: 'Lead Generator', href: 'lead-gen', icon: Target }
    ]
  },

  // ========== MARKETING SECTION ==========
  {
    id: 'marketing',
    title: 'Marketing',
    icon: Rocket,
    items: [
      { key: 'analytics', label: 'Analytics & Statistics', href: 'analytics', icon: BarChart3 },
      { key: 'seo', label: 'SEO', href: 'seo', icon: Search },
      { key: 'social-accounts', label: 'Social Accounts', href: 'social-accounts', icon: Share2 },
      { key: 'campaigns', label: 'Campaigns', href: 'campaigns', icon: Rocket },
      { key: 'payment-gateway', label: 'Payment Gateway', href: 'payments', icon: CreditCard },
      { key: 'billing', label: 'Billing & Invoicing', href: 'billing', icon: Receipt }
    ]
  },

  // ========== BILLING & SUBSCRIPTIONS SECTION ==========
  {
    id: 'billing-subscriptions',
    title: 'Billing & Subscriptions',
    icon: CreditCard,
    items: [
      { key: 'payment-methods', label: 'Payment Methods', href: '/dashboard/account/payment-methods', icon: CreditCard },
      { key: 'billing-history', label: 'Billing History', href: '/dashboard/account/billing-history', icon: FileText },
      { key: 'subscription-overview', label: 'Subscription Overview', href: '/dashboard/account/subscription-overview', icon: Receipt },
      { key: 'statements', label: 'Statements', href: '/dashboard/account/statements', icon: FileText },
      { key: 'refund-requests', label: 'Refund Requests', href: '/dashboard/account/refund-requests', icon: RotateCcw },
      { key: 'campaign-bank', label: 'Campaign Bank', href: '/dashboard/account/campaign-bank', icon: Megaphone }
    ]
  }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all menu items flattened (for search/lookup)
 */
export function getAllListingManagerMenuItems(): ListingManagerMenuItem[] {
  const flatten = (items: ListingManagerMenuItem[]): ListingManagerMenuItem[] => {
    return items.reduce<ListingManagerMenuItem[]>((acc, item) => {
      acc.push(item);
      if (item.children) {
        acc.push(...flatten(item.children));
      }
      return acc;
    }, []);
  };

  return flatten(listingManagerMenuSections.flatMap(section => section.items));
}

/**
 * Find menu item by key
 */
export function findListingManagerMenuItem(key: string): ListingManagerMenuItem | undefined {
  return getAllListingManagerMenuItems().find(item => item.key === key);
}

/**
 * Build full href with listing ID
 */
export function buildListingManagerHref(listingId: number | string, relativePath: string): string {
  return `/dashboard/listings/${listingId}/${relativePath}`;
}

// ============================================================================
// MENU KEY TO FEATURE ID MAPPING (Phase 6)
// ============================================================================

import type { FeatureId } from '@features/listings/types/listing-section-layout';

/**
 * Maps menu item keys to layout FeatureIds
 * Used for showing visibility indicators in dashboard menu
 */
export const MENU_TO_FEATURE_MAP: Partial<Record<string, FeatureId>> = {
  // Listing Details section
  'quick-facts': 'quick-facts',
  'categories': 'categories',
  'description': 'description',
  'memberships': 'memberships',
  'contact-info': 'contact-info',
  'location': 'location',
  'hours': 'hours',
  'social': 'social-links',
  'testimonials': 'testimonials',

  // Features section
  'gallery': 'gallery',
  'video-gallery': 'video-gallery',
  'projects': 'projects',
  'offers': 'offers',
  'events': 'events',
  'products': 'products',
  'team': 'team',
  'attachments': 'attachments',
  'other-locations': 'other-locations',
  'affiliates': 'affiliated',
  // Note: 'content' is not a FeatureId (Creator Suite add-on, not a listing section feature)

  // Communication section
  'bizwire': 'bizwire',
  'reviews': 'reviews',
  'followers': 'followers',
  'recommendations': 'recommendations',
  'email-notifications': 'notifications',

  // Advanced section
  'announcements': 'announcements',
  'services': 'services',
  'quotes': 'quotes'
};

/**
 * Check if a menu item has a corresponding layout feature
 */
export function hasLayoutFeature(menuKey: string): boolean {
  return menuKey in MENU_TO_FEATURE_MAP;
}

/**
 * Get the FeatureId for a menu key
 */
export function getFeatureIdForMenuKey(menuKey: string): FeatureId | null {
  return MENU_TO_FEATURE_MAP[menuKey] || null;
}
