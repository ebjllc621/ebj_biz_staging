/**
 * ContentManager - Content Management (Articles, Podcasts, Videos)
 *
 * @description Manage content with CRUD operations via /api/dashboard/listings/[listingId]/content
 * @component Client Component
 * @tier ADVANCED
 * @generated ComponentBuilder v3.0
 * @phase Content Phase 5A
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier1_Phases/PHASE_5A_DASHBOARD_CONTENT_MANAGER.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use ErrorBoundary (ADVANCED tier requirement)
 * - Orange theme (#ed6437) for action buttons
 * - BizModal for all modals (MANDATORY)
 * - fetchWithCsrf for all mutations
 * - Creator Suite add-on gating
 * - Follows EventsManager.tsx pattern exactly
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, AlertCircle, FileText, Headphones, Play, ScrollText, BarChart3 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { Route } from 'next';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { useListingData } from '@features/dashboard/hooks/useListingData';
import { fetchWithCsrf } from '@core/utils/csrf';
import { EmptyState } from '../shared/EmptyState';
import { TierLimitBanner } from '../shared/TierLimitBanner';
import { ConfirmDeleteModal } from '../shared/ConfirmDeleteModal';
import { ContentItemCard } from './content/ContentItemCard';
import { ArticleFormModal } from './content/ArticleFormModal';
import { PodcastFormModal } from './content/PodcastFormModal';
import { VideoFormModal } from './content/VideoFormModal';
import { ContentAnalyticsPanel } from './content/ContentAnalyticsPanel';
import { SocialMediaManagerModal } from './content/SocialMediaManagerModal';
import type { ContentArticle, ContentVideo, ContentPodcast } from '@core/services/ContentService';

// ============================================================================
// TYPES
// ============================================================================

type ContentTab = 'articles' | 'podcasts' | 'videos';
type ContentItem = ContentArticle | ContentVideo | ContentPodcast;

interface ContentCounts {
  articles: number;
  podcasts: number;
  videos: number;
}

const CONTENT_LIMITS: Record<string, number> = {
  essentials: 5,
  plus: 15,
  preferred: 50,
  premium: 9999,
};

// Map plural tab names to singular contentType for API
const TAB_TO_CONTENT_TYPE: Record<ContentTab, string> = {
  articles: 'article',
  podcasts: 'podcast',
  videos: 'video',
};

// ============================================================================
// COMPONENT
// ============================================================================

function ContentManagerContent() {
  const { selectedListingId } = useListingContext();
  const { listing } = useListingData(selectedListingId);

  // View mode: list or analytics
  const [viewMode, setViewMode] = useState<'list' | 'analytics'>('list');

  // Tab state
  const [activeTab, setActiveTab] = useState<ContentTab>('articles');

  // Data state
  const [items, setItems] = useState<ContentItem[]>([]);
  const [counts, setCounts] = useState<ContentCounts>({ articles: 0, podcasts: 0, videos: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Creator Suite gating
  const [hasCreatorSuite, setHasCreatorSuite] = useState<boolean | null>(null);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<ContentItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [socialShareItem, setSocialShareItem] = useState<ContentItem | null>(null);

  const tier = listing?.tier || 'essentials';
  const limit = CONTENT_LIMITS[tier] ?? 5;
  const totalItems = counts.articles + counts.podcasts + counts.videos;
  const canAddMore = totalItems < limit;

  // Fetch content for selected listing + active tab
  const fetchContent = useCallback(async () => {
    if (!selectedListingId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/dashboard/listings/${selectedListingId}/content?type=${activeTab}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        if (response.status === 403) {
          setHasCreatorSuite(false);
          return;
        }
        throw new Error('Failed to fetch content');
      }

      const result = await response.json();
      if (result.success) {
        setItems(result.data[activeTab] || []);
        if (result.data.counts) {
          setCounts(result.data.counts);
        }
        setHasCreatorSuite(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content');
    } finally {
      setIsLoading(false);
    }
  }, [selectedListingId, activeTab]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Handle create
  const handleCreate = useCallback(async (data: Record<string, unknown>) => {
    if (!selectedListingId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(
        `/api/dashboard/listings/${selectedListingId}/content`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentType: TAB_TO_CONTENT_TYPE[activeTab],
            ...data,
          }),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to create content');
      }

      await fetchContent();
      setShowCreateModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create content');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedListingId, activeTab, fetchContent]);

  // Handle update
  const handleUpdate = useCallback(async (data: Record<string, unknown>) => {
    if (!editingItem || !selectedListingId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(
        `/api/dashboard/listings/${selectedListingId}/content`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentType: TAB_TO_CONTENT_TYPE[activeTab],
            contentId: editingItem.id,
            ...data,
          }),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to update content');
      }

      await fetchContent();
      setEditingItem(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update content');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [editingItem, selectedListingId, activeTab, fetchContent]);

  // Handle publish / archive / re-publish
  const handlePublish = useCallback(async (item: ContentItem) => {
    if (!selectedListingId) return;

    setError(null);

    // Determine target status
    let targetStatus: string;
    if (item.status === 'published') {
      targetStatus = 'archived';
    } else {
      targetStatus = 'published';
    }

    try {
      const response = await fetchWithCsrf(
        `/api/dashboard/listings/${selectedListingId}/content`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentType: TAB_TO_CONTENT_TYPE[activeTab],
            contentId: item.id,
            status: targetStatus,
          }),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to update status');
      }

      await fetchContent();
      if (targetStatus === 'published') {
        setSocialShareItem(item);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  }, [selectedListingId, activeTab, fetchContent]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!deletingItem || !selectedListingId) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(
        `/api/dashboard/listings/${selectedListingId}/content`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentType: TAB_TO_CONTENT_TYPE[activeTab],
            contentId: deletingItem.id,
          }),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to delete content');
      }

      await fetchContent();
      setDeletingItem(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete content');
    } finally {
      setIsDeleting(false);
    }
  }, [deletingItem, selectedListingId, activeTab, fetchContent]);

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
          Publish articles, podcasts, and videos for your listing to grow your audience and establish authority in your industry.
        </p>
        <ul className="text-sm text-gray-500 mb-6 space-y-1">
          <li>Publish articles and blog posts</li>
          <li>Upload podcast episodes</li>
          <li>Share video content</li>
          <li>Notify followers when you publish</li>
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
  // Build initial data for edit modals
  // ============================================================================

  function getArticleInitialData(item: ContentItem) {
    if (!('reading_time' in item)) return undefined;
    const a = item as ContentArticle;
    return {
      title: a.title,
      excerpt: a.excerpt || '',
      content: a.content || '',
      featured_image: a.featured_image || '',
      category_id: a.category_id?.toString() || '',
      tags: (a.tags || []).join(', '),
      reading_time: a.reading_time?.toString() || '',
    };
  }

  function getPodcastInitialData(item: ContentItem) {
    if (!('audio_url' in item)) return undefined;
    const p = item as ContentPodcast;
    return {
      title: p.title,
      audio_url: p.audio_url,
      description: p.description || '',
      thumbnail: p.thumbnail || '',
      season_number: p.season_number?.toString() || '',
      episode_number: p.episode_number?.toString() || '',
      duration: p.duration?.toString() || '',
      category_id: p.category_id?.toString() || '',
      tags: (p.tags || []).join(', '),
    };
  }

  function getVideoInitialData(item: ContentItem) {
    if (!('video_url' in item)) return undefined;
    const v = item as ContentVideo;
    return {
      title: v.title,
      video_url: v.video_url,
      video_type: v.video_type as 'youtube' | 'vimeo' | 'upload' | 'embed',
      description: v.description || '',
      thumbnail: v.thumbnail || '',
      duration: v.duration?.toString() || '',
      category_id: v.category_id?.toString() || '',
      tags: (v.tags || []).join(', '),
    };
  }

  // ============================================================================
  // Tab icons + labels
  // ============================================================================

  const TABS: Array<{ id: ContentTab; label: string; icon: LucideIcon; count: number }> = [
    { id: 'articles', label: 'Articles', icon: FileText, count: counts.articles },
    { id: 'podcasts', label: 'Podcasts', icon: Headphones, count: counts.podcasts },
    { id: 'videos', label: 'Videos', icon: Play, count: counts.videos },
  ];

  // ============================================================================
  // Render
  // ============================================================================

  const getEmptyTitle = () => {
    if (activeTab === 'articles') return 'No Articles Yet';
    if (activeTab === 'podcasts') return 'No Podcasts Yet';
    return 'No Videos Yet';
  };

  const getEmptyDescription = () => {
    if (activeTab === 'articles') return 'Write and publish articles to share your expertise with your audience';
    if (activeTab === 'podcasts') return 'Upload podcast episodes to reach listeners and grow your following';
    return 'Share videos to engage your audience and showcase your business';
  };

  const getCreateLabel = () => {
    if (activeTab === 'articles') return 'Create Article';
    if (activeTab === 'podcasts') return 'Create Podcast';
    return 'Create Video';
  };

  const tabIcon: LucideIcon = TABS.find(t => t.id === activeTab)?.icon ?? FileText;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Content</h2>
          <p className="text-sm text-gray-600 mt-1">
            {totalItems} of {limit === 9999 ? 'unlimited' : limit} items used
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Analytics Toggle */}
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'analytics' : 'list')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            {viewMode === 'list' ? 'Analytics' : 'Back to Content'}
          </button>
          {/* Create Button — only shown in list mode */}
          {viewMode === 'list' && (
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={!canAddMore || isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              {getCreateLabel()}
            </button>
          )}
        </div>
      </div>

      {/* Analytics Panel — shown when viewMode is analytics */}
      {viewMode === 'analytics' && (
        <ContentAnalyticsPanel />
      )}

      {/* List Mode content — only shown when viewMode is list */}
      {viewMode === 'list' && (
      <>
      {/* Tab Bar */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0">
          {TABS.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-[#ed6437] text-[#ed6437]'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium ${
                activeTab === id ? 'bg-orange-100 text-[#ed6437]' : 'bg-gray-100 text-gray-600'
              }`}>
                {count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tier Limit Banner */}
      <TierLimitBanner
        current={totalItems}
        limit={limit}
        itemType="content items"
        tier={tier}
      />

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

      {/* Content List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#ed6437] animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={tabIcon}
          title={getEmptyTitle()}
          description={getEmptyDescription()}
          action={{
            label: getCreateLabel(),
            onClick: () => setShowCreateModal(true),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <ContentItemCard
              key={item.id}
              item={item}
              contentType={activeTab}
              onEdit={() => setEditingItem(item)}
              onPublish={() => handlePublish(item)}
              onDelete={() => setDeletingItem(item)}
            />
          ))}
        </div>
      )}

      {/* Create Modals */}
      {activeTab === 'articles' && (
        <ArticleFormModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
          isSubmitting={isSubmitting}
        />
      )}
      {activeTab === 'podcasts' && (
        <PodcastFormModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
          isSubmitting={isSubmitting}
        />
      )}
      {activeTab === 'videos' && (
        <VideoFormModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Edit Modals */}
      {editingItem && activeTab === 'articles' && (
        <ArticleFormModal
          isOpen={true}
          onClose={() => setEditingItem(null)}
          onSubmit={handleUpdate}
          isSubmitting={isSubmitting}
          initialData={getArticleInitialData(editingItem)}
        />
      )}
      {editingItem && activeTab === 'podcasts' && (
        <PodcastFormModal
          isOpen={true}
          onClose={() => setEditingItem(null)}
          onSubmit={handleUpdate}
          isSubmitting={isSubmitting}
          initialData={getPodcastInitialData(editingItem)}
        />
      )}
      {editingItem && activeTab === 'videos' && (
        <VideoFormModal
          isOpen={true}
          onClose={() => setEditingItem(null)}
          onSubmit={handleUpdate}
          isSubmitting={isSubmitting}
          initialData={getVideoInitialData(editingItem)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <ConfirmDeleteModal
          isOpen={true}
          onClose={() => setDeletingItem(null)}
          onConfirm={handleDelete}
          itemType={TAB_TO_CONTENT_TYPE[activeTab]}
          itemName={deletingItem.title}
          isDeleting={isDeleting}
        />
      )}
      </>
      )}

      {/* Social Media Share Modal */}
      {socialShareItem && selectedListingId && (
        <SocialMediaManagerModal
          isOpen={true}
          onClose={() => setSocialShareItem(null)}
          listingId={selectedListingId}
          contentType={TAB_TO_CONTENT_TYPE[activeTab]}
          contentId={socialShareItem.id}
          contentTitle={socialShareItem.title}
        />
      )}
    </div>
  );
}

/**
 * ContentManager - Wrapped with ErrorBoundary
 */
export function ContentManager() {
  return (
    <ErrorBoundary componentName="ContentManager">
      <ContentManagerContent />
    </ErrorBoundary>
  );
}

export default ContentManager;
