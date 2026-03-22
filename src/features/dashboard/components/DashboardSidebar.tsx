/**
 * DashboardSidebar - Collapsible Navigation Sidebar for User Dashboard
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @dna-version 11.4.0
 * @authority docs/pages/layouts/home/user/phases/PHASE_1_BRAIN_PLAN.md
 *
 * GOVERNANCE COMPLIANCE:
 * - Client component with ErrorBoundary wrapper
 * - React.memo for MenuItem performance
 * - useCallback for handlers passed to children
 * - Lucide React icons only
 * - Path aliases (@/features/, @/components/, @/core/)
 * - Type-safe routing with Route type
 *
 * Features:
 * - Collapsible sidebar (mobile/desktop)
 * - Hierarchical menu sections
 * - Active route highlighting
 * - Notification badges
 * - User menu in footer
 * - Close-on-outside-click (mobile)
 * - Keyboard navigation (ESC to close)
 */

'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import type { Route } from 'next';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  User,
  Settings,
  LogOut,
  Home,
  Bookmark,
  Star,
  Users,
  UsersRound,
  Calendar,
  CalendarDays,
  ShoppingBag,
  Search,
  MessageSquare,
  FileText,
  Link as LinkIcon,
  Eye,
  Heart,
  Bell,
  CalendarClock,
  Activity,
  Share2,
  Inbox,
  Trophy,
  TrendingUp,
  Briefcase,
  Gift,
  Send,
  Rss
} from 'lucide-react';
import { useAuth } from '@/core/context/AuthContext';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { NotificationBadge } from '@/components/common/NotificationBadge';
import { useNotificationPolling } from '@features/notifications';
import { useDashboardMode, useListingContextOptional } from '../context';
import { DashboardSidebarSection } from './DashboardSidebarSection';
import { ListingManagerMenu } from './ListingManagerMenu';
import { ListingSelector } from './ListingSelector';
import type { ListingTier } from '@features/listings/types/listing-section-layout';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface DashboardSidebarProps {
  /** Whether sidebar is open (mobile) */
  isOpen: boolean;
  /** Callback to close sidebar */
  onClose: () => void;
  /** Whether sidebar is collapsed (desktop only) */
  isCollapsed?: boolean;
  /** Callback to toggle collapsed state (desktop only) */
  onToggleCollapse?: () => void;
}

interface DashboardMenuItem {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface DashboardMenuSection {
  id: string;
  title: string;
  items: DashboardMenuItem[];
}

// ============================================================================
// MENU CONFIGURATION
// ============================================================================

const dashboardMenuSections: DashboardMenuSection[] = [
  {
    id: 'personal',
    title: '', // No header - expandable "Personal" title is sufficient
    items: [
      { key: 'overview', label: 'Dashboard', href: '/dashboard', icon: Home },
      { key: 'following', label: 'Following', href: '/dashboard/following', icon: Eye },
      { key: 'bookmarks', label: 'My Bookmarks', href: '/dashboard/bookmarks', icon: Bookmark },
      { key: 'reviews', label: 'My Reviews', href: '/dashboard/reviews', icon: Star }
    ]
  },
  {
    id: 'communication',
    title: 'Communication',
    items: [
      { key: 'messages', label: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
      { key: 'bizwire', label: 'BizWire', href: '/dashboard/bizwire', icon: Send },
      { key: 'quotes', label: 'Quotes', href: '/dashboard/quotes', icon: FileText }
    ]
  },
  {
    id: 'network',
    title: 'Network',
    items: [
      { key: 'contacts', label: 'My Contacts', href: '/dashboard/contacts', icon: Users },
      { key: 'connections', label: 'Connections', href: '/dashboard/connections', icon: LinkIcon },
      { key: 'connection-groups', label: 'Connection Groups', href: '/dashboard/connections/groups', icon: UsersRound },
      { key: 'followers', label: 'Followers', href: '/dashboard/followers', icon: Heart }
    ]
  },
  {
    id: 'recommendations',
    title: 'Recommendations',
    items: [
      { key: 'rec-inbox', label: 'Inbox', href: '/dashboard/recommendations', icon: Inbox },
      { key: 'rec-leaderboard', label: 'Leaderboard', href: '/dashboard/recommendations/leaderboard', icon: Trophy },
      { key: 'rec-progress', label: 'My Progress', href: '/dashboard/recommendations/progress', icon: TrendingUp },
      { key: 'rec-rewards', label: 'Points & Rewards', href: '/dashboard/recommendations/activity', icon: Trophy }
    ]
  },
  {
    id: 'engagement',
    title: 'Engagement',
    items: [
      { key: 'appointments', label: 'Appointments', href: '/dashboard/appointments', icon: Calendar },
      { key: 'events', label: 'Events', href: '/dashboard/events', icon: CalendarDays },
      { key: 'my-offers', label: 'My Offers', href: '/dashboard/my-offers', icon: Gift },
      { key: 'loyalty', label: 'My Rewards', href: '/dashboard/loyalty', icon: Trophy },
      { key: 'purchases', label: 'Purchases', href: '/dashboard/purchases', icon: ShoppingBag },
      { key: 'saved-searches', label: 'Saved Searches', href: '/dashboard/saved-searches', icon: Search },
      { key: 'my-job-search', label: 'Job Assistant', href: '/dashboard/jobs', icon: Briefcase },
      { key: 'content-subscriptions', label: 'My Subscriptions', href: '/dashboard/content-subscriptions', icon: Rss }
    ]
  },
  {
    id: 'activity',
    title: 'Activity',
    items: [
      { key: 'notifications', label: 'Notifications', href: '/dashboard/notifications', icon: Bell, badge: 0 },
      { key: 'calendar', label: 'Calendar', href: '/dashboard/calendar', icon: CalendarClock },
      { key: 'activity-log', label: 'Activity Log', href: '/dashboard/activity', icon: Activity }
    ]
  },
];

// ============================================================================
// MENUITEM COMPONENT
// ============================================================================

const MenuItem = React.memo(function MenuItem({
  item,
  pathname,
  onNavigate,
  isCollapsed = false
}: {
  item: DashboardMenuItem;
  pathname: string;
  onNavigate: () => void;
  isCollapsed?: boolean;
}) {
  const isActive = item.href === pathname;
  const Icon = item.icon;

  const baseClasses = isCollapsed
    ? 'w-full text-left p-2 rounded-md font-medium transition-colors flex items-center justify-center'
    : 'w-full text-left px-3 py-2 rounded-md font-medium transition-colors flex items-center justify-between gap-2';

  const activeClasses = isActive
    ? 'bg-[var(--dashboard-bg-active)] text-[var(--dashboard-text-on-primary)]'
    : 'text-[var(--dashboard-text-muted)] hover:bg-[var(--dashboard-bg-hover)]';

  /**
   * Handle menu item click - reload page if clicking active link
   * This allows users to refresh the current page to clear notifications
   * Uses full page reload to ensure all client-side state/hooks refetch data
   */
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isActive) {
      e.preventDefault();
      // Full page reload to refresh all data including client-side hooks
      window.location.reload();
      return;
    }
    onNavigate();
  }, [isActive, onNavigate]);

  return (
    <Link
      href={item.href as Route}
      onClick={handleClick}
      className={`${baseClasses} ${activeClasses}`}
      aria-current={isActive ? 'page' : undefined}
      title={isCollapsed ? item.label : undefined}
    >
      {isCollapsed ? (
        <span className="relative">
          <Icon className="w-5 h-5" />
          {item.badge !== undefined && item.badge > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </span>
      ) : (
        <>
          <span className="flex items-center gap-2">
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{item.label}</span>
          </span>
          {item.badge !== undefined && item.badge > 0 && (
            <NotificationBadge count={item.badge} size="sm" variant="danger" />
          )}
        </>
      )}
    </Link>
  );
});

// ============================================================================
// DASHBOARDSIDEBAR COMPONENT
// ============================================================================

function DashboardSidebarContent({ isOpen, onClose, isCollapsed = false, onToggleCollapse }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Track selected listing from ListingSelector (standalone mode)
  const [standaloneSelectedListingId, setStandaloneSelectedListingId] = useState<number | null>(null);
  const [standaloneSelectedTier, setStandaloneSelectedTier] = useState<string | undefined>(undefined);

  // ============================================================================
  // DASHBOARD MODE CONTEXT
  // ============================================================================

  const {
    personalExpanded,
    listingManagerExpanded,
    togglePersonalSection,
    toggleListingManagerSection
  } = useDashboardMode();

  // ============================================================================
  // LISTING CONTEXT (OPTIONAL)
  // ============================================================================

  const listingContext = useListingContextOptional();

  // ============================================================================
  // NOTIFICATION POLLING WITH ADAPTIVE INTERVALS
  // ============================================================================

  const { summary: notifications } = useNotificationPolling({
    adaptive: true,
    pauseWhenHidden: true
  });

  // ============================================================================
  // DYNAMIC MENU SECTIONS WITH NOTIFICATION BADGES
  // ============================================================================

  const menuSectionsWithBadges = useMemo(() => {
    return dashboardMenuSections.map(section => ({
      ...section,
      items: section.items.map(item => {
        let badge = item.badge;

        // Map notification types to menu items (with null-safety)
        if (notifications?.by_type) {
          switch (item.key) {
            case 'connections':
              badge = notifications.by_type.connection_request ?? 0;
              break;
            case 'messages':
              badge = notifications.by_type.message ?? 0;
              break;
            case 'bizwire':
              badge = notifications.by_type.bizwire ?? 0;
              break;
            case 'reviews':
              badge = notifications.by_type.review ?? 0;
              break;
            case 'notifications':
              badge = notifications.total_unread ?? 0;
              break;
            case 'rec-inbox':
              badge = notifications.by_type.recommendation ?? 0;
              break;
          }
        }

        return { ...item, badge };
      })
    }));
  }, [notifications]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleNavigate = useCallback(() => {
    // Close sidebar on mobile after navigation
    onClose();
  }, [onClose]);

  const handleListingChange = useCallback((listingId: number | null, tier?: string) => {
    setStandaloneSelectedListingId(listingId);
    setStandaloneSelectedTier(tier);
  }, []);

  /**
   * Handle Personal section toggle with navigation
   * When expanding Personal → navigate to personal dashboard
   * When collapsing Personal → Listing Manager auto-expands, navigate to listing dashboard
   */
  const handlePersonalToggle = useCallback(() => {
    const wasExpanded = personalExpanded;
    togglePersonalSection();

    // Navigate based on the NEW state (opposite of current)
    if (wasExpanded) {
      // Was expanded, now collapsing → Listing Manager will expand
      // Navigate to listing manager dashboard
      void router.push('/dashboard/listings');
    } else {
      // Was collapsed, now expanding → Personal is opening
      // Navigate to personal dashboard
      void router.push('/dashboard');
    }
  }, [personalExpanded, togglePersonalSection, router]);

  /**
   * Handle Listing Manager section toggle with navigation
   * When expanding Listing Manager → navigate to listing dashboard
   * When collapsing Listing Manager → Personal auto-expands, navigate to personal dashboard
   */
  const handleListingManagerToggle = useCallback(() => {
    const wasExpanded = listingManagerExpanded;
    toggleListingManagerSection();

    // Navigate based on the NEW state (opposite of current)
    if (wasExpanded) {
      // Was expanded, now collapsing → Personal will expand
      // Navigate to personal dashboard
      void router.push('/dashboard');
    } else {
      // Was collapsed, now expanding → Listing Manager is opening
      // Navigate to listing manager dashboard
      void router.push('/dashboard/listings');
    }
  }, [listingManagerExpanded, toggleListingManagerSection, router]);

  const handleUserNavigate = useCallback(
    (path: string) => {
      setUserMenuOpen(false);
      onClose();
      void router.push(path as Parameters<typeof router.push>[0]);
    },
    [router, onClose]
  );

  const handleLogout = useCallback(async () => {
    setUserMenuOpen(false);
    await logout();
  }, [logout]);

  const getUserInitials = useCallback((): string => {
    if (!user) return '?';
    if (user.name) {
      const names = user.name.split(' ').filter(Boolean);
      if (names.length >= 2 && names[0] && names[1]) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return user.name.substring(0, 2).toUpperCase();
    }
    return user.email.substring(0, 2).toUpperCase();
  }, [user]);

  // ============================================================================
  // OUTSIDE CLICK & KEYBOARD HANDLING
  // ============================================================================

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [userMenuOpen]);

  // Close user menu on ESC
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [userMenuOpen]);

  // ============================================================================
  // RENDER
  // ============================================================================

  // Determine sidebar width based on collapsed state (desktop only)
  const sidebarWidth = isCollapsed ? 'lg:w-16' : 'lg:w-64';

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-50 w-64 ${sidebarWidth} bg-white border-r border-gray-200
        transform transition-all duration-200 ease-in-out
        lg:relative lg:z-30 lg:translate-x-0 lg:h-full flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      aria-label="Dashboard navigation"
    >
      {/* Header - Mobile only */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0 lg:hidden">
        <a href="/" className="block">
          <Image
            src="/uploads/site/branding/namelogo-horizontal.png"
            alt="Bizconekt"
            width={160}
            height={32}
            className="h-8 w-auto"
            priority
          />
        </a>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 p-1 rounded"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Desktop Collapse Toggle */}
      {onToggleCollapse && (
        <div className="hidden lg:flex items-center justify-end px-2 py-0.5 border-b border-gray-200 bg-white flex-shrink-0">
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hidden py-4"
        aria-label="Main navigation"
      >
        {/* Listing Manager Section - Placed ABOVE Personal */}
        <DashboardSidebarSection
          id="listing-manager"
          title="Listing Manager"
          isExpanded={listingManagerExpanded}
          variant="listing-manager"
          onToggle={handleListingManagerToggle}
          isCollapsed={isCollapsed}
        >
          {/* Listing Selector - Shows BEFORE ListingManagerMenu */}
          <ListingSelector
            isCollapsed={isCollapsed}
            onListingChange={handleListingChange}
          />
          <ListingManagerMenu
            listingId={listingContext?.selectedListingId ?? standaloneSelectedListingId}
            listingTier={(listingContext?.selectedListing?.tier ?? standaloneSelectedTier) as ListingTier | undefined}
            isCollapsed={isCollapsed}
            onNavigate={handleNavigate}
            badgeCounts={notifications?.by_type ? {
              bizwire: notifications.by_type.bizwire ?? 0,
              messages: notifications.by_type.message ?? 0
            } : undefined}
          />
        </DashboardSidebarSection>

        {/* Personal Section - Wrapped with accordion */}
        <DashboardSidebarSection
          id="personal"
          title="Personal"
          isExpanded={personalExpanded}
          variant="personal"
          onToggle={handlePersonalToggle}
          isCollapsed={isCollapsed}
        >
          {menuSectionsWithBadges.map(section => (
            <div key={section.id} className={isCollapsed ? 'px-2 mb-4' : 'px-3 mb-6'}>
              {/* Section Header - Hidden when collapsed on desktop or if title is empty */}
              {/* Darker blue (blue-800) - not affected by route theme */}
              {!isCollapsed && section.title && (
                <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-blue-800">
                  {section.title}
                </div>
              )}
              {/* Section Divider when collapsed */}
              {isCollapsed && (
                <div className="hidden lg:block border-t border-gray-200 my-2 first:hidden" />
              )}

              {/* Section Items */}
              <div className={isCollapsed ? 'space-y-1' : 'space-y-1'}>
                {section.items.map(item => (
                  <MenuItem
                    key={item.key}
                    item={item}
                    pathname={pathname}
                    onNavigate={handleNavigate}
                    isCollapsed={isCollapsed}
                  />
                ))}
              </div>
            </div>
          ))}
        </DashboardSidebarSection>
      </nav>

      {/* User Menu Footer - Mobile only (header has user menu on desktop) */}
      <div className="border-t border-gray-200 flex-shrink-0 relative lg:hidden" ref={userMenuRef}>
        {user ? (
          <>
            {/* User Menu Dropdown (opens upward) */}
            {userMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 mx-3 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                {/* User Info */}
                <div className="px-4 py-2 border-b border-gray-100">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {user.name || 'User'}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{user.email}</div>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <button
                    onClick={() => handleUserNavigate('/')}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  >
                    <Home className="w-4 h-4 mr-3" />
                    Back to Site
                  </button>
                  <button
                    onClick={() => handleUserNavigate('/profile')}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  >
                    <User className="w-4 h-4 mr-3" />
                    Your Profile
                  </button>
                  <button
                    onClick={() => handleUserNavigate('/settings')}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  >
                    <Settings className="w-4 h-4 mr-3" />
                    Settings
                  </button>
                </div>

                {/* Logout */}
                <div className="border-t border-gray-100 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}

            {/* User Button */}
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full px-4 py-3 flex items-center hover:bg-gray-50 transition-colors"
              aria-label="User menu"
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
            >
              {/* Avatar - Shows image if available, otherwise initials */}
              {user.avatarUrl && !imageError ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name || 'User avatar'}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full text-white flex items-center justify-center text-sm font-semibold flex-shrink-0"
                  style={{ backgroundColor: user.avatarBgColor || '#022641' }}
                >
                  {getUserInitials()}
                </div>
              )}

              {/* User Info */}
              <div className="ml-3 flex-1 text-left min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {user.name || 'User'}
                </div>
                <div className="text-xs text-gray-500 capitalize">{user.role}</div>
              </div>

              {/* Chevron */}
              <ChevronDown
                className={`w-4 h-4 text-gray-600 transition-transform duration-200 flex-shrink-0 ${
                  userMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
          </>
        ) : (
          <div className="px-6 py-4">
            <div className="text-xs text-gray-600">Dashboard v1.0</div>
          </div>
        )}
      </div>
    </aside>
  );
}

/**
 * DashboardSidebar - Wrapped with ErrorBoundary (STANDARD tier requirement)
 */
export function DashboardSidebar(props: DashboardSidebarProps) {
  return (
    <ErrorBoundary componentName="DashboardSidebar">
      <DashboardSidebarContent {...props} />
    </ErrorBoundary>
  );
}

// PHASE 4 COMPLETE: Sidebar height constrained, independent scroll
// PHASE 5 COMPLETE: Listing selector and context-based listing selection integrated

export default DashboardSidebar;
