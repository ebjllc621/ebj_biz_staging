/**
 * Admin Menu Configuration
 *
 * @authority PHASE_2_ADMIN_SIDEBAR_BRAIN_PLAN.md
 * @authority MASTER_ADMIN_SHELL_BRAIN_PLAN.md
 * @tier STANDARD
 *
 * GOVERNANCE: All menu items map to existing admin routes
 * GOVERNANCE: Icons from lucide-react only
 */

import {
  LayoutDashboard,
  Building2,
  Users,
  Calendar,
  Tag,
  Star,
  Image,
  Megaphone,
  Menu as MenuIcon,
  Flag,
  BarChart3,
  Settings,
  Database,
  Mail,
  ToggleLeft,
  Gauge,
  Search,
  Clock,
  Bell,
  Shield,
  Share2,
  Beaker,
  Package,
  ScrollText,
  AlertCircle,
  Activity,
  LayoutList,
  Briefcase,
  FileText,
  UsersRound,
  CalendarDays,
  Timer,
  Crown,
  LayoutTemplate,
  BookOpen,
  CreditCard,
  Globe
} from 'lucide-react';
import type { AdminModule, AdminMenuSection } from '@/types/admin';

/**
 * Site Controls - Primary business management
 */
export const siteControls: AdminModule[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard
  },
  {
    key: 'users',
    label: 'Users',
    icon: Users,
    children: [
      { key: 'usersManager', label: 'Users Manager', href: '/admin/users' },
      { key: 'recommendations', label: 'Recommendations Analytics', href: '/admin/users/recommendations', icon: BarChart3 },
      { key: 'sharingAnalytics', label: 'Sharing Analytics', href: '/admin/sharing', icon: Share2 },
      { key: 'connectionGroups', label: 'Connection Groups', href: '/admin/connections/groups/analytics', icon: UsersRound },
      { key: 'profileLayouts', label: 'Profile Layouts', href: '/admin/users/profiles', icon: LayoutTemplate },
    ]
  },
  {
    key: 'categories',
    label: 'Categories',
    href: '/admin/categories',
    icon: Tag
  },
  {
    key: 'listings',
    label: 'Listings',
    icon: Building2,
    children: [
      { key: 'listingsManager', label: 'Listings Manager', href: '/admin/listings' },
      { key: 'claims', label: 'Claims', href: '/admin/claims', icon: Shield },
      { key: 'types', label: 'Types', href: '/admin/types' },
      { key: 'appointments', label: 'Appointments', href: '/admin/appointments', icon: Clock },
      { key: 'featuredListingsManager', label: 'Featured Listings', href: '/admin/featured-listings', icon: Crown },
      { key: 'listingTemplatesManager', label: 'Listing Templates', href: '/admin/listing-templates', icon: LayoutTemplate },
      { key: 'listingAnalytics', label: 'Listing Analytics', href: '/admin/listings/analytics', icon: BarChart3 },
    ]
  },
  {
    key: 'events',
    label: 'Events',
    icon: Calendar,
    children: [
      { key: 'eventsManager', label: 'Events Manager', href: '/admin/events' },
      { key: 'communityEvents', label: 'Community Events', href: '/admin/events/community' },
      { key: 'eventTypes', label: 'Event Types', href: '/admin/events/types' },
      { key: 'eventSponsors', label: 'Event Sponsors', href: '/admin/events/sponsors' },
      { key: 'eventCoHosts', label: 'Co-Hosts', href: '/admin/events/co-hosts' },
      { key: 'eventExhibitors', label: 'Exhibitors', href: '/admin/events/exhibitors' },
      { key: 'eventServiceRequests', label: 'Service Requests', href: '/admin/events/service-requests' },
      { key: 'eventTicketSales', label: 'Ticket Sales', href: '/admin/events/ticket-sales' },
      { key: 'eventAnalytics', label: 'Event Analytics', href: '/admin/events/analytics', icon: BarChart3 },
    ]
  },
  {
    key: 'offers',
    label: 'Offers',
    icon: Tag,
    children: [
      { key: 'offersManager', label: 'Offers Manager', href: '/admin/offers' },
      { key: 'discounts', label: 'Discounts', href: '/admin/discounts' },
    ]
  },
  {
    key: 'jobs',
    label: 'Jobs',
    icon: Briefcase,
    children: [
      { key: 'jobsManager', label: 'Jobs Manager', href: '/admin/jobs' },
      { key: 'communityGigs', label: 'Community Gigs', href: '/admin/jobs/community' },
      { key: 'marketContent', label: 'Market Content', href: '/admin/jobs/content' },
      { key: 'jobAnalytics', label: 'Job Analytics', href: '/admin/jobs/analytics', icon: BarChart3 },
    ],
  },
  {
    key: 'content',
    label: 'Content',
    icon: ScrollText,
    children: [
      { key: 'contentManager', label: 'Content Manager', href: '/admin/content' },
      { key: 'contentAnalytics', label: 'Content Analytics', href: '/admin/content/analytics', icon: BarChart3 },
      { key: 'subscriptionAnalytics', label: 'Subscription Analytics', href: '/admin/content/subscription-analytics', icon: Activity },
      { key: 'newsletters', label: 'Newsletters', href: '/admin/newsletters', icon: Mail },
      { key: 'guides', label: 'Guides', href: '/admin/guides', icon: BookOpen },
      { key: 'creatorProfiles', label: 'Creator Profiles', href: '/admin/creator-profiles', icon: UsersRound },
    ]
  },
  {
    key: 'packages',
    label: 'Packages',
    href: '/admin/packages',
    icon: Package
  },
  {
    key: 'quotes',
    label: 'Quotes',
    href: '/admin/quotes',
    icon: FileText
  },
  {
    key: 'reviews',
    label: 'Reviews',
    icon: Star,
    children: [
      { key: 'reviewsManager', label: 'Reviews Manager', href: '/admin/reviews' },
      { key: 'externalReviews', label: 'External Reviews', href: '/admin/external-reviews', icon: Globe },
    ]
  },
  {
    key: 'media',
    label: 'Media',
    href: '/admin/media',
    icon: Image
  },
  {
    key: 'campaigns',
    label: 'Campaigns',
    href: '/admin/campaigns',
    icon: Megaphone
  },
  {
    key: 'menus',
    label: 'Site Menus',
    href: '/admin/menus',
    icon: MenuIcon
  },
  {
    key: 'moderation',
    label: 'Moderation',
    href: '/admin/moderation',
    icon: Flag
  },
  {
    key: 'analytics',
    label: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3
  },
  {
    key: 'billing',
    label: 'Billing & Subscriptions',
    icon: CreditCard,
    children: [
      { key: 'billingOverview', label: 'Overview', href: '/admin/billing' },
      { key: 'billingSubscriptions', label: 'Subscriptions', href: '/admin/billing/subscriptions' },
      { key: 'billingTransactions', label: 'Transactions', href: '/admin/billing/transactions' },
      { key: 'billingStatements', label: 'Statements', href: '/admin/billing/statements' },
      { key: 'billingRefunds', label: 'Refunds', href: '/admin/billing/refunds' },
      { key: 'billingCampaignBanks', label: 'Campaign Banks', href: '/admin/billing/campaign-banks' },
    ]
  },
];

/**
 * System Controls - System configuration and monitoring
 */
export const systemControls: AdminModule[] = [
  {
    key: 'databaseManager',
    label: 'Database Manager',
    href: '/admin/database-manager',
    icon: Database
  },
  {
    key: 'notificationManager',
    label: 'Notification Manager',
    href: '/admin/notification-manager',
    icon: Bell
  },
  {
    key: 'logManager',
    label: 'Log Manager',
    icon: ScrollText,
    children: [
      { key: 'userLogs', label: 'User Logs', href: '/admin/logs/user', icon: Users },
      { key: 'errorLogs', label: 'Error Logs', href: '/admin/logs/error', icon: AlertCircle },
      { key: 'adminActivity', label: 'Admin Activity', href: '/admin/logs/admin-activity', icon: Activity }
    ]
  },
  {
    key: 'emailTemplates',
    label: 'Email Templates',
    href: '/admin/email-templates',
    icon: Mail
  },
  {
    key: 'featureFlags',
    label: 'Feature Flags',
    href: '/admin/feature-flags',
    icon: ToggleLeft
  },
  {
    key: 'performance',
    label: 'Performance',
    href: '/admin/performance',
    icon: Gauge
  },
  {
    key: 'tests',
    label: 'Test Dashboard',
    icon: Beaker,
    children: [
      { key: 'testsLighthouse', label: 'Lighthouse Testing', href: '/admin/tests/lighthouse', icon: Gauge },
      { key: 'testsPhase5', label: 'Recommendations System', href: '/admin/tests/phase5' },
      { key: 'testsPackages', label: 'Packages Tests', href: '/admin/tests/packages', icon: Package },
      { key: 'testsLayoutEnhancement', label: 'Layout Enhancement', href: '/admin/tests/layout-enhancement', icon: LayoutDashboard },
      { key: 'testsListingDetails', label: 'Listing Details E2E', href: '/admin/tests/listing-details', icon: LayoutList },
      { key: 'testsGalleryShowcase', label: 'Gallery Showcase', href: '/admin/tests/gallery-showcase', icon: Image },
      { key: 'testsOffersPhase4', label: 'Offers Phase 4', href: '/admin/tests/offers-phase4', icon: Tag },
      { key: 'testsMedia', label: 'Media System', href: '/admin/tests/media', icon: Image },
      { key: 'testsEventsDetail', label: 'Events Detail', href: '/admin/tests/events-detail', icon: CalendarDays },
      { key: 'testsBilling', label: 'Billing & Payments', href: '/admin/tests/billing', icon: CreditCard },
    ]
  },
  {
    key: 'seo',
    label: 'SEO',
    href: '/admin/seo',
    icon: Search
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: Settings,
    children: [
      { key: 'systemSettings', label: 'System Settings', href: '/admin/settings' },
      { key: 'layouts', label: 'Layouts', href: '/admin/settings/layouts', icon: LayoutTemplate },
      { key: 'cronJobs', label: 'Cron Jobs', href: '/admin/settings/cron-jobs', icon: Timer },
    ]
  },
];

/**
 * Menu sections for sidebar rendering
 */
export const adminMenuSections: AdminMenuSection[] = [
  { id: 'site', title: 'Site Controls', items: siteControls },
  { id: 'system', title: 'System Controls', items: systemControls },
];

/**
 * Get all menu items flattened (for search/lookup)
 */
export function getAllMenuItems(): AdminModule[] {
  const flatten = (items: AdminModule[]): AdminModule[] => {
    return items.reduce<AdminModule[]>((acc, item) => {
      acc.push(item);
      if (item.children) {
        acc.push(...flatten(item.children));
      }
      return acc;
    }, []);
  };

  return flatten([...siteControls, ...systemControls]);
}

/**
 * Find menu item by key
 */
export function findMenuItem(key: string): AdminModule | undefined {
  return getAllMenuItems().find(item => item.key === key);
}
