/**
 * UserMenu Component - Logged-In User Dropdown
 *
 * @authority mandatory-verification-protocol.mdc - httpOnly cookies
 * @pattern React 18 hooks, Tailwind CSS
 * @governance Displays user info, provides logout, role-based navigation
 * @compliance master_build_v_4_4_0.md, admin-build-map-v2.1.mdc
 *
 * FEATURES:
 * - User avatar/initials display
 * - Dropdown menu with close-on-outside-click
 * - User profile link
 * - Settings link
 * - Admin dashboard link (role-based)
 * - Logout action with CSRF protection
 * - Keyboard navigation (ESC to close)
 * - Email verification badge
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/core/context/AuthContext';
import { useRouter } from 'next/navigation';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UserMenuProps {
  /** Optional className for custom styling */
  className?: string;
}

// ============================================================================
// USERMENU COMPONENT
// ============================================================================

/**
 * UserMenu - Dropdown menu for logged-in users
 *
 * @example
 * ```tsx
 * <UserMenu />
 * ```
 */
export default function UserMenu({ className = '' }: UserMenuProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // CLOSE MENU ON OUTSIDE CLICK
  // ============================================================================

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // ============================================================================
  // KEYBOARD HANDLING (ESC TO CLOSE)
  // ============================================================================

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  /**
   * Handle logout with menu close
   */
  const handleLogout = useCallback(async () => {
    setIsOpen(false);
    await logout();
  }, [logout]);

  /**
   * Navigate to route and close menu
   * Using window.location for navigation to avoid Next.js strict type checking
   * while maintaining server-side rendering compatibility
   */
  const handleNavigate = useCallback(
    (path: string) => {
      setIsOpen(false);
      // Use router.push with type assertion for Next.js App Router compatibility
      void router.push(path as Parameters<typeof router.push>[0]);
    },
    [router]
  );

  /**
   * Get user initials for avatar
   */
  const getUserInitials = useCallback((): string => {
    if (!user) return '?';

    if (user.name) {
      const names = user.name.split(' ').filter(Boolean);
      if (names.length >= 2 && names[0] && names[1]) {
        const firstInitial = names[0][0] ?? '';
        const secondInitial = names[1][0] ?? '';
        return `${firstInitial}${secondInitial}`.toUpperCase();
      }
      return user.name.substring(0, 2).toUpperCase();
    }

    return user.email.substring(0, 2).toUpperCase();
  }, [user]);

  // ============================================================================
  // RENDER NULL IF NO USER
  // ============================================================================

  if (!user) return null;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      {/* User Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="User menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Avatar Circle - Shows image if available, otherwise initials */}
        {user.avatarUrl && !imageError ? (
          <img
            src={user.avatarUrl}
            alt={user.name || 'User avatar'}
            className="w-8 h-8 rounded-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            className="w-8 h-8 rounded-full text-white flex items-center justify-center text-sm font-semibold"
            style={{ backgroundColor: user.avatarBgColor || '#022641' }}
          >
            {getUserInitials()}
          </div>
        )}

        {/* User Info (Hidden on Mobile) */}
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium text-gray-700">
            {user.name || 'User'}
          </div>
          <div className="text-xs text-gray-500 capitalize">{user.role}</div>
        </div>

        {/* Chevron Icon */}
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu - left-aligned on mobile, right-aligned on desktop */}
      {isOpen && (
        <div className="absolute left-0 md:left-auto md:right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {/* User Info Section */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="text-sm font-medium text-gray-900">
              {user.name || 'User'}
            </div>
            <div className="text-sm text-gray-500 truncate">{user.email}</div>

            {/* Verification Badge */}
            {user.isVerified ? (
              <div className="mt-1 flex items-center text-xs text-green-600">
                <svg
                  className="w-3 h-3 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Verified
              </div>
            ) : (
              <div className="mt-1 flex items-center text-xs text-yellow-600">
                <svg
                  className="w-3 h-3 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Unverified
              </div>
            )}
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {/* Profile Link */}
            <button
              onClick={() => handleNavigate(user.username ? `/profile/${user.username}` : '/profile')}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors"
            >
              <svg
                className="w-4 h-4 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Your Profile
            </button>

            {/* Dashboard Link */}
            <button
              onClick={() => handleNavigate('/dashboard')}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors"
            >
              <svg
                className="w-4 h-4 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
              Dashboard
            </button>

            {/* Settings Link */}
            <button
              onClick={() => handleNavigate('/settings')}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors"
            >
              <svg
                className="w-4 h-4 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Settings
            </button>

            {/* Admin Dashboard Link (Role-Based) */}
            {user.role === 'admin' && (
              <button
                onClick={() => handleNavigate('/admin')}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors"
              >
                <svg
                  className="w-4 h-4 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                Admin Dashboard
              </button>
            )}
          </div>

          {/* Logout Section */}
          <div className="border-t border-gray-200 pt-2">
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
            >
              <svg
                className="w-4 h-4 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
