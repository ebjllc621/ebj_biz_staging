/**
 * Admin Listing Management Page (Shell-Integrated)
 *
 * SHELL INTEGRATION NOTE:
 * This page renders inside AdminShell which provides p-6 padding.
 * Uses fragment wrapper instead of div.p-6 to avoid double padding.
 *
 * Preserved version: /admin/listings-basic (standalone with own padding)
 *
 * @authority PHASE_4_LISTINGS_PRESERVATION_BRAIN_PLAN.md
 *
 * GOVERNANCE COMPLIANCE:
 * - Template: AdminTableTemplate (MANDATORY)
 * - Authentication: Admin-only access required
 * - Service Boundary: NO direct database access (API routes only)
 * - Credentials: 'include' for all fetch requests
 * - Complexity: STANDARD tier
 *
 * Features:
 * - Listing table with pagination (20 per page)
 * - Filters: tier, status
 * - Search: listing name, owner
 * - Moderation workflow: Approve, Reject
 * - CRUD operations: View, Edit, Delete
 * - Bulk actions: Approve, Reject, Delete
 *
 * @component
 * @returns {JSX.Element} Admin listing management interface
 */

'use client';


// Force dynamic rendering (required for useAuth() - React Context cannot be used in SSG)
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, memo, useRef, useMemo } from 'react';
import { AdminTableTemplate, TableColumn, TableAction } from '@/components/admin/templates/AdminTableTemplate';
import { BizModal, BizModalButton } from '@/components/ui/BizModal';
import { useAuth } from '@core/hooks/useAuth';
import { useIsMobile } from '@core/hooks/useMediaQuery';
import { fetchWithCsrf } from '@core/utils/csrf';
import { KeywordBadges } from '@/components/admin/KeywordBadges';
import { HighlightedText } from '@/components/common/HighlightedText';
import {
  detectListingSearchMode,
  type ListingSearchMode
} from '@core/utils/search';
import {
  getEntitySearchHistory,
  saveEntitySearchToHistory,
  clearEntitySearchHistory,
  type SearchHistoryEntry
} from '@core/utils/searchHistory';
import { Eye, EyeOff, Edit2, Clock, PauseCircle, Trash2, CheckCircle, XCircle, X, AlertTriangle, Search, Filter, ChevronUp, ChevronDown, ChevronsLeft, ChevronsRight, RefreshCw } from 'lucide-react';
import { NewListingModal } from '@features/listings/components/NewListingModal';
import { EditListingModal } from '@features/listings/components/EditListingModal';
import { ErrorService } from '@core/services/ErrorService';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Listing interface for admin management
 * @phase Phase 2 - Extended Columns (14 columns)
 * @governance Matches database schema from Phase 0 verification
 * @updated 2026-02-01 - Added claimed, created_at, mock per ListingsManagerReference.md
 */
interface Listing {
  // Primary Identity
  id: number;
  name: string;
  slug: string;
  type: string;

  // Tier & Status - CORRECTED ENUMS
  tier: 'essentials' | 'plus' | 'preferred' | 'premium';
  status: 'active' | 'inactive' | 'pending' | 'suspended' | 'draft' | 'paused';
  approved: 'pending' | 'approved' | 'rejected';

  // Ownership & Claiming
  user_id: number | null;
  user_email: string;
  user_name: string;
  claimed: boolean;              // NEW - TINYINT(1) converted to boolean

  // Media
  logo_url: string | null;

  // Categorization
  add_ons: string[] | null;
  category_id: number | null;
  category_name: string | null;
  active_categories: number[] | null;
  bank_categories: number[] | null;
  active_category_names: string[] | null;  // Resolved names for display
  bank_category_names: string[] | null;    // Resolved names for display

  // Description
  description: string | null;

  // Location
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;

  // Contact Information
  email: string | null;
  phone: string | null;
  website: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;

  // Timestamps
  last_update: string;
  created_at: string;            // Used for "Created" column

  // Data Flags
  mock: boolean;                 // NEW - TINYINT(1) converted to boolean
}

/**
 * Form data for listing editor modal
 * @phase Phase 5 - Listing Editor Modal
 */
interface ListingFormData {
  // Identity
  name: string;
  slug: string;
  type: string;

  // Classification
  tier: 'essentials' | 'plus' | 'preferred' | 'premium';
  status: 'active' | 'inactive' | 'pending' | 'suspended' | 'draft' | 'paused';
  approved: 'pending' | 'approved' | 'rejected';

  // Ownership
  user_id: number | null;
  claimed: boolean;

  // Categorization
  category_id: number | null;

  // Content
  description: string;

  // Location
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;

  // Contact
  email: string;
  phone: string;
  website: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;

  // Flags
  mock: boolean;
}

/**
 * Default form values for new listing
 */
const DEFAULT_LISTING_FORM: ListingFormData = {
  name: '',
  slug: '',
  type: 'Standard',
  tier: 'essentials',
  status: 'pending',
  approved: 'pending',
  user_id: null,
  claimed: false,
  category_id: null,
  description: '',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  country: 'US',
  email: '',
  phone: '',
  website: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  mock: false
};

/**
 * Category option for dropdown
 */
interface CategoryOption {
  id: number;
  name: string;
}

/**
 * User option for owner dropdown
 */
interface UserOption {
  id: number;
  email: string;
  display_name: string | null;
}

interface ListingStats {
  total: number;
  active_30d: number;
  unclaimed: number;
  claims_awaiting_approval: number;
  by_tier: {
    essentials: number;
    plus: number;
    preferred: number;
    premium: number;
  };
  by_status: {
    active: number;
    inactive: number;
    pending: number;
    suspended: number;
    draft: number;
    paused: number;
  };
}

// ============================================================================
// PHASE 8: Activity Log Types
// ============================================================================

/**
 * Activity log entry from admin_activity table
 * @phase Phase 8 - Activity Log Modal
 */
interface ActivityLogEntry {
  id: number;
  action: string;
  details: string;
  admin_id: number;
  ip_address: string;
  created_at: string;
  severity: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Convert listing type ID/code to human-readable name
 * @param type - Type ID (1-6) or string code
 * @returns Human-readable type name
 */
const getTypeLabel = (type?: string | number | null): string => {
  if (!type) return 'Standard';
  const typeStr = typeof type === 'number' ? String(type) : type;
  const typeMap: Record<string, string> = {
    '1': 'Business',
    '2': 'Non-Profit',
    '3': 'Government',
    '4': 'Professional Association',
    '5': 'Other Group',
    '6': 'Creator',
    business: 'Business',
    nonProfit: 'Non-Profit',
    government: 'Government',
    professionalAssociation: 'Professional Association',
    otherGroup: 'Other Group',
    creator: 'Creator',
  };
  return typeMap[typeStr] || typeStr.charAt(0).toUpperCase() + typeStr.slice(1);
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * ListingStatistics Component
 * Displays platform-wide listing statistics above the table
 * @governance PHASE_1_STATISTICS_BRAIN_PLAN.md
 */
const ListingStatistics = memo(function ListingStatistics() {
  const [stats, setStats] = useState<ListingStats>({
    total: 0,
    active_30d: 0,
    unclaimed: 0,
    claims_awaiting_approval: 0,
    by_tier: { essentials: 0, plus: 0, preferred: 0, premium: 0 },
    by_status: { active: 0, inactive: 0, pending: 0, suspended: 0, draft: 0, paused: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/admin/listings/statistics', {
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
        {/* Skeleton loading for statistics - horizontal layout */}
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
      <h3 className="font-medium mb-3">Listing Statistics</h3>
      <div className="grid grid-cols-3 gap-4">
        {/* Totals Section */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Total Listings:</span>
            <span className="font-medium">{stats.total}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Active (30d):</span>
            <span className="font-medium">{stats.active_30d}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Unclaimed:</span>
            <span>{stats.unclaimed}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Claims Awaiting Approval:</span>
            <span className="font-bold">{stats.claims_awaiting_approval}</span>
          </div>
        </div>
        {/* By Tier Section */}
        <div className="border-l pl-4">
          <div className="text-sm font-medium mb-1">By Tier:</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Essentials:</span>
              <span>{stats.by_tier.essentials}</span>
            </div>
            <div className="flex justify-between">
              <span>Plus:</span>
              <span>{stats.by_tier.plus}</span>
            </div>
            <div className="flex justify-between">
              <span>Preferred:</span>
              <span>{stats.by_tier.preferred}</span>
            </div>
            <div className="flex justify-between">
              <span>Premium:</span>
              <span>{stats.by_tier.premium}</span>
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
              <span>Inactive:</span>
              <span>{stats.by_status.inactive}</span>
            </div>
            <div className="flex justify-between">
              <span>Pending:</span>
              <span>{stats.by_status.pending}</span>
            </div>
            <div className="flex justify-between">
              <span>Suspended:</span>
              <span>{stats.by_status.suspended}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

/**
 * Moderation Modal Component
 * Handles approve/reject actions with optional reason
 */
function ModerationModal({
  listing,
  action,
  isOpen,
  onClose,
  onConfirm
}: {
  listing: Listing;
  action: 'approve' | 'reject';
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = () => {
    if (action === 'reject' && !reason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    setSubmitting(true);
    onConfirm(reason);
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={`${action === 'approve' ? 'Approve' : 'Reject'} Listing`}
      size="small"
    >
      <div className="space-y-4">
        <p>
          {action === 'approve' ? 'Approve' : 'Reject'} listing <strong>{listing.name}</strong>?
        </p>

        {action === 'reject' && (
          <div>
            <label className="block text-sm font-medium mb-1">Rejection Reason *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              rows={3}
              placeholder="Explain why this listing is being rejected..."
              required
            />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <BizModalButton variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </BizModalButton>
          <BizModalButton
            variant={action === 'approve' ? 'primary' : 'danger'}
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? 'Processing...' : action === 'approve' ? 'Approve' : 'Reject'}
          </BizModalButton>
        </div>
      </div>
    </BizModal>
  );
}

// ============================================================================
// PHASE 4: AdminPasswordModal Component
// ============================================================================

/**
 * AdminPasswordModal - Password verification gate for destructive operations
 * Pattern from Users Manager with unique ID to avoid conflicts
 *
 * @tier STANDARD
 * @phase Phase 4 - Password Verification Gate
 * @pattern 3-strike lockout with countdown timer
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
          <label htmlFor="admin-password-listings" className="block text-sm font-medium text-gray-700 mb-1">
            Admin Password
          </label>
          <div className="relative">
            <input
              id="admin-password-listings"
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
// PHASE 4.5: DeleteConfirmationModal Component
// ============================================================================

/**
 * DeleteConfirmationModal - Final confirmation before listing deletion
 * Shows listing details and executes delete API internally
 *
 * @tier STANDARD
 * @phase Phase 4.5 - Confirmation Modals
 * @see src/app/admin/users/page.tsx (lines 801-949) - Reference implementation
 */
function DeleteConfirmationModal({
  isOpen,
  selectedListings,
  deletingIndividual,
  individualListing,
  onClose,
  onExecute
}: {
  isOpen: boolean;
  selectedListings: Listing[];
  deletingIndividual: boolean;
  individualListing: Listing | null;
  onClose: () => void;
  onExecute: () => void;  // Called after successful delete to refresh data
}) {
  const [submitting, setSubmitting] = useState(false);

  // Determine which listings to delete
  const listingsToDelete = deletingIndividual && individualListing
    ? [individualListing]
    : selectedListings;

  const count = listingsToDelete.length;
  const isBatch = !deletingIndividual && count > 0;

  /**
   * Handle delete execution - makes API call internally
   */
  const handleExecute = async () => {
    if (listingsToDelete.length === 0) {
      return;
    }

    setSubmitting(true);
    try {
      if (deletingIndividual && individualListing) {
        // Individual delete
        const response = await fetchWithCsrf(`/api/admin/listings/${individualListing.id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          onExecute();  // Refresh data
          onClose();    // Close modal
        } else {
          const error = await response.json();
          alert(error.error?.message ?? 'Failed to delete listing');
        }
      } else {
        // Batch delete
        const listingIds = listingsToDelete.map(l => l.id);
        const response = await fetchWithCsrf('/api/admin/listings/bulk-delete', {
          method: 'POST',
          body: JSON.stringify({ listingIds })
        });

        if (response.ok) {
          onExecute();  // Refresh data
          onClose();    // Close modal
        } else {
          const error = await response.json();
          alert(error.error?.message ?? 'Failed to delete listings');
        }
      }
    } catch {
      alert('Error deleting listing(s). Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={isBatch ? `Delete ${count} Listings` : 'Delete Listing'}
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
                ? `${count} listings will be permanently deleted.`
                : 'This listing will be permanently deleted.'}
            </p>
          </div>
        </div>

        {/* Listing list */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            {isBatch ? 'Listings to be deleted:' : 'Listing to be deleted:'}
          </p>
          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
            {listingsToDelete.slice(0, 10).map((listing) => (
              <div
                key={listing.id}
                className="px-3 py-2 border-b border-gray-100 last:border-b-0 flex items-center justify-between"
              >
                <div>
                  <span className="text-sm font-medium text-gray-900">{listing.name}</span>
                  <span className="text-xs text-gray-500 ml-2">#{listing.id}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  listing.tier === 'premium' ? 'bg-amber-100 text-amber-700' :
                  listing.tier === 'preferred' ? 'bg-purple-100 text-purple-700' :
                  listing.tier === 'plus' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {listing.tier}
                </span>
              </div>
            ))}
            {count > 10 && (
              <div className="px-3 py-2 text-xs text-gray-500 italic">
                ... and {count - 10} more listings
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
                ? `Delete ${count} Listings`
                : 'Delete Listing'}
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
 * Shows listing details and requires suspension reason
 *
 * @tier STANDARD
 * @phase Phase 4.5 - Confirmation Modals
 * @see src/app/admin/users/page.tsx (lines 965-1138) - Reference implementation
 */
function SuspendConfirmationModal({
  isOpen,
  selectedListings,
  suspendingIndividual,
  individualListing,
  onClose,
  onExecute
}: {
  isOpen: boolean;
  selectedListings: Listing[];
  suspendingIndividual: boolean;
  individualListing: Listing | null;
  onClose: () => void;
  onExecute: () => void;  // Called after successful suspend to refresh data
}) {
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState('Suspended by admin');

  // Determine which listings to suspend
  const listingsToSuspend = suspendingIndividual && individualListing
    ? [individualListing]
    : selectedListings;

  const count = listingsToSuspend.length;
  const isBatch = !suspendingIndividual && count > 0;

  // Reset reason when modal opens
  useEffect(() => {
    if (isOpen) {
      setReason('Suspended by admin');
    }
  }, [isOpen]);

  /**
   * Handle suspend execution - makes API call internally
   */
  const handleExecute = async () => {
    if (listingsToSuspend.length === 0) {
      return;
    }

    setSubmitting(true);
    try {
      if (suspendingIndividual && individualListing) {
        // Individual suspend
        const response = await fetchWithCsrf(`/api/admin/listings/${individualListing.id}/suspend`, {
          method: 'PATCH',
          body: JSON.stringify({ action: 'suspend', reason })
        });

        if (response.ok) {
          onExecute();  // Refresh data
          onClose();    // Close modal
        } else {
          const error = await response.json();
          alert(error.error?.message ?? 'Failed to suspend listing');
        }
      } else {
        // Batch suspend
        const listingIds = listingsToSuspend.map(l => l.id);
        const response = await fetchWithCsrf('/api/admin/listings/batch-update', {
          method: 'POST',
          body: JSON.stringify({ listingIds, updates: { status: 'suspended' } })
        });

        if (response.ok) {
          onExecute();  // Refresh data
          onClose();    // Close modal
        } else {
          const error = await response.json();
          alert(error.error?.message ?? 'Failed to suspend listings');
        }
      }
    } catch {
      alert('Error suspending listing(s). Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={isBatch ? `Suspend ${count} Listings` : 'Suspend Listing'}
      size="medium"
    >
      <div className="space-y-4">
        {/* Warning */}
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-md flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-orange-800">
              Listing Suspension
            </p>
            <p className="text-xs text-orange-700 mt-1">
              {isBatch
                ? `${count} listings will be suspended and hidden from public view.`
                : 'This listing will be suspended and hidden from public view.'}
            </p>
          </div>
        </div>

        {/* Reason input */}
        <div>
          <label htmlFor="suspend-reason-listing" className="block text-sm font-medium text-gray-700 mb-1">
            Suspension Reason
          </label>
          <input
            id="suspend-reason-listing"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={submitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
            placeholder="Enter suspension reason"
          />
        </div>

        {/* Listing list */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            {isBatch ? 'Listings to be suspended:' : 'Listing to be suspended:'}
          </p>
          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
            {listingsToSuspend.slice(0, 10).map((listing) => (
              <div
                key={listing.id}
                className="px-3 py-2 border-b border-gray-100 last:border-b-0 flex items-center justify-between"
              >
                <div>
                  <span className="text-sm font-medium text-gray-900">{listing.name}</span>
                  <span className="text-xs text-gray-500 ml-2">#{listing.id}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  listing.status === 'active' ? 'bg-green-100 text-green-700' :
                  listing.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {listing.status}
                </span>
              </div>
            ))}
            {count > 10 && (
              <div className="px-3 py-2 text-xs text-gray-500 italic">
                ... and {count - 10} more listings
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
                ? `Suspend ${count} Listings`
                : 'Suspend Listing'}
          </BizModalButton>
        </div>
      </div>
    </BizModal>
  );
}

// ============================================================================
// PHASE 7: ListingImportExportModal Component
// ============================================================================

/**
 * ListingImportExportModal - Tab-based import/export modal
 * @tier ADVANCED
 * @phase Phase 7 - Import/Export Functionality
 * @see src/app/admin/users/page.tsx (lines 1557-1930) - Reference implementation
 */
function ListingImportExportModal({
  isOpen,
  onClose,
  listings,
  selectedIds,
  onImportComplete
}: {
  isOpen: boolean;
  onClose: () => void;
  listings: Listing[];
  selectedIds: Set<number>;
  onImportComplete: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'sql'>('json');
  const [exportScope, setExportScope] = useState<'all' | 'selected'>('all');
  const [isExporting, setIsExporting] = useState(false);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importFormat, setImportFormat] = useState<'json' | 'csv' | 'sql' | null>(null);
  const [importPreview, setImportPreview] = useState<ListingImportPreviewResult | null>(null);
  const [conflictResolution, setConflictResolution] = useState<'skip' | 'overwrite' | 'rename' | 'update_existing'>('skip');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [showFormatExamples, setShowFormatExamples] = useState(false);
  const [showAllErrorsModal, setShowAllErrorsModal] = useState(false);
  const [importResult, setImportResult] = useState<ImportExecutionResult | null>(null);
  const [showSkippedRecordsModal, setShowSkippedRecordsModal] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setImportFile(null);
      setImportFormat(null);
      setImportPreview(null);
      setImportError(null);
      setShowFormatExamples(false);
      setShowAllErrorsModal(false);
      setImportResult(null);
      setShowSkippedRecordsModal(false);
      setConflictResolution('skip'); // Reset to default on modal close
    }
  }, [isOpen]);

  // Helper function to categorize errors by type
  const categorizeErrors = useCallback((errors: Array<{ row: number; field: string; message: string }>) => {
    const categories: Record<string, number> = {};

    errors.forEach(err => {
      // Determine error category from message
      let category = 'Other';
      const msg = err.message.toLowerCase();

      if (msg.includes('duplicate listing') || msg.includes('duplicate name') || msg.includes('duplicate slug')) {
        category = 'Duplicate';
      } else if (msg.includes('name too short') || msg.includes('name too long') || msg.includes('name is required')) {
        category = 'Name';
      } else if (msg.includes('email')) {
        category = 'Email';
      } else if (msg.includes('slug')) {
        category = 'Slug';
      } else if (msg.includes('tier')) {
        category = 'Tier';
      } else if (msg.includes('status')) {
        category = 'Status';
      } else if (msg.includes('approval') || msg.includes('approved')) {
        category = 'Approval';
      } else if (msg.includes('website') || msg.includes('url')) {
        category = 'Website';
      } else if (msg.includes('zip')) {
        category = 'ZIP Code';
      }

      categories[category] = (categories[category] || 0) + 1;
    });

    return categories;
  }, []);

  // Format error breakdown string
  const getErrorBreakdown = useCallback((errors: Array<{ row: number; field: string; message: string }>) => {
    const categories = categorizeErrors(errors);
    return Object.entries(categories)
      .sort((a, b) => b[1] - a[1]) // Sort by count descending
      .map(([type, count]) => `${type} (${count})`)
      .join(', ');
  }, [categorizeErrors]);

  // Helper function to categorize skipped records by reason
  const categorizeSkippedRecords = useCallback((records: Array<{ row: number; name: string; reason: string }>) => {
    const categories: Record<string, Array<{ row: number; name: string; reason: string }>> = {
      'Name Conflict': [],
      'Slug Conflict': [],
      'Missing Name': [],
      'Other': []
    };

    records.forEach(record => {
      const reason = record.reason.toLowerCase();
      if (reason.includes('duplicate name') || reason.includes('matches existing listing')) {
        categories['Name Conflict']!.push(record);
      } else if (reason.includes('duplicate slug') || reason.includes('slug')) {
        categories['Slug Conflict']!.push(record);
      } else if (reason.includes('missing') || reason.includes('empty name')) {
        categories['Missing Name']!.push(record);
      } else {
        categories['Other']!.push(record);
      }
    });

    return categories;
  }, []);

  // Format skipped records breakdown string
  const getSkippedBreakdown = useCallback((records: Array<{ row: number; name: string; reason: string }>) => {
    const categories = categorizeSkippedRecords(records);
    return Object.entries(categories)
      .filter(([, items]) => items.length > 0)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([type, items]) => `${type}: ${items.length}`)
      .join(' | ');
  }, [categorizeSkippedRecords]);

  // Export handler - calls backend API for ALL 58 database fields
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      if (exportScope === 'selected' && selectedIds.size === 0) {
        alert('No listings selected for export');
        setIsExporting(false);
        return;
      }

      // Build API URL with parameters
      const params = new URLSearchParams({
        format: exportFormat,
        scope: exportScope
      });

      if (exportScope === 'selected') {
        params.set('ids', Array.from(selectedIds).join(','));
      }

      // Call export API (returns ALL 58 database fields)
      const response = await fetchWithCsrf(`/api/admin/listings/export?${params.toString()}`, {
        method: 'GET'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Export failed');
      }

      const data = await response.json();
      const { content, contentType, filename } = data.data;

      // Download the file
      downloadFile(content, filename, contentType);
    } catch (error) {
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  }, [selectedIds, exportScope, exportFormat]);

  // File selection handler
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !['json', 'csv', 'sql'].includes(extension)) {
      setImportError('Invalid file type. Please upload .json, .csv, or .sql file.');
      return;
    }

    // Check file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setImportError('File too large. Maximum size is 10MB.');
      return;
    }

    setImportFile(file);
    setImportFormat(extension as 'json' | 'csv' | 'sql');
    setImportError(null);

    try {
      const content = await readFileAsText(file);
      await handleImportPreview(extension as 'json' | 'csv' | 'sql', content);
    } catch (error) {
      setImportError(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  // Import preview handler
  const handleImportPreview = useCallback(async (format: 'json' | 'csv' | 'sql', content: string) => {
    setIsImporting(true);
    setImportError(null);

    try {
      const response = await fetchWithCsrf('/api/admin/listings/import/preview', {
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
  }, []);

  // Import execution handler
  const handleImportExecute = useCallback(async () => {
    if (!importFile || !importFormat) {
      setImportError('No file selected');
      return;
    }

    setIsImporting(true);
    setImportError(null);

    try {
      const content = await readFileAsText(importFile);

      const response = await fetchWithCsrf('/api/admin/listings/import', {
        method: 'POST',
        body: JSON.stringify({ format: importFormat, content, conflictResolution })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Import failed');
      }

      const data = await response.json();
      const result = data.data as ImportExecutionResult;

      // Store result for display instead of alert
      // NOTE: Do NOT call onImportComplete() here - wait for user to dismiss result
      setImportResult(result);
      setImportFile(null);
      setImportFormat(null);
      setImportPreview(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // Check for timeout errors - import may have succeeded
      if (errorMessage.toLowerCase().includes('timeout') || errorMessage.includes('408')) {
        setImportError(
          'Request timed out. For large imports, the operation may have completed successfully. ' +
          'Please close this modal, refresh the page, and check if your listings were imported.'
        );
      } else {
        setImportError(errorMessage);
      }
    } finally {
      setIsImporting(false);
    }
  }, [importFile, importFormat, conflictResolution, onImportComplete]);

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Import / Export Listings"
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
              <strong>Warning:</strong> Exported files may contain owner emails and contact information. Handle securely and do not share publicly.
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
                All Listings ({listings.length})
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
              <strong>Note:</strong> Imported listings will be set to &quot;pending&quot; status by default and require approval.
            </p>
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

          {/* Format Examples - Collapsible */}
          <div className="border border-gray-200 rounded-md">
            <button
              type="button"
              onClick={() => setShowFormatExamples(!showFormatExamples)}
              className="w-full px-4 py-3 flex items-center justify-between text-left bg-gray-50 hover:bg-gray-100 rounded-t-md"
            >
              <span className="text-sm font-medium text-gray-700">
                📋 Format Examples & Required Fields
              </span>
              <svg
                className={`w-4 h-4 text-gray-500 transform transition-transform ${showFormatExamples ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showFormatExamples && (
              <div className="p-4 space-y-4 text-sm border-t border-gray-200 max-h-[60vh] overflow-y-auto">
                {/* Import Defaults Notice */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-800">
                  <strong>Import Defaults:</strong>
                  <ul className="mt-1 ml-4 list-disc text-xs">
                    <li><code>claimed</code>: false (unclaimed) - preserves existing if overwriting claimed record</li>
                    <li><code>approved</code>: &quot;pending&quot; - preserves existing if overwriting approved record</li>
                    <li><code>mock</code>: false (live data)</li>
                    <li><code>status</code>: &quot;active&quot; - unless specified</li>
                  </ul>
                </div>

                {/* ALL 58 Database Fields Reference */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded text-blue-800">
                  <strong>📋 All 58 Database Fields (Export includes ALL):</strong>
                  <div className="mt-2 text-xs font-mono grid grid-cols-3 gap-1">
                    <span>id</span><span>user_id</span><span>name</span>
                    <span>slug</span><span>description</span><span>type</span>
                    <span>year_established</span><span>employee_count</span><span>email</span>
                    <span>phone</span><span>website</span><span>address</span>
                    <span>city</span><span>state</span><span>zip_code</span>
                    <span>country</span><span>latitude</span><span>longitude</span>
                    <span>category_id</span><span>logo_url</span><span>cover_image_url</span>
                    <span>gallery_images</span><span>video_url</span><span>audio_url</span>
                    <span>business_hours</span><span>social_media</span><span>features</span>
                    <span>amenities</span><span>tier</span><span>add_ons</span>
                    <span>claimed</span><span>status</span><span>approved</span>
                    <span>mock</span><span>meta_title</span><span>meta_description</span>
                    <span>meta_keywords</span><span>custom_fields</span><span>metadata</span>
                    <span>contact_name</span><span>contact_email</span><span>contact_phone</span>
                    <span>annual_revenue</span><span>certifications</span><span>languages_spoken</span>
                    <span>payment_methods</span><span>view_count</span><span>click_count</span>
                    <span>favorite_count</span><span>import_source</span><span>import_date</span>
                    <span>import_batch_id</span><span>keywords</span><span>slogan</span>
                    <span>date_created</span><span>last_update</span><span>created_at</span>
                    <span>updated_at</span><span>category_name*</span><span>owner_email*</span>
                  </div>
                  <p className="text-xs mt-2 text-blue-600">* Derived fields included in export for reference</p>
                </div>

                {/* CSV Format */}
                <div>
                  <h5 className="font-medium text-gray-800 mb-2">CSV Format (Minimum Required)</h5>
                  <p className="text-xs text-gray-600 mb-2">
                    First row = headers. Required: <code className="bg-gray-100 px-1">name</code>. All 58 fields supported.
                  </p>
                  <div className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto font-mono">
                    <div className="whitespace-nowrap text-green-400">
                      {/* Common fields header */}
                      name,slug,type,tier,status,description,address,city,state,zip_code,country,email,phone,website,category_id,year_established,employee_count,latitude,longitude,contact_name,contact_email,contact_phone,meta_title,meta_description,keywords,slogan,claimed,mock
                    </div>
                    <div className="whitespace-nowrap text-gray-600 mt-1">
                      &quot;Acme Corp&quot;,acme-corp,Business,essentials,active,&quot;A great company&quot;,&quot;123 Main St&quot;,Denver,CO,80202,US,info@acme.com,555-1234,https://acme.com,5,2010,50,39.7392,-104.9903,&quot;John Doe&quot;,john@acme.com,555-5678,&quot;Acme Corp - Business&quot;,&quot;Description here&quot;,&quot;business,local&quot;,&quot;Your trusted partner&quot;,false,false
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    <strong>Tip:</strong> Export first to see all available columns, then modify and re-import.
                  </p>
                </div>

                {/* JSON Format */}
                <div>
                  <h5 className="font-medium text-gray-800 mb-2">JSON Format (Full Example)</h5>
                  <p className="text-xs text-gray-600 mb-2">
                    Array of objects. All 58 fields supported. Only <code className="bg-gray-100 px-1">name</code> required.
                  </p>
                  <div className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto font-mono max-h-48 overflow-y-auto">
                    <pre className="whitespace-pre">{`[
  {
    "name": "Acme Corp",
    "slug": "acme-corp",
    "type": "Business",
    "tier": "essentials",
    "status": "active",
    "description": "A great company",
    "year_established": 2010,
    "employee_count": 50,
    "email": "info@acme.com",
    "phone": "555-1234",
    "website": "https://acme.com",
    "address": "123 Main St",
    "city": "Denver",
    "state": "CO",
    "zip_code": "80202",
    "country": "US",
    "latitude": 39.7392,
    "longitude": -104.9903,
    "category_id": 5,
    "logo_url": null,
    "cover_image_url": null,
    "gallery_images": [],
    "video_url": null,
    "business_hours": {"mon": "9-5", "tue": "9-5"},
    "social_media": {"twitter": "@acme"},
    "features": ["Feature 1", "Feature 2"],
    "amenities": ["WiFi", "Parking"],
    "add_ons": ["premium_support"],
    "meta_title": "Acme Corp - Business",
    "meta_description": "Description here",
    "meta_keywords": "business,services",
    "contact_name": "John Doe",
    "contact_email": "john@acme.com",
    "contact_phone": "555-5678",
    "annual_revenue": 1000000,
    "certifications": ["ISO 9001"],
    "languages_spoken": ["English", "Spanish"],
    "payment_methods": ["Credit Card", "Cash"],
    "keywords": "business,local",
    "slogan": "Your trusted partner"
  }
]`}</pre>
                  </div>
                </div>

                {/* SQL Format */}
                <div>
                  <h5 className="font-medium text-gray-800 mb-2">SQL Format</h5>
                  <p className="text-xs text-gray-600 mb-2">
                    Standard INSERT statements. Include any subset of the 58 columns.
                  </p>
                  <div className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto font-mono">
                    <pre className="whitespace-pre">{`INSERT INTO listings (
  name, slug, type, tier, status, description,
  address, city, state, zip_code, country,
  email, phone, website, category_id,
  year_established, employee_count,
  latitude, longitude, contact_name
) VALUES (
  'Acme Corp', 'acme-corp', 'Business', 'essentials', 'active',
  'A great company', '123 Main St', 'Denver', 'CO', '80202', 'US',
  'info@acme.com', '555-1234', 'https://acme.com', 5,
  2010, 50, 39.7392, -104.9903, 'John Doe'
);`}</pre>
                  </div>
                </div>

                {/* Tier, Status, Approved Values */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <h5 className="font-medium text-gray-800 mb-1">Valid Tier Values</h5>
                    <ul className="text-xs text-gray-600 list-disc ml-4">
                      <li>essentials (default)</li>
                      <li>plus</li>
                      <li>preferred</li>
                      <li>premium</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-800 mb-1">Valid Status Values</h5>
                    <ul className="text-xs text-gray-600 list-disc ml-4">
                      <li>active (default)</li>
                      <li>inactive</li>
                      <li>pending</li>
                      <li>suspended</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-800 mb-1">Valid Approved Values</h5>
                    <ul className="text-xs text-gray-600 list-disc ml-4">
                      <li>pending (default)</li>
                      <li>approved</li>
                      <li>rejected</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
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
                  <div className="text-green-700">Valid: {importPreview.valid}</div>
                  <div className={importPreview.conflicts.length > 0 ? 'text-yellow-700' : ''}>
                    Conflicts: {importPreview.conflicts.length}
                    {importPreview.conflicts.length > 0 && (
                      <span className="text-xs ml-2">
                        (Name: {importPreview.conflicts.filter(c => ['name', 'name_and_address'].includes(c.type)).length},
                        Slug: {importPreview.conflicts.filter(c => c.type === 'slug').length})
                      </span>
                    )}
                  </div>
                  {/* Show Update Candidates when update_existing or overwrite is selected */}
                  {importPreview.conflicts.length > 0 && ['update_existing', 'overwrite'].includes(conflictResolution) && (
                    <div className="text-green-700 font-medium">
                      ✓ Update Candidates: {importPreview.conflicts.length}
                      <span className="text-xs ml-2 font-normal">
                        (will {conflictResolution === 'update_existing' ? 'merge with' : 'replace'} existing records)
                      </span>
                    </div>
                  )}
                  <div className={importPreview.errors.length > 0 ? 'text-red-700' : ''}>
                    Errors: {importPreview.errors.length}
                    {importPreview.errors.length > 0 && (
                      <span className="text-xs ml-2">
                        - {getErrorBreakdown(importPreview.errors)}
                      </span>
                    )}
                  </div>
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
                      <span className="text-sm text-yellow-700">Skip - Don&apos;t import conflicting listings</span>
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
                      <span className="text-sm text-yellow-700">Update Existing - Fill empty fields, preserve existing data</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="rename"
                        checked={conflictResolution === 'rename'}
                        onChange={(e) => setConflictResolution(e.target.value as 'rename')}
                      />
                      <span className="text-sm text-yellow-700">Rename - Create with modified slug</span>
                    </label>
                  </div>
                </div>
              )}

              {importPreview.errors.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <h4 className="font-medium text-red-900 mb-2">
                    Validation Errors ({importPreview.errors.length})
                  </h4>
                  <ul className="text-sm text-red-700 space-y-1 max-h-40 overflow-y-auto pr-2">
                    {importPreview.errors.slice(0, 15).map((err, i) => (
                      <li key={i} className="py-0.5 border-b border-red-100 last:border-0">
                        <span className="font-medium">Row {err.row}</span>
                        <span className="text-red-500 mx-1">|</span>
                        <span className="text-xs bg-red-100 px-1 py-0.5 rounded">{err.field}</span>
                        <span className="text-red-500 mx-1">:</span>
                        {err.message}
                      </li>
                    ))}
                  </ul>
                  {importPreview.errors.length > 15 && (
                    <div className="mt-2 pt-2 border-t border-red-200 flex items-center justify-between">
                      <span className="text-xs text-red-600">
                        Showing 15 of {importPreview.errors.length} errors
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAllErrorsModal(true)}
                        className="text-sm text-red-700 hover:text-red-900 font-medium underline"
                      >
                        See All Errors
                      </button>
                    </div>
                  )}
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
              disabled={
                isImporting ||
                !importPreview ||
                // Enable if: has valid records OR (using update_existing/overwrite AND has conflicts to update)
                (importPreview.valid === 0 &&
                  !(['update_existing', 'overwrite'].includes(conflictResolution) && importPreview.conflicts.length > 0))
              }
            >
              {isImporting ? 'Importing...' : 'Import Listings'}
            </BizModalButton>
          </div>
        </div>
      )}

      {/* All Errors Modal */}
      {showAllErrorsModal && importPreview && importPreview.errors.length > 0 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  All Validation Errors ({importPreview.errors.length})
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {getErrorBreakdown(importPreview.errors)}
                </p>
              </div>
              <button
                onClick={() => setShowAllErrorsModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Error type filter tabs */}
            <div className="p-3 border-b border-gray-200 bg-gray-50 flex flex-wrap gap-2">
              {Object.entries(categorizeErrors(importPreview.errors))
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <span
                    key={type}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"
                  >
                    {type}: {count}
                  </span>
                ))}
            </div>

            {/* Scrollable error list */}
            <div className="flex-1 overflow-y-auto p-4">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-white border-b">
                  <tr>
                    <th className="text-left py-2 px-2 font-medium text-gray-700 w-16">Row</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-700 w-24">Field</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-700">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {importPreview.errors.map((err, i) => (
                    <tr key={i} className="hover:bg-red-50">
                      <td className="py-2 px-2 text-gray-900 font-mono">{err.row}</td>
                      <td className="py-2 px-2">
                        <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs">
                          {err.field}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-red-700">{err.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowAllErrorsModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Result Display */}
      {importResult && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Import Complete
              </h3>
            </div>

            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{importResult.imported}</div>
                  <div className="text-sm text-green-700">Imported</div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{importResult.updated}</div>
                  <div className="text-sm text-blue-700">Updated</div>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{importResult.skipped}</div>
                  <div className="text-sm text-yellow-700">Skipped</div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{importResult.renamed}</div>
                  <div className="text-sm text-purple-700">Renamed</div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="bg-red-50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-red-600">{importResult.errors.length} Errors</div>
                  <div className="text-sm text-red-700">
                    {importResult.errors.slice(0, 3).map((err, i) => (
                      <div key={i}>Row {err.row}: {err.message}</div>
                    ))}
                    {importResult.errors.length > 3 && (
                      <div className="text-xs mt-1">...and {importResult.errors.length - 3} more</div>
                    )}
                  </div>
                </div>
              )}

              {importResult.skippedRecords && importResult.skippedRecords.length > 0 && (
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-yellow-800">
                        {importResult.skippedRecords.length} records skipped
                      </div>
                      <div className="text-xs text-yellow-700 mt-1">
                        {getSkippedBreakdown(importResult.skippedRecords)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSkippedRecordsModal(true)}
                      className="text-sm text-yellow-700 hover:text-yellow-900 font-medium underline ml-3"
                    >
                      View All
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  setImportResult(null);
                  onImportComplete(); // Refresh data and close modal
                }}
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skipped Records Modal */}
      {showSkippedRecordsModal && importResult?.skippedRecords && importResult.skippedRecords.length > 0 && (() => {
        const categorized = categorizeSkippedRecords(importResult.skippedRecords);
        const categoryOrder = ['Name Conflict', 'Slug Conflict', 'Missing Name', 'Other'];
        const categoryColors: Record<string, string> = {
          'Name Conflict': 'bg-blue-100 text-blue-800 border-blue-200',
          'Slug Conflict': 'bg-purple-100 text-purple-800 border-purple-200',
          'Missing Name': 'bg-red-100 text-red-800 border-red-200',
          'Other': 'bg-gray-100 text-gray-800 border-gray-200'
        };

        return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[85vh] flex flex-col">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Skipped Records ({importResult.skippedRecords.length})
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Grouped by reason - click a category to jump to it
                  </p>
                </div>
                <button
                  onClick={() => setShowSkippedRecordsModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  aria-label="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Category summary badges */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap gap-2">
                {categoryOrder.map(cat => {
                  const items = categorized[cat] || [];
                  if (items.length === 0) return null;
                  return (
                    <a
                      key={cat}
                      href={`#skipped-${cat.replace(/\s+/g, '-').toLowerCase()}`}
                      className={`px-3 py-1 rounded-full text-sm font-medium border ${categoryColors[cat]}`}
                    >
                      {cat}: {items.length}
                    </a>
                  );
                })}
              </div>

              <div className="overflow-auto flex-1 p-4 space-y-6">
                {categoryOrder.map(category => {
                  const items = categorized[category] || [];
                  if (items.length === 0) return null;

                  return (
                    <div key={category} id={`skipped-${category.replace(/\s+/g, '-').toLowerCase()}`}>
                      <h4 className={`text-sm font-semibold px-3 py-2 rounded-t-lg border ${categoryColors[category]}`}>
                        {category} ({items.length} records)
                      </h4>
                      <table className="min-w-full divide-y divide-gray-200 border border-t-0 rounded-b-lg overflow-hidden">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Row</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">Name</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {items.slice(0, 100).map((record, index) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap">{record.row}</td>
                              <td className="px-4 py-2 text-sm text-gray-900 truncate max-w-[250px]" title={record.name}>
                                {record.name}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600 truncate max-w-[350px]" title={record.reason}>
                                {record.reason}
                              </td>
                            </tr>
                          ))}
                          {items.length > 100 && (
                            <tr className="bg-yellow-50">
                              <td colSpan={3} className="px-4 py-2 text-sm text-yellow-700 text-center">
                                ...and {items.length - 100} more in this category
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setShowSkippedRecordsModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </BizModal>
  );
}

// Helper functions for the modal
function downloadFile(content: string, filename: string, contentType: string): void {
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

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function generateListingCSV(listings: ListingExportData[]): string {
  const fields = [
    'id', 'name', 'slug', 'type', 'tier', 'status', 'approved',
    'owner_email', 'category_name', 'description', 'address', 'city',
    'state', 'zip_code', 'country', 'email', 'phone', 'website',
    'claimed', 'mock', 'created_at', 'last_update'
  ];

  const header = fields.join(',');
  const rows = listings.map(l => {
    return fields.map(f => {
      const value = (l as unknown as Record<string, unknown>)[f];
      if (value === null || value === undefined) return '';
      if (Array.isArray(value)) return `"${value.join(';').replace(/"/g, '""')}"`;
      if (typeof value === 'boolean') return value ? 'true' : 'false';
      if (typeof value === 'string') {
        const escaped = value.replace(/"/g, '""');
        return value.includes(',') || value.includes('"') || value.includes('\n')
          ? `"${escaped}"` : escaped;
      }
      return String(value);
    }).join(',');
  });

  return [header, ...rows].join('\n');
}

function generateListingSQL(listings: ListingExportData[]): string {
  const lines = [
    '-- Listing Export',
    `-- Generated: ${new Date().toISOString()}`,
    `-- Total: ${listings.length} listings`,
    ''
  ];

  const fields = ['name', 'slug', 'type', 'tier', 'status', 'approved', 'description',
    'address', 'city', 'state', 'zip_code', 'country', 'email', 'phone', 'website', 'claimed', 'mock'];

  listings.forEach(l => {
    const values = fields.map(f => {
      const value = (l as unknown as Record<string, unknown>)[f];
      if (value === null || value === undefined) return 'NULL';
      if (typeof value === 'boolean') return value ? '1' : '0';
      if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
      return String(value);
    });

    lines.push(`INSERT INTO listings (${fields.join(', ')}) VALUES (${values.join(', ')});`);
  });

  return lines.join('\n');
}

// Type for preview result
interface ListingImportPreviewResult {
  total: number;
  valid: number;
  conflicts: Array<{
    identifier: string;
    type: 'name' | 'slug';
    existingId: number;
    existingName: string;
    importName: string;
    importRow: number;
  }>;
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
  preview: unknown[];
}

// Type for import result (after execution)
interface ImportExecutionResult {
  imported: number;
  updated: number;
  skipped: number;
  renamed: number;
  errors: Array<{ row: number; field: string; message: string }>;
  skippedRecords?: Array<{ row: number; name: string; reason: string }>;
}

// Type for export data
interface ListingExportData {
  id?: number;
  name: string;
  slug?: string;
  type?: string;
  tier?: string;
  status?: string;
  approved?: string;
  owner_email?: string;
  category_name?: string | null;
  category_id?: number | null;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  country?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  add_ons?: string[] | null;
  claimed?: boolean;
  mock?: boolean;
  created_at?: string;
  last_update?: string;
}

// ============================================================================
// PHASE 8: ActivityLogModal Component
// ============================================================================

/**
 * ActivityLogModal - Display activity history for a listing
 * @tier STANDARD
 * @phase Phase 8 - Activity Log Modal
 * @see src/app/admin/users/page.tsx (lines 2087-2152) - Reference implementation
 */
const ActivityLogModal = memo(function ActivityLogModal({
  listing,
  isOpen,
  onClose
}: {
  listing: Listing | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch activities when modal opens
  useEffect(() => {
    if (isOpen && listing) {
      fetchActivities();
    }
  }, [isOpen, listing?.id]);

  const fetchActivities = async () => {
    if (!listing) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/listings/${listing.id}/activity?limit=50`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setActivities(data.data?.activities ?? data.activities ?? []);
      } else {
        const errorData = await response.json();
        setError(errorData.error?.message || 'Failed to load activities');
      }
    } catch (err) {
      setError('Network error while loading activities');
      ErrorService.capture('Failed to fetch activities:', err);
    } finally {
      setLoading(false);
    }
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: string): string => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  // Get severity badge color
  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get action badge color
  const getActionColor = (action: string): string => {
    if (action.includes('delete')) return 'bg-red-100 text-red-800';
    if (action.includes('suspend')) return 'bg-orange-100 text-orange-800';
    if (action.includes('create')) return 'bg-green-100 text-green-800';
    if (action.includes('update')) return 'bg-blue-100 text-blue-800';
    if (action.includes('import')) return 'bg-purple-100 text-purple-800';
    if (action.includes('moderate')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (!listing) return null;

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Activity Log: ${listing.name}`}
      size="large"
    >
      <div className="space-y-4">
        {/* Info Banner */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            Showing the last 50 admin actions performed on this listing.
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            <p className="mt-2 text-gray-500">Loading activities...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-red-500 mb-2">
              <AlertTriangle className="h-8 w-8 mx-auto" />
            </div>
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchActivities}
              className="mt-2 text-sm text-orange-600 hover:text-orange-800"
            >
              Try Again
            </button>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-8 w-8 mx-auto mb-2 text-gray-600" />
            <p>No activity found for this listing.</p>
            <p className="text-sm mt-1">
              Activities are logged when admin operations are performed.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">
                    Action
                  </th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">
                    Details
                  </th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">
                    IP Address
                  </th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {activities.map((activity) => (
                  <tr key={activity.id} className="hover:bg-gray-50">
                    <td className="py-3 px-2">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getActionColor(activity.action)}`}>
                        {activity.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-sm text-gray-600 max-w-md">
                      <div className="truncate" title={activity.details}>
                        {activity.details}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-sm text-gray-500 font-mono">
                      {activity.ip_address}
                    </td>
                    <td className="py-3 px-2 text-sm text-gray-500 whitespace-nowrap">
                      {formatTimestamp(activity.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t">
          <BizModalButton variant="secondary" onClick={onClose}>
            Close
          </BizModalButton>
        </div>
      </div>
    </BizModal>
  );
});

// ============================================================================
// PHASE 5: ListingEditorModal Component - DEPRECATED (Phase 8)
// ============================================================================
// Replaced with NewListingModal and EditListingModal from @features/listings/components/
// See Phase 8 implementation at lines 4140-4167

// ============================================================================
// PHASE 3: BatchHandlingBar Component
// ============================================================================

/**
 * BatchHandlingBar - Floating action bar for batch listing operations
 * Adapted from Users Manager pattern for listing management
 *
 * @tier STANDARD
 * @phase Phase 3 - Batch Selection & BatchHandlingBar
 */
const BatchHandlingBar = memo(function BatchHandlingBar({
  selectedCount,
  isMobile = false,
  onBulkApprove,
  onBulkSuspend,
  onBulkDelete,
  onClearSelection
}: {
  selectedCount: number;
  isMobile?: boolean;
  onBulkApprove: () => void;
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
              {isMobile ? selectedCount : `${selectedCount} ${selectedCount === 1 ? 'listing' : 'listings'} selected`}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Approve button - Sets selected listings to approved */}
            <button
              onClick={onBulkApprove}
              className={`${
                isMobile
                  ? 'min-w-[44px] min-h-[44px] p-2.5 flex items-center justify-center'
                  : 'flex items-center gap-2 px-3 py-2'
              } rounded-md bg-green-50 hover:bg-green-100 text-green-700 active:scale-95 transition-all text-sm`}
              aria-label={isMobile ? 'Bulk approve' : undefined}
            >
              <CheckCircle className="w-4 h-4" />
              {!isMobile && <span>Approve</span>}
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
              <PauseCircle className="w-4 h-4" />
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
});

// ============================================================================
// PHASE 6: ListingSearch Component
// ============================================================================

/**
 * ListingSearch - Dedicated search component with debounce and history
 * @tier STANDARD
 * @phase Phase 6 - Advanced Search Integration
 * @see src/app/admin/users/page.tsx (lines 301-449) - Reference implementation
 */
const ListingSearch = memo(function ListingSearch({
  onSearch,
  searchHistory,
  onHistoryItemClick,
  onClearHistory,
  isDebouncing
}: {
  onSearch: (query: string, mode: ListingSearchMode) => void;
  searchHistory: SearchHistoryEntry[];
  onHistoryItemClick: (query: string) => void;
  onClearHistory: () => void;
  isDebouncing: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const searchMode = useMemo(() => detectListingSearchMode(searchQuery), [searchQuery]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const mode = detectListingSearchMode(query);
      onSearch(query, mode);
    }, 300);  // 300ms debounce
  }, [onSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      const mode = detectListingSearchMode(searchQuery);
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
    const mode = detectListingSearchMode(query);
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
    <div className="relative flex-1 max-w-[50%]">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600" />
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsHistoryOpen(searchHistory.length > 0)}
          onBlur={() => setTimeout(() => setIsHistoryOpen(false), 200)}
          placeholder="Search by name, #ID, or owner:name..."
          autoComplete="off"
          className="w-full pl-10 pr-24 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          aria-label="Search listings"
        />
        {searchQuery && (
          <div className="absolute right-12 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {searchMode === 'id' && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">ID Search</span>
            )}
            {searchMode === 'owner' && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Owner Search</span>
            )}
            {searchMode === 'name' && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Name Search</span>
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
// PHASE 6: ListingAdvancedFilterPanel Component
// ============================================================================

/**
 * Advanced filter state for listing searches
 */
interface ListingAdvancedFilters {
  id: string;
  name: string;
  type: string;
  tier: 'all' | 'essentials' | 'plus' | 'preferred' | 'premium';
  status: 'all' | 'active' | 'inactive' | 'pending' | 'suspended' | 'draft' | 'paused';
  approved: 'all' | 'pending' | 'approved' | 'rejected';
  owner: string;
  matchMode: 'all' | 'any';
}

/**
 * Default advanced filter values
 */
const DEFAULT_LISTING_FILTERS: ListingAdvancedFilters = {
  id: '',
  name: '',
  type: '',
  tier: 'all',
  status: 'all',
  approved: 'all',
  owner: '',
  matchMode: 'all'
};

/**
 * ListingAdvancedFilterPanel - Collapsible filter panel with AND/OR toggle
 * @tier STANDARD
 * @phase Phase 6 - Advanced Filter Integration
 * @see src/app/admin/users/page.tsx (lines 1963-2081) - Reference implementation
 */
const ListingAdvancedFilterPanel = memo(function ListingAdvancedFilterPanel({
  isOpen,
  filters,
  onChange,
  onClear,
  onToggle,
  activeFilterCount
}: {
  isOpen: boolean;
  filters: ListingAdvancedFilters;
  onChange: (filters: ListingAdvancedFilters) => void;
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* ID Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Listing ID (exact match)</label>
              <input
                type="number"
                value={filters.id}
                onChange={(e) => onChange({ ...filters, id: e.target.value })}
                placeholder="e.g., 123"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            {/* Name Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Listing Name (partial match)</label>
              <input
                type="text"
                value={filters.name}
                onChange={(e) => onChange({ ...filters, name: e.target.value })}
                placeholder="e.g., Coffee"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            {/* Owner Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Owner (name/email)</label>
              <input
                type="text"
                value={filters.owner}
                onChange={(e) => onChange({ ...filters, owner: e.target.value })}
                placeholder="e.g., john@example.com"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            {/* Type Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select
                value={filters.type}
                onChange={(e) => onChange({ ...filters, type: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">All Types</option>
                <option value="Standard">Standard</option>
                <option value="Business">Business</option>
                <option value="Service">Service</option>
                <option value="Restaurant">Restaurant</option>
                <option value="Retail">Retail</option>
                <option value="Professional">Professional</option>
              </select>
            </div>
            {/* Tier Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tier</label>
              <select
                value={filters.tier}
                onChange={(e) => onChange({ ...filters, tier: e.target.value as ListingAdvancedFilters['tier'] })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Tiers</option>
                <option value="essentials">Essentials</option>
                <option value="plus">Plus</option>
                <option value="preferred">Preferred</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            {/* Status Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => onChange({ ...filters, status: e.target.value as ListingAdvancedFilters['status'] })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
                <option value="draft">Draft</option>
                <option value="paused">Paused</option>
              </select>
            </div>
            {/* Approval Status Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Approval Status</label>
              <select
                value={filters.approved}
                onChange={(e) => onChange({ ...filters, approved: e.target.value as ListingAdvancedFilters['approved'] })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Approval States</option>
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            {/* Match Mode */}
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
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * AdminListingsPage - Listing management interface for platform administrators
 *
 * Provides moderation workflow and CRUD operations for listings.
 * Requires admin role for access.
 *
 * @component
 * @returns {JSX.Element} Admin listing management interface
 */
export default function AdminListingsPage() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({
    tier: '',
    status: '',
    search: ''
  });
  const [moderationModalOpen, setModerationModalOpen] = useState(false);
  const [moderationAction, setModerationAction] = useState<'approve' | 'reject'>('approve');
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const isMobile = useIsMobile();

  // ============================================================================
  // PHASE 4: Password Modal State
  // ============================================================================

  // Pending operation type for password verification gate
  type PendingOperationType = 'delete' | 'suspend' | null;

  // Track what operation is awaiting password verification
  const [pendingOperation, setPendingOperation] = useState<{
    type: PendingOperationType;
    listings: Listing[];
  } | null>(null);

  // Password modal visibility
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  // ============================================================================
  // PHASE 4.5: Confirmation Modal State
  // ============================================================================

  // Delete confirmation modal state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingIndividual, setDeletingIndividual] = useState(false);
  const [individualDeleteListing, setIndividualDeleteListing] = useState<Listing | null>(null);

  // Suspend confirmation modal state
  const [suspendConfirmOpen, setSuspendConfirmOpen] = useState(false);
  const [suspendingIndividual, setSuspendingIndividual] = useState(false);
  const [individualSuspendListing, setIndividualSuspendListing] = useState<Listing | null>(null);

  // ============================================================================
  // PHASE 5: Editor Modal State
  // ============================================================================

  // Listing being edited (null for create mode)
  const [editingListing, setEditingListing] = useState<Listing | null>(null);

  // Editor modal visibility
  const [editorModalOpen, setEditorModalOpen] = useState(false);

  // Categories for dropdown (loaded once)
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  // ============================================================================
  // PHASE 6: Search & Advanced Filter State
  // ============================================================================

  // Search mode tracking
  const [currentSearchMode, setCurrentSearchMode] = useState<ListingSearchMode>('all');

  // Debouncing indicator
  const [isDebouncing, setIsDebouncing] = useState(false);

  // Search history (entity-specific: 'listings')
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);

  // Advanced filters panel
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);

  // ============================================================================
  // PHASE 7: Import/Export State
  // ============================================================================
  const [importExportModalOpen, setImportExportModalOpen] = useState(false);

  // ============================================================================
  // PHASE 8: Activity Log State
  // ============================================================================
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityListing, setActivityListing] = useState<Listing | null>(null);

  // ============================================================================
  // SERVER-SIDE SORTING STATE
  // Column sorting is handled at the database level for proper full-dataset ordering
  // ============================================================================
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [advancedFilters, setAdvancedFilters] = useState<ListingAdvancedFilters>(DEFAULT_LISTING_FILTERS);

  // Load search history on mount
  useEffect(() => {
    setSearchHistory(getEntitySearchHistory('listings'));
  }, []);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (advancedFilters.id) count++;
    if (advancedFilters.name) count++;
    if (advancedFilters.owner) count++;
    if (advancedFilters.type) count++;
    if (advancedFilters.tier !== 'all') count++;
    if (advancedFilters.status !== 'all') count++;
    if (advancedFilters.approved !== 'all') count++;
    return count;
  }, [advancedFilters]);

  // ============================================================================
  // TABLE CONFIGURATION - PHASE 2: Extended Columns (14 total)
  // PHASE 10 FIX: Moved to BEFORE conditional returns to comply with React Hooks rules
  // Order: Checkbox → Logo → ID → Name → Owner → Claimed → Type → Tier →
  //        Add-ons → Categories → Last Update → Created → Status → Mock
  // ============================================================================

  const columns: TableColumn<Listing>[] = useMemo(() => [
    // COLUMN 1: Checkbox for batch selection (Phase 3 prep)
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={listings.length > 0 && selectedIds.size === listings.length}
          onChange={() => {
            if (selectedIds.size === listings.length) {
              setSelectedIds(new Set());
            } else {
              setSelectedIds(new Set(listings.map(l => l.id)));
            }
          }}
          className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
          aria-label="Select all listings"
        />
      ),
      accessor: (listing: Listing) => (
        <input
          type="checkbox"
          checked={selectedIds.has(listing.id)}
          onChange={() => {
            const newSelected = new Set(selectedIds);
            if (newSelected.has(listing.id)) {
              newSelected.delete(listing.id);
            } else {
              newSelected.add(listing.id);
            }
            setSelectedIds(newSelected);
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
          aria-label={`Select ${listing.name}`}
        />
      ),
      sortable: false,
      width: '40px'
    },

    // COLUMN 2: Logo Thumbnail
    {
      key: 'logo',
      header: 'Logo',
      accessor: (listing: Listing) => (
        <div className="w-10 h-10 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
          {listing.logo_url ? (
            <img
              src={listing.logo_url}
              alt={`${listing.name} logo`}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to initials on error
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement!.innerHTML = `<span class="text-xs font-medium text-gray-500">${listing.name.substring(0, 2).toUpperCase()}</span>`;
              }}
            />
          ) : (
            <span className="text-xs font-medium text-gray-500">
              {listing.name.substring(0, 2).toUpperCase()}
            </span>
          )}
        </div>
      ),
      sortable: false,
      width: '60px'
    },

    // COLUMN 3: Listing ID
    {
      key: 'id',
      header: 'ID',
      accessor: (listing: Listing) => (
        <span className="text-gray-600 font-mono text-sm">#{listing.id}</span>
      ),
      sortable: true,
      width: '70px'
    },

    // COLUMN 4: Listing Name + Type with search highlighting
    {
      key: 'name',
      header: 'Listing Name',
      accessor: (listing: Listing) => (
        <div>
          <div className="font-medium">
            <HighlightedText
              text={listing.name}
              query={filters.search}
              highlightClassName="bg-yellow-200"
            />
          </div>
          <div className="text-xs text-gray-500">{listing.type}</div>
        </div>
      ),
      sortable: true
    },

    // COLUMN 5: Owner with search highlighting
    {
      key: 'user',
      header: 'Owner',
      accessor: (listing: Listing) => (
        <div>
          <div>
            <HighlightedText
              text={listing.user_name || 'Unknown'}
              query={currentSearchMode === 'owner' ? filters.search.replace(/^owner:/i, '').trim() : filters.search}
              highlightClassName="bg-yellow-200"
            />
          </div>
          <div className="text-xs text-gray-500">
            <HighlightedText
              text={listing.user_email || '-'}
              query={currentSearchMode === 'owner' ? filters.search.replace(/^owner:/i, '').trim() : ''}
              highlightClassName="bg-yellow-200"
            />
          </div>
        </div>
      ),
      sortable: true
    },

    // COLUMN 6: Claimed - NEW (boolean badge)
    {
      key: 'claimed',
      header: 'Claimed',
      accessor: (listing: Listing) => (
        listing.claimed ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            Yes
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
            <XCircle className="w-3 h-3" />
            No
          </span>
        )
      ),
      sortable: true,
      width: '80px'
    },

    // COLUMN 7: Type Badge
    {
      key: 'type',
      header: 'Type',
      accessor: (listing: Listing) => (
        <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700">
          {getTypeLabel(listing.type)}
        </span>
      ),
      sortable: true
    },

    // COLUMN 8: Tier - CORRECTED ENUM VALUES
    {
      key: 'tier',
      header: 'Tier',
      accessor: (listing: Listing) => {
        const tierColors: Record<string, string> = {
          essentials: 'bg-gray-100 text-gray-800',
          plus: 'bg-blue-100 text-blue-800',
          preferred: 'bg-purple-100 text-purple-800',
          premium: 'bg-amber-100 text-amber-800'
        };

        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${tierColors[listing.tier] ?? 'bg-gray-100 text-gray-800'}`}>
            {listing.tier?.toUpperCase() ?? 'ESSENTIALS'}
          </span>
        );
      },
      sortable: true
    },

    // COLUMN 9: Add-ons (KeywordBadges)
    {
      key: 'add_ons',
      header: 'Add-ons',
      accessor: (listing: Listing) => (
        <KeywordBadges
          keywords={listing.add_ons}
          maxVisible={3}
          variant="navy"
        />
      ),
      sortable: false
    },

    // COLUMN 10: Category
    {
      key: 'category',
      header: 'Category',
      accessor: (listing: Listing) => (
        <span className="text-sm text-gray-700">
          {listing.category_name || '-'}
        </span>
      ),
      sortable: true
    },

    // COLUMN: Active Categories (multiple categories)
    {
      key: 'active_categories',
      header: 'Active Categories',
      accessor: (listing: Listing) => (
        <KeywordBadges
          keywords={listing.active_category_names || []}
          maxVisible={2}
          variant="green"
        />
      ),
      sortable: false
    },

    // COLUMN: Bank Categories (reserved categories)
    {
      key: 'bank_categories',
      header: 'Bank Categories',
      accessor: (listing: Listing) => (
        <KeywordBadges
          keywords={listing.bank_category_names || []}
          maxVisible={2}
          variant="blue"
        />
      ),
      sortable: false
    },

    // COLUMN 11: Last Update
    {
      key: 'last_update',
      header: 'Last Update',
      accessor: (listing: Listing) => (
        listing.last_update
          ? new Date(listing.last_update).toLocaleDateString()
          : 'Never'
      ),
      sortable: true
    },

    // COLUMN 12: Created - NEW (date formatted)
    {
      key: 'created_at',
      header: 'Created',
      accessor: (listing: Listing) => (
        listing.created_at
          ? new Date(listing.created_at).toLocaleDateString()
          : '-'
      ),
      sortable: true
    },

    // COLUMN 13: Approved - Approval status (pending/approved/rejected)
    {
      key: 'approved',
      header: 'Approved',
      accessor: (listing: Listing) => {
        const approvedColors: Record<string, string> = {
          approved: 'bg-green-100 text-green-800',
          pending: 'bg-yellow-100 text-yellow-800',
          rejected: 'bg-red-100 text-red-800'
        };

        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${approvedColors[listing.approved] ?? 'bg-gray-100 text-gray-800'}`}>
            {listing.approved?.toUpperCase() ?? 'PENDING'}
          </span>
        );
      },
      sortable: true
    },

    // COLUMN 14: Status - ACTUAL STATUS FIELD
    {
      key: 'status',
      header: 'Status',
      accessor: (listing: Listing) => {
        const statusColors: Record<string, string> = {
          active: 'bg-green-100 text-green-800',
          inactive: 'bg-gray-100 text-gray-800',
          pending: 'bg-yellow-100 text-yellow-800',
          suspended: 'bg-red-100 text-red-800'
        };

        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[listing.status] ?? 'bg-gray-100 text-gray-800'}`}>
            {listing.status?.toUpperCase() ?? 'PENDING'}
          </span>
        );
      },
      sortable: true
    },

    // COLUMN 15: Mock - NEW (boolean badge for test data)
    {
      key: 'mock',
      header: 'Mock',
      accessor: (listing: Listing) => (
        listing.mock ? (
          <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
            TEST
          </span>
        ) : (
          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700">
            LIVE
          </span>
        )
      ),
      sortable: true,
      width: '70px'
    }
  ], [listings, selectedIds, filters.search, currentSearchMode]);

  // ============================================================================
  // DATA FETCHING - HOOKS MUST BE BEFORE CONDITIONAL RETURNS
  // ============================================================================

  // GOVERNANCE FIX: useEffect MUST be called before any early returns
  // React Rules of Hooks require hooks to be called in the same order every render
  useEffect(() => {
    // Only fetch if user is admin - conditional logic INSIDE the hook, not outside
    if (user?.role === 'admin') {
      fetchListings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filters, advancedFilters, pagination.page, sortColumn, sortDirection]);

  // Fetch categories for editor modal dropdown
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories?limit=1000', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          const cats = data.data?.categories ?? data.categories ?? [];
          setCategories(cats.map((c: { id: number; name: string }) => ({
            id: c.id,
            name: c.name
          })));
        }
      } catch {
        // Silent fail - categories will be empty
      }
    };

    if (user?.role === 'admin') {
      fetchCategories();
    }
  }, [user]);

  // ============================================================================
  // PHASE 9: Auto-refresh every 5 minutes (300000ms)
  // ============================================================================
  useEffect(() => {
    // Only auto-refresh if user is admin
    if (user?.role !== 'admin') return;

    const intervalId = setInterval(() => {
      fetchListings();
    }, 300000); // 5 minutes

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ============================================================================
  // ACTION HANDLERS - Define before conditional returns so they're available
  // ============================================================================

  const fetchListings = async () => {
    setLoading(true);
    setSelectedIds(new Set());  // Clear selection on refresh
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.pageSize.toString()
      });

      // Basic filters
      if (filters.tier) queryParams.append('tier', filters.tier);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.search) queryParams.append('q', filters.search);

      // Advanced filters
      if (advancedFilters.id) queryParams.append('filterId', advancedFilters.id);
      if (advancedFilters.name) queryParams.append('filterName', advancedFilters.name);
      if (advancedFilters.type) queryParams.append('filterType', advancedFilters.type);
      if (advancedFilters.owner) queryParams.append('filterOwner', advancedFilters.owner);
      if (advancedFilters.tier !== 'all') queryParams.append('filterTier', advancedFilters.tier);
      if (advancedFilters.status !== 'all') queryParams.append('filterStatus', advancedFilters.status);
      if (advancedFilters.approved !== 'all') queryParams.append('filterApproved', advancedFilters.approved);
      if (advancedFilters.matchMode !== 'all') queryParams.append('matchMode', advancedFilters.matchMode);

      // Server-side sorting parameters - sort is applied at database level
      queryParams.append('sortBy', sortColumn);
      queryParams.append('sortOrder', sortDirection);

      const response = await fetch(`/api/admin/listings?${queryParams}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setListings(data.data?.listings ?? data.listings ?? []);
        setPagination(prev => ({
          ...prev,
          total: data.data?.pagination?.total ?? data.pagination?.total ?? 0
        }));
      }
    } catch (error) {
      ErrorService.capture('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // SERVER-SIDE SORTING HANDLER
  // ============================================================================

  /**
   * Handle column header click for server-side sorting
   * Toggles sort direction if same column, or sets new column with default direction
   * Resets to page 1 to show sorted results from the beginning
   */
  const handleColumnSort = useCallback((columnKey: string) => {
    // Map column keys to database column names
    const columnMapping: Record<string, string> = {
      'id': 'id',
      'name': 'name',
      'type': 'type',
      'tier': 'tier',
      'status': 'status',
      'approved': 'approved',
      'claimed': 'claimed',
      'mock': 'mock',
      'category_name': 'category_id',  // Sort by category_id in DB
      'last_update': 'last_update',
      'created_at': 'created_at'
    };

    const dbColumn = columnMapping[columnKey];
    if (!dbColumn) return; // Ignore non-sortable columns

    if (sortColumn === dbColumn) {
      // Toggle direction if same column
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, set with default ascending order
      setSortColumn(dbColumn);
      setSortDirection('asc');
    }

    // Reset to page 1 to show sorted results from the beginning
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [sortColumn]);

  // ============================================================================
  // PHASE 7: Import/Export Handlers
  // ============================================================================

  /**
   * Handle import complete - refresh data
   */
  const handleImportComplete = useCallback(() => {
    setImportExportModalOpen(false);
    fetchListings();
  }, []);

  // ============================================================================
  // PHASE 8: Activity Log Handler
  // ============================================================================
  /**
   * Handle Activity button click - open activity log modal
   * @phase Phase 8 - Activity Log Modal
   */
  const handleViewActivity = useCallback((listing: Listing) => {
    setActivityListing(listing);
    setActivityModalOpen(true);
  }, []);

  // ============================================================================
  // PHASE 6: Search & Filter Handlers
  // ============================================================================

  /**
   * Handle search query execution
   * Saves to history and triggers fetch with filters
   */
  const handleSearch = useCallback((query: string, mode: ListingSearchMode) => {
    setCurrentSearchMode(mode);
    setIsDebouncing(false);

    // Save to search history if non-empty query
    if (query.trim()) {
      saveEntitySearchToHistory('listings', query, mode);
      setSearchHistory(getEntitySearchHistory('listings'));
    }

    // Update filters and trigger fetch
    setFilters(prev => ({
      ...prev,
      search: query
    }));
  }, []);

  /**
   * Handle history item click - rerun search
   */
  const handleHistoryItemClick = useCallback((query: string) => {
    // Move to top of history
    saveEntitySearchToHistory('listings', query, detectListingSearchMode(query));
    setSearchHistory(getEntitySearchHistory('listings'));
  }, []);

  /**
   * Handle clear search history
   */
  const handleClearHistory = useCallback(() => {
    clearEntitySearchHistory('listings');
    setSearchHistory([]);
  }, []);

  /**
   * Handle advanced filter changes
   */
  const handleAdvancedFiltersChange = useCallback((newFilters: ListingAdvancedFilters) => {
    setAdvancedFilters(newFilters);

    // Update main filters
    setFilters(prev => ({
      ...prev,
      tier: newFilters.tier === 'all' ? '' : newFilters.tier,
      status: newFilters.status === 'all' ? '' : newFilters.status
    }));
  }, []);

  /**
   * Handle clear all advanced filters
   */
  const handleClearAdvancedFilters = useCallback(() => {
    setAdvancedFilters(DEFAULT_LISTING_FILTERS);
    setFilters({ tier: '', status: '', search: '' });
  }, []);

  /**
   * Toggle advanced filters panel
   */
  const handleToggleAdvancedFilters = useCallback(() => {
    setAdvancedFiltersOpen(prev => !prev);
  }, []);

  // GOVERNANCE: Admin-only access enforcement - AFTER all hooks
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-600 font-medium">Access Denied: Admin privileges required</div>
      </div>
    );
  }

  // ============================================================================
  // ACTION HANDLERS
  // ============================================================================

  const handleModerate = async (listingId: number, action: 'approve' | 'reject', reason?: string) => {
    try {
      // @governance MANDATORY - CSRF protection for PATCH requests
      // Source: osi-production-compliance.mdc, Layer 5 Security
      const response = await fetchWithCsrf(`/api/admin/listings/${listingId}/moderate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason })
      });

      if (response.ok) {
        await fetchListings();
        setModerationModalOpen(false);
        setSelectedListing(null);
      } else {
        const error = await response.json();
        alert(error.message ?? 'Failed to moderate listing');
      }
    } catch (error) {
      alert('Error moderating listing');
    }
  };

  const handleReject = (listing: Listing) => {
    setSelectedListing(listing);
    setModerationAction('reject');
    setModerationModalOpen(true);
  };

  const handleApprove = (listing: Listing) => {
    setSelectedListing(listing);
    setModerationAction('approve');
    setModerationModalOpen(true);
  };

  const handleDelete = async (listing: Listing) => {
    if (!confirm(`Delete listing "${listing.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      // @governance MANDATORY - CSRF protection for DELETE requests
      // Source: osi-production-compliance.mdc, Layer 7 Security
      const response = await fetchWithCsrf(`/api/admin/listings/${listing.id}`, {method: 'DELETE'});

      if (response.ok) {
        await fetchListings();
      } else {
        const error = await response.json();
        alert(error.message ?? 'Failed to delete listing');
      }
    } catch (error) {
      alert('Error deleting listing');
    }
  };

  // ============================================================================
  // PHASE 3: BATCH HANDLING BAR HANDLERS
  // (Note: Old bulkActions handlers removed - batch ops via BatchHandlingBar only)
  // ============================================================================
  // PHASE 5: Editor Modal Handlers
  // ============================================================================

  /**
   * Handler for "+ New" button - opens editor in create mode
   */
  const handleCreateNew = () => {
    setEditingListing(null);
    setEditorModalOpen(true);
  };

  /**
   * Handler for Edit action - opens editor in edit mode
   */
  const handleEdit = (listing: Listing) => {
    setEditingListing(listing);
    setEditorModalOpen(true);
  };

  /**
   * Handler for editor save - refreshes data
   */
  const handleEditorSave = async () => {
    await fetchListings();
  };

  /**
   * Handler for bulk approve operation
   * Sets selected listings to approved status via batch-update API
   */
  const handleBatchApprove = async () => {
    const selectedListings = listings.filter(l => selectedIds.has(l.id));
    if (selectedListings.length === 0) return;

    try {
      const response = await fetchWithCsrf('/api/admin/listings/batch-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingIds: selectedListings.map(l => l.id),
          updates: { approved: 'approved' }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to approve listings');
      }

      const result = await response.json();
      alert(`Successfully approved ${result.successCount} listing(s)${result.failureCount > 0 ? `, ${result.failureCount} failed` : ''}`);

      // Refresh data and clear selection
      await fetchListings();
      setSelectedIds(new Set());
    } catch (error) {
      ErrorService.capture('Batch approve error:', error);
      alert(error instanceof Error ? error.message : 'Failed to approve listings');
    }
  };

  /**
   * Handler for bulk suspend operation
   * Phase 4: Opens AdminPasswordModal first
   * Phase 4.5: Will chain to SuspendConfirmationModal after password
   */
  const handleBatchSuspend = () => {
    const selectedListings = listings.filter(l => selectedIds.has(l.id));
    if (selectedListings.length === 0) return;

    // Gate through password modal
    setPendingOperation({ type: 'suspend', listings: selectedListings });
    setPasswordModalOpen(true);
  };

  /**
   * Handler for clearing selection
   * Resets selectedIds to empty Set
   */
  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  /**
   * Handler for bulk delete operation
   * Phase 4: Opens AdminPasswordModal first
   * Phase 4.5: Will chain to DeleteConfirmationModal after password
   */
  const handleBatchDelete = () => {
    const selectedListings = listings.filter(l => selectedIds.has(l.id));
    if (selectedListings.length === 0) return;

    // Gate through password modal
    setPendingOperation({ type: 'delete', listings: selectedListings });
    setPasswordModalOpen(true);
  };

  // ============================================================================
  // PHASE 4: Password Verification Handler
  // ============================================================================

  /**
   * Handler called when password is successfully verified
   * Phase 4.5: Opens confirmation modal instead of executing directly
   */
  const handlePasswordVerified = () => {
    if (!pendingOperation) return;

    if (pendingOperation.type === 'delete') {
      // Phase 4.5: Open DeleteConfirmationModal
      setDeletingIndividual(false);
      setIndividualDeleteListing(null);
      setDeleteConfirmOpen(true);
    } else if (pendingOperation.type === 'suspend') {
      // Phase 4.5: Open SuspendConfirmationModal
      setSuspendingIndividual(false);
      setIndividualSuspendListing(null);
      setSuspendConfirmOpen(true);
    }

    // Keep pendingOperation so confirmation modal can access the listings
    // It will be cleared when confirmation modal closes
  };

  /**
   * Handler for individual listing suspend
   * Phase 4.5: Gates through password modal, then confirmation
   */
  const handleIndividualSuspend = (listing: Listing) => {
    setPendingOperation({ type: 'suspend', listings: [listing] });
    setSuspendingIndividual(true);
    setIndividualSuspendListing(listing);
    setPasswordModalOpen(true);
  };

  /**
   * Handler for individual listing delete (password gated)
   * Phase 4.5: Gates through password modal, then confirmation
   */
  const handleIndividualDelete = (listing: Listing) => {
    setPendingOperation({ type: 'delete', listings: [listing] });
    setDeletingIndividual(true);
    setIndividualDeleteListing(listing);
    setPasswordModalOpen(true);
  };

  /**
   * Handler called after successful delete to refresh data
   */
  const handleDeleteExecute = async () => {
    await fetchListings();
    setSelectedIds(new Set());
    setPendingOperation(null);
  };

  /**
   * Handler called after successful suspend to refresh data
   */
  const handleSuspendExecute = async () => {
    await fetchListings();
    setSelectedIds(new Set());
    setPendingOperation(null);
  };

  /**
   * Get operation description for password modal
   */
  const getOperationDescription = (): string => {
    if (!pendingOperation) return 'perform this action';

    const count = pendingOperation.listings.length;
    const noun = count === 1 ? 'listing' : 'listings';

    if (pendingOperation.type === 'delete') {
      return `delete ${count} ${noun}`;
    } else if (pendingOperation.type === 'suspend') {
      return `suspend ${count} ${noun}`;
    }

    return 'perform this action';
  };

  const actions: TableAction<Listing>[] = [
    {
      label: 'View',
      icon: <Eye className="w-4 h-4" />,
      iconOnly: true,
      onClick: (listing: Listing) => window.open(`/listings/${listing.slug || listing.id}`, '_blank')
    },
    {
      label: 'Edit',
      icon: <Edit2 className="w-4 h-4" />,
      iconOnly: true,
      onClick: (listing: Listing) => handleEdit(listing)
    },
    {
      label: 'Activity',
      icon: <Clock className="w-4 h-4" />,
      iconOnly: true,
      onClick: (listing: Listing) => handleViewActivity(listing)
    },
    {
      label: 'Approve',
      icon: <CheckCircle className="w-4 h-4" />,
      iconOnly: true,
      onClick: (listing: Listing) => handleApprove(listing),
      variant: 'primary',
      isHidden: (listing: Listing) => listing.approved !== 'pending'
    },
    {
      label: 'Reject',
      icon: <XCircle className="w-4 h-4" />,
      iconOnly: true,
      onClick: (listing: Listing) => handleReject(listing),
      variant: 'danger',
      isHidden: (listing: Listing) => listing.approved !== 'pending'
    },
    {
      label: 'Suspend',
      icon: <PauseCircle className="w-4 h-4" />,
      iconOnly: true,
      onClick: (listing: Listing) => {
        handleIndividualSuspend(listing);
      },
      variant: 'warning'
    },
    {
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      iconOnly: true,
      onClick: (listing: Listing) => {
        handleIndividualDelete(listing);
      },
      variant: 'danger'
    }
  ];

  // Note: bulkActions removed from AdminTableTemplate to eliminate duplicate checkboxes.
  // Batch operations are now handled exclusively by BatchHandlingBar (Phase 3) using page's selectedIds state.

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={selectedIds.size > 0 ? 'pb-20' : ''}>
      {/* Page Header with Title and Action Buttons - matches Users Manager pattern */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Listings Manager</h1>
        <div className="flex gap-3 items-center">
          <button
            onClick={handleCreateNew}
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

      {/* Statistics Panel - Phase 1 */}
      <ListingStatistics />

      {/* Phase 6: Search and Filter Section */}
      <div className="mb-6 space-y-4">
        {/* Search Row */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* ListingSearch Component */}
          <ListingSearch
            onSearch={handleSearch}
            searchHistory={searchHistory}
            onHistoryItemClick={handleHistoryItemClick}
            onClearHistory={handleClearHistory}
            isDebouncing={isDebouncing}
          />

          {/* Advanced Filters Toggle */}
          <ListingAdvancedFilterPanel
            isOpen={advancedFiltersOpen}
            filters={advancedFilters}
            onChange={handleAdvancedFiltersChange}
            onClear={handleClearAdvancedFilters}
            onToggle={handleToggleAdvancedFilters}
            activeFilterCount={activeFilterCount}
          />
        </div>
      </div>

      {/* Table container with header */}
      <div className="bg-white rounded shadow">
        {/* Table header with pagination controls and refresh button */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Listings</h2>

          {/* Pagination controls */}
          <div className="flex items-center gap-4">
            {/* Page size dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 hidden sm:inline">Show</span>
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
                aria-label="Page size"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value="all">All</option>
              </select>
            </div>

            {/* Results range indicator */}
            <span className="text-sm text-gray-600 hidden md:inline">
              Showing {pagination.total === 0 ? 0 : ((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} results
            </span>

            {/* Page navigation */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1 || loading}
                className="p-1.5 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                title="Previous page"
                aria-label="Previous page"
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
                aria-label="Next page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>

            {/* Refresh button */}
            <button
              onClick={() => fetchListings()}
              disabled={loading}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh listings"
              aria-label="Refresh listings"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <AdminTableTemplate<Listing>
          title=""
          tableId="admin-listings"
          defaultHiddenColumns={['logo', 'created_at', 'mock', 'type']}
          data={listings}
          columns={columns}
          rowKey={(row: Listing) => row.id}
          actions={actions}
          loading={loading}
          searchable={false}
          pagination={{
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onPageChange: (page: number) => setPagination({ ...pagination, page })
          }}
          emptyMessage="No listings found"
          // Server-side sorting - delegates to parent for database-level ordering
          onSort={handleColumnSort}
          sortState={{ column: sortColumn, direction: sortDirection }}
        />
      </div>

      {/* Moderation Modal */}
      {selectedListing && (
        <ModerationModal
          listing={selectedListing}
          action={moderationAction}
          isOpen={moderationModalOpen}
          onClose={() => {
            setModerationModalOpen(false);
            setSelectedListing(null);
          }}
          onConfirm={(reason) => handleModerate(selectedListing.id, moderationAction, reason)}
        />
      )}

      {/* Phase 4: AdminPasswordModal - Password verification for destructive operations */}
      <AdminPasswordModal
        isOpen={passwordModalOpen}
        onClose={() => {
          setPasswordModalOpen(false);
          setPendingOperation(null);
        }}
        onVerified={handlePasswordVerified}
        operationDescription={getOperationDescription()}
      />

      {/* Phase 4.5: DeleteConfirmationModal - Final confirmation before deletion */}
      <DeleteConfirmationModal
        isOpen={deleteConfirmOpen}
        selectedListings={pendingOperation?.listings ?? []}
        deletingIndividual={deletingIndividual}
        individualListing={individualDeleteListing}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setPendingOperation(null);
          setIndividualDeleteListing(null);
        }}
        onExecute={handleDeleteExecute}
      />

      {/* Phase 4.5: SuspendConfirmationModal - Suspension with reason requirement */}
      <SuspendConfirmationModal
        isOpen={suspendConfirmOpen}
        selectedListings={pendingOperation?.listings ?? []}
        suspendingIndividual={suspendingIndividual}
        individualListing={individualSuspendListing}
        onClose={() => {
          setSuspendConfirmOpen(false);
          setPendingOperation(null);
          setIndividualSuspendListing(null);
        }}
        onExecute={handleSuspendExecute}
      />

      {/* Phase 8: NewListingModal - Replace ListingEditorModal for create mode */}
      {editorModalOpen && !editingListing && (
        <NewListingModal
          isOpen={true}
          onClose={() => {
            setEditorModalOpen(false);
            setEditingListing(null);
          }}
          onSuccess={(listingId: number) => {
            handleEditorSave();
            setEditorModalOpen(false);
          }}
          userRole="admin"
        />
      )}

      {/* Phase 8: EditListingModal - Replace ListingEditorModal for edit mode */}
      {editorModalOpen && editingListing && (
        <EditListingModal
          isOpen={true}
          onClose={() => {
            setEditorModalOpen(false);
            setEditingListing(null);
          }}
          onSuccess={(listingId: number) => {
            handleEditorSave();
            setEditorModalOpen(false);
          }}
          listingId={editingListing.id}
          userRole="admin"
        />
      )}

      {/* Phase 7: Import/Export Modal */}
      <ListingImportExportModal
        isOpen={importExportModalOpen}
        onClose={() => setImportExportModalOpen(false)}
        listings={listings}
        selectedIds={selectedIds}
        onImportComplete={handleImportComplete}
      />

      {/* Phase 8: Activity Log Modal */}
      <ActivityLogModal
        listing={activityListing}
        isOpen={activityModalOpen}
        onClose={() => {
          setActivityModalOpen(false);
          setActivityListing(null);
        }}
      />

      {/* Phase 3: BatchHandlingBar - Floating action bar for batch operations */}
      <BatchHandlingBar
        selectedCount={selectedIds.size}
        isMobile={isMobile}
        onBulkApprove={handleBatchApprove}
        onBulkSuspend={handleBatchSuspend}
        onBulkDelete={handleBatchDelete}
        onClearSelection={handleClearSelection}
      />
    </div>
  );
}
