/**
 * AdminShell - Main admin layout wrapper
 *
 * @tier STANDARD
 * @complexity 3.5
 * @osi_layers 7, 6, 5, 4
 * @buildmap v2.1
 * @authority PHASE_1_ADMIN_SHELL_BRAIN_PLAN.md
 *
 * GOVERNANCE: React 18 patterns (Client Component)
 * GOVERNANCE: Responsive design with mobile sidebar toggle
 * GOVERNANCE: ErrorBoundary wrapping main content
 */

'use client';

import React, { useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, LogIn } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { AdminSidebar } from './AdminSidebar';
import { useAuth } from '@/core/context/AuthContext';
import type { AdminShellProps } from '@/types/admin';

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ============================================================================
  // AUTH GATE - Blocks sidebar/menu from rendering to unauthorized users
  // ============================================================================

  // Loading state - show spinner, do NOT render sidebar
  if (loading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#002641] mx-auto" />
          <p className="mt-4 text-gray-500 text-sm">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login prompt, do NOT render sidebar
  if (!user) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full mx-4 text-center">
          <LogIn className="w-12 h-12 text-[#002641] mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-[#002641] mb-2">Authentication Required</h1>
          <p className="text-gray-600 mb-6">
            You must be signed in to access the admin area.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#002641] text-white rounded-md hover:bg-[#003a5c] transition-colors font-medium"
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  // Authenticated but not admin - show access denied, do NOT render sidebar
  if (user.role !== 'admin') {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full mx-4 text-center">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-[#002641] mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You do not have permission to access this area.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#002641] text-white rounded-md hover:bg-[#003a5c] transition-colors font-medium"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  // ============================================================================
  // AUTHORIZED ADMIN - Render sidebar + content
  // ============================================================================

  // Derive selected key from pathname
  const getSelectedFromPath = (path: string): string => {
    const segments = path.split('/').filter(Boolean);
    if (segments.length <= 1) return 'dashboard';
    return segments[1] || 'dashboard';
  };

  const selected = getSelectedFromPath(pathname);

  const handleSidebarToggle = () => {
    setSidebarOpen(prev => !prev);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar */}
      <AdminSidebar
        selected={selected}
        isOpen={sidebarOpen}
        onClose={handleCloseSidebar}
      />

      {/* Main Content */}
      <main
        id="admin-main-content"
        className="flex-1 flex flex-col overflow-hidden"
      >
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center">
          <button
            onClick={handleSidebarToggle}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="ml-4 text-lg font-semibold text-[#002641]">Admin</span>
        </header>

        {/* Content Area with ErrorBoundary */}
        <div className="flex-1 overflow-y-auto p-6">
          <ErrorBoundary componentName="AdminContent" isolate>
            {children}
          </ErrorBoundary>
        </div>
      </main>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={handleCloseSidebar}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export default AdminShell;
