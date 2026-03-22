/**
 * ListingManagerMenu - Hierarchical Menu for Listing Manager
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @phase Phase 2 - Listing Manager Menu Structure
 *
 * GOVERNANCE COMPLIANCE:
 * - 'use client' directive
 * - Recursive MenuItem pattern (from AdminSidebar.tsx)
 * - useCallback for handlers passed to children
 * - React.memo for MenuItem performance
 * - Lucide React icons only
 * - ErrorBoundary wrapper (STANDARD tier)
 *
 * Features:
 * - Recursive nested menu rendering (up to 3 levels)
 * - Expand/collapse state tracking
 * - Active item highlighting
 * - Visual hierarchy with indentation
 * - Coming Soon indicators for unimplemented pages
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Route } from 'next';
import { ChevronDown, ChevronRight, Construction } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import {
  listingManagerMenuSections,
  buildListingManagerHref,
  getFeatureIdForMenuKey,
  type ListingManagerMenuItem,
  type ListingManagerMenuSection
} from '../config/listingManagerMenu';
import { useListingLayoutSync } from '@features/dashboard/hooks/useListingLayoutSync';
import { LayoutAwareMenuItem } from './LayoutAwareMenuItem';
import type { ListingTier, FeatureId } from '@features/listings/types/listing-section-layout';
import type { FeatureVisibilityState } from '@features/dashboard/hooks/useListingLayoutSync';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ListingManagerMenuProps {
  /** Current listing ID (null if none selected) */
  listingId: number | null;
  /** Current listing's subscription tier (determines feature locking) */
  listingTier?: ListingTier;
  /** Whether sidebar is collapsed (desktop) */
  isCollapsed?: boolean;
  /** Callback when navigating */
  onNavigate?: () => void;
  /** Dynamic badge counts by menu key (e.g., { bizwire: 2, messages: 1 }) */
  badgeCounts?: Record<string, number>;
}

interface MenuItemProps {
  item: ListingManagerMenuItem;
  listingId: number | null;
  pathname: string;
  openGroups: Record<string, boolean>;
  onToggle: (key: string) => void;
  onNavigate: () => void;
  visibilityMap: Map<FeatureId, FeatureVisibilityState>;
  level?: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a parent menu item has a selected child
 */
function isChildSelected(
  parent: ListingManagerMenuItem,
  pathname: string,
  listingId: number | null
): boolean {
  if (!parent.children || !listingId) return false;
  return parent.children.some(child => {
    const childHref = child.href ? buildListingManagerHref(listingId, child.href) : null;
    if (childHref && pathname === childHref) return true;
    // Recursively check nested children
    return isChildSelected(child, pathname, listingId);
  });
}

// ============================================================================
// MENU ITEM COMPONENT (RECURSIVE)
// ============================================================================

const MenuItem = React.memo(function MenuItem({
  item,
  listingId,
  pathname,
  openGroups,
  onToggle,
  onNavigate,
  visibilityMap,
  level = 0
}: MenuItemProps) {
  const isOpen = openGroups[item.key] ?? false;
  const hasChildren = item.children && item.children.length > 0;

  // Build full href
  // If href starts with '/', it's an absolute path (e.g., '/dashboard/listings')
  // Otherwise, it's relative to /dashboard/listings/[listingId]/
  const fullHref = item.href
    ? item.href.startsWith('/')
      ? item.href // Absolute path - use as-is
      : listingId
        ? buildListingManagerHref(listingId, item.href) // Relative path - needs listingId
        : null
    : null;

  const isActive = fullHref ? pathname === fullHref : false;
  const hasActiveChild = isChildSelected(item, pathname, listingId);
  const Icon = item.icon;

  // Check if page exists (Phase 6+: Dashboard implemented, others coming soon)
  // PHASE 9 MARKER: Communication/Reputation pages implemented
  // PHASE 10 MARKER: Marketing & Advanced Features pages implemented
  const implementedPages = [
    '/dashboard/listings',
    'bizwire',         // BizWire: Contact listing messaging
    'reviews',         // Phase 9: Reviews and owner responses
    'followers',       // Phase 9: Listing followers
    'recommendations', // Phase 9: Featured reviews
    'analytics',       // Phase 10: Analytics dashboard
    'campaigns',       // Phase 10: Marketing campaigns
    'billing',         // Phase 10: Subscription & billing
    'events',           // Events management
    'events/sponsors',  // Event sponsors management
    'events/attendees', // Event attendees management
    'events/analytics', // Event analytics dashboard
    'gallery',         // Gallery management
    'offers',          // Offers management
    'quick-facts',     // Quick facts management
    'jobs',            // Jobs management
    // Billing & Subscriptions (account-level pages accessed from listing manager)
    '/dashboard/account/payment-methods',
    '/dashboard/account/billing-history',
    '/dashboard/account/subscription-overview',
    '/dashboard/account/statements',
    '/dashboard/account/refund-requests',
    '/dashboard/account/campaign-bank'
  ];
  const isImplemented = fullHref ? (fullHref.startsWith('/') ? implementedPages.includes(fullHref) : implementedPages.includes(item.href || '')) : false;

  // Style classes
  const baseClasses = `
    w-full text-left px-3 py-2 rounded-md font-medium transition-colors
    flex items-center justify-between gap-2
  `;

  // Active state matches premium badge styling: light orange bg + dark orange text
  const activeClasses = isActive
    ? 'bg-[var(--dashboard-bg-active-subtle)] text-[var(--dashboard-text-accessible)] font-semibold'
    : hasActiveChild
      ? 'bg-[var(--dashboard-bg-active-subtle)] text-gray-900'
      : 'text-[var(--dashboard-text-muted)] hover:bg-[var(--dashboard-bg-hover)]';

  // Indentation based on level
  const paddingLeft = level > 0 ? { paddingLeft: `${12 + level * 12}px` } : {};

  // ========== PARENT ITEM (HAS CHILDREN) ==========
  if (hasChildren) {
    // Item has BOTH href AND children - clicking label navigates, clicking chevron expands
    const hasOwnPage = fullHref !== null;

    return (
      <div>
        <div
          className={`${baseClasses} ${isActive ? 'bg-[var(--dashboard-bg-active-subtle)] text-[var(--dashboard-text-accessible)] font-semibold' : hasActiveChild ? 'bg-[var(--dashboard-bg-active-subtle)] text-gray-900' : 'text-[var(--dashboard-text-muted)] hover:bg-[var(--dashboard-bg-hover)]'}`}
          style={paddingLeft}
        >
          {/* Clickable label area - navigates if item has href */}
          {hasOwnPage ? (
            <Link
              href={fullHref as Route}
              onClick={onNavigate}
              className="flex items-center gap-3 flex-1 min-w-0"
              aria-current={isActive ? 'page' : undefined}
            >
              {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
              <span className="text-sm">{item.label}</span>
            </Link>
          ) : (
            <span className="flex items-center gap-3 flex-1 min-w-0">
              {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
              <span className="text-sm">{item.label}</span>
            </span>
          )}

          {/* Chevron button - always toggles submenu */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(item.key);
            }}
            className="p-1 -mr-1 hover:bg-black/10 rounded transition-colors"
            aria-expanded={isOpen}
            aria-controls={`listing-submenu-${item.key}`}
            aria-label={isOpen ? `Collapse ${item.label} submenu` : `Expand ${item.label} submenu`}
          >
            {isOpen ? (
              <ChevronDown className="w-4 h-4 flex-shrink-0 text-[var(--dashboard-text-primary)]" />
            ) : (
              <ChevronRight className="w-4 h-4 flex-shrink-0" />
            )}
          </button>
        </div>

        {/* Nested Children */}
        {isOpen && (
          <div
            id={`listing-submenu-${item.key}`}
            className="mt-1 space-y-1 border-l-2 border-[var(--dashboard-border-nested)] ml-4"
          >
            {item.children!.map(child => (
              <MenuItem
                key={child.key}
                item={child}
                listingId={listingId}
                pathname={pathname}
                openGroups={openGroups}
                onToggle={onToggle}
                onNavigate={onNavigate}
                visibilityMap={visibilityMap}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ========== LEAF ITEM (NO CHILDREN) ==========
  if (fullHref) {
    const featureId = getFeatureIdForMenuKey(item.key);
    const featureState = featureId ? visibilityMap.get(featureId) : null;

    // Use LayoutAwareMenuItem for items with layout features
    if (featureId && featureState) {
      return (
        <div style={paddingLeft}>
          <LayoutAwareMenuItem
            menuKey={item.key}
            label={item.label}
            href={fullHref}
            icon={Icon}
            isActive={isActive}
            isVisible={featureState.visible}
            isLocked={featureState.locked}
            requiredTier={featureState.requiredTier}
            onClick={onNavigate}
            badge={item.badge}
          />
        </div>
      );
    }

    // Keep existing Link for non-layout items (analytics, billing, etc.)
    return (
      <Link
        href={fullHref as Route}
        onClick={onNavigate}
        className={`${baseClasses} ${activeClasses}`}
        style={paddingLeft}
        aria-current={isActive ? 'page' : undefined}
      >
        <span className="flex items-center gap-3">
          {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
          <span className="text-sm">{item.label}</span>
        </span>
        {!isImplemented && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Construction className="w-3 h-3" />
          </span>
        )}
        {item.badge !== undefined && (
          <span className="bg-[var(--dashboard-badge-bg)] text-[var(--dashboard-badge-text)] text-xs px-2 py-0.5 rounded-full">
            {item.badge}
          </span>
        )}
      </Link>
    );
  }

  // Non-navigable item (no href, no children - shouldn't happen normally)
  return null;
});

// ============================================================================
// LISTING MANAGER MENU COMPONENT
// ============================================================================

function ListingManagerMenuContent({
  listingId,
  listingTier: listingTierProp,
  isCollapsed = false,
  onNavigate,
  badgeCounts
}: ListingManagerMenuProps) {
  const pathname = usePathname();

  // Use actual listing tier from prop, fall back to essentials only if not provided
  const listingTier: ListingTier = listingTierProp || 'essentials';

  // Layout sync for visibility indicators
  const { visibilityMap } = useListingLayoutSync({
    listingId,
    listingTier,
    autoLoad: true
  });

  // ========== DYNAMIC BADGE INJECTION ==========
  // Apply badgeCounts to menu items (e.g., bizwire unread count)
  const menuSectionsWithBadges = useMemo(() => {
    if (!badgeCounts) return listingManagerMenuSections;

    const counts = badgeCounts;
    const applyBadges = (items: ListingManagerMenuItem[]): ListingManagerMenuItem[] =>
      items.map(item => {
        const count = counts[item.key];
        return {
          ...item,
          badge: count !== undefined && count > 0 ? count : item.badge,
          children: item.children ? applyBadges(item.children) : undefined
        };
      });

    return listingManagerMenuSections.map(section => ({
      ...section,
      items: applyBadges(section.items)
    }));
  }, [badgeCounts]);

  // ========== OPEN GROUPS STATE ==========
  // Initialize with parents of active item expanded
  const initialOpenGroups = useMemo(() => {
    const groups: Record<string, boolean> = {};

    if (listingId) {
      // Auto-expand sections containing active routes
      listingManagerMenuSections.forEach(section => {
        section.items.forEach(item => {
          if (isChildSelected(item, pathname, listingId)) {
            groups[item.key] = true;
          }
          // Check nested children too
          if (item.children) {
            item.children.forEach(child => {
              if (isChildSelected(child, pathname, listingId)) {
                groups[child.key] = true;
              }
            });
          }
        });
      });
    }

    return groups;
  }, [pathname, listingId]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialOpenGroups);

  // ========== HANDLERS ==========
  const handleToggleGroup = useCallback((key: string) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleNavigate = useCallback(() => {
    onNavigate?.();
  }, [onNavigate]);

  // ========== COLLAPSED STATE (DESKTOP) ==========
  // Show ALL individual menu item icons (matching personal dashboard pattern)
  if (isCollapsed) {
    return (
      <div className="space-y-1">
        {menuSectionsWithBadges.map(section => (
          <div key={section.id} className="px-2 mb-4">
            {/* Section Divider */}
            <div className="hidden lg:block border-t border-gray-200 my-2 first:hidden" />

            {/* Individual item icons */}
            <div className="space-y-1">
              {section.items.map(item => {
                const Icon = item.icon;
                if (!Icon) return null;

                // Build href
                const fullHref = item.href
                  ? item.href.startsWith('/')
                    ? item.href
                    : listingId
                      ? buildListingManagerHref(listingId, item.href)
                      : null
                  : null;

                const isActive = fullHref ? pathname === fullHref : false;

                const activeClasses = isActive
                  ? 'bg-[var(--dashboard-bg-active)] text-[var(--dashboard-text-on-primary)]'
                  : 'text-[var(--dashboard-text-muted)] hover:bg-[var(--dashboard-bg-hover)]';

                if (fullHref) {
                  return (
                    <Link
                      key={item.key}
                      href={fullHref as Route}
                      onClick={handleNavigate}
                      className={`w-full p-2 rounded-md font-medium transition-colors flex items-center justify-center ${activeClasses}`}
                      title={item.label}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className="w-5 h-5" />
                    </Link>
                  );
                }

                // Non-navigable item (has children but no own href)
                return (
                  <div
                    key={item.key}
                    className="w-full p-2 rounded-md font-medium transition-colors flex items-center justify-center text-[var(--dashboard-text-muted)]"
                    title={item.label}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ========== NO LISTING SELECTED STATE ==========
  if (!listingId) {
    return (
      <div className="px-3 py-6 text-center">
        <Construction className="w-8 h-8 mx-auto text-orange-300 mb-2" />
        <p className="text-sm text-gray-600">
          No listing selected
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Use the selector above to choose a listing
        </p>
      </div>
    );
  }

  // ========== FULL MENU RENDER ==========
  return (
    <div className="space-y-4">
      {menuSectionsWithBadges.map(section => (
        <div key={section.id}>
          {/* Section Header - Always orange for Listing Manager identity */}
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#ed6437' }}>
            {section.title}
          </div>

          {/* Section Items */}
          <div className="space-y-1">
            {section.items.map(item => (
              <MenuItem
                key={item.key}
                item={item}
                listingId={listingId}
                pathname={pathname}
                openGroups={openGroups}
                onToggle={handleToggleGroup}
                onNavigate={handleNavigate}
                visibilityMap={visibilityMap}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * ListingManagerMenu - Wrapped with ErrorBoundary (STANDARD tier)
 */
export function ListingManagerMenu(props: ListingManagerMenuProps) {
  return (
    <ErrorBoundary componentName="ListingManagerMenu">
      <ListingManagerMenuContent {...props} />
    </ErrorBoundary>
  );
}

export default ListingManagerMenu;
