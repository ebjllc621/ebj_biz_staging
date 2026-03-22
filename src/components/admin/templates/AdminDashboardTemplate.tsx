// GOVERNANCE: React 18 patterns (Client Component)
// GOVERNANCE: Role-based menu visibility
// GOVERNANCE: Responsive design (mobile/tablet/desktop)
// AUTHORITY: docs/buildSpecs/incorporationV_old/phases/PHASE_2.2_BRAIN_PLAN.md

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Route } from 'next';

export interface AdminMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
  children?: AdminMenuItem[];
  roles?: string[];  // Role-based visibility
}

export interface AdminDashboardTemplateProps {
  title: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
  menuItems: AdminMenuItem[];
  children: React.ReactNode;
  userRole: string;
}

/**
 * AdminDashboardTemplate - Standard admin dashboard layout
 * GOVERNANCE: Use for admin pages with sidebar navigation
 * GOVERNANCE: Vertical sidebar (250px) + main content area
 * AUTHORITY: Phase 2.2 Core Pattern - Admin Dashboard Template
 *
 * Features:
 * - Fixed vertical sidebar (250px width)
 * - Hierarchical navigation menu with icons
 * - Active item highlighting (based on pathname)
 * - Role-based menu item visibility
 * - Responsive design (mobile/tablet/desktop)
 * - Breadcrumb navigation
 * - Action buttons area
 * - Mobile sidebar toggle with overlay
 *
 * @example
 * ```tsx
 * <AdminDashboardTemplate
 *   title="User Management"
 *   breadcrumbs={[
 *     { label: 'Admin', href: '/admin' },
 *     { label: 'Users' }
 *   ]}
 *   actions={<button>Add User</button>}
 *   menuItems={adminMenuItems}
 *   userRole="admin"
 * >
 *   <div>Dashboard content</div>
 * </AdminDashboardTemplate>
 * ```
 */
export function AdminDashboardTemplate({
  title,
  breadcrumbs,
  actions,
  menuItems,
  children,
  userRole
}: AdminDashboardTemplateProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /**
   * Check if menu item is visible for current user role
   */
  const isVisible = (item: AdminMenuItem): boolean => {
    if (!item.roles || item.roles.length === 0) return true;
    return item.roles.includes(userRole);
  };

  /**
   * Check if menu item is active (matches current pathname)
   */
  const isActive = (item: AdminMenuItem): boolean => {
    if (item.href === pathname) return true;
    if (item.children) {
      return item.children.some(child => child.href === pathname);
    }
    return false;
  };

  /**
   * Render menu item (recursive for hierarchical menus)
   */
  const renderMenuItem = (item: AdminMenuItem, level = 0) => {
    if (!isVisible(item)) return null;

    const hasChildren = item.children && item.children.length > 0;
    const active = isActive(item);

    return (
      <div key={item.id} className={`${level > 0 ? 'ml-4' : ''}`}>
        {item.href ? (
          <Link
            href={item.href as Route}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              active
                ? 'bg-orange-100 text-orange-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {item.icon && <span className="mr-3">{item.icon}</span>}
            {item.label}
          </Link>
        ) : (
          <div className="px-4 py-2 text-sm font-semibold text-gray-500">
            {item.label}
          </div>
        )}
        {hasChildren && (
          <div className="mt-1 space-y-1">
            {item.children!.map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="text-xl font-bold text-orange-600">Bizconekt</div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-gray-600"
            aria-label="Close sidebar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {menuItems.map(item => renderMenuItem(item))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
              aria-label="Open sidebar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Breadcrumbs */}
            {breadcrumbs && (
              <nav className="flex items-center space-x-2 text-sm text-gray-500">
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <span>/</span>}
                    {crumb.href ? (
                      <Link href={crumb.href as Route} className="hover:text-orange-600">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-gray-900">{crumb.label}</span>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            )}

            {/* Actions */}
            {actions && <div className="flex items-center space-x-2">{actions}</div>}
          </div>

          {/* Title */}
          <h1 className="mt-2 text-2xl font-bold text-gray-900">{title}</h1>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
