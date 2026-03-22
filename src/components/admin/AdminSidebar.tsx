/**
 * AdminSidebar - Hierarchical Navigation Sidebar for Admin Area
 *
 * @tier STANDARD
 * @complexity 4.0
 * @osi_layers 7, 6, 5
 * @buildmap v2.1
 * @authority PHASE_2_ADMIN_SIDEBAR_BRAIN_PLAN.md
 *
 * GOVERNANCE: React 18 patterns (Client Component)
 * GOVERNANCE: Lucide React icons only
 * GOVERNANCE: Keyboard navigation support
 * GOVERNANCE: useCallback for handlers passed to children
 * GOVERNANCE: User menu in footer for admin-only layout
 */

'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import type { Route } from 'next';
import { ChevronDown, ChevronRight, X, User, Settings, LogOut, Home } from 'lucide-react';
import type { AdminSidebarProps, AdminModule, AdminMenuSection } from '@/types/admin';
import { adminMenuSections } from '@/config/adminMenu';
import { useAuth } from '@/core/context/AuthContext';

/**
 * Check if a parent menu item has a selected child
 */
function isChildSelected(parent: AdminModule, pathname: string): boolean {
  if (!parent.children) return false;
  return parent.children.some(child => child.href === pathname);
}

/**
 * Individual menu item component
 */
const MenuItem = React.memo(function MenuItem({
  item,
  pathname,
  openGroups,
  onToggle,
  onNavigate,
  level = 0
}: {
  item: AdminModule;
  pathname: string;
  openGroups: Record<string, boolean>;
  onToggle: (_key: string) => void;
  onNavigate: () => void;
  level?: number;
}) {
  const isOpen = openGroups[item.key] ?? false;
  const hasChildren = item.children && item.children.length > 0;
  const isActive = item.href === pathname;
  const hasActiveChild = isChildSelected(item, pathname);
  const Icon = item.icon;

  const baseClasses = `
    w-full text-left px-3 py-2 rounded-md font-medium transition-colors
    flex items-center justify-between gap-2
  `;

  const activeClasses = isActive
    ? 'bg-[#ed6437] text-white'
    : hasActiveChild
    ? 'bg-[#ed6437]/10 text-[#002641]'
    : 'text-[#002641] hover:bg-gray-100';

  const paddingLeft = level > 0 ? `pl-${4 + level * 3}` : '';

  if (hasChildren) {
    return (
      <div>
        <button
          type="button"
          onClick={() => onToggle(item.key)}
          className={`${baseClasses} ${hasActiveChild ? 'bg-[#ed6437]/10 text-[#002641]' : 'text-[#002641] hover:bg-gray-100'} ${paddingLeft}`}
          aria-expanded={isOpen}
          aria-controls={`submenu-${item.key}`}
        >
          <span className="flex items-center gap-2">
            {level === 0 && Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
            <span className="text-sm">{item.label}</span>
            {item.badge && (
              <span className="bg-[#ed6437] text-white text-xs px-2 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
          </span>
          {isOpen ? (
            <ChevronDown className="w-4 h-4 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 flex-shrink-0" />
          )}
        </button>

        {isOpen && (
          <div
            id={`submenu-${item.key}`}
            className="ml-4 mt-1 space-y-1 border-l border-gray-200 pl-2"
          >
            {item.children!.map(child => (
              <MenuItem
                key={child.key}
                item={child}
                pathname={pathname}
                openGroups={openGroups}
                onToggle={onToggle}
                onNavigate={onNavigate}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Leaf item with href
  if (item.href) {
    return (
      <Link
        href={item.href as Route}
        onClick={onNavigate}
        className={`${baseClasses} ${activeClasses} ${paddingLeft}`}
        aria-current={isActive ? 'page' : undefined}
      >
        <span className="flex items-center gap-2">
          {level === 0 && Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
          <span className="text-sm">{item.label}</span>
        </span>
        {item.badge && (
          <span className="bg-[#ed6437] text-white text-xs px-2 py-0.5 rounded-full">
            {item.badge}
          </span>
        )}
      </Link>
    );
  }

  return null;
});

/**
 * AdminSidebar - Main sidebar component
 */
export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fetch moderation pending counts for sidebar badge
  const [moderationCount, setModerationCount] = useState(0);
  const [jobsCount, setJobsCount] = useState(0);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    fetch('/api/admin/moderation/counts', { credentials: 'include' })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        const c = data?.data ?? data;
        if (c) {
          const total = (c.listings ?? 0) + (c.reviews ?? 0) + (c.events ?? 0) + (c.content ?? 0);
          setModerationCount(total);
          setJobsCount(c.jobs ?? 0);
        }
      })
      .catch(() => { /* silent */ });
  }, [user?.role, pathname]); // Re-fetch when navigating (e.g. after moderating)

  // Inject moderation + jobs badges into menu sections
  const sectionsWithBadges: AdminMenuSection[] = useMemo(() => {
    if (moderationCount === 0 && jobsCount === 0) return adminMenuSections;
    return adminMenuSections.map((section) => ({
      ...section,
      items: section.items.map((item) => {
        if (item.key === 'moderation' && moderationCount > 0) return { ...item, badge: moderationCount };
        if (item.key === 'jobs' && jobsCount > 0) return { ...item, badge: jobsCount };
        return item;
      }),
    }));
  }, [moderationCount, jobsCount]);

  // Initialize open groups based on current path
  const initialOpenGroups = useMemo(() => {
    const groups: Record<string, boolean> = {};
    adminMenuSections.forEach(section => {
      section.items.forEach(item => {
        if (item.children && isChildSelected(item, pathname)) {
          groups[item.key] = true;
        }
      });
    });
    return groups;
  }, [pathname]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialOpenGroups);

  const handleToggleGroup = useCallback((key: string) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleNavigate = useCallback(() => {
    // Close sidebar on mobile after navigation
    onClose();
  }, [onClose]);

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

  const handleLogout = useCallback(async () => {
    setUserMenuOpen(false);
    await logout();
  }, [logout]);

  const handleUserNavigate = useCallback((path: string) => {
    setUserMenuOpen(false);
    onClose(); // Close mobile sidebar too
    void router.push(path as Parameters<typeof router.push>[0]);
  }, [router, onClose]);

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

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200
        transform transition-transform duration-200 ease-in-out
        lg:static lg:translate-x-0 flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      aria-label="Admin navigation"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <a href="/" target="_blank" rel="noopener noreferrer" className="block">
          <Image
            src="/uploads/site/branding/namelogo-horizontal.png"
            alt="Bizconekt - Open homepage in new tab"
            width={160}
            height={32}
            className="h-8 w-auto"
            priority
          />
        </a>
        <button
          onClick={onClose}
          className="lg:hidden text-gray-500 hover:text-gray-700 p-1 rounded"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4" aria-label="Main navigation">
        {sectionsWithBadges.map(section => (
          <div key={section.id} className="px-3 mb-6">
            {/* Section Header */}
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#ed6437]">
              {section.title}
            </div>

            {/* Section Items */}
            <div className="space-y-1">
              {section.items.map(item => (
                <MenuItem
                  key={item.key}
                  item={item}
                  pathname={pathname}
                  openGroups={openGroups}
                  onToggle={handleToggleGroup}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User Menu Footer */}
      <div className="border-t border-gray-200 flex-shrink-0 relative" ref={userMenuRef}>
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
            <div className="text-xs text-gray-600">Admin Panel v2.0</div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default AdminSidebar;
