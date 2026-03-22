/**
 * Admin User Management Page
 *
 * GOVERNANCE COMPLIANCE:
 * - Template: AdminTableTemplate (MANDATORY)
 * - Authentication: Admin-only access required
 * - Service Boundary: NO direct database access (API routes only)
 * - Credentials: 'include' for all fetch requests
 * - Complexity: ADVANCED tier (error boundaries required)
 *
 * Features:
 * - User table with pagination (20 per page)
 * - Filters: role, status
 * - Search: email, username, name
 * - CRUD operations: View, Edit, Suspend, Unsuspend, Delete
 * - User statistics sidebar
 * - Bulk actions: Suspend, Delete
 *
 * @authority PHASE_5.1_BRAIN_PLAN.md - Section 3.1
 * @component
 * @returns {JSX.Element} Admin user management interface
 */

'use client';


// Force dynamic rendering (required for useAuth() - React Context cannot be used in SSG)
export const dynamic = 'force-dynamic';

import { useState, useEffect, memo, useMemo, useCallback, useRef } from 'react';
import { AdminTableTemplate, TableColumn, TableAction } from '@/components/admin/templates/AdminTableTemplate';
import { BizModal, BizModalButton } from '@/components/ui/BizModal';
import { useAuth } from '@core/hooks/useAuth';
import { useIsMobile } from '@core/hooks/useMediaQuery';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ErrorFallback } from '@/components/common/ErrorFallback';
import { fetchWithCsrf } from '@core/utils/csrf';
import { Search, X, Clock, Filter, ChevronUp, ChevronDown, ChevronsLeft, ChevronsRight, Trash2, Edit2, EyeOff, Eye, AlertTriangle, RefreshCw, LogOut } from 'lucide-react';
import { HighlightedText } from '@/components/common/HighlightedText';
import { detectUserSearchMode, type UserSearchMode } from '@core/utils/search';
import {
  getEntitySearchHistory,
  saveEntitySearchToHistory,
  clearEntitySearchHistory,
  type SearchHistoryEntry
} from '@core/utils/searchHistory';
import { generateUserJSONExport, generateUserCSVExport, generateUserSQLExport } from '@core/utils/export/userExport';
import type { UserImportPreviewResult, UserExportData } from '@core/types/import-export';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface User {
  id: number;
  email: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  role: 'general' | 'listing_member' | 'admin';
  status: 'active' | 'suspended' | 'banned' | 'deleted' | 'pending';
  is_verified: boolean;
  created_at: string;
  updated_at: string | null;
  last_login_at: string | null;
}

interface ActivityLogEntry {
  action: string;
  details: string;
  ip_address: string;
  created_at: string;
}

interface UserStatistics {
  total: number;
  active_30d: number;
  by_role: {
    user: number;
    admin: number;
  };
  by_status: {
    active: number;
    suspended: number;
    banned: number;
    pending: number;
  };
}

// ============================================================================
// PHASE 2: Advanced Search Types
// ============================================================================

/**
 * Advanced filter state for user searches
 */
interface UserAdvancedFilters {
  id: string;
  email: string;
  username: string;
  name: string;
  role: 'all' | 'general' | 'listing_member' | 'admin';
  status: 'all' | 'active' | 'suspended' | 'banned' | 'pending';
  matchMode: 'all' | 'any';
}

/**
 * Default advanced filter values
 */
const DEFAULT_USER_FILTERS: UserAdvancedFilters = {
  id: '',
  email: '',
  username: '',
  name: '',
  role: 'all',
  status: 'all',
  matchMode: 'all'
};

// ============================================================================
// PHASE 5: UserEditorModal Types
// ============================================================================

/**
 * User form data for create/edit operations
 */
interface UserFormData {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  display_name: string;
  role: 'general' | 'listing_member' | 'admin';
  status: 'active' | 'suspended' | 'banned' | 'deleted' | 'pending';
  is_verified: boolean;
}

/**
 * Default form values for new user creation
 */
const DEFAULT_USER_FORM: UserFormData = {
  email: '',
  username: '',
  first_name: '',
  last_name: '',
  display_name: '',
  role: 'general',
  status: 'active',
  is_verified: false
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * User Statistics Sidebar Component
 * Displays aggregate statistics about users
 */
function UserStatistics() {
  const [stats, setStats] = useState<UserStatistics>({
    total: 0,
    active_30d: 0,
    by_role: { user: 0, admin: 0 },
    by_status: { active: 0, suspended: 0, banned: 0, pending: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/admin/users/statistics', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data?.statistics ?? data.statistics);
      }
    } catch (error) {
      // Silent fail - statistics are non-critical
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-4 rounded shadow mb-6">
        {/* PHASE 8: Skeleton loading for statistics - horizontal layout */}
        <div className="animate-pulse">
          <div className="h-5 w-32 bg-gray-200 rounded mb-3"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <div className="h-4 w-20 bg-gray-200 rounded"></div>
                <div className="h-4 w-8 bg-gray-200 rounded"></div>
              </div>
              <div className="flex justify-between">
                <div className="h-4 w-20 bg-gray-200 rounded"></div>
                <div className="h-4 w-8 bg-gray-200 rounded"></div>
              </div>
            </div>
            <div className="border-l pl-4 space-y-2">
              <div className="h-4 w-16 bg-gray-200 rounded"></div>
              <div className="flex justify-between">
                <div className="h-3 w-12 bg-gray-200 rounded"></div>
                <div className="h-3 w-8 bg-gray-200 rounded"></div>
              </div>
              <div className="flex justify-between">
                <div className="h-3 w-12 bg-gray-200 rounded"></div>
                <div className="h-3 w-8 bg-gray-200 rounded"></div>
              </div>
            </div>
            <div className="border-l pl-4 space-y-2">
              <div className="h-4 w-16 bg-gray-200 rounded"></div>
              <div className="flex justify-between">
                <div className="h-3 w-12 bg-gray-200 rounded"></div>
                <div className="h-3 w-8 bg-gray-200 rounded"></div>
              </div>
              <div className="flex justify-between">
                <div className="h-3 w-12 bg-gray-200 rounded"></div>
                <div className="h-3 w-8 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded shadow mb-6">
      <h3 className="font-medium mb-3">User Statistics</h3>
      <div className="grid grid-cols-3 gap-4">
        {/* Totals Section */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Total Users:</span>
            <span className="font-medium">{stats.total}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Active (30d):</span>
            <span className="font-medium">{stats.active_30d}</span>
          </div>
        </div>
        {/* By Role Section */}
        <div className="border-l pl-4">
          <div className="text-sm font-medium mb-1">By Role:</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Users:</span>
              <span>{stats.by_role.user}</span>
            </div>
            <div className="flex justify-between">
              <span>Admins:</span>
              <span>{stats.by_role.admin}</span>
            </div>
          </div>
        </div>
        {/* By Status Section */}
        <div className="border-l pl-4">
          <div className="text-sm font-medium mb-1">By Status:</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Active:</span>
              <span>{stats.by_status.active}</span>
            </div>
            <div className="flex justify-between">
              <span>Suspended:</span>
              <span>{stats.by_status.suspended}</span>
            </div>
            <div className="flex justify-between">
              <span>Banned:</span>
              <span>{stats.by_status.banned}</span>
            </div>
            <div className="flex justify-between">
              <span>Pending:</span>
              <span>{stats.by_status.pending}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PHASE 2: UserSearch Component
// ============================================================================

/**
 * UserSearch - Dedicated search component with debounce and history
 * @tier STANDARD
 * @phase Phase 2 - Advanced Search Integration
 */
const UserSearch = memo(function UserSearch({
  onSearch,
  searchHistory,
  onHistoryItemClick,
  onClearHistory,
  isDebouncing
}: {
  onSearch: (query: string, mode: UserSearchMode) => void;
  searchHistory: SearchHistoryEntry[];
  onHistoryItemClick: (query: string) => void;
  onClearHistory: () => void;
  isDebouncing: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const searchMode = useMemo(() => detectUserSearchMode(searchQuery), [searchQuery]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const mode = detectUserSearchMode(query);
      onSearch(query, mode);
    }, 300);
  }, [onSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      const mode = detectUserSearchMode(searchQuery);
      onSearch(searchQuery, mode);
    } else if (e.key === 'Escape') {
      setSearchQuery('');
      onSearch('', 'all');
    }
  }, [searchQuery, onSearch]);

  const handleClear = useCallback(() => {
    setSearchQuery('');
    onSearch('', 'all');
  }, [onSearch]);

  const handleHistoryClick = useCallback((query: string) => {
    setSearchQuery(query);
    setIsHistoryOpen(false);
    const mode = detectUserSearchMode(query);
    onSearch(query, mode);
    onHistoryItemClick(query);
  }, [onSearch, onHistoryItemClick]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const getRelativeTime = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600" />
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsHistoryOpen(searchHistory.length > 0)}
          onBlur={() => setTimeout(() => setIsHistoryOpen(false), 200)}
          placeholder="Search by name, email, #ID, or @username..."
          autoComplete="off"
          className="w-full pl-10 pr-24 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          aria-label="Search users"
        />
        {searchQuery && (
          <div className="absolute right-12 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {searchMode === 'id' && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">ID Search</span>
            )}
            {searchMode === 'email' && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Email Search</span>
            )}
            {searchMode === 'username' && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Username Search</span>
            )}
          </div>
        )}
        {isDebouncing && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-orange-500 border-t-transparent rounded-full" />
          </div>
        )}
        {searchQuery && !isDebouncing && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      {isHistoryOpen && searchHistory.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10">
          <div className="p-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Recent Searches</span>
              <button onClick={onClearHistory} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
            </div>
            <div className="space-y-1">
              {searchHistory.map((entry, i) => (
                <button
                  key={i}
                  onClick={() => handleHistoryClick(entry.query)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-left hover:bg-gray-50 rounded"
                >
                  <Clock className="w-3 h-3 text-gray-600" />
                  <span className="flex-1">{entry.query}</span>
                  <span className="text-xs text-gray-600">{getRelativeTime(entry.timestamp)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// ============================================================================
// PHASE 3: BatchHandlingBar Component
// ============================================================================

/**
 * BatchHandlingBar - Floating action bar for batch user operations
 * Adapts Categories page pattern for user management
 *
 * @tier STANDARD
 * @phase Phase 3 - Batch Selection & BatchHandlingBar
 */
function BatchHandlingBar({
  selectedCount,
  isMobile = false,
  onBulkEdit,
  onBulkSuspend,
  onBulkDelete,
  onClearSelection
}: {
  selectedCount: number;
  isMobile?: boolean;
  onBulkEdit: () => void;
  onBulkSuspend: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 transition-transform">
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${isMobile ? 'py-3' : 'py-4'}`}>
        <div className={`flex items-center ${isMobile ? 'justify-center gap-4' : 'justify-between'}`}>
          {/* Selection count with clear button */}
          <div className="flex items-center gap-4">
            <button
              onClick={onClearSelection}
              className="min-w-[44px] min-h-[44px] p-2.5 flex items-center justify-center rounded-md hover:bg-gray-100 active:scale-95 transition-all"
              aria-label="Clear selection"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-900">
              {isMobile ? selectedCount : `${selectedCount} ${selectedCount === 1 ? 'user' : 'users'} selected`}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Edit button */}
            <button
              onClick={onBulkEdit}
              className={`${
                isMobile
                  ? 'min-w-[44px] min-h-[44px] p-2.5 flex items-center justify-center'
                  : 'flex items-center gap-2 px-3 py-2'
              } rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 active:scale-95 transition-all text-sm`}
              aria-label={isMobile ? 'Bulk edit' : undefined}
            >
              <Edit2 className="w-4 h-4" />
              {!isMobile && <span>Edit</span>}
            </button>

            {/* Suspend button */}
            <button
              onClick={onBulkSuspend}
              className={`${
                isMobile
                  ? 'min-w-[44px] min-h-[44px] p-2.5 flex items-center justify-center'
                  : 'flex items-center gap-2 px-3 py-2'
              } rounded-md bg-yellow-50 hover:bg-yellow-100 text-yellow-700 active:scale-95 transition-all text-sm`}
              aria-label={isMobile ? 'Bulk suspend' : undefined}
            >
              <EyeOff className="w-4 h-4" />
              {!isMobile && <span>Suspend</span>}
            </button>

            {/* Delete button */}
            <button
              onClick={onBulkDelete}
              className={`${
                isMobile
                  ? 'min-w-[44px] min-h-[44px] p-2.5 flex items-center justify-center'
                  : 'flex items-center gap-2 px-3 py-2'
              } rounded-md bg-red-50 hover:bg-red-100 text-red-600 active:scale-95 transition-all text-sm`}
              aria-label={isMobile ? 'Bulk delete' : undefined}
            >
              <Trash2 className="w-4 h-4" />
              {!isMobile && <span>Delete</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PHASE 4: AdminPasswordModal Component
// ============================================================================

/**
 * AdminPasswordModal - Admin password confirmation for destructive operations
 * Adapted from Categories page pattern for user management
 *
 * @tier STANDARD
 * @phase Phase 4 - Admin Password Modal & Delete Confirmation
 *
 * GOVERNANCE:
 * - BizModal wrapper MANDATORY
 * - Password never logged in plaintext
 * - Reusable for future admin operations
 * - PII-compliant error messages
 *
 * Features:
 * - Password input with autoFocus
 * - Password visibility toggle (Eye/EyeOff icons)
 * - Failed attempt tracking (client-side display)
 * - Lockout countdown display
 * - Enter key submits password
 * - Clear error messaging
 */
function AdminPasswordModal({
  isOpen,
  onClose,
  onVerified,
  operationDescription
}: {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  operationDescription: string;
}) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPassword('');
      setShowPassword(false);
      setError(null);
      setAttemptsRemaining(null);
      setLockedUntil(null);
    }
  }, [isOpen]);

  // Lockout countdown timer
  useEffect(() => {
    if (!lockedUntil) return;

    const interval = setInterval(() => {
      const now = new Date();
      if (now >= lockedUntil) {
        setLockedUntil(null);
        setError(null);
        setAttemptsRemaining(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockedUntil]);

  const handleVerify = async () => {
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetchWithCsrf('/api/admin/verify-password', {
        method: 'POST',
        body: JSON.stringify({ password })
      });

      if (response.ok) {
        // Success: Password verified
        onVerified();
        onClose();
      } else {
        // Failure: Invalid password or lockout
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || 'Invalid password';
        const details = errorData.error?.details;

        setError(errorMessage);

        // Update attempts remaining if provided
        if (details?.attempts_remaining !== undefined) {
          setAttemptsRemaining(details.attempts_remaining);
        }

        // Update lockout time if provided
        if (details?.locked_until) {
          setLockedUntil(new Date(details.locked_until));
        }
      }
    } catch (err) {
      setError('Failed to verify password. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isVerifying && !lockedUntil) {
      handleVerify();
    }
  };

  const getRemainingTime = () => {
    if (!lockedUntil) return '';
    const now = new Date();
    const remainingMs = lockedUntil.getTime() - now.getTime();
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Admin Password"
      size="small"
    >
      <div className="space-y-4">
        {/* Description */}
        <p className="text-sm text-gray-700">
          Enter your admin password to <strong>{operationDescription}</strong>.
        </p>

        {/* Password input with visibility toggle */}
        {/* PASSWORD MANAGER GUARDS: Prevent autofill from interfering with admin confirmation */}
        <div data-form-type="other">
          {/* Hidden honeypot field to confuse password managers */}
          <input
            type="text"
            name="username"
            autoComplete="username"
            style={{ display: 'none' }}
            tabIndex={-1}
            aria-hidden="true"
          />
          <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 mb-1">
            Admin Password
          </label>
          <div className="relative">
            <input
              id="admin-password"
              name="admin-confirm-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isVerifying || !!lockedUntil}
              autoFocus
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore="true"
              data-form-type="other"
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Enter your password"
              aria-label="Admin password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isVerifying || !!lockedUntil}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md" role="alert" aria-live="polite">
            <p className="text-sm text-red-700">
              <strong>Error:</strong> {error}
            </p>
            {attemptsRemaining !== null && attemptsRemaining > 0 && (
              <p className="text-xs text-red-600 mt-1">
                {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining
              </p>
            )}
          </div>
        )}

        {/* Lockout warning */}
        {lockedUntil && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md" role="alert" aria-live="polite">
            <p className="text-sm text-yellow-700">
              <strong>Account Locked:</strong> Too many failed attempts.
            </p>
            <p className="text-xs text-yellow-600 mt-1">
              Try again in {getRemainingTime()}
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <BizModalButton
            variant="secondary"
            onClick={onClose}
            disabled={isVerifying}
          >
            Cancel
          </BizModalButton>
          <BizModalButton
            variant="danger"
            onClick={handleVerify}
            disabled={isVerifying || !!lockedUntil || !password.trim()}
          >
            {isVerifying ? 'Verifying...' : 'Verify Password'}
          </BizModalButton>
        </div>
      </div>
    </BizModal>
  );
}

// ============================================================================
// PHASE 4: DeleteConfirmationModal Component
// ============================================================================

/**
 * DeleteConfirmationModal - Final confirmation for delete operations
 * Shows user details before permanent deletion
 *
 * PATTERN: Matches categories BatchDeleteModal - makes API call internally
 * to avoid state synchronization issues with parent component.
 *
 * @tier STANDARD
 * @phase Phase 4 - Delete Confirmation Flow (Refactored to match categories pattern)
 */
function DeleteConfirmationModal({
  isOpen,
  selectedUsers,
  deletingIndividual,
  individualUser,
  onClose,
  onExecute
}: {
  isOpen: boolean;
  selectedUsers: User[];
  deletingIndividual: boolean;
  individualUser: User | null;
  onClose: () => void;
  onExecute: () => void;  // Called after successful delete to refresh data
}) {
  const [submitting, setSubmitting] = useState(false);

  // Determine which users to delete
  const usersToDelete = deletingIndividual && individualUser
    ? [individualUser]
    : selectedUsers;

  const count = usersToDelete.length;
  const isBatch = !deletingIndividual && count > 0;

  /**
   * Handle delete execution - makes API call internally (matches categories pattern)
   */
  const handleExecute = async () => {
    if (usersToDelete.length === 0) {
      return;
    }

    setSubmitting(true);
    try {
      if (deletingIndividual && individualUser) {
        // Individual delete
        const response = await fetchWithCsrf(`/api/admin/users/${individualUser.id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          onExecute();  // Refresh data
          onClose();    // Close modal
        } else {
          const error = await response.json();
          alert(error.error?.message ?? 'Failed to delete user');
        }
      } else {
        // Batch delete
        const userIds = usersToDelete.map(u => u.id);
        const response = await fetchWithCsrf('/api/admin/users/batch-delete', {
          method: 'POST',
          body: JSON.stringify({ userIds })
        });

        if (response.ok) {
          onExecute();  // Refresh data
          onClose();    // Close modal
        } else {
          const error = await response.json();
          alert(error.error?.message ?? 'Failed to delete users');
        }
      }
    } catch {
      alert('Error deleting user(s). Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={isBatch ? `Delete ${count} Users` : 'Delete User'}
      size="medium"
    >
      <div className="space-y-4">
        {/* Warning */}
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">
              This action cannot be undone
            </p>
            <p className="text-xs text-red-700 mt-1">
              {isBatch
                ? `${count} user accounts will be permanently deleted.`
                : 'This user account will be permanently deleted.'}
            </p>
          </div>
        </div>

        {/* User list */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            {isBatch ? 'Users to be deleted:' : 'User to be deleted:'}
          </p>
          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
            {usersToDelete.slice(0, 10).map((user) => (
              <div
                key={user.id}
                className="px-3 py-2 border-b border-gray-100 last:border-b-0 flex items-center justify-between"
              >
                <div>
                  <span className="text-sm font-medium text-gray-900">{user.email}</span>
                  <span className="text-xs text-gray-500 ml-2">@{user.username}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {user.role}
                </span>
              </div>
            ))}
            {count > 10 && (
              <div className="px-3 py-2 text-xs text-gray-500 italic">
                ... and {count - 10} more users
              </div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <BizModalButton
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </BizModalButton>
          <BizModalButton
            variant="danger"
            onClick={handleExecute}
            disabled={submitting}
          >
            {submitting
              ? 'Deleting...'
              : isBatch
                ? `Delete ${count} Users`
                : 'Delete User'}
          </BizModalButton>
        </div>
      </div>
    </BizModal>
  );
}

// ============================================================================
// PHASE 4.5: SuspendConfirmationModal Component
// ============================================================================

/**
 * SuspendConfirmationModal - Final confirmation for suspend operations
 * Shows user details before suspension
 *
 * PATTERN: Matches DeleteConfirmationModal - makes API call internally
 * to avoid state synchronization issues with parent component.
 *
 * @tier STANDARD
 * @phase Phase 4.5 - Suspend Confirmation Flow (mirrors delete pattern)
 */
function SuspendConfirmationModal({
  isOpen,
  selectedUsers,
  suspendingIndividual,
  individualUser,
  onClose,
  onExecute
}: {
  isOpen: boolean;
  selectedUsers: User[];
  suspendingIndividual: boolean;
  individualUser: User | null;
  onClose: () => void;
  onExecute: () => void;  // Called after successful suspend to refresh data
}) {
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState('Suspended by admin');

  // Determine which users to suspend
  const usersToSuspend = suspendingIndividual && individualUser
    ? [individualUser]
    : selectedUsers;

  const count = usersToSuspend.length;
  const isBatch = !suspendingIndividual && count > 0;

  // Reset reason when modal opens
  useEffect(() => {
    if (isOpen) {
      setReason('Suspended by admin');
    }
  }, [isOpen]);

  /**
   * Handle suspend execution - makes API call internally (matches delete pattern)
   */
  const handleExecute = async () => {
    if (usersToSuspend.length === 0) {
      return;
    }

    setSubmitting(true);
    try {
      if (suspendingIndividual && individualUser) {
        // Individual suspend
        const response = await fetchWithCsrf(`/api/admin/users/${individualUser.id}/suspend`, {
          method: 'PATCH',
          body: JSON.stringify({ action: 'suspend', reason })
        });

        if (response.ok) {
          onExecute();  // Refresh data
          onClose();    // Close modal
        } else {
          const error = await response.json();
          alert(error.error?.message ?? 'Failed to suspend user');
        }
      } else {
        // Batch suspend
        const userIds = usersToSuspend.map(u => u.id);
        const response = await fetchWithCsrf('/api/admin/users/batch-update', {
          method: 'POST',
          body: JSON.stringify({ userIds, updates: { status: 'suspended' } })
        });

        if (response.ok) {
          onExecute();  // Refresh data
          onClose();    // Close modal
        } else {
          const error = await response.json();
          alert(error.error?.message ?? 'Failed to suspend users');
        }
      }
    } catch {
      alert('Error suspending user(s). Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={isBatch ? `Suspend ${count} Users` : 'Suspend User'}
      size="medium"
    >
      <div className="space-y-4">
        {/* Warning */}
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-md flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-orange-800">
              Account Suspension
            </p>
            <p className="text-xs text-orange-700 mt-1">
              {isBatch
                ? `${count} user accounts will be suspended and unable to log in.`
                : 'This user account will be suspended and unable to log in.'}
            </p>
          </div>
        </div>

        {/* Reason input */}
        <div>
          <label htmlFor="suspend-reason" className="block text-sm font-medium text-gray-700 mb-1">
            Suspension Reason
          </label>
          <input
            id="suspend-reason"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={submitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
            placeholder="Enter suspension reason"
          />
        </div>

        {/* User list */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            {isBatch ? 'Users to be suspended:' : 'User to be suspended:'}
          </p>
          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
            {usersToSuspend.slice(0, 10).map((user) => (
              <div
                key={user.id}
                className="px-3 py-2 border-b border-gray-100 last:border-b-0 flex items-center justify-between"
              >
                <div>
                  <span className="text-sm font-medium text-gray-900">{user.email}</span>
                  <span className="text-xs text-gray-500 ml-2">@{user.username}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {user.role}
                </span>
              </div>
            ))}
            {count > 10 && (
              <div className="px-3 py-2 text-xs text-gray-500 italic">
                ... and {count - 10} more users
              </div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <BizModalButton
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </BizModalButton>
          <BizModalButton
            variant="primary"
            onClick={handleExecute}
            disabled={submitting || !reason.trim()}
          >
            {submitting
              ? 'Suspending...'
              : isBatch
                ? `Suspend ${count} Users`
                : 'Suspend User'}
          </BizModalButton>
        </div>
      </div>
    </BizModal>
  );
}

// ============================================================================
// Force Logout Confirmation Modal Component
// ============================================================================

/**
 * ForceLogoutConfirmationModal - Confirmation for force user logout
 * Requires admin password verification before displaying
 *
 * @tier STANDARD
 *
 * GOVERNANCE:
 * - BizModal wrapper MANDATORY
 * - fetchWithCsrf for all mutations
 * - Password verification already completed before this modal
 */
function ForceLogoutConfirmationModal({
  isOpen,
  user,
  onClose,
  onExecute
}: {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onExecute: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  /**
   * Handle force logout execution - makes API call internally
   */
  const handleExecute = async () => {
    if (!user) return;

    setSubmitting(true);
    try {
      const response = await fetchWithCsrf(`/api/admin/users/${user.id}/force-logout`, {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        const sessionsRevoked = data.data?.sessionsRevoked ?? 0;
        alert(`Successfully logged out ${user.email}. ${sessionsRevoked} session(s) revoked.`);
        onExecute();
        onClose();
      } else {
        const error = await response.json();
        alert(error.error?.message ?? 'Failed to force logout user');
      }
    } catch {
      alert('Error forcing user logout. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Force User Logout"
      size="medium"
    >
      <div className="space-y-4">
        {/* Warning */}
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-md flex items-start gap-3">
          <LogOut className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-orange-800">
              Force Logout
            </p>
            <p className="text-xs text-orange-700 mt-1">
              This will immediately terminate all active sessions for this user.
              They will be logged out of all devices and browsers.
            </p>
          </div>
        </div>

        {/* User info */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            User to be logged out:
          </p>
          <div className="border border-gray-200 rounded-md">
            <div className="px-3 py-2 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-900">{user.email}</span>
                <span className="text-xs text-gray-500 ml-2">@{user.username}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${
                user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {user.role}
              </span>
            </div>
          </div>
        </div>

        {/* Last login info */}
        {user.last_login_at && (
          <p className="text-xs text-gray-500">
            Last login: {new Date(user.last_login_at).toLocaleString()}
          </p>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <BizModalButton
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </BizModalButton>
          <BizModalButton
            variant="primary"
            onClick={handleExecute}
            disabled={submitting}
          >
            {submitting ? 'Logging Out...' : 'Force Logout'}
          </BizModalButton>
        </div>
      </div>
    </BizModal>
  );
}

// ============================================================================
// PHASE 5: UserEditorModal Component
// ============================================================================

/**
 * UserEditorModal - Create/Edit user modal
 * Adapted from CategoryEditorModal pattern
 *
 * @tier STANDARD
 * @phase Phase 5 - User Editor Modal
 *
 * GOVERNANCE:
 * - BizModal wrapper MANDATORY
 * - fetchWithCsrf for all mutations
 * - Email uniqueness validation
 * - ARIA labels for accessibility
 *
 * Features:
 * - Create new user form
 * - Edit existing user form (prefilled)
 * - Real-time email/username conflict detection
 * - Role and status management
 * - Membership tier selection
 */
function UserEditorModal({
  user,
  isOpen,
  onClose,
  onSave
}: {
  user?: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState<UserFormData>(DEFAULT_USER_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);

  // Reset form when modal opens/closes or user changes
  useEffect(() => {
    if (isOpen) {
      if (user) {
        // Edit mode: Prefill form with user data
        setFormData({
          email: user.email,
          username: user.username,
          first_name: user.first_name ?? '',
          last_name: user.last_name ?? '',
          display_name: user.display_name ?? '',
          role: user.role,
          status: user.status,
          is_verified: user.is_verified
        });
      } else {
        // Create mode: Reset to defaults
        setFormData(DEFAULT_USER_FORM);
      }
      setErrors({});
      setEmailAvailable(null);
    }
  }, [isOpen, user]);

  // Debounced email uniqueness check
  const checkEmailAvailability = useCallback(async (email: string) => {
    if (!email.trim() || !email.includes('@')) {
      setEmailAvailable(null);
      return;
    }

    // Skip check if editing and email unchanged
    if (user && user.email === email) {
      setEmailAvailable(true);
      return;
    }

    setEmailChecking(true);
    try {
      const response = await fetch(`/api/admin/users/check-email?email=${encodeURIComponent(email)}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setEmailAvailable(data.available);
      }
    } catch {
      // Silent fail - form validation will catch on submit
    } finally {
      setEmailChecking(false);
    }
  }, [user]);

  // Validate form fields
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    if (emailAvailable === false) {
      newErrors.email = 'Email is already in use';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, emailAvailable]);

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const isEdit = !!user;
      const url = isEdit
        ? `/api/admin/users/${user.id}`
        : '/api/admin/users/create';
      const method = isEdit ? 'PATCH' : 'POST';

      const payload = {
        ...formData,
        // Ensure proper types for API
        first_name: formData.first_name || null,
        last_name: formData.last_name || null,
        display_name: formData.display_name || null
      };

      const response = await fetchWithCsrf(url, {
        method,
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        onSave();
        onClose();
      } else {
        const error = await response.json();
        const message = error.error?.message || error.message || 'Failed to save user';

        // Handle specific error codes
        if (message.includes('email') || message.includes('Email')) {
          setErrors(prev => ({ ...prev, email: message }));
        } else if (message.includes('username') || message.includes('Username')) {
          setErrors(prev => ({ ...prev, username: message }));
        } else {
          alert(message);
        }
      }
    } catch (err) {
      alert('Error saving user. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle field change with auto-username generation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setFormData(prev => ({
      ...prev,
      email,
      // Auto-generate username from email for new users (if username hasn't been manually edited)
      // Continue auto-generating as long as username matches the email prefix (not manually changed)
      username: !user && (
        !prev.username ||
        prev.email.split('@')[0] === prev.username
      ) ? (email.split('@')[0] || '') : prev.username
    }));
    setErrors(prev => ({ ...prev, email: '' }));
    setEmailAvailable(null);
  };

  // Debounce email check on blur
  const handleEmailBlur = () => {
    if (formData.email) {
      checkEmailAvailability(formData.email);
    }
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={user ? `Edit User: ${user.email}` : 'Create New User'}
      size="medium"
    >
      <div className="space-y-4">
        {/* Email Field */}
        <div>
          <label htmlFor="user-email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address *
          </label>
          <div className="relative">
            <input
              id="user-email"
              type="email"
              value={formData.email}
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
              disabled={submitting}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                errors.email ? 'border-red-500' : emailAvailable === true ? 'border-green-500' : 'border-gray-300'
              }`}
              placeholder="user@example.com"
              aria-label="Email address"
              aria-invalid={!!errors.email}
            />
            {emailChecking && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="animate-spin h-4 w-4 border-2 border-orange-500 border-t-transparent rounded-full" />
              </div>
            )}
            {emailAvailable === true && !emailChecking && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">✓</div>
            )}
          </div>
          {errors.email && (
            <p className="text-sm text-red-600 mt-1">{errors.email}</p>
          )}
        </div>

        {/* Username Field */}
        <div>
          <label htmlFor="user-username" className="block text-sm font-medium text-gray-700 mb-1">
            Username *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">@</span>
            <input
              id="user-username"
              type="text"
              value={formData.username}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, username: e.target.value }));
                setErrors(prev => ({ ...prev, username: '' }));
              }}
              disabled={submitting}
              className={`w-full pl-7 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                errors.username ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="username"
              aria-label="Username"
              aria-invalid={!!errors.username}
            />
          </div>
          {errors.username && (
            <p className="text-sm text-red-600 mt-1">{errors.username}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">Letters, numbers, and underscores only</p>
        </div>

        {/* Name Fields (2-column grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="user-first-name" className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <input
              id="user-first-name"
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
              disabled={submitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="John"
            />
          </div>
          <div>
            <label htmlFor="user-last-name" className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              id="user-last-name"
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
              disabled={submitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Doe"
            />
          </div>
        </div>

        {/* Display Name Field */}
        <div>
          <label htmlFor="user-display-name" className="block text-sm font-medium text-gray-700 mb-1">
            Display Name
          </label>
          <input
            id="user-display-name"
            type="text"
            value={formData.display_name}
            onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
            disabled={submitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="John D."
          />
          <p className="text-xs text-gray-500 mt-1">How the user&apos;s name appears publicly</p>
        </div>

        {/* Role & Status (2-column grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="user-role" className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              id="user-role"
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'general' | 'listing_member' | 'admin' }))}
              disabled={submitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="general">General</option>
              <option value="listing_member">Listing Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label htmlFor="user-status" className="block text-sm font-medium text-gray-700 mb-1">
              Status *
            </label>
            <select
              id="user-status"
              value={formData.status}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                status: e.target.value as 'active' | 'suspended' | 'banned' | 'pending'
              }))}
              disabled={submitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
            </select>
          </div>
        </div>

        {/* Email Verified Checkbox */}
        <div className="flex items-center gap-2">
          <input
            id="user-verified"
            type="checkbox"
            checked={formData.is_verified}
            onChange={(e) => setFormData(prev => ({ ...prev, is_verified: e.target.checked }))}
            disabled={submitting}
            className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
          />
          <label htmlFor="user-verified" className="text-sm text-gray-700">
            Email Verified
          </label>
        </div>

        {/* Note for new users */}
        {!user && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> New users will receive a password reset email to set their password.
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <BizModalButton
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </BizModalButton>
          <BizModalButton
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting || emailChecking}
          >
            {submitting ? 'Saving...' : user ? 'Save Changes' : 'Create User'}
          </BizModalButton>
        </div>
      </div>
    </BizModal>
  );
}

// ============================================================================
// PHASE 6: UserImportExportModal Component
// ============================================================================

/**
 * UserImportExportModal - Data portability for users
 * Adapted from Categories ImportExportModal pattern
 *
 * @tier ADVANCED
 * @phase Phase 6 - Import/Export Modal
 *
 * GOVERNANCE:
 * - BizModal wrapper MANDATORY
 * - fetchWithCsrf for all mutations
 * - PII security: password_hash NEVER exported
 * - ARIA labels for accessibility
 */
function UserImportExportModal({
  isOpen,
  onClose,
  users,
  selectedIds,
  onImportComplete
}: {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  selectedIds: Set<number>;
  onImportComplete: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'sql'>('json');
  const [exportScope, setExportScope] = useState<'all' | 'selected'>('all');
  const [isExporting, setIsExporting] = useState(false);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importFormat, setImportFormat] = useState<'json' | 'csv' | 'sql' | null>(null);
  const [importPreview, setImportPreview] = useState<UserImportPreviewResult | null>(null);
  const [conflictResolution, setConflictResolution] = useState<'skip' | 'overwrite' | 'rename' | 'update_existing'>('skip');
  const [showFormatExamples, setShowFormatExamples] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setImportFile(null);
      setImportFormat(null);
      setImportPreview(null);
      setImportError(null);
      setShowFormatExamples(false);
    }
  }, [isOpen]);

  // Export handler
  const handleExport = () => {
    setIsExporting(true);
    try {
      const usersToExport = exportScope === 'selected'
        ? users.filter(u => selectedIds.has(u.id))
        : users;

      if (exportScope === 'selected' && usersToExport.length === 0) {
        alert('No users selected for export');
        setIsExporting(false);
        return;
      }

      let content: string;
      let contentType: string;
      let extension: string;

      switch (exportFormat) {
        case 'json':
          content = generateUserJSONExport(usersToExport as unknown as Array<Partial<UserExportData> & { [key: string]: unknown }>);
          contentType = 'application/json';
          extension = 'json';
          break;

        case 'csv':
          content = generateUserCSVExport(usersToExport as unknown as Array<Partial<UserExportData> & { [key: string]: unknown }>);
          contentType = 'text/csv';
          extension = 'csv';
          break;

        case 'sql':
          content = generateUserSQLExport(usersToExport as unknown as Array<Partial<UserExportData> & { [key: string]: unknown }>);
          contentType = 'text/plain';
          extension = 'sql';
          break;

        default:
          throw new Error('Invalid export format');
      }

      const filename = `users-export-${new Date().toISOString().slice(0, 10)}.${extension}`;
      downloadUserFile(content, filename, contentType);
    } catch (error) {
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // File selection handler
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !['json', 'csv', 'sql'].includes(extension)) {
      setImportError('Invalid file type. Please upload .json, .csv, or .sql file.');
      return;
    }

    setImportFile(file);
    setImportFormat(extension as 'json' | 'csv' | 'sql');
    setImportError(null);

    try {
      const content = await readUserFileAsText(file);
      await handleImportPreview(extension as 'json' | 'csv' | 'sql', content);
    } catch (error) {
      setImportError(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Import preview handler
  const handleImportPreview = async (format: 'json' | 'csv' | 'sql', content: string) => {
    setIsImporting(true);
    setImportError(null);

    try {
      const response = await fetchWithCsrf('/api/admin/users/import/preview', {
        method: 'POST',
        body: JSON.stringify({ format, content })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Preview failed');
      }

      const data = await response.json();
      setImportPreview(data.data);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Unknown error');
      setImportPreview(null);
    } finally {
      setIsImporting(false);
    }
  };

  // Import execution handler
  const handleImportExecute = async () => {
    if (!importFile || !importFormat) {
      setImportError('No file selected');
      return;
    }

    setIsImporting(true);
    setImportError(null);

    try {
      const content = await readUserFileAsText(importFile);

      const response = await fetchWithCsrf('/api/admin/users/import', {
        method: 'POST',
        body: JSON.stringify({ format: importFormat, content, conflictResolution })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Import failed');
      }

      const data = await response.json();
      const result = data.data;

      alert(
        `Import complete!\n` +
        `Imported: ${result.imported}\n` +
        `Updated: ${result.updated}\n` +
        `Skipped: ${result.skipped}\n` +
        `Renamed: ${result.renamed}\n` +
        `Errors: ${result.errors.length}`
      );

      setImportFile(null);
      setImportFormat(null);
      setImportPreview(null);
      onImportComplete();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Import / Export Users"
      size="large"
    >
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          className={`px-4 py-2 flex items-center gap-2 ${activeTab === 'export' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('export')}
        >
          Export
        </button>
        <button
          className={`px-4 py-2 flex items-center gap-2 ${activeTab === 'import' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('import')}
        >
          Import
        </button>
      </div>

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="space-y-4">
          {/* PII Warning */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> Exported files contain PII (names, emails). Handle securely and do not share publicly.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Format
            </label>
            <div className="flex gap-3">
              <button
                className={`px-4 py-2 rounded ${exportFormat === 'json' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => setExportFormat('json')}
              >
                JSON
              </button>
              <button
                className={`px-4 py-2 rounded ${exportFormat === 'csv' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => setExportFormat('csv')}
              >
                CSV
              </button>
              <button
                className={`px-4 py-2 rounded ${exportFormat === 'sql' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => setExportFormat('sql')}
              >
                SQL
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scope
            </label>
            <div className="flex gap-3">
              <button
                className={`px-4 py-2 rounded ${exportScope === 'all' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => setExportScope('all')}
              >
                All Users ({users.length})
              </button>
              <button
                className={`px-4 py-2 rounded ${exportScope === 'selected' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => setExportScope('selected')}
                disabled={selectedIds.size === 0}
              >
                Selected ({selectedIds.size})
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <BizModalButton variant="secondary" onClick={onClose}>
              Cancel
            </BizModalButton>
            <BizModalButton
              variant="primary"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Download'}
            </BizModalButton>
          </div>
        </div>
      )}

      {/* Import Tab */}
      {activeTab === 'import' && (
        <div className="space-y-4">
          {/* Import Info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Imported users will be assigned temporary passwords and should reset via email.
            </p>
          </div>

          {/* Collapsible Format Examples */}
          <div className="border border-gray-200 rounded-md">
            <button
              type="button"
              onClick={() => setShowFormatExamples(!showFormatExamples)}
              className="w-full px-4 py-3 flex items-center justify-between text-left bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
            >
              <span className="text-sm font-medium text-gray-700">Format Examples & Field Reference</span>
              {showFormatExamples ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>
            {showFormatExamples && (
              <div className="p-4 border-t border-gray-200 space-y-4 text-xs">
                {/* Field Reference - DATABASE VERIFIED: 32 importable fields */}
                <div>
                  <h5 className="font-medium text-gray-800 mb-2">Importable Fields (32 total from 49 DB columns):</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-1 text-gray-600">
                    {/* Primary */}
                    <span>• email (required)</span>
                    <span>• username</span>
                    {/* Name */}
                    <span>• first_name</span>
                    <span>• last_name</span>
                    <span>• display_name</span>
                    <span>• contact_phone</span>
                    {/* Profile */}
                    <span>• avatar_url</span>
                    <span>• avatar_bg_color</span>
                    <span>• bio</span>
                    <span>• occupation</span>
                    <span>• goals</span>
                    <span>• cover_image_url</span>
                    {/* Location */}
                    <span>• city</span>
                    <span>• state</span>
                    <span>• country</span>
                    {/* Flags */}
                    <span>• is_active</span>
                    <span>• is_verified</span>
                    <span>• is_mock</span>
                    <span>• is_business_owner</span>
                    {/* Role/Status */}
                    <span>• role</span>
                    <span>• status</span>
                    <span>• user_group</span>
                    <span>• profile_visibility</span>
                    {/* Terms */}
                    <span>• terms_accepted_at</span>
                    <span>• terms_version</span>
                    {/* JSON Settings */}
                    <span>• permissions (JSON)</span>
                    <span>• privacy_settings (JSON)</span>
                    <span>• interests (JSON)</span>
                    <span>• social_links (JSON)</span>
                    <span>• visibility_settings (JSON)</span>
                    <span>• connection_privacy (JSON)</span>
                    <span>• user_preferences (JSON)</span>
                  </div>
                  <p className="mt-2 text-gray-500">
                    <strong>Role:</strong> general, listing_member, admin | <strong>Status:</strong> active, suspended, banned, pending, deleted | <strong>Visibility:</strong> public, connections, private
                  </p>
                </div>

                {/* JSON Example */}
                <div>
                  <h5 className="font-medium text-gray-800 mb-1">JSON Format:</h5>
                  <pre className="bg-gray-100 p-2 rounded overflow-x-auto text-[10px]">{`[
  {
    "email": "user@example.com",
    "username": "john_doe",
    "first_name": "John",
    "last_name": "Doe",
    "contact_phone": "+1-555-0100",
    "bio": "Software developer",
    "city": "New York",
    "state": "NY",
    "country": "USA",
    "role": "general",
    "status": "active",
    "profile_visibility": "public"
  }
]`}</pre>
                </div>

                {/* CSV Example */}
                <div>
                  <h5 className="font-medium text-gray-800 mb-1">CSV Format:</h5>
                  <pre className="bg-gray-100 p-2 rounded overflow-x-auto text-[10px]">{`email,username,first_name,last_name,contact_phone,bio,city,state,country,role,status,profile_visibility
user@example.com,john_doe,John,Doe,+1-555-0100,Software developer,New York,NY,USA,general,active,public`}</pre>
                </div>

                {/* SQL Example */}
                <div>
                  <h5 className="font-medium text-gray-800 mb-1">SQL Format:</h5>
                  <pre className="bg-gray-100 p-2 rounded overflow-x-auto text-[10px]">{`INSERT INTO users (email, username, first_name, last_name, contact_phone, bio, city, state, country, role, status, profile_visibility)
VALUES ('user@example.com', 'john_doe', 'John', 'Doe', '+1-555-0100', 'Software developer', 'New York', 'NY', 'USA', 'general', 'active', 'public');`}</pre>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload File
            </label>
            <input
              type="file"
              accept=".json,.csv,.sql"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
            />
            <p className="mt-1 text-xs text-gray-500">
              Supported formats: JSON, CSV, SQL (max 10MB)
            </p>
          </div>

          {importError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {importError}
            </div>
          )}

          {importPreview && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <h4 className="font-medium text-blue-900 mb-2">Import Preview</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <div>Total: {importPreview.total}</div>
                  <div>Valid: {importPreview.valid}</div>
                  <div>Conflicts: {importPreview.conflicts.length}</div>
                  <div>Errors: {importPreview.errors.length}</div>
                </div>
              </div>

              {importPreview.conflicts.length > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <h4 className="font-medium text-yellow-900 mb-2">
                    Conflict Resolution ({importPreview.conflicts.length} conflicts)
                  </h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="skip"
                        checked={conflictResolution === 'skip'}
                        onChange={(e) => setConflictResolution(e.target.value as 'skip')}
                      />
                      <span className="text-sm text-yellow-700">Skip - Don&apos;t import conflicting users</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="overwrite"
                        checked={conflictResolution === 'overwrite'}
                        onChange={(e) => setConflictResolution(e.target.value as 'overwrite')}
                      />
                      <span className="text-sm text-yellow-700">Overwrite - Replace all fields with import data</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="update_existing"
                        checked={conflictResolution === 'update_existing'}
                        onChange={(e) => setConflictResolution(e.target.value as 'update_existing')}
                      />
                      <span className="text-sm text-yellow-700">Update Existing - Merge (only update non-empty fields, preserve existing)</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="rename"
                        checked={conflictResolution === 'rename'}
                        onChange={(e) => setConflictResolution(e.target.value as 'rename')}
                      />
                      <span className="text-sm text-yellow-700">Rename - Create with modified email</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <BizModalButton variant="secondary" onClick={onClose}>
              Cancel
            </BizModalButton>
            <BizModalButton
              variant="primary"
              onClick={handleImportExecute}
              disabled={isImporting || !importPreview || importPreview.valid === 0}
            >
              {isImporting ? 'Importing...' : 'Import Users'}
            </BizModalButton>
          </div>
        </div>
      )}
    </BizModal>
  );
}

// Helper functions for the modal
function downloadUserFile(content: string, filename: string, contentType: string): void {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function readUserFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// ============================================================================
// PHASE 2: UserAdvancedFilterPanel Component
// ============================================================================

/**
 * UserAdvancedFilterPanel - Toggleable multi-field filter panel
 * @tier STANDARD
 * @phase Phase 2 - Advanced Search Integration
 */
function UserAdvancedFilterPanel({
  isOpen,
  filters,
  onChange,
  onClear,
  onToggle,
  activeFilterCount
}: {
  isOpen: boolean;
  filters: UserAdvancedFilters;
  onChange: (filters: UserAdvancedFilters) => void;
  onClear: () => void;
  onToggle: () => void;
  activeFilterCount: number;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex items-center gap-2 min-h-[44px] px-4 py-2 bg-gray-100 hover:bg-gray-200 active:scale-95 rounded-md transition-all text-sm font-medium"
      >
        <Filter className="w-4 h-4" />
        <span>Advanced Filters</span>
        {activeFilterCount > 0 && (
          <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">{activeFilterCount}</span>
        )}
        {isOpen ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
      </button>
      {isOpen && (
        <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-md space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">User ID (exact match)</label>
              <input
                type="number"
                value={filters.id}
                onChange={(e) => onChange({ ...filters, id: e.target.value })}
                placeholder="e.g., 123"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email (partial match)</label>
              <input
                type="text"
                value={filters.email}
                onChange={(e) => onChange({ ...filters, email: e.target.value })}
                placeholder="e.g., john@example"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Username (partial match)</label>
              <input
                type="text"
                value={filters.username}
                onChange={(e) => onChange({ ...filters, username: e.target.value })}
                placeholder="e.g., john_doe"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name (partial match)</label>
              <input
                type="text"
                value={filters.name}
                onChange={(e) => onChange({ ...filters, name: e.target.value })}
                placeholder="e.g., John Smith"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
              <select
                value={filters.role}
                onChange={(e) => onChange({ ...filters, role: e.target.value as UserAdvancedFilters['role'] })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Roles</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => onChange({ ...filters, status: e.target.value as UserAdvancedFilters['status'] })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="banned">Banned</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Match Mode</label>
              <select
                value={filters.matchMode}
                onChange={(e) => onChange({ ...filters, matchMode: e.target.value as 'all' | 'any' })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">Match All (AND)</option>
                <option value="any">Match Any (OR)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end pt-2 border-t border-gray-200">
            <button onClick={onClear} className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded-md transition-colors">
              Clear All Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Activity Log Modal Component
 * Displays last 50 user actions
 */
function ActivityLogModal({ user, isOpen, onClose }: { user: User; isOpen: boolean; onClose: () => void }) {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchActivities();
    }
  }, [isOpen]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}/activity?limit=50`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setActivities(data.data?.activities ?? data.activities ?? []);
      }
    } catch (error) {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Activity Log for ${user.display_name ?? user.username}`}
      size="large"
    >
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading activities...</div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No activity found</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Action</th>
                <th className="text-left py-2">Details</th>
                <th className="text-left py-2">IP Address</th>
                <th className="text-left py-2">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((activity, idx) => (
                <tr key={idx} className="border-b">
                  <td className="py-2">{activity.action}</td>
                  <td className="py-2">{activity.details}</td>
                  <td className="py-2">{activity.ip_address}</td>
                  <td className="py-2">{new Date(activity.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </BizModal>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * AdminUsersPage - User management interface for platform administrators
 *
 * Provides CRUD operations for user accounts and activity tracking.
 * Requires admin role for access.
 *
 * @component
 * @returns {JSX.Element} Admin user management interface
 */
function AdminUsersPageContent() {
  const { user: currentUser } = useAuth();
  const isMobile = useIsMobile();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({
    role: '',
    status: '',
    search: ''
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activityModalOpen, setActivityModalOpen] = useState(false);

  // ============================================================================
  // PHASE 1: Header action state (wired in later phases)
  // ============================================================================
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [importExportModalOpen, setImportExportModalOpen] = useState(false);

  // ============================================================================
  // PHASE 2: Advanced Search State
  // ============================================================================
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<UserSearchMode>('all');
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<UserAdvancedFilters>(DEFAULT_USER_FILTERS);
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);

  // ============================================================================
  // PHASE 3: Batch Selection State
  // ============================================================================
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // ============================================================================
  // PHASE 4: Password Modal & Delete Confirmation State
  // ============================================================================
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
  const [deletingIndividual, setDeletingIndividual] = useState(false);
  const [individualUserToDelete, setIndividualUserToDelete] = useState<User | null>(null);
  const [pendingDeleteOperation, setPendingDeleteOperation] = useState<'batch' | 'individual' | null>(null);

  // ============================================================================
  // PHASE 4.5: Suspend Confirmation State (mirrors delete flow)
  // ============================================================================
  const [isSuspendConfirmModalOpen, setIsSuspendConfirmModalOpen] = useState(false);
  const [suspendingIndividual, setSuspendingIndividual] = useState(false);
  const [individualUserToSuspend, setIndividualUserToSuspend] = useState<User | null>(null);
  const [pendingSuspendOperation, setPendingSuspendOperation] = useState<'batch' | 'individual' | null>(null);
  const [pendingPasswordOperation, setPendingPasswordOperation] = useState<'delete' | 'suspend' | 'force-logout' | null>(null);

  // ============================================================================
  // Force Logout State
  // ============================================================================
  const [isForceLogoutConfirmModalOpen, setIsForceLogoutConfirmModalOpen] = useState(false);
  const [individualUserToForceLogout, setIndividualUserToForceLogout] = useState<User | null>(null);

  // ============================================================================
  // PHASE 5: User Editor Modal State
  // ============================================================================
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // ============================================================================
  // DATA FETCHING (useCallback - MUST be before conditional returns)
  // ============================================================================

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.pageSize.toString(),
        ...(filters.role && { role: filters.role }),
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { q: filters.search })
      });

      const response = await fetch(`/api/admin/users?${queryParams}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.data?.users ?? data.users ?? []);
        setPagination(prev => ({
          ...prev,
          total: data.data?.pagination?.total ?? data.pagination?.total ?? 0
        }));
      }
    } catch (error) {
      // Error handling
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, filters]);

  // ============================================================================
  // PHASE 2: Search Handlers (useCallback - MUST be before conditional returns)
  // ============================================================================

  const handleSearch = useCallback((query: string, mode: UserSearchMode) => {
    setSearchQuery(query);
    setSearchMode(mode);
    setIsDebouncing(false);
    setFilters(prev => ({ ...prev, search: query }));
    setPagination(prev => ({ ...prev, page: 1 }));

    if (query.trim()) {
      saveEntitySearchToHistory('users', query, mode);
      setSearchHistory(getEntitySearchHistory('users'));
    }
  }, []);

  const handleHistoryItemClick = useCallback((_query: string) => {
    // History already updated by handleSearch
  }, []);

  const handleClearHistory = useCallback(() => {
    clearEntitySearchHistory('users');
    setSearchHistory([]);
  }, []);

  const handleAdvancedFilterChange = useCallback((newFilters: UserAdvancedFilters) => {
    setAdvancedFilters(newFilters);
    setFilters(prev => ({
      ...prev,
      role: newFilters.role === 'all' ? '' : newFilters.role,
      status: newFilters.status === 'all' ? '' : newFilters.status
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleClearAdvancedFilters = useCallback(() => {
    setAdvancedFilters(DEFAULT_USER_FILTERS);
    setFilters(prev => ({
      ...prev,
      role: '',
      status: ''
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (advancedFilters.id) count++;
    if (advancedFilters.email) count++;
    if (advancedFilters.username) count++;
    if (advancedFilters.name) count++;
    if (advancedFilters.role !== 'all') count++;
    if (advancedFilters.status !== 'all') count++;
    return count;
  }, [advancedFilters]);

  // ============================================================================
  // PHASE 3: Batch Selection Handlers (useCallback - MUST be before conditional returns)
  // ============================================================================

  const handleCheckboxToggle = useCallback((userId: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const visibleIds = users.map(user => user.id);
    setSelectedIds(new Set(visibleIds));
  }, [users]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedUsers = useMemo(() => {
    return users.filter(user => selectedIds.has(user.id));
  }, [users, selectedIds]);

  /**
   * Handle bulk suspend from bar - PHASE 4.5: Opens password modal
   */
  const handleBulkSuspendFromBar = useCallback(() => {
    if (selectedIds.size === 0) return;

    setSuspendingIndividual(false);
    setIndividualUserToSuspend(null);
    setPendingSuspendOperation('batch');
    setPendingPasswordOperation('suspend');
    setIsPasswordModalOpen(true);
  }, [selectedIds]);

  /**
   * Handle bulk delete from bar - PHASE 4: Opens password modal
   */
  const handleBulkDeleteFromBar = useCallback(() => {
    if (selectedIds.size === 0) return;

    setDeletingIndividual(false);
    setIndividualUserToDelete(null);
    setPendingDeleteOperation('batch');
    setPendingPasswordOperation('delete');
    setIsPasswordModalOpen(true);
  }, [selectedIds]);

  // ============================================================================
  // PHASE 4: Password Verification & Delete Execution Handlers
  // ============================================================================

  /**
   * Handle password verification success - opens appropriate confirmation modal
   * Supports delete, suspend, and force-logout operations via pendingPasswordOperation
   */
  const handlePasswordVerified = useCallback(() => {
    setIsPasswordModalOpen(false);
    if (pendingPasswordOperation === 'suspend') {
      setIsSuspendConfirmModalOpen(true);
    } else if (pendingPasswordOperation === 'force-logout') {
      setIsForceLogoutConfirmModalOpen(true);
    } else {
      setIsDeleteConfirmModalOpen(true);
    }
  }, [pendingPasswordOperation]);

  /**
   * Close delete confirmation modal and reset state
   */
  const handleDeleteConfirmClose = useCallback(() => {
    setIsDeleteConfirmModalOpen(false);
    setDeletingIndividual(false);
    setIndividualUserToDelete(null);
    setPendingDeleteOperation(null);
    setPendingPasswordOperation(null);
  }, []);

  /**
   * Close suspend confirmation modal and reset state
   */
  const handleSuspendConfirmClose = useCallback(() => {
    setIsSuspendConfirmModalOpen(false);
    setSuspendingIndividual(false);
    setIndividualUserToSuspend(null);
    setPendingSuspendOperation(null);
    setPendingPasswordOperation(null);
  }, []);

  // ============================================================================
  // PHASE 5: User Editor Save Handler
  // ============================================================================

  /**
   * Handle user save (create or update) - refreshes table data
   */
  const handleUserSaved = useCallback(async () => {
    await fetchUsers();
    setEditorModalOpen(false);
    setEditingUser(null);
  }, [fetchUsers]);

  /**
   * Open editor for new user creation
   */
  const handleNewUser = useCallback(() => {
    setEditingUser(null);
    setEditorModalOpen(true);
  }, []);

  /**
   * Open editor for existing user - called from table action
   */
  const handleEditUserAction = useCallback((userId: number) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setEditingUser(user);
      setEditorModalOpen(true);
    }
  }, [users]);

  /**
   * Handle individual user delete - PHASE 4: Opens password modal
   * NOTE: MUST be before conditional returns to comply with Rules of Hooks
   */
  const handleDeleteUser = useCallback((userId: number) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    setDeletingIndividual(true);
    setIndividualUserToDelete(user);
    setPendingDeleteOperation('individual');
    setPendingPasswordOperation('delete');
    setIsPasswordModalOpen(true);
  }, [users]);

  /**
   * Handle individual user suspend - PHASE 4.5: Opens password modal
   * NOTE: MUST be before conditional returns to comply with Rules of Hooks
   */
  const handleSuspendUserWithPassword = useCallback((userId: number) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    setSuspendingIndividual(true);
    setIndividualUserToSuspend(user);
    setPendingSuspendOperation('individual');
    setPendingPasswordOperation('suspend');
    setIsPasswordModalOpen(true);
  }, [users]);

  /**
   * Handle individual user force logout - Opens password modal
   * NOTE: MUST be before conditional returns to comply with Rules of Hooks
   */
  const handleForceLogoutUser = useCallback((userId: number) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    setIndividualUserToForceLogout(user);
    setPendingPasswordOperation('force-logout');
    setIsPasswordModalOpen(true);
  }, [users]);

  /**
   * Close force logout confirmation modal and reset state
   */
  const handleForceLogoutConfirmClose = useCallback(() => {
    setIsForceLogoutConfirmModalOpen(false);
    setIndividualUserToForceLogout(null);
    setPendingPasswordOperation(null);
  }, []);

  // ============================================================================
  // useEffect hooks (MUST be after useCallback but before conditional returns)
  // ============================================================================

  useEffect(() => {
    // Only fetch if user is admin - conditional logic INSIDE the hook
    if (currentUser?.role === 'admin') {
      fetchUsers();
    }
  }, [currentUser, fetchUsers]);

  // Load search history on mount
  useEffect(() => {
    setSearchHistory(getEntitySearchHistory('users'));
  }, []);

  // Auto-refresh every 5 minutes (300000ms)
  useEffect(() => {
    if (currentUser?.role !== 'admin') return;

    const intervalId = setInterval(() => {
      fetchUsers();
    }, 300000); // 5 minutes

    return () => clearInterval(intervalId);
  }, [currentUser, fetchUsers]);

  // ============================================================================
  // TABLE CONFIGURATION (MUST be before conditional returns - React Rules of Hooks)
  // ============================================================================

  const columns: TableColumn<User>[] = useMemo(() => [
    // PHASE 3: Checkbox column for batch selection
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={users.length > 0 && selectedIds.size === users.length}
          onChange={() => {
            if (selectedIds.size === users.length) {
              handleClearSelection();
            } else {
              handleSelectAll();
            }
          }}
          className={`${isMobile ? 'w-6 h-6' : 'w-4 h-4'} rounded border-gray-300 text-orange-600 focus:ring-orange-500`}
          aria-label="Select all users"
        />
      ),
      accessor: (user) => (
        <input
          type="checkbox"
          checked={selectedIds.has(user.id)}
          onChange={() => handleCheckboxToggle(user.id)}
          onClick={(e) => e.stopPropagation()}
          className={`${isMobile ? 'w-6 h-6' : 'w-4 h-4'} rounded border-gray-300 text-orange-600 focus:ring-orange-500`}
          aria-label={`Select ${user.email}`}
        />
      ),
      sortable: false,
      width: isMobile ? '50px' : '40px'
    },
    // User ID column
    {
      key: 'id',
      header: 'ID',
      accessor: (user) => (
        <span className="text-gray-600 font-mono text-sm">#{user.id}</span>
      ),
      sortable: true,
      width: '70px'
    },
    {
      key: 'email',
      header: 'Email / Username',
      accessor: (user) => (
        <div>
          <div className="font-medium">
            <HighlightedText
              text={user.email}
              query={searchMode === 'email' || searchMode === 'all' ? searchQuery : ''}
            />
          </div>
          <div className="text-xs text-gray-500">
            @<HighlightedText
              text={user.username}
              query={searchMode === 'username' || searchMode === 'all' ? searchQuery : ''}
            />
          </div>
        </div>
      ),
      sortable: true
    },
    {
      key: 'name',
      header: 'Name',
      accessor: (user) => {
        const name = user.display_name ?? ((`${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()) || '-');
        return (
          <HighlightedText
            text={name}
            query={searchMode === 'all' ? searchQuery : ''}
          />
        );
      },
      sortValue: (user) => user.display_name ?? ((`${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()) || ''),
      sortable: true
    },
    {
      key: 'role',
      header: 'Role',
      accessor: (user) => {
        const role = user.role || 'general';
        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {role.toUpperCase()}
          </span>
        );
      },
      sortable: true
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (user) => {
        const statusColors: Record<string, string> = {
          active: 'bg-green-100 text-green-800',
          suspended: 'bg-orange-100 text-orange-700',
          banned: 'bg-red-200 text-red-900',
          pending: 'bg-yellow-100 text-yellow-800',
          deleted: 'bg-red-50 text-red-600'
        };

        const status = user.status || 'active';
        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[status] || statusColors.active}`}>
            {status.toUpperCase()}
          </span>
        );
      },
      sortable: true
    },
    {
      key: 'created_at',
      header: 'Created',
      accessor: (user) => new Date(user.created_at).toLocaleDateString(),
      sortable: true
    },
    {
      key: 'updated_at',
      header: 'Last Updated',
      accessor: (user) => user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'Never',
      sortable: true
    },
    {
      key: 'last_login_at',
      header: 'Last Login',
      accessor: (user) => user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never',
      sortable: true
    }
  ], [users.length, selectedIds, isMobile, handleClearSelection, handleSelectAll, handleCheckboxToggle, searchMode, searchQuery]);

  // ============================================================================
  // CONDITIONAL RETURNS (after ALL hooks)
  // ============================================================================

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (currentUser.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-600 font-medium">Access Denied: Admin privileges required</div>
      </div>
    );
  }

  // ============================================================================
  // ACTION HANDLERS
  // ============================================================================

  const handleViewUser = (username: string) => {
    window.open(`/profile/${username}`, '_blank');
  };

  const handleEditUser = (userId: number) => {
    handleEditUserAction(userId);
  };

  // Legacy confirm() handlers removed - now using password-protected modal flow:
  // - handleSuspendUserWithPassword (replaces handleSuspendUser)
  // - handleBulkSuspendFromBar (replaces handleBulkSuspend)
  // - handleBulkDeleteFromBar (replaces handleBulkDelete)

  const handleViewActivity = (user: User) => {
    setSelectedUser(user);
    setActivityModalOpen(true);
  };

  const actions: TableAction<User>[] = [
    {
      label: 'View',
      icon: <Eye className="w-4 h-4" />,
      iconOnly: true,
      onClick: (user) => handleViewUser(user.username)
    },
    {
      label: 'Edit',
      icon: <Edit2 className="w-4 h-4" />,
      iconOnly: true,
      onClick: (user) => handleEditUser(user.id)
    },
    {
      label: 'Activity',
      icon: <Clock className="w-4 h-4" />,
      iconOnly: true,
      onClick: handleViewActivity
    },
    {
      label: 'Log Off',
      icon: <LogOut className="w-4 h-4" />,
      iconOnly: true,
      onClick: (user) => handleForceLogoutUser(user.id),
      variant: 'warning'
    },
    {
      label: 'Suspend',
      icon: <EyeOff className="w-4 h-4" />,
      iconOnly: true,
      onClick: (user) => handleSuspendUserWithPassword(user.id),
      variant: 'warning'
    },
    {
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      iconOnly: true,
      onClick: (user) => handleDeleteUser(user.id),
      variant: 'danger'
    }
  ];

  // NOTE: bulkActions removed - we use custom checkbox column in columns definition
  // and BatchHandlingBar for actions UI instead of AdminTableTemplate's built-in bulk selection

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      {/* Header with title and action buttons - matches Categories Manager pattern */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">User Management</h1>
        <div className="flex gap-3">
          <button
            onClick={handleNewUser}
            className="px-4 py-2 bg-[#ed6437] text-white rounded hover:bg-[#d55a31]"
          >
            + New
          </button>
          <button
            onClick={() => setImportExportModalOpen(true)}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Import / Export
          </button>
        </div>
      </div>

      {/* Statistics - placed above search like Categories Manager */}
      <UserStatistics />

      {/* PHASE 2: Search and Filters - responsive layout */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-start mb-4">
        <div className="w-full md:max-w-[50%] relative">
          <UserSearch
            onSearch={handleSearch}
            searchHistory={searchHistory}
            onHistoryItemClick={handleHistoryItemClick}
            onClearHistory={handleClearHistory}
            isDebouncing={isDebouncing}
          />
        </div>
        <button
          onClick={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}
          className="flex items-center gap-2 min-h-[44px] px-4 py-2 bg-gray-100 hover:bg-gray-200 active:scale-95 rounded-md transition-all text-sm font-medium shrink-0 w-full md:w-auto justify-center md:justify-start"
        >
          <Filter className="w-4 h-4" />
          <span>Advanced Filters</span>
          {activeFilterCount > 0 && (
            <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">{activeFilterCount}</span>
          )}
          {isAdvancedFilterOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
      {/* Advanced Filters Expanded Panel */}
      {isAdvancedFilterOpen && (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-md space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">User ID (exact match)</label>
              <input
                type="number"
                value={advancedFilters.id}
                onChange={(e) => handleAdvancedFilterChange({ ...advancedFilters, id: e.target.value })}
                placeholder="e.g., 123"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email (partial match)</label>
              <input
                type="text"
                value={advancedFilters.email}
                onChange={(e) => handleAdvancedFilterChange({ ...advancedFilters, email: e.target.value })}
                placeholder="e.g., john@example"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Username (partial match)</label>
              <input
                type="text"
                value={advancedFilters.username}
                onChange={(e) => handleAdvancedFilterChange({ ...advancedFilters, username: e.target.value })}
                placeholder="e.g., john_doe"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name (partial match)</label>
              <input
                type="text"
                value={advancedFilters.name}
                onChange={(e) => handleAdvancedFilterChange({ ...advancedFilters, name: e.target.value })}
                placeholder="e.g., John Smith"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
              <select
                value={advancedFilters.role}
                onChange={(e) => handleAdvancedFilterChange({ ...advancedFilters, role: e.target.value as UserAdvancedFilters['role'] })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Roles</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                value={advancedFilters.status}
                onChange={(e) => handleAdvancedFilterChange({ ...advancedFilters, status: e.target.value as UserAdvancedFilters['status'] })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="banned">Banned</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Match Mode</label>
              <select
                value={advancedFilters.matchMode}
                onChange={(e) => handleAdvancedFilterChange({ ...advancedFilters, matchMode: e.target.value as 'all' | 'any' })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">Match All (AND)</option>
                <option value="any">Match Any (OR)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end pt-2 border-t border-gray-200">
            <button onClick={handleClearAdvancedFilters} className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded-md transition-colors">
              Clear All Filters
            </button>
          </div>
        </div>
      )}

      {/* Batch selection controls - matches Categories Manager pattern */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={handleSelectAll}
          className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          disabled={users.length === 0}
        >
          Select All ({users.length})
        </button>
        {selectedIds.size > 0 && (
          <button
            onClick={handleClearSelection}
            className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Clear Selection ({selectedIds.size})
          </button>
        )}
      </div>

      {/* Main content area - Table only (statistics moved above search) */}
      <div className="bg-white rounded shadow">
        {/* Table header with pagination controls and refresh button */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Users</h2>

          {/* Pagination controls */}
          <div className="flex items-center gap-4">
            {/* Page size dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Show</span>
              <select
                value={pagination.pageSize === pagination.total && pagination.total > 0 ? 'all' : pagination.pageSize}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'all') {
                    setPagination({ ...pagination, pageSize: pagination.total || 1000, page: 1 });
                  } else {
                    setPagination({ ...pagination, pageSize: parseInt(value), page: 1 });
                  }
                }}
                className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value="all">All</option>
              </select>
            </div>

            {/* Results range indicator */}
            <span className="text-sm text-gray-600">
              Showing {pagination.total === 0 ? 0 : ((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} results
            </span>

            {/* Page navigation */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1 || loading}
                className="p-1.5 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                title="Previous page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">
                Page {pagination.page} of {Math.max(1, Math.ceil(pagination.total / pagination.pageSize))}
              </span>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize) || loading}
                className="p-1.5 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                title="Next page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>

            {/* Refresh button */}
            <button
              onClick={() => fetchUsers()}
              disabled={loading}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh users"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        <AdminTableTemplate<User>
          title=""
          data={users}
          columns={columns}
          rowKey={(row) => row.id}
          actions={actions}
          loading={loading}
          searchable={false}
          pagination={{
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onPageChange: (page) => setPagination({ ...pagination, page })
          }}
          emptyMessage="No users found"
        />
      </div>

      {/* Activity Log Modal */}
      {selectedUser && (
        <ActivityLogModal
          user={selectedUser}
          isOpen={activityModalOpen}
          onClose={() => {
            setActivityModalOpen(false);
            setSelectedUser(null);
          }}
        />
      )}

      {/* PHASE 3: Batch handling bar */}
      <BatchHandlingBar
        selectedCount={selectedIds.size}
        isMobile={isMobile}
        onBulkEdit={() => {
          // Phase 5: For single selection, open editor
          if (selectedIds.size === 1) {
            const userId = Array.from(selectedIds)[0];
            if (userId !== undefined) {
              handleEditUserAction(userId);
            }
          } else {
            alert(`Bulk edit for ${selectedIds.size} users - Coming in future phase`);
          }
        }}
        onBulkSuspend={handleBulkSuspendFromBar}
        onBulkDelete={handleBulkDeleteFromBar}
        onClearSelection={handleClearSelection}
      />

      {/* PHASE 4: Admin Password Modal - Supports both delete and suspend operations */}
      {/* NOTE: onClose should NOT reset operation state - only close the modal.
          State is preserved so the confirmation modal can use it.
          State is only reset when user explicitly cancels in the confirmation modal
          or when the operation completes. */}
      <AdminPasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          // DO NOT reset operation state here - it causes race condition with password manager autofill
          // State will be reset by handleDeleteConfirmClose or handleSuspendConfirmClose
        }}
        onVerified={handlePasswordVerified}
        operationDescription={
          pendingPasswordOperation === 'suspend'
            ? pendingSuspendOperation === 'individual'
              ? `suspend user ${individualUserToSuspend?.email ?? ''}`
              : `suspend ${selectedIds.size} user${selectedIds.size !== 1 ? 's' : ''}`
            : pendingPasswordOperation === 'force-logout'
              ? `force logout user ${individualUserToForceLogout?.email ?? ''}`
              : pendingDeleteOperation === 'individual'
                ? `delete user ${individualUserToDelete?.email ?? ''}`
                : `delete ${selectedIds.size} user${selectedIds.size !== 1 ? 's' : ''}`
        }
      />

      {/* PHASE 4: Delete Confirmation Modal - Refactored to match categories pattern */}
      <DeleteConfirmationModal
        isOpen={isDeleteConfirmModalOpen}
        selectedUsers={selectedUsers}
        deletingIndividual={deletingIndividual}
        individualUser={individualUserToDelete}
        onClose={handleDeleteConfirmClose}
        onExecute={async () => {
          // Refresh data and clear selection after successful delete
          await fetchUsers();
          setSelectedIds(new Set());
        }}
      />

      {/* PHASE 4.5: Suspend Confirmation Modal - Matches delete pattern */}
      <SuspendConfirmationModal
        isOpen={isSuspendConfirmModalOpen}
        selectedUsers={selectedUsers}
        suspendingIndividual={suspendingIndividual}
        individualUser={individualUserToSuspend}
        onClose={handleSuspendConfirmClose}
        onExecute={async () => {
          // Refresh data and clear selection after successful suspend
          await fetchUsers();
          setSelectedIds(new Set());
        }}
      />

      {/* Force Logout Confirmation Modal */}
      <ForceLogoutConfirmationModal
        isOpen={isForceLogoutConfirmModalOpen}
        user={individualUserToForceLogout}
        onClose={handleForceLogoutConfirmClose}
        onExecute={async () => {
          // Refresh data after successful force logout
          await fetchUsers();
        }}
      />

      {/* PHASE 5: User Editor Modal */}
      <UserEditorModal
        user={editingUser}
        isOpen={editorModalOpen}
        onClose={() => {
          setEditorModalOpen(false);
          setEditingUser(null);
        }}
        onSave={handleUserSaved}
      />

      {/* PHASE 6: Import/Export Modal */}
      <UserImportExportModal
        isOpen={importExportModalOpen}
        onClose={() => setImportExportModalOpen(false)}
        users={users}
        selectedIds={selectedIds}
        onImportComplete={async () => {
          await fetchUsers();
          setImportExportModalOpen(false);
        }}
      />
    </>
  );
}

/**
 * AdminUsersPage - Error boundary wrapper for user management
 * @phase Phase R4.2 - Error Boundary Implementation
 */
export default function AdminUsersPage() {
  return (
    <ErrorBoundary
      fallback={
        <ErrorFallback
          title="User Management Error"
          message="Unable to load user management interface. Please try again."
        />
      }
      isolate={true}
      componentName="AdminUsersPage"
    >
      <AdminUsersPageContent />
    </ErrorBoundary>
  );
}
