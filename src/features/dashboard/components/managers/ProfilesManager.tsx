/**
 * ProfilesManager - Creator Profile Management (Affiliate Marketer + Internet Personality + Podcaster)
 *
 * @description Manage creator profiles with create/edit operations, portfolio/collaboration/episode
 *   management, reordering, and profile preview via /api/dashboard/listings/[listingId]/creator-profiles
 * @component Client Component
 * @tier ADVANCED
 * @phase Tier 3 Creator Profiles - Phase 8C (extends Phase 8B - Podcaster Parity)
 * @authority docs/pages/layouts/admin/PODCASTER_PARITY_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use ErrorBoundary (ADVANCED tier requirement)
 * - Orange theme (#ed6437) for action buttons
 * - BizModal for all modals (MANDATORY — delegated to form modals)
 * - fetchWithCsrf for all mutations
 * - Creator Suite add-on gating
 * - getAvatarInitials from @core/utils/avatar — NO local implementations
 * - Follows ContentManager.tsx pattern
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Loader2,
  AlertCircle,
  Briefcase,
  Users,
  ScrollText,
  Eye,
  Phone,
  Star,
  FolderOpen,
  ExternalLink,
  Trash2,
  ChevronDown,
  ChevronUp,
  Pencil,
  ArrowUp,
  ArrowDown,
  Mic,
  Clock,
  Download,
} from 'lucide-react';
import Link from 'next/link';
import type { Route } from 'next';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { fetchWithCsrf } from '@core/utils/csrf';
import { getAvatarInitials } from '@core/utils/avatar';
import { AffiliateMarketerFormModal } from './creator-profiles/AffiliateMarketerFormModal';
import { InternetPersonalityFormModal } from './creator-profiles/InternetPersonalityFormModal';
import { PortfolioItemFormModal } from './creator-profiles/PortfolioItemFormModal';
import { CollaborationItemFormModal } from './creator-profiles/CollaborationItemFormModal';
import { PodcasterFormModal } from './creator-profiles/PodcasterFormModal';
import { EpisodeItemFormModal } from './creator-profiles/EpisodeItemFormModal';
import { ProfilePreviewPanel } from './creator-profiles/ProfilePreviewPanel';
import { ProfileAnalyticsPanel } from './creator-profiles/ProfileAnalyticsPanel';
import { CampaignAnalyticsDashboard } from './creator-profiles/CampaignAnalyticsDashboard';
import { PlatformConnectionManager } from './creator-profiles/PlatformConnectionManager';
import { MediaKitGenerator } from './creator-profiles/MediaKitGenerator';
import { SEOPreviewPanel } from './content/SEOPreviewPanel';
import type { AffiliateMarketerProfile, PortfolioItem } from '@core/types/affiliate-marketer';
import type { InternetPersonalityProfile, Collaboration } from '@core/types/internet-personality';
import type { PodcasterProfile, PodcasterEpisode } from '@core/types/podcaster';

// ============================================================================
// TYPES
// ============================================================================

type ProfileTab = 'affiliate_marketer' | 'internet_personality' | 'podcaster';

// ============================================================================
// STATUS BADGE HELPER
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
    suspended: 'bg-red-100 text-red-800',
    inactive: 'bg-gray-100 text-gray-600',
  };
  const color = colorMap[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${color}`}>
      {status}
    </span>
  );
}

// ============================================================================
// COMPONENT (inner)
// ============================================================================

function ProfilesManagerContent() {
  const { selectedListingId } = useListingContext();

  // Tab state
  const [activeTab, setActiveTab] = useState<ProfileTab>('affiliate_marketer');

  // Data state
  const [amProfile, setAmProfile] = useState<AffiliateMarketerProfile | null>(null);
  const [ipProfile, setIpProfile] = useState<InternetPersonalityProfile | null>(null);
  const [podProfile, setPodProfile] = useState<PodcasterProfile | null>(null);
  const [portfolioCount, setPortfolioCount] = useState(0);
  const [collaborationCount, setCollaborationCount] = useState(0);
  const [episodeCount, setEpisodeCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Creator Suite gating
  const [hasCreatorSuite, setHasCreatorSuite] = useState<boolean | null>(null);

  // Profile modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<AffiliateMarketerProfile | InternetPersonalityProfile | PodcasterProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Portfolio/Collaboration items
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [collaborationItems, setCollaborationItems] = useState<Collaboration[]>([]);
  const [isPortfolioLoading, setIsPortfolioLoading] = useState(false);
  const [isCollabLoading, setIsCollabLoading] = useState(false);

  // Portfolio/Collaboration modal state
  const [isPortfolioFormOpen, setIsPortfolioFormOpen] = useState(false);
  const [editingPortfolioItem, setEditingPortfolioItem] = useState<PortfolioItem | null>(null);
  const [isCollabFormOpen, setIsCollabFormOpen] = useState(false);
  const [editingCollabItem, setEditingCollabItem] = useState<Collaboration | null>(null);
  const [isItemSubmitting, setIsItemSubmitting] = useState(false);

  // Section collapse state
  const [isPortfolioExpanded, setIsPortfolioExpanded] = useState(true);
  const [isCollabExpanded, setIsCollabExpanded] = useState(true);

  // Podcaster episode state
  const [episodeItems, setEpisodeItems] = useState<PodcasterEpisode[]>([]);
  const [isEpisodesLoading, setIsEpisodesLoading] = useState(false);
  const [isEpisodeFormOpen, setIsEpisodeFormOpen] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<PodcasterEpisode | null>(null);
  const [isEpisodesExpanded, setIsEpisodesExpanded] = useState(true);

  // Preview state
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);

  // Delete confirmation
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const [deletingItemType, setDeletingItemType] = useState<'portfolio' | 'collaboration' | 'episode' | null>(null);

  // ============================================================================
  // Fetch profiles
  // ============================================================================

  const fetchProfiles = useCallback(async () => {
    if (!selectedListingId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/dashboard/listings/${selectedListingId}/creator-profiles`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        if (response.status === 403) {
          setHasCreatorSuite(false);
          return;
        }
        throw new Error('Failed to fetch creator profiles');
      }

      const result = await response.json();
      if (result.success) {
        setAmProfile(result.data.profiles.affiliate_marketer ?? null);
        setIpProfile(result.data.profiles.internet_personality ?? null);
        setPodProfile(result.data.profiles.podcaster ?? null);
        setPortfolioCount(result.data.portfolioCount ?? 0);
        setCollaborationCount(result.data.collaborationCount ?? 0);
        setEpisodeCount(result.data.episodeCount ?? 0);
        setHasCreatorSuite(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load creator profiles');
    } finally {
      setIsLoading(false);
    }
  }, [selectedListingId]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // ============================================================================
  // Fetch portfolio items
  // ============================================================================

  const fetchPortfolioItems = useCallback(async () => {
    if (!selectedListingId || !amProfile) return;
    setIsPortfolioLoading(true);
    try {
      const response = await fetch(
        `/api/dashboard/listings/${selectedListingId}/creator-profiles/portfolio`,
        { credentials: 'include' }
      );
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setPortfolioItems(result.data.portfolio || []);
        }
      }
    } catch {
      // silent
    } finally {
      setIsPortfolioLoading(false);
    }
  }, [selectedListingId, amProfile]);

  useEffect(() => {
    fetchPortfolioItems();
  }, [fetchPortfolioItems]);

  // ============================================================================
  // Fetch collaboration items
  // ============================================================================

  const fetchCollaborationItems = useCallback(async () => {
    if (!selectedListingId || !ipProfile) return;
    setIsCollabLoading(true);
    try {
      const response = await fetch(
        `/api/dashboard/listings/${selectedListingId}/creator-profiles/collaborations`,
        { credentials: 'include' }
      );
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setCollaborationItems(result.data.collaborations || []);
        }
      }
    } catch {
      // silent
    } finally {
      setIsCollabLoading(false);
    }
  }, [selectedListingId, ipProfile]);

  useEffect(() => {
    fetchCollaborationItems();
  }, [fetchCollaborationItems]);

  // ============================================================================
  // Fetch episode items
  // ============================================================================

  const fetchEpisodeItems = useCallback(async () => {
    if (!selectedListingId || !podProfile) return;
    setIsEpisodesLoading(true);
    try {
      const response = await fetch(
        `/api/dashboard/listings/${selectedListingId}/creator-profiles/episodes`,
        { credentials: 'include' }
      );
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setEpisodeItems(result.data.episodes || []);
        }
      }
    } catch {
      // silent
    } finally {
      setIsEpisodesLoading(false);
    }
  }, [selectedListingId, podProfile]);

  useEffect(() => {
    fetchEpisodeItems();
  }, [fetchEpisodeItems]);

  // ============================================================================
  // Profile CRUD handlers
  // ============================================================================

  const handleCreate = useCallback(async (data: Record<string, unknown>) => {
    if (!selectedListingId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(
        `/api/dashboard/listings/${selectedListingId}/creator-profiles`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profileType: activeTab,
            ...data,
          }),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to create profile');
      }

      await fetchProfiles();
      setIsFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedListingId, activeTab, fetchProfiles]);

  const handleUpdate = useCallback(async (data: Record<string, unknown>) => {
    if (!editingProfile || !selectedListingId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(
        `/api/dashboard/listings/${selectedListingId}/creator-profiles`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profileId: editingProfile.id,
            profileType: activeTab,
            ...data,
          }),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to update profile');
      }

      await fetchProfiles();
      setEditingProfile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [editingProfile, selectedListingId, activeTab, fetchProfiles]);

  // ============================================================================
  // Portfolio CRUD handlers
  // ============================================================================

  const handleAddPortfolioItem = useCallback(async (data: Record<string, unknown>) => {
    if (!selectedListingId) return;
    setIsItemSubmitting(true);
    try {
      const response = await fetchWithCsrf(
        `/api/dashboard/listings/${selectedListingId}/creator-profiles/portfolio`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to add portfolio item');
      }
      await fetchPortfolioItems();
      setPreviewRefreshKey(prev => prev + 1);
      setIsPortfolioFormOpen(false);
    } finally {
      setIsItemSubmitting(false);
    }
  }, [selectedListingId, fetchPortfolioItems]);

  const handleUpdatePortfolioItem = useCallback(async (data: Record<string, unknown>) => {
    if (!selectedListingId || !editingPortfolioItem) return;
    setIsItemSubmitting(true);
    try {
      const response = await fetchWithCsrf(
        `/api/dashboard/listings/${selectedListingId}/creator-profiles/portfolio`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId: editingPortfolioItem.id, ...data }),
        }
      );
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to update portfolio item');
      }
      await fetchPortfolioItems();
      setPreviewRefreshKey(prev => prev + 1);
      setEditingPortfolioItem(null);
    } finally {
      setIsItemSubmitting(false);
    }
  }, [selectedListingId, editingPortfolioItem, fetchPortfolioItems]);

  const handleDeletePortfolioItem = useCallback(async (itemId: number) => {
    if (!selectedListingId) return;
    setIsItemSubmitting(true);
    try {
      const response = await fetchWithCsrf(
        `/api/dashboard/listings/${selectedListingId}/creator-profiles/portfolio`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId }),
        }
      );
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to delete portfolio item');
      }
      await fetchPortfolioItems();
      setPreviewRefreshKey(prev => prev + 1);
      setDeletingItemId(null);
      setDeletingItemType(null);
    } finally {
      setIsItemSubmitting(false);
    }
  }, [selectedListingId, fetchPortfolioItems]);

  const handleReorderPortfolio = useCallback(async (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= portfolioItems.length) return;

    const reordered = [...portfolioItems];
    const [moved] = reordered.splice(fromIndex, 1);
    if (moved) reordered.splice(toIndex, 0, moved);
    setPortfolioItems(reordered);

    if (!selectedListingId) return;
    try {
      await fetchWithCsrf(
        `/api/dashboard/listings/${selectedListingId}/creator-profiles/portfolio`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reorder: true, itemIds: reordered.map(item => item.id) }),
        }
      );
    } catch {
      // Revert on failure
      await fetchPortfolioItems();
    }
  }, [portfolioItems, selectedListingId, fetchPortfolioItems]);

  // ============================================================================
  // Collaboration CRUD handlers
  // ============================================================================

  const handleAddCollabItem = useCallback(async (data: Record<string, unknown>) => {
    if (!selectedListingId) return;
    setIsItemSubmitting(true);
    try {
      const response = await fetchWithCsrf(
        `/api/dashboard/listings/${selectedListingId}/creator-profiles/collaborations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to add collaboration');
      }
      await fetchCollaborationItems();
      setPreviewRefreshKey(prev => prev + 1);
      setIsCollabFormOpen(false);
    } finally {
      setIsItemSubmitting(false);
    }
  }, [selectedListingId, fetchCollaborationItems]);

  const handleUpdateCollabItem = useCallback(async (data: Record<string, unknown>) => {
    if (!selectedListingId || !editingCollabItem) return;
    setIsItemSubmitting(true);
    try {
      const response = await fetchWithCsrf(
        `/api/dashboard/listings/${selectedListingId}/creator-profiles/collaborations`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId: editingCollabItem.id, ...data }),
        }
      );
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to update collaboration');
      }
      await fetchCollaborationItems();
      setPreviewRefreshKey(prev => prev + 1);
      setEditingCollabItem(null);
    } finally {
      setIsItemSubmitting(false);
    }
  }, [selectedListingId, editingCollabItem, fetchCollaborationItems]);

  const handleDeleteCollabItem = useCallback(async (itemId: number) => {
    if (!selectedListingId) return;
    setIsItemSubmitting(true);
    try {
      const response = await fetchWithCsrf(
        `/api/dashboard/listings/${selectedListingId}/creator-profiles/collaborations`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId }),
        }
      );
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to delete collaboration');
      }
      await fetchCollaborationItems();
      setPreviewRefreshKey(prev => prev + 1);
      setDeletingItemId(null);
      setDeletingItemType(null);
    } finally {
      setIsItemSubmitting(false);
    }
  }, [selectedListingId, fetchCollaborationItems]);

  const handleReorderCollaborations = useCallback(async (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= collaborationItems.length) return;

    const reordered = [...collaborationItems];
    const [moved] = reordered.splice(fromIndex, 1);
    if (moved) reordered.splice(toIndex, 0, moved);
    setCollaborationItems(reordered);

    if (!selectedListingId) return;
    try {
      await fetchWithCsrf(
        `/api/dashboard/listings/${selectedListingId}/creator-profiles/collaborations`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reorder: true, itemIds: reordered.map(item => item.id) }),
        }
      );
    } catch {
      // Revert on failure
      await fetchCollaborationItems();
    }
  }, [collaborationItems, selectedListingId, fetchCollaborationItems]);

  // ============================================================================
  // Episode CRUD handlers
  // ============================================================================

  const handleAddEpisodeItem = useCallback(async (data: Record<string, unknown>) => {
    if (!selectedListingId) return;
    setIsItemSubmitting(true);
    try {
      const response = await fetchWithCsrf(
        `/api/dashboard/listings/${selectedListingId}/creator-profiles/episodes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to add episode');
      }
      await fetchEpisodeItems();
      setPreviewRefreshKey(prev => prev + 1);
      setIsEpisodeFormOpen(false);
    } finally {
      setIsItemSubmitting(false);
    }
  }, [selectedListingId, fetchEpisodeItems]);

  const handleUpdateEpisodeItem = useCallback(async (data: Record<string, unknown>) => {
    if (!selectedListingId || !editingEpisode) return;
    setIsItemSubmitting(true);
    try {
      const response = await fetchWithCsrf(
        `/api/dashboard/listings/${selectedListingId}/creator-profiles/episodes`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId: editingEpisode.id, ...data }),
        }
      );
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to update episode');
      }
      await fetchEpisodeItems();
      setPreviewRefreshKey(prev => prev + 1);
      setEditingEpisode(null);
    } finally {
      setIsItemSubmitting(false);
    }
  }, [selectedListingId, editingEpisode, fetchEpisodeItems]);

  const handleDeleteEpisodeItem = useCallback(async (itemId: number) => {
    if (!selectedListingId) return;
    setIsItemSubmitting(true);
    try {
      const response = await fetchWithCsrf(
        `/api/dashboard/listings/${selectedListingId}/creator-profiles/episodes`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId }),
        }
      );
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to delete episode');
      }
      await fetchEpisodeItems();
      setPreviewRefreshKey(prev => prev + 1);
      setDeletingItemId(null);
      setDeletingItemType(null);
    } finally {
      setIsItemSubmitting(false);
    }
  }, [selectedListingId, fetchEpisodeItems]);

  const handleReorderEpisodes = useCallback(async (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= episodeItems.length) return;

    const reordered = [...episodeItems];
    const [moved] = reordered.splice(fromIndex, 1);
    if (moved) reordered.splice(toIndex, 0, moved);
    setEpisodeItems(reordered);

    if (!selectedListingId) return;
    try {
      await fetchWithCsrf(
        `/api/dashboard/listings/${selectedListingId}/creator-profiles/episodes`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reorder: true, itemIds: reordered.map(item => item.id) }),
        }
      );
    } catch {
      // Revert on failure
      await fetchEpisodeItems();
    }
  }, [episodeItems, selectedListingId, fetchEpisodeItems]);

  // ============================================================================
  // Creator Suite not active — show upgrade prompt
  // ============================================================================

  if (hasCreatorSuite === false) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="bg-orange-50 rounded-full p-6 mb-4">
          <ScrollText className="w-12 h-12 text-[#ed6437]" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Creator Suite Required</h2>
        <p className="text-gray-600 max-w-md mb-2">
          Create affiliate marketer, internet personality, and podcaster profiles to connect with brands and grow your creator business.
        </p>
        <ul className="text-sm text-gray-500 mb-6 space-y-1">
          <li>Build an affiliate marketer profile</li>
          <li>Create an internet personality profile</li>
          <li>Launch a podcaster profile</li>
          <li>Manage your portfolio, collaborations, and episodes</li>
          <li>Connect with brands and businesses</li>
        </ul>
        <Link
          href={`/dashboard/listings/${selectedListingId}/billing` as Route}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors font-medium"
        >
          Add Creator Suite
        </Link>
      </div>
    );
  }

  // ============================================================================
  // Loading state (initial check)
  // ============================================================================

  if (isLoading && hasCreatorSuite === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[#ed6437] animate-spin" />
      </div>
    );
  }

  // ============================================================================
  // Derived values for active tab
  // ============================================================================

  const currentAmProfile = activeTab === 'affiliate_marketer' ? amProfile : null;
  const currentIpProfile = activeTab === 'internet_personality' ? ipProfile : null;
  const currentPodProfile = activeTab === 'podcaster' ? podProfile : null;
  const hasProfile = activeTab === 'affiliate_marketer'
    ? !!amProfile
    : activeTab === 'internet_personality'
      ? !!ipProfile
      : !!podProfile;

  // ============================================================================
  // Profile summary card (AM)
  // ============================================================================

  function renderAMProfileCard(profile: AffiliateMarketerProfile) {
    const initials = getAvatarInitials(profile.display_name);
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        {/* Profile Header */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {profile.profile_image ? (
              <img
                src={profile.profile_image}
                alt={profile.display_name}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xl font-semibold">
                {initials}
              </div>
            )}
          </div>

          {/* Name + Status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-xl font-bold text-gray-900 truncate">{profile.display_name}</h3>
              <StatusBadge status={profile.status} />
            </div>
            {profile.headline && (
              <p className="text-gray-600 mt-1 text-sm">{profile.headline}</p>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-6 flex-wrap text-sm text-gray-600">
          <span className="flex items-center gap-1.5">
            <Eye className="w-4 h-4" />
            {profile.view_count.toLocaleString()} views
          </span>
          <span className="flex items-center gap-1.5">
            <Phone className="w-4 h-4" />
            {profile.contact_count.toLocaleString()} contacts
          </span>
          <span className="flex items-center gap-1.5">
            <Star className="w-4 h-4" />
            {Number(profile.rating_average).toFixed(1)} ({profile.rating_count})
          </span>
          <span className="flex items-center gap-1.5">
            <FolderOpen className="w-4 h-4" />
            {portfolioCount} portfolio items
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => setEditingProfile(profile)}
            className="px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors font-medium text-sm"
          >
            Edit Profile
          </button>
          {profile.status === 'active' && profile.slug && (
            <Link
              href={`/affiliate-marketers/${profile.slug}` as Route}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              View Public Profile
            </Link>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // Profile summary card (IP)
  // ============================================================================

  function renderIPProfileCard(profile: InternetPersonalityProfile) {
    const initials = getAvatarInitials(profile.display_name);
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        {/* Profile Header */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {profile.profile_image ? (
              <img
                src={profile.profile_image}
                alt={profile.display_name}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xl font-semibold">
                {initials}
              </div>
            )}
          </div>

          {/* Name + Status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-xl font-bold text-gray-900 truncate">{profile.display_name}</h3>
              <StatusBadge status={profile.status} />
            </div>
            {profile.headline && (
              <p className="text-gray-600 mt-1 text-sm">{profile.headline}</p>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-6 flex-wrap text-sm text-gray-600">
          <span className="flex items-center gap-1.5">
            <Eye className="w-4 h-4" />
            {profile.view_count.toLocaleString()} views
          </span>
          <span className="flex items-center gap-1.5">
            <Phone className="w-4 h-4" />
            {profile.contact_count.toLocaleString()} contacts
          </span>
          <span className="flex items-center gap-1.5">
            <Star className="w-4 h-4" />
            {Number(profile.rating_average).toFixed(1)} ({profile.rating_count})
          </span>
          <span className="flex items-center gap-1.5">
            <FolderOpen className="w-4 h-4" />
            {collaborationCount} collaborations
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => setEditingProfile(profile)}
            className="px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors font-medium text-sm"
          >
            Edit Profile
          </button>
          {profile.status === 'active' && profile.slug && (
            <Link
              href={`/internet-personalities/${profile.slug}` as Route}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              View Public Profile
            </Link>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // Profile summary card (Podcaster)
  // ============================================================================

  function renderPodProfileCard(profile: PodcasterProfile) {
    const initials = getAvatarInitials(profile.display_name);
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        {/* Profile Header */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {profile.profile_image ? (
              <img
                src={profile.profile_image}
                alt={profile.display_name}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xl font-semibold">
                {initials}
              </div>
            )}
          </div>

          {/* Name + Status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-xl font-bold text-gray-900 truncate">{profile.display_name}</h3>
              <StatusBadge status={profile.status} />
            </div>
            {profile.podcast_name && (
              <p className="text-[#ed6437] font-medium mt-0.5 text-sm">{profile.podcast_name}</p>
            )}
            {profile.headline && (
              <p className="text-gray-600 mt-1 text-sm">{profile.headline}</p>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-6 flex-wrap text-sm text-gray-600">
          <span className="flex items-center gap-1.5">
            <Eye className="w-4 h-4" />
            {profile.view_count.toLocaleString()} views
          </span>
          <span className="flex items-center gap-1.5">
            <Phone className="w-4 h-4" />
            {profile.contact_count.toLocaleString()} contacts
          </span>
          <span className="flex items-center gap-1.5">
            <Star className="w-4 h-4" />
            {Number(profile.rating_average).toFixed(1)} ({profile.rating_count})
          </span>
          <span className="flex items-center gap-1.5">
            <Mic className="w-4 h-4" />
            {episodeCount} episodes
          </span>
          <span className="flex items-center gap-1.5">
            <Download className="w-4 h-4" />
            {profile.download_count.toLocaleString()} downloads
          </span>
          {profile.avg_episode_length > 0 && (
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {profile.avg_episode_length} min avg
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => setEditingProfile(profile)}
            className="px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors font-medium text-sm"
          >
            Edit Profile
          </button>
          {profile.status === 'active' && profile.slug && (
            <Link
              href={`/podcasters/${profile.slug}` as Route}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              View Public Profile
            </Link>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // Episodes section
  // ============================================================================

  function renderEpisodesSection() {
    if (!podProfile) return null;

    return (
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Section header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <button
            type="button"
            onClick={() => setIsEpisodesExpanded(prev => !prev)}
            className="flex items-center gap-2 text-left"
          >
            {isEpisodesExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
            <span className="font-medium text-gray-900">
              Episodes ({episodeItems.length})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setIsEpisodeFormOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors text-sm font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Episode
          </button>
        </div>

        {isEpisodesExpanded && (
          <div className="p-6 space-y-3">
            {isEpisodesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-[#ed6437] animate-spin" />
              </div>
            ) : episodeItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No episodes yet. Add your first episode to showcase your podcast.
              </div>
            ) : (
              episodeItems.map((item, index) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {item.episode_title ?? 'Untitled Episode'}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                        {item.episode_number != null && (
                          <span>Episode {item.episode_number}</span>
                        )}
                        {item.season_number != null && (
                          <span>Season {item.season_number}</span>
                        )}
                        {item.duration != null && (
                          <span>{Math.round(item.duration / 60)} min</span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {item.description.length > 100
                            ? item.description.slice(0, 100) + '...'
                            : item.description}
                        </p>
                      )}
                      {item.guest_names && item.guest_names.length > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          Guests: {item.guest_names.join(', ')}
                        </p>
                      )}
                      {item.published_at && (
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(item.published_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleReorderEpisodes(index, 'up')}
                        disabled={index === 0 || isItemSubmitting}
                        className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReorderEpisodes(index, 'down')}
                        disabled={index === episodeItems.length - 1 || isItemSubmitting}
                        className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingEpisode(item)}
                        className="p-1.5 text-gray-400 hover:text-[#ed6437] transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {deletingItemId === item.id && deletingItemType === 'episode' ? (
                        <div className="flex items-center gap-1.5 ml-1">
                          <span className="text-xs text-gray-600">Are you sure?</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteEpisodeItem(item.id)}
                            disabled={isItemSubmitting}
                            className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 disabled:opacity-50"
                          >
                            {isItemSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setDeletingItemId(null); setDeletingItemType(null); }}
                            className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setDeletingItemId(item.id); setDeletingItemType('episode'); }}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // Portfolio section
  // ============================================================================

  function renderPortfolioSection() {
    if (!amProfile) return null;

    return (
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Section header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <button
            type="button"
            onClick={() => setIsPortfolioExpanded(prev => !prev)}
            className="flex items-center gap-2 text-left"
          >
            {isPortfolioExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
            <span className="font-medium text-gray-900">
              Portfolio ({portfolioItems.length})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setIsPortfolioFormOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors text-sm font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Item
          </button>
        </div>

        {isPortfolioExpanded && (
          <div className="p-6 space-y-3">
            {isPortfolioLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-[#ed6437] animate-spin" />
              </div>
            ) : portfolioItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No portfolio items yet. Add your first campaign to showcase your work.
              </div>
            ) : (
              portfolioItems.map((item, index) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {item.campaign_title ?? 'Untitled Campaign'}
                      </p>
                      {item.brand_name && (
                        <p className="text-sm text-gray-600 mt-0.5">{item.brand_name}</p>
                      )}
                      {item.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {item.description.length > 100
                            ? item.description.slice(0, 100) + '...'
                            : item.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        {item.conversion_rate != null && (
                          <span>{item.conversion_rate}% conversion</span>
                        )}
                        {item.campaign_date && (
                          <span>
                            {new Date(item.campaign_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleReorderPortfolio(index, 'up')}
                        disabled={index === 0 || isItemSubmitting}
                        className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReorderPortfolio(index, 'down')}
                        disabled={index === portfolioItems.length - 1 || isItemSubmitting}
                        className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPortfolioItem(item)}
                        className="p-1.5 text-gray-400 hover:text-[#ed6437] transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {deletingItemId === item.id && deletingItemType === 'portfolio' ? (
                        <div className="flex items-center gap-1.5 ml-1">
                          <span className="text-xs text-gray-600">Are you sure?</span>
                          <button
                            type="button"
                            onClick={() => handleDeletePortfolioItem(item.id)}
                            disabled={isItemSubmitting}
                            className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 disabled:opacity-50"
                          >
                            {isItemSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setDeletingItemId(null); setDeletingItemType(null); }}
                            className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setDeletingItemId(item.id); setDeletingItemType('portfolio'); }}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // Collaboration section
  // ============================================================================

  function renderCollaborationSection() {
    if (!ipProfile) return null;

    return (
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Section header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <button
            type="button"
            onClick={() => setIsCollabExpanded(prev => !prev)}
            className="flex items-center gap-2 text-left"
          >
            {isCollabExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
            <span className="font-medium text-gray-900">
              Collaborations ({collaborationItems.length})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setIsCollabFormOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors text-sm font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Collaboration
          </button>
        </div>

        {isCollabExpanded && (
          <div className="p-6 space-y-3">
            {isCollabLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-[#ed6437] animate-spin" />
              </div>
            ) : collaborationItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No collaborations yet. Add your first brand collaboration to showcase your work.
              </div>
            ) : (
              collaborationItems.map((item, index) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {item.brand_name ?? 'Unnamed Brand'}
                      </p>
                      {item.collaboration_type && (
                        <p className="text-sm text-gray-600 mt-0.5">{item.collaboration_type}</p>
                      )}
                      {item.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {item.description.length > 100
                            ? item.description.slice(0, 100) + '...'
                            : item.description}
                        </p>
                      )}
                      {item.collaboration_date && (
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(item.collaboration_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleReorderCollaborations(index, 'up')}
                        disabled={index === 0 || isItemSubmitting}
                        className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReorderCollaborations(index, 'down')}
                        disabled={index === collaborationItems.length - 1 || isItemSubmitting}
                        className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCollabItem(item)}
                        className="p-1.5 text-gray-400 hover:text-[#ed6437] transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {deletingItemId === item.id && deletingItemType === 'collaboration' ? (
                        <div className="flex items-center gap-1.5 ml-1">
                          <span className="text-xs text-gray-600">Are you sure?</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteCollabItem(item.id)}
                            disabled={isItemSubmitting}
                            className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 disabled:opacity-50"
                          >
                            {isItemSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setDeletingItemId(null); setDeletingItemType(null); }}
                            className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setDeletingItemId(item.id); setDeletingItemType('collaboration'); }}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // Create CTA (no profile exists for this tab)
  // ============================================================================

  function renderCreateCTA() {
    const isAM = activeTab === 'affiliate_marketer';
    const isPod = activeTab === 'podcaster';
    const Icon = isAM ? Briefcase : isPod ? Mic : Users;
    const title = isAM
      ? 'No Affiliate Marketer Profile Yet'
      : isPod
        ? 'No Podcaster Profile Yet'
        : 'No Internet Personality Profile Yet';
    const description = isAM
      ? 'Create your affiliate marketer profile to connect with brands, showcase your expertise, and grow your affiliate business.'
      : isPod
        ? 'Create your podcaster profile to attract sponsors, book guests, and grow your podcast audience.'
        : 'Create your internet personality profile to connect with brands, showcase your content, and manage collaborations.';

    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="bg-orange-50 rounded-full p-6 mb-4">
          <Icon className="w-12 h-12 text-[#ed6437]" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 max-w-md mb-6">{description}</p>
        <button
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          Create Profile
        </button>
      </div>
    );
  }

  // ============================================================================
  // Render
  // ============================================================================

  const TABS: Array<{ id: ProfileTab; label: string }> = [
    { id: 'affiliate_marketer', label: 'Affiliate Marketer' },
    { id: 'internet_personality', label: 'Internet Personality' },
    { id: 'podcaster', label: 'Podcaster' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Creator Profiles</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage your affiliate marketer, internet personality, and podcaster profiles
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/creator-profile-compare.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
          >
            <Eye className="w-4 h-4" />
            Preview Mockups
          </a>
          {hasProfile && (
            <button
              onClick={() => setIsFormOpen(true)}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Create Profile
            </button>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-[#ed6437] text-[#ed6437]'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              {id === 'affiliate_marketer' ? (
                <Briefcase className="w-4 h-4" />
              ) : id === 'podcaster' ? (
                <Mic className="w-4 h-4" />
              ) : (
                <Users className="w-4 h-4" />
              )}
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-sm hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Profile Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#ed6437] animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Affiliate Marketer tab */}
          {activeTab === 'affiliate_marketer' && (
            <>
              {currentAmProfile ? renderAMProfileCard(currentAmProfile) : renderCreateCTA()}
              {currentAmProfile && renderPortfolioSection()}
              {currentAmProfile && (
                <ProfilePreviewPanel
                  profileType="affiliate_marketer"
                  profile={currentAmProfile}
                  listingId={selectedListingId!}
                  refreshKey={previewRefreshKey}
                />
              )}
              {currentAmProfile && (
                <SEOPreviewPanel
                  title={currentAmProfile.display_name}
                  description={currentAmProfile.headline || currentAmProfile.bio?.slice(0, 160) || ''}
                  slug={currentAmProfile.slug ?? undefined}
                  contentType="affiliate_marketer"
                />
              )}
              {currentAmProfile && (
                <ProfileAnalyticsPanel
                  profileType="affiliate_marketer"
                  profileId={currentAmProfile.id}
                />
              )}
              {currentAmProfile && (
                <CampaignAnalyticsDashboard
                  profileId={currentAmProfile.id}
                />
              )}
            </>
          )}

          {/* Podcaster tab */}
          {activeTab === 'podcaster' && (
            <>
              {currentPodProfile ? renderPodProfileCard(currentPodProfile) : renderCreateCTA()}
              {currentPodProfile && renderEpisodesSection()}
            </>
          )}

          {/* Internet Personality tab */}
          {activeTab === 'internet_personality' && (
            <>
              {currentIpProfile ? renderIPProfileCard(currentIpProfile) : renderCreateCTA()}
              {currentIpProfile && renderCollaborationSection()}
              {currentIpProfile && (
                <ProfilePreviewPanel
                  profileType="internet_personality"
                  profile={currentIpProfile}
                  listingId={selectedListingId!}
                  refreshKey={previewRefreshKey}
                />
              )}
              {currentIpProfile && (
                <SEOPreviewPanel
                  title={currentIpProfile.display_name}
                  description={currentIpProfile.headline || currentIpProfile.bio?.slice(0, 160) || ''}
                  slug={currentIpProfile.slug ?? undefined}
                  contentType="internet_personality"
                />
              )}
              {currentIpProfile && (
                <ProfileAnalyticsPanel
                  profileType="internet_personality"
                  profileId={currentIpProfile.id}
                />
              )}
              {currentIpProfile && (
                <PlatformConnectionManager
                  profileType="internet_personality"
                  profileId={currentIpProfile.id}
                />
              )}
              {currentIpProfile && (
                <MediaKitGenerator
                  profileId={currentIpProfile.id}
                  currentMediaKitUrl={currentIpProfile.media_kit_url}
                  profileSlug={currentIpProfile.slug || ''}
                  onMediaKitGenerated={(url) => {
                    setIpProfile(prev => prev ? { ...prev, media_kit_url: url } : prev);
                  }}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* Create Profile Form Modals */}
      {isFormOpen && activeTab === 'affiliate_marketer' && (
        <AffiliateMarketerFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleCreate}
          isSubmitting={isSubmitting}
        />
      )}
      {isFormOpen && activeTab === 'internet_personality' && (
        <InternetPersonalityFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleCreate}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Edit Profile Form Modals */}
      {editingProfile && activeTab === 'affiliate_marketer' && (
        <AffiliateMarketerFormModal
          isOpen={true}
          onClose={() => setEditingProfile(null)}
          onSubmit={handleUpdate}
          isSubmitting={isSubmitting}
          initialData={{
            display_name: (editingProfile as AffiliateMarketerProfile).display_name,
            headline: (editingProfile as AffiliateMarketerProfile).headline ?? '',
            bio: (editingProfile as AffiliateMarketerProfile).bio ?? '',
            niches: ((editingProfile as AffiliateMarketerProfile).niches ?? []).join(', '),
            specializations: ((editingProfile as AffiliateMarketerProfile).specializations ?? []).join(', '),
            affiliate_networks: ((editingProfile as AffiliateMarketerProfile).affiliate_networks ?? []).join(', '),
            commission_range_min: (editingProfile as AffiliateMarketerProfile).commission_range_min?.toString() ?? '',
            commission_range_max: (editingProfile as AffiliateMarketerProfile).commission_range_max?.toString() ?? '',
            flat_fee_min: (editingProfile as AffiliateMarketerProfile).flat_fee_min?.toString() ?? '',
            flat_fee_max: (editingProfile as AffiliateMarketerProfile).flat_fee_max?.toString() ?? '',
            audience_size: (editingProfile as AffiliateMarketerProfile).audience_size?.toString() ?? '',
            platforms: ((editingProfile as AffiliateMarketerProfile).platforms ?? []).join(', '),
            website_url: (editingProfile as AffiliateMarketerProfile).website_url ?? '',
            location: (editingProfile as AffiliateMarketerProfile).location ?? '',
          }}
        />
      )}
      {editingProfile && activeTab === 'internet_personality' && (
        <InternetPersonalityFormModal
          isOpen={true}
          onClose={() => setEditingProfile(null)}
          onSubmit={handleUpdate}
          isSubmitting={isSubmitting}
          initialData={{
            display_name: (editingProfile as InternetPersonalityProfile).display_name,
            headline: (editingProfile as InternetPersonalityProfile).headline ?? '',
            bio: (editingProfile as InternetPersonalityProfile).bio ?? '',
            content_categories: ((editingProfile as InternetPersonalityProfile).content_categories ?? []).join(', '),
            platforms: ((editingProfile as InternetPersonalityProfile).platforms ?? []).join(', '),
            creating_since: (editingProfile as InternetPersonalityProfile).creating_since?.toString() ?? '',
            total_reach: (editingProfile as InternetPersonalityProfile).total_reach?.toString() ?? '',
            avg_engagement_rate: (editingProfile as InternetPersonalityProfile).avg_engagement_rate?.toString() ?? '',
            collaboration_types: ((editingProfile as InternetPersonalityProfile).collaboration_types ?? []).join(', '),
            website_url: (editingProfile as InternetPersonalityProfile).website_url ?? '',
            media_kit_url: (editingProfile as InternetPersonalityProfile).media_kit_url ?? '',
            management_contact: (editingProfile as InternetPersonalityProfile).management_contact ?? '',
            location: (editingProfile as InternetPersonalityProfile).location ?? '',
          }}
        />
      )}

      {/* Podcaster Create/Edit Form Modals */}
      {isFormOpen && activeTab === 'podcaster' && (
        <PodcasterFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleCreate}
          isSubmitting={isSubmitting}
        />
      )}
      {editingProfile && activeTab === 'podcaster' && (
        <PodcasterFormModal
          isOpen={true}
          onClose={() => setEditingProfile(null)}
          onSubmit={handleUpdate}
          isSubmitting={isSubmitting}
          initialData={{
            display_name: (editingProfile as PodcasterProfile).display_name,
            podcast_name: (editingProfile as PodcasterProfile).podcast_name ?? '',
            headline: (editingProfile as PodcasterProfile).headline ?? '',
            bio: (editingProfile as PodcasterProfile).bio ?? '',
            hosting_platform: (editingProfile as PodcasterProfile).hosting_platform ?? '',
            rss_feed_url: (editingProfile as PodcasterProfile).rss_feed_url ?? '',
            genres: ((editingProfile as PodcasterProfile).genres ?? []).join(', '),
            publishing_frequency: (editingProfile as PodcasterProfile).publishing_frequency ?? '',
            avg_episode_length: (editingProfile as PodcasterProfile).avg_episode_length?.toString() ?? '',
            guest_booking_info: (editingProfile as PodcasterProfile).guest_booking_info ?? '',
            monetization_methods: ((editingProfile as PodcasterProfile).monetization_methods ?? []).join(', '),
            website_url: (editingProfile as PodcasterProfile).website_url ?? '',
            location: (editingProfile as PodcasterProfile).location ?? '',
          }}
        />
      )}

      {/* Episode Item Form Modals */}
      {(isEpisodeFormOpen || editingEpisode) && (
        <EpisodeItemFormModal
          isOpen={isEpisodeFormOpen || !!editingEpisode}
          onClose={() => { setIsEpisodeFormOpen(false); setEditingEpisode(null); }}
          onSubmit={editingEpisode ? handleUpdateEpisodeItem : handleAddEpisodeItem}
          isSubmitting={isItemSubmitting}
          initialData={editingEpisode ? {
            id: editingEpisode.id,
            episode_title: editingEpisode.episode_title ?? '',
            description: editingEpisode.description ?? '',
            episode_number: editingEpisode.episode_number?.toString() ?? '',
            season_number: editingEpisode.season_number?.toString() ?? '',
            duration: editingEpisode.duration?.toString() ?? '',
            published_at: editingEpisode.published_at
              ? new Date(editingEpisode.published_at).toISOString().slice(0, 10)
              : '',
            audio_url: editingEpisode.audio_url ?? '',
            guest_names: (editingEpisode.guest_names ?? []).join(', '),
            listen_url: '',
          } : undefined}
        />
      )}

      {/* Portfolio Item Form Modals */}
      {(isPortfolioFormOpen || editingPortfolioItem) && (
        <PortfolioItemFormModal
          isOpen={isPortfolioFormOpen || !!editingPortfolioItem}
          onClose={() => { setIsPortfolioFormOpen(false); setEditingPortfolioItem(null); }}
          onSubmit={editingPortfolioItem ? handleUpdatePortfolioItem : handleAddPortfolioItem}
          isSubmitting={isItemSubmitting}
          initialData={editingPortfolioItem ? {
            id: editingPortfolioItem.id,
            campaign_title: editingPortfolioItem.campaign_title ?? '',
            brand_name: editingPortfolioItem.brand_name ?? '',
            brand_logo: editingPortfolioItem.brand_logo ?? '',
            description: editingPortfolioItem.description ?? '',
            results_summary: editingPortfolioItem.results_summary ?? '',
            conversion_rate: editingPortfolioItem.conversion_rate?.toString() ?? '',
            content_url: editingPortfolioItem.content_url ?? '',
            campaign_date: editingPortfolioItem.campaign_date
              ? new Date(editingPortfolioItem.campaign_date).toISOString().slice(0, 10)
              : '',
          } : undefined}
        />
      )}

      {/* Collaboration Item Form Modals */}
      {(isCollabFormOpen || editingCollabItem) && (
        <CollaborationItemFormModal
          isOpen={isCollabFormOpen || !!editingCollabItem}
          onClose={() => { setIsCollabFormOpen(false); setEditingCollabItem(null); }}
          onSubmit={editingCollabItem ? handleUpdateCollabItem : handleAddCollabItem}
          isSubmitting={isItemSubmitting}
          initialData={editingCollabItem ? {
            id: editingCollabItem.id,
            brand_name: editingCollabItem.brand_name ?? '',
            brand_logo: editingCollabItem.brand_logo ?? '',
            collaboration_type: editingCollabItem.collaboration_type ?? '',
            description: editingCollabItem.description ?? '',
            content_url: editingCollabItem.content_url ?? '',
            collaboration_date: editingCollabItem.collaboration_date
              ? new Date(editingCollabItem.collaboration_date).toISOString().slice(0, 10)
              : '',
          } : undefined}
        />
      )}
    </div>
  );
}

// ============================================================================
// ProfilesManager - Wrapped with ErrorBoundary
// ============================================================================

/**
 * ProfilesManager - Wrapped with ErrorBoundary (ADVANCED tier requirement)
 */
export function ProfilesManager() {
  return (
    <ErrorBoundary componentName="ProfilesManager">
      <ProfilesManagerContent />
    </ErrorBoundary>
  );
}

export default ProfilesManager;
