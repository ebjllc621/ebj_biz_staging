/**
 * Admin Creator Profiles Manager Page
 * /admin/creator-profiles
 *
 * GOVERNANCE COMPLIANCE:
 * - Template: AdminTableTemplate (ADVANCED tier, ErrorBoundary required)
 * - Authentication: Admin-only access required
 * - Service Boundary: NO direct database access (API routes only)
 * - Credentials: 'include' for all fetch requests
 * - CSRF: fetchWithCsrf for state-changing requests (PATCH)
 * - Modals: BizModal MANDATORY
 *
 * Features:
 * - Tabbed interface (Affiliate Marketers | Internet Personalities)
 * - Statistics panel per tab
 * - Search and status filter
 * - Verify, Feature, Status actions
 * - Review moderation modal
 * - Server-side pagination
 *
 * @authority CLAUDE.md - Admin Development
 * @phase Tier 3 Creator Profiles - Phase 7
 * @tier ADVANCED
 */

'use client';

// Force dynamic rendering (required for useAuth() - React Context cannot be used in SSG)
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminTableTemplate, TableColumn, TableAction } from '@/components/admin/templates/AdminTableTemplate';
import { AdminStatsPanel, StatSection } from '@/components/admin/shared/AdminStatsPanel';
import { AdminPageHeader } from '@/components/admin/shared/AdminPageHeader';
import { AdminImportExportModal } from '@/components/admin/shared/AdminImportExportModal';
import { BizModal, BizModalButton } from '@/components/ui/BizModal';
import { useAuth } from '@core/hooks/useAuth';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ErrorFallback } from '@/components/common/ErrorFallback';
import { fetchWithCsrf } from '@core/utils/csrf';
import { AffiliateMarketerFormModal } from '@features/dashboard/components/managers/creator-profiles/AffiliateMarketerFormModal';
import { InternetPersonalityFormModal } from '@features/dashboard/components/managers/creator-profiles/InternetPersonalityFormModal';
import { PodcasterFormModal } from '@features/dashboard/components/managers/creator-profiles/PodcasterFormModal';
import type { AffiliateMarketerProfile } from '@core/types/affiliate-marketer';
import type { InternetPersonalityProfile } from '@core/types/internet-personality';
import type { PodcasterProfile } from '@core/types/podcaster';
import {
  Eye,
  Edit2,
  Star,
  StarOff,
  ShieldCheck,
  Shield,
  CheckCircle,
  XCircle,
  Search,
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type CreatorTab = 'affiliate-marketers' | 'internet-personalities' | 'podcasters';

interface CreatorProfile {
  id: number;
  user_id: number;
  display_name: string;
  slug: string;
  status: string;
  is_verified: boolean;
  is_featured: boolean;
  rating_average: number;
  rating_count: number;
  view_count: number;
  contact_count: number;
  recommendation_count: number;
  pending_review_count: number;
  created_at: string;
}

interface AdminStats {
  totalProfiles: number;
  activeCount: number;
  pendingCount: number;
  suspendedCount: number;
  inactiveCount: number;
  verifiedCount: number;
  featuredCount: number;
  pendingReviewCount: number;
}

interface ProfileReview {
  id: number;
  reviewer_user_id: number;
  reviewer_display_name: string | null;
  rating: number;
  review_text: string | null;
  status: string;
  created_at: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
    suspended: 'bg-red-100 text-red-700',
    inactive: 'bg-gray-100 text-gray-700',
  };
  const cls = colorMap[status] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  const numRating = Number(rating) || 0;
  const numCount = Number(count) || 0;
  return (
    <div className="flex items-center gap-1">
      <Star size={13} className="text-yellow-400 fill-yellow-400" />
      <span className="text-sm">{numRating > 0 ? numRating.toFixed(1) : '—'}</span>
      <span className="text-xs text-gray-400">({numCount})</span>
    </div>
  );
}

// ============================================================================
// INNER PAGE COMPONENT
// ============================================================================

const VALID_TABS: CreatorTab[] = ['affiliate-marketers', 'internet-personalities', 'podcasters'];

function AdminCreatorProfilesPageInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') as CreatorTab | null;

  const [activeTab, setActiveTab] = useState<CreatorTab>(
    initialTab && VALID_TABS.includes(initialTab) ? initialTab : 'affiliate-marketers'
  );
  const [profiles, setProfiles] = useState<CreatorProfile[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<CreatorProfile | null>(null);
  const [reviews, setReviews] = useState<ProfileReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Create/Edit modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<CreatorProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Import/Export modal state
  const [importExportOpen, setImportExportOpen] = useState(false);

  const PAGE_SIZE = 20;

  // --------------------------------------------------------------------------
  // Data Fetching
  // --------------------------------------------------------------------------

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: activeTab,
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery) params.set('q', searchQuery);

      const res = await fetch(`/api/admin/creator-profiles?${params.toString()}`, {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        const payload = data.data ?? data;
        setProfiles(payload.profiles ?? []);
        setTotal(payload.pagination?.total ?? 0);
        setStats(payload.stats ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, searchQuery, statusFilter]);

  const fetchReviews = useCallback(async (profileId: number, type: CreatorTab) => {
    setReviewsLoading(true);
    try {
      const res = await fetch(
        `/api/admin/creator-profiles/${profileId}/reviews?type=${type}`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const data = await res.json();
        const payload = data.data ?? data;
        setReviews(payload.reviews ?? []);
      }
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchProfiles();
    }
  }, [user, activeTab, page, searchQuery, statusFilter, fetchProfiles]);

  // Reset page on tab/filter/search changes
  useEffect(() => {
    setPage(1);
  }, [activeTab, statusFilter, searchQuery]);

  // --------------------------------------------------------------------------
  // Auth guards (after all hooks)
  // --------------------------------------------------------------------------

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

  // --------------------------------------------------------------------------
  // Action Handlers
  // --------------------------------------------------------------------------

  const handleAction = async (profile: CreatorProfile, action: string) => {
    await fetchWithCsrf(`/api/admin/creator-profiles/${profile.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: activeTab, action }),
    });
    fetchProfiles();
  };

  const handleViewReviews = (profile: CreatorProfile) => {
    setSelectedProfile(profile);
    setReviewModalOpen(true);
    fetchReviews(profile.id, activeTab);
  };

  const handleReviewAction = async (reviewId: number, action: 'approve' | 'reject') => {
    if (!selectedProfile) return;
    await fetchWithCsrf(`/api/admin/creator-profiles/${selectedProfile.id}/reviews`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: activeTab, reviewId, action }),
    });
    // Refresh reviews
    fetchReviews(selectedProfile.id, activeTab);
    // Refresh profile list to update pending_review_count
    fetchProfiles();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  // --------------------------------------------------------------------------
  // Create / Edit Handlers
  // --------------------------------------------------------------------------

  const profileTypeMap: Record<CreatorTab, string> = {
    'affiliate-marketers': 'affiliate_marketer',
    'internet-personalities': 'internet_personality',
    'podcasters': 'podcaster',
  };

  const handleCreateNew = () => {
    setEditingProfile(null);
    setCreateModalOpen(true);
  };

  const handleEdit = (profile: CreatorProfile) => {
    setEditingProfile(profile);
  };

  const handleCreateSubmit = async (data: Record<string, unknown>) => {
    setIsSubmitting(true);
    try {
      const res = await fetchWithCsrf('/api/admin/creator-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileType: profileTypeMap[activeTab],
          user_id: data.user_id,
          ...data,
        }),
      });
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error?.message || 'Failed to create profile');
      }
      setCreateModalOpen(false);
      fetchProfiles();
    } catch (err) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (data: Record<string, unknown>) => {
    if (!editingProfile) return;
    setIsSubmitting(true);
    try {
      const res = await fetchWithCsrf(`/api/admin/creator-profiles/${editingProfile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeTab,
          ...data,
        }),
      });
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error?.message || 'Failed to update profile');
      }
      setEditingProfile(null);
      fetchProfiles();
    } catch (err) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // --------------------------------------------------------------------------
  // Stats Panel
  // --------------------------------------------------------------------------

  const statsSections: StatSection[] = stats
    ? [
        {
          title: 'Profiles',
          items: [
            { label: 'Total', value: stats.totalProfiles, bold: true },
            { label: 'Active', value: stats.activeCount },
            { label: 'Pending', value: stats.pendingCount },
            { label: 'Suspended', value: stats.suspendedCount },
            { label: 'Inactive', value: stats.inactiveCount },
          ],
        },
        {
          title: 'Quality',
          items: [
            { label: 'Verified', value: stats.verifiedCount },
            { label: 'Featured', value: stats.featuredCount },
            { label: 'Pending Reviews', value: stats.pendingReviewCount, bold: stats.pendingReviewCount > 0 },
          ],
        },
      ]
    : [];

  // --------------------------------------------------------------------------
  // Column Definitions
  // --------------------------------------------------------------------------

  const columns: TableColumn<CreatorProfile>[] = [
    {
      key: 'display_name',
      header: 'Profile',
      accessor: (row) => (
        <div>
          <div className="font-medium truncate max-w-xs" title={row.display_name}>
            {row.display_name.length > 45 ? row.display_name.slice(0, 45) + '…' : row.display_name}
          </div>
          <div className="text-xs text-gray-400 truncate max-w-xs">{row.slug}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'is_verified',
      header: 'Verified',
      accessor: (row) =>
        row.is_verified ? (
          <ShieldCheck size={16} className="text-blue-500" />
        ) : (
          <Shield size={16} className="text-gray-300" />
        ),
    },
    {
      key: 'is_featured',
      header: 'Featured',
      accessor: (row) =>
        row.is_featured ? (
          <Star size={16} className="text-yellow-400 fill-yellow-400" />
        ) : (
          <StarOff size={16} className="text-gray-300" />
        ),
    },
    {
      key: 'rating',
      header: 'Rating',
      accessor: (row) => <StarRating rating={row.rating_average} count={row.rating_count} />,
      sortable: true,
      sortValue: (row) => row.rating_average,
    },
    {
      key: 'stats',
      header: 'Views / Contacts',
      accessor: (row) => (
        <span className="text-sm text-gray-600">
          {row.view_count} / {row.contact_count}
        </span>
      ),
    },
    {
      key: 'recommendation_count',
      header: 'Recommends',
      accessor: (row) => row.recommendation_count,
      sortable: true,
      sortValue: (row) => row.recommendation_count,
    },
    {
      key: 'pending_reviews',
      header: 'Pending Reviews',
      accessor: (row) =>
        row.pending_review_count > 0 ? (
          <button
            onClick={() => handleViewReviews(row)}
            className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 cursor-pointer"
          >
            {row.pending_review_count} pending
          </button>
        ) : (
          <span className="text-xs text-gray-400">None</span>
        ),
    },
    {
      key: 'created_at',
      header: 'Created',
      accessor: (row) => formatRelativeDate(row.created_at),
    },
  ];

  // --------------------------------------------------------------------------
  // Table Actions
  // --------------------------------------------------------------------------

  const tableActions: TableAction<CreatorProfile>[] = [
    {
      label: 'Edit',
      icon: <Edit2 size={14} />,
      iconOnly: true,
      variant: 'secondary',
      onClick: handleEdit,
    },
    {
      label: 'View Reviews',
      icon: <Eye size={14} />,
      iconOnly: true,
      variant: 'secondary',
      onClick: handleViewReviews,
    },
    {
      label: 'Toggle Verify',
      icon: <ShieldCheck size={14} />,
      iconOnly: true,
      variant: 'secondary',
      onClick: (row) => handleAction(row, row.is_verified ? 'unverify' : 'verify'),
    },
    {
      label: 'Toggle Featured',
      icon: <Star size={14} />,
      iconOnly: true,
      variant: 'secondary',
      onClick: (row) => handleAction(row, row.is_featured ? 'unfeature' : 'feature'),
    },
    {
      label: 'Toggle Status',
      icon: <CheckCircle size={14} />,
      iconOnly: true,
      variant: 'secondary',
      onClick: (row) => handleAction(row, row.status === 'active' ? 'suspend' : 'activate'),
    },
  ];

  // --------------------------------------------------------------------------
  // Tabs
  // --------------------------------------------------------------------------

  const tabs: { key: CreatorTab; label: string }[] = [
    { key: 'affiliate-marketers', label: 'Affiliate Marketers' },
    { key: 'internet-personalities', label: 'Internet Personalities' },
    { key: 'podcasters', label: 'Podcasters' },
  ];

  const tabLabel = activeTab === 'affiliate-marketers'
    ? 'Affiliate Marketers'
    : activeTab === 'internet-personalities'
      ? 'Internet Personalities'
      : 'Podcasters';

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <>
      {/* Header with +New and Import/Export buttons */}
      <AdminPageHeader
        title="Creator Profiles Manager"
        onCreateNew={handleCreateNew}
        createLabel={`+ New ${tabLabel.replace(/s$/, '')}`}
        onImportExport={() => setImportExportOpen(true)}
      />

      {/* Stats Panel */}
      <div className="mb-6">
        <AdminStatsPanel
          title="Profile Statistics"
          sections={statsSections}
          loading={loading}
        />
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-[#ed6437] text-[#ed6437]'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search profiles..."
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore="true"
              className="pl-8 pr-3 py-1.5 border rounded text-sm w-56"
            />
          </div>
          <button type="submit" className="px-3 py-1.5 bg-[#ed6437] text-white rounded text-sm hover:bg-[#d55a2f]">
            Search
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setSearchInput(''); }}
              className="px-3 py-1.5 border rounded text-sm text-gray-600 hover:bg-gray-50"
            >
              Clear
            </button>
          )}
        </form>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 border rounded text-sm"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <AdminTableTemplate<CreatorProfile>
        title={`${tabLabel} (${total})`}
        data={profiles}
        columns={columns}
        rowKey={(row) => row.id}
        actions={tableActions}
        loading={loading}
        emptyMessage={`No ${tabLabel.toLowerCase()} found`}
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          total,
          onPageChange: setPage,
        }}
        tableId={`admin-creator-profiles-${activeTab}`}
      />

      {/* Review Moderation Modal */}
      <BizModal
        isOpen={reviewModalOpen}
        onClose={() => { setReviewModalOpen(false); setSelectedProfile(null); setReviews([]); }}
        title={selectedProfile ? `Reviews: ${selectedProfile.display_name}` : 'Reviews'}
        size="large"
      >
        {reviewsLoading ? (
          <div className="py-8 text-center text-gray-500 text-sm">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="py-8 text-center text-gray-500 text-sm">No reviews found</div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="border rounded p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="font-medium text-sm">
                      {review.reviewer_display_name ?? `User #${review.reviewer_user_id}`}
                    </span>
                    <div className="flex items-center gap-1 mt-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={12}
                          className={i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                        />
                      ))}
                    </div>
                  </div>
                  <StatusBadge status={review.status} />
                </div>
                {review.review_text && (
                  <p className="text-sm text-gray-700 mb-3">{review.review_text}</p>
                )}
                <div className="text-xs text-gray-400 mb-3">{formatRelativeDate(review.created_at)}</div>
                {review.status === 'pending' && (
                  <div className="flex gap-2">
                    <BizModalButton
                      variant="primary"
                      onClick={() => handleReviewAction(review.id, 'approve')}
                    >
                      <CheckCircle size={14} className="mr-1" />
                      Approve
                    </BizModalButton>
                    <BizModalButton
                      variant="danger"
                      onClick={() => handleReviewAction(review.id, 'reject')}
                    >
                      <XCircle size={14} className="mr-1" />
                      Reject
                    </BizModalButton>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </BizModal>

      {/* Create Profile Modals (tab-dependent) */}
      {createModalOpen && activeTab === 'affiliate-marketers' && (
        <AffiliateMarketerFormModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSubmit={handleCreateSubmit}
          isSubmitting={isSubmitting}
        />
      )}
      {createModalOpen && activeTab === 'internet-personalities' && (
        <InternetPersonalityFormModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSubmit={handleCreateSubmit}
          isSubmitting={isSubmitting}
        />
      )}
      {createModalOpen && activeTab === 'podcasters' && (
        <PodcasterFormModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSubmit={handleCreateSubmit}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Edit Profile Modals (tab-dependent with initialData) */}
      {editingProfile && activeTab === 'affiliate-marketers' && (
        <AffiliateMarketerFormModal
          isOpen={true}
          onClose={() => setEditingProfile(null)}
          onSubmit={handleEditSubmit}
          isSubmitting={isSubmitting}
          initialData={{
            display_name: editingProfile.display_name,
            headline: (editingProfile as unknown as AffiliateMarketerProfile).headline ?? '',
            bio: (editingProfile as unknown as AffiliateMarketerProfile).bio ?? '',
            niches: ((editingProfile as unknown as AffiliateMarketerProfile).niches ?? []).join(', '),
            specializations: ((editingProfile as unknown as AffiliateMarketerProfile).specializations ?? []).join(', '),
            affiliate_networks: ((editingProfile as unknown as AffiliateMarketerProfile).affiliate_networks ?? []).join(', '),
            commission_range_min: (editingProfile as unknown as AffiliateMarketerProfile).commission_range_min?.toString() ?? '',
            commission_range_max: (editingProfile as unknown as AffiliateMarketerProfile).commission_range_max?.toString() ?? '',
            flat_fee_min: (editingProfile as unknown as AffiliateMarketerProfile).flat_fee_min?.toString() ?? '',
            flat_fee_max: (editingProfile as unknown as AffiliateMarketerProfile).flat_fee_max?.toString() ?? '',
            audience_size: (editingProfile as unknown as AffiliateMarketerProfile).audience_size?.toString() ?? '',
            platforms: ((editingProfile as unknown as AffiliateMarketerProfile).platforms ?? []).join(', '),
            website_url: (editingProfile as unknown as AffiliateMarketerProfile).website_url ?? '',
            location: (editingProfile as unknown as AffiliateMarketerProfile).location ?? '',
          }}
        />
      )}
      {editingProfile && activeTab === 'internet-personalities' && (
        <InternetPersonalityFormModal
          isOpen={true}
          onClose={() => setEditingProfile(null)}
          onSubmit={handleEditSubmit}
          isSubmitting={isSubmitting}
          initialData={{
            display_name: editingProfile.display_name,
            headline: (editingProfile as unknown as InternetPersonalityProfile).headline ?? '',
            bio: (editingProfile as unknown as InternetPersonalityProfile).bio ?? '',
            content_categories: ((editingProfile as unknown as InternetPersonalityProfile).content_categories ?? []).join(', '),
            platforms: ((editingProfile as unknown as InternetPersonalityProfile).platforms ?? []).join(', '),
            creating_since: (editingProfile as unknown as InternetPersonalityProfile).creating_since?.toString() ?? '',
            total_reach: (editingProfile as unknown as InternetPersonalityProfile).total_reach?.toString() ?? '',
            avg_engagement_rate: (editingProfile as unknown as InternetPersonalityProfile).avg_engagement_rate?.toString() ?? '',
            collaboration_types: ((editingProfile as unknown as InternetPersonalityProfile).collaboration_types ?? []).join(', '),
            website_url: (editingProfile as unknown as InternetPersonalityProfile).website_url ?? '',
            media_kit_url: (editingProfile as unknown as InternetPersonalityProfile).media_kit_url ?? '',
            management_contact: (editingProfile as unknown as InternetPersonalityProfile).management_contact ?? '',
            location: (editingProfile as unknown as InternetPersonalityProfile).location ?? '',
          }}
        />
      )}
      {editingProfile && activeTab === 'podcasters' && (
        <PodcasterFormModal
          isOpen={true}
          onClose={() => setEditingProfile(null)}
          onSubmit={handleEditSubmit}
          isSubmitting={isSubmitting}
          initialData={{
            display_name: editingProfile.display_name,
            podcast_name: (editingProfile as unknown as PodcasterProfile).podcast_name ?? '',
            headline: (editingProfile as unknown as PodcasterProfile).headline ?? '',
            bio: (editingProfile as unknown as PodcasterProfile).bio ?? '',
            hosting_platform: (editingProfile as unknown as PodcasterProfile).hosting_platform ?? '',
            rss_feed_url: (editingProfile as unknown as PodcasterProfile).rss_feed_url ?? '',
            genres: ((editingProfile as unknown as PodcasterProfile).genres ?? []).join(', '),
            publishing_frequency: (editingProfile as unknown as PodcasterProfile).publishing_frequency ?? '',
            avg_episode_length: (editingProfile as unknown as PodcasterProfile).avg_episode_length?.toString() ?? '',
            guest_booking_info: (editingProfile as unknown as PodcasterProfile).guest_booking_info ?? '',
            monetization_methods: ((editingProfile as unknown as PodcasterProfile).monetization_methods ?? []).join(', '),
            website_url: (editingProfile as unknown as PodcasterProfile).website_url ?? '',
            location: (editingProfile as unknown as PodcasterProfile).location ?? '',
          }}
        />
      )}

      {/* Import / Export Modal */}
      <AdminImportExportModal
        isOpen={importExportOpen}
        onClose={() => setImportExportOpen(false)}
        entityType={activeTab}
        entityLabel={tabLabel}
        exportEndpoint={`/api/admin/creator-profiles?type=${activeTab}&limit=10000`}
        exportDataKey="profiles"
        onImportComplete={() => { setImportExportOpen(false); fetchProfiles(); }}
      />
    </>
  );
}

// ============================================================================
// EXPORTED PAGE WITH ERROR BOUNDARY
// ============================================================================

export default function AdminCreatorProfilesPage() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="text-gray-500">Loading...</div></div>}>
        <AdminCreatorProfilesPageInner />
      </Suspense>
    </ErrorBoundary>
  );
}
