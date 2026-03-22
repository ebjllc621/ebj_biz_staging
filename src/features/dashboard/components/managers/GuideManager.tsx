/**
 * GuideManager - Guide Management (CRUD)
 *
 * @description Manage guides with CRUD operations via /api/dashboard/listings/[listingId]/guides
 * @component Client Component
 * @tier ADVANCED
 * @generated ComponentBuilder v3.0
 * @phase Tier 2 Content Types - Phase G8
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier2_Phases/PHASE_G8_DASHBOARD_GUIDE_CREATION.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use ErrorBoundary (ADVANCED tier requirement)
 * - Orange theme (#ed6437) for action buttons
 * - BizModal for all modals (MANDATORY via GuideFormModal)
 * - fetchWithCsrf for all mutations
 * - Creator Suite add-on gating
 * - Follows NewsletterManager.tsx pattern exactly
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, AlertCircle, BookOpen, Eye, Pencil, Trash2, ToggleLeft, Clock, Layers, Download, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import type { Route } from 'next';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { useListingData } from '@features/dashboard/hooks/useListingData';
import { fetchWithCsrf } from '@core/utils/csrf';
import { downloadGuidePdf } from '@core/utils/export/guidePdfGenerator';
import { EmptyState } from '../shared/EmptyState';
import { TierLimitBanner } from '../shared/TierLimitBanner';
import { ConfirmDeleteModal } from '../shared/ConfirmDeleteModal';
import { GuideFormModal } from './guide/GuideFormModal';
import { GuideAnalyticsDashboard } from './guide/GuideAnalyticsDashboard';
import { SocialMediaManagerModal } from './content/SocialMediaManagerModal';
import type { Guide, GuideSection } from '@core/types/guide';

// ============================================================================
// TYPES
// ============================================================================

interface GuideCounts {
  total: number;
  draft: number;
  published: number;
  archived: number;
}

interface GuideWithSectionCount extends Guide {
  section_count: number;
}

const GUIDE_LIMITS: Record<string, number> = {
  essentials: 3,
  plus: 10,
  preferred: 30,
  premium: 9999,
};

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'published', label: 'Published' },
  { id: 'archived', label: 'Archived' },
];

// ============================================================================
// HELPERS
// ============================================================================

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-700';
    case 'published':
      return 'bg-green-100 text-green-700';
    case 'archived':
      return 'bg-yellow-100 text-yellow-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getDifficultyBadgeClass(level: string): string {
  switch (level) {
    case 'beginner':
      return 'bg-green-100 text-green-700';
    case 'intermediate':
      return 'bg-yellow-100 text-yellow-700';
    case 'advanced':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function formatDate(date: Date | string | null): string {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getGuideInitialData(item: GuideWithSectionCount, sections: GuideSection[]) {
  return {
    title: item.title,
    subtitle: item.subtitle || '',
    excerpt: item.excerpt || '',
    overview: item.overview || '',
    prerequisites: item.prerequisites || '',
    difficulty_level: item.difficulty_level || 'beginner',
    estimated_time: item.estimated_time?.toString() || '',
    featured_image: item.featured_image || '',
    category_id: item.category_id?.toString() || '',
    tags: (item.tags || []).join(', '),
    version: item.version || '',
    sections: sections.map(s => ({
      id: s.id,
      title: s.title,
      content: s.content,
      estimated_time: s.estimated_time,
      sort_order: s.sort_order,
    })),
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

function GuideManagerContent() {
  const { selectedListingId } = useListingContext();
  const { listing } = useListingData(selectedListingId);

  // Data state
  const [items, setItems] = useState<GuideWithSectionCount[]>([]);
  const [counts, setCounts] = useState<GuideCounts>({ total: 0, draft: 0, published: 0, archived: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Creator Suite gating
  const [hasCreatorSuite, setHasCreatorSuite] = useState<boolean | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<GuideWithSectionCount | null>(null);
  const [editingSections, setEditingSections] = useState<GuideSection[]>([]);
  const [deletingItem, setDeletingItem] = useState<GuideWithSectionCount | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFetchingSections, setIsFetchingSections] = useState(false);
  const [analyticsGuide, setAnalyticsGuide] = useState<GuideWithSectionCount | null>(null);
  const [socialShareGuide, setSocialShareGuide] = useState<GuideWithSectionCount | null>(null);

  const tier = listing?.tier || 'essentials';
  const limit = GUIDE_LIMITS[tier] ?? 3;
  const canAddMore = counts.total < limit;

  // Fetch guides
  const fetchGuides = useCallback(async () => {
    if (!selectedListingId) return;

    setIsLoading(true);
    setError(null);

    try {
      const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
      const response = await fetch(
        `/api/dashboard/listings/${selectedListingId}/guides?page=1&limit=50${statusParam}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        if (response.status === 403) {
          setHasCreatorSuite(false);
          return;
        }
        throw new Error('Failed to fetch guides');
      }

      const result = await response.json();
      if (result.success) {
        setItems(result.data.guides || []);
        if (result.data.counts) setCounts(result.data.counts);
        setHasCreatorSuite(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load guides');
    } finally {
      setIsLoading(false);
    }
  }, [selectedListingId, statusFilter]);

  useEffect(() => {
    fetchGuides();
  }, [fetchGuides]);

  // Fetch sections for a guide (used when opening edit modal)
  const fetchSections = useCallback(async (guideId: number): Promise<GuideSection[]> => {
    if (!selectedListingId) return [];

    const response = await fetch(
      `/api/dashboard/listings/${selectedListingId}/guides/${guideId}/sections`,
      { credentials: 'include' }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch guide sections');
    }

    const result = await response.json();
    return result.data?.sections || [];
  }, [selectedListingId]);

  // Handle edit click — fetch sections before opening modal
  const handleEditClick = useCallback(async (item: GuideWithSectionCount) => {
    if (!selectedListingId) return;

    setIsFetchingSections(true);
    setError(null);

    try {
      const sections = await fetchSections(item.id);
      setEditingSections(sections);
      setEditingItem(item);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load guide sections');
    } finally {
      setIsFetchingSections(false);
    }
  }, [selectedListingId, fetchSections]);

  // Handle create
  const handleCreate = useCallback(async (data: Record<string, unknown>) => {
    if (!selectedListingId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(
        `/api/dashboard/listings/${selectedListingId}/guides`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to create guide');
      }

      // If sections were included, add them now
      const createResult = await response.json();
      const newGuideId = createResult.data?.guide?.id;

      if (newGuideId && Array.isArray(data.sections) && data.sections.length > 0) {
        for (const section of data.sections as Array<{ title: string; content?: string; estimated_time?: number }>) {
          await fetchWithCsrf(
            `/api/dashboard/listings/${selectedListingId}/guides/${newGuideId}/sections`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: section.title,
                content: section.content || '',
                estimated_time: section.estimated_time || null,
              }),
            }
          );
        }
      }

      await fetchGuides();
      setShowCreateModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create guide');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedListingId, fetchGuides]);

  // Handle update
  const handleUpdate = useCallback(async (data: Record<string, unknown>) => {
    if (!editingItem || !selectedListingId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Update guide metadata (without sections key)
      const { sections: incomingSections, ...guideData } = data;

      const response = await fetchWithCsrf(
        `/api/dashboard/listings/${selectedListingId}/guides`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guideId: editingItem.id, ...guideData }),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to update guide');
      }

      // Sync sections: delete removed, update existing, add new
      if (Array.isArray(incomingSections)) {
        const incoming = incomingSections as Array<{
          id?: number;
          title: string;
          content?: string | null;
          estimated_time?: number | null;
          sort_order: number;
        }>;

        // Delete sections that are no longer present
        const incomingIds = new Set(incoming.filter(s => s.id).map(s => s.id));
        for (const existingSection of editingSections) {
          if (!incomingIds.has(existingSection.id)) {
            await fetchWithCsrf(
              `/api/dashboard/listings/${selectedListingId}/guides/${editingItem.id}/sections`,
              {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sectionId: existingSection.id }),
              }
            );
          }
        }

        // Update existing and add new sections
        for (const section of incoming) {
          if (section.id) {
            await fetchWithCsrf(
              `/api/dashboard/listings/${selectedListingId}/guides/${editingItem.id}/sections`,
              {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sectionId: section.id,
                  title: section.title,
                  content: section.content || '',
                  estimated_time: section.estimated_time || null,
                  sort_order: section.sort_order,
                }),
              }
            );
          } else {
            await fetchWithCsrf(
              `/api/dashboard/listings/${selectedListingId}/guides/${editingItem.id}/sections`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title: section.title,
                  content: section.content || '',
                  estimated_time: section.estimated_time || null,
                }),
              }
            );
          }
        }
      }

      await fetchGuides();
      setEditingItem(null);
      setEditingSections([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update guide');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [editingItem, editingSections, selectedListingId, fetchGuides]);

  // Handle publish / archive / re-draft cycle
  const handleToggleStatus = useCallback(async (item: GuideWithSectionCount) => {
    if (!selectedListingId) return;

    setError(null);

    let nextStatus: string;
    if (item.status === 'draft') {
      nextStatus = 'published';
    } else if (item.status === 'published') {
      nextStatus = 'archived';
    } else {
      nextStatus = 'draft';
    }

    try {
      const response = await fetchWithCsrf(
        `/api/dashboard/listings/${selectedListingId}/guides`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guideId: item.id, status: nextStatus }),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to update status');
      }

      await fetchGuides();
      if (nextStatus === 'published') {
        setSocialShareGuide(item);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  }, [selectedListingId, fetchGuides]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!deletingItem || !selectedListingId) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(
        `/api/dashboard/listings/${selectedListingId}/guides`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guideId: deletingItem.id }),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to delete guide');
      }

      await fetchGuides();
      setDeletingItem(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete guide');
    } finally {
      setIsDeleting(false);
    }
  }, [deletingItem, selectedListingId, fetchGuides]);

  // ============================================================================
  // Creator Suite not active — show upgrade prompt
  // ============================================================================

  if (hasCreatorSuite === false) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="bg-orange-50 rounded-full p-6 mb-4">
          <BookOpen className="w-12 h-12 text-[#ed6437]" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Creator Suite Required</h2>
        <p className="text-gray-600 max-w-md mb-2">
          Create multi-section educational guides to help your audience learn from your expertise.
        </p>
        <ul className="text-sm text-gray-500 mb-6 space-y-1">
          <li>Build multi-section structured guides</li>
          <li>Set difficulty levels and estimated read times</li>
          <li>Track views and completion rates</li>
          <li>Publish and share with followers</li>
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

  // Analytics view
  if (analyticsGuide) {
    return (
      <GuideAnalyticsDashboard
        listingId={selectedListingId!}
        guideId={analyticsGuide.id}
        guideTitle={analyticsGuide.title}
        onBack={() => setAnalyticsGuide(null)}
      />
    );
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Guides</h2>
          <p className="text-sm text-gray-600 mt-1">
            {counts.total} of {limit === 9999 ? 'unlimited' : limit} guides used
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={!canAddMore || isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Create Guide
        </button>
      </div>

      {/* Status Filter Bar */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0">
          {STATUS_FILTERS.map(({ id, label }) => {
            const count = id === 'all' ? counts.total : (counts[id as keyof GuideCounts] as number) ?? 0;
            return (
              <button
                key={id}
                onClick={() => setStatusFilter(id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  statusFilter === id
                    ? 'border-[#ed6437] text-[#ed6437]'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {label}
                <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  statusFilter === id ? 'bg-orange-100 text-[#ed6437]' : 'bg-gray-100 text-gray-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tier Limit Banner */}
      <TierLimitBanner
        current={counts.total}
        limit={limit}
        itemType="guides"
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

      {/* Guide List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#ed6437] animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No Guides Yet"
          description="Create your first guide to share structured educational content with your audience"
          action={{
            label: 'Create Guide',
            onClick: () => setShowCreateModal(true),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 hover:border-gray-300 transition-colors"
            >
              {/* Title row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{item.title}</h3>
                  {item.slug && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{item.slug}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${getDifficultyBadgeClass(item.difficulty_level)}`}>
                    {item.difficulty_level}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${getStatusBadgeClass(item.status)}`}>
                    {item.status}
                  </span>
                </div>
              </div>

              {/* Excerpt */}
              {item.excerpt && (
                <p className="text-sm text-gray-600 line-clamp-2">{item.excerpt}</p>
              )}

              {/* Meta row */}
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  {item.section_count} {item.section_count === 1 ? 'section' : 'sections'}
                </span>
                {item.estimated_time && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.estimated_time} min
                  </span>
                )}
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {item.view_count ?? 0} views
                </span>
                <span>
                  {item.completion_count ?? 0} completions
                </span>
              </div>

              {/* Dates */}
              <div className="text-xs text-gray-400 space-y-0.5">
                <div>Created: {formatDate(item.created_at)}</div>
                {item.published_at && (
                  <div>Published: {formatDate(item.published_at)}</div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1 border-t border-gray-100 flex-wrap">
                {item.status === 'published' && (
                  <button
                    onClick={async () => {
                      try {
                        const sections = await fetchSections(item.id);
                        const guideWithSections = { ...item, sections };
                        downloadGuidePdf(guideWithSections as Guide, undefined);
                      } catch {
                        setError('Failed to generate PDF');
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    title="Download PDF"
                  >
                    <Download className="w-3 h-3" />
                    PDF
                  </button>
                )}
                {item.status === 'published' && (
                  <button
                    onClick={() => setAnalyticsGuide(item)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    title="View Analytics"
                  >
                    <BarChart3 className="w-3 h-3" />
                    Analytics
                  </button>
                )}
                <button
                  onClick={() => handleEditClick(item)}
                  disabled={isFetchingSections}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  title="Edit"
                >
                  {isFetchingSections && editingItem?.id === item.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Pencil className="w-3 h-3" />
                  )}
                  Edit
                </button>
                <button
                  onClick={() => handleToggleStatus(item)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  title={item.status === 'draft' ? 'Publish' : item.status === 'published' ? 'Archive' : 'Restore to Draft'}
                >
                  <ToggleLeft className="w-3 h-3" />
                  {item.status === 'draft' ? 'Publish' : item.status === 'published' ? 'Archive' : 'Restore'}
                </button>
                <button
                  onClick={() => setDeletingItem(item)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors ml-auto"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <GuideFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
      />

      {/* Edit Modal */}
      {editingItem && (
        <GuideFormModal
          isOpen={true}
          onClose={() => { setEditingItem(null); setEditingSections([]); }}
          onSubmit={handleUpdate}
          isSubmitting={isSubmitting}
          initialData={getGuideInitialData(editingItem, editingSections)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <ConfirmDeleteModal
          isOpen={true}
          onClose={() => setDeletingItem(null)}
          onConfirm={handleDelete}
          itemType="guide"
          itemName={deletingItem.title}
          isDeleting={isDeleting}
        />
      )}

      {/* Social Media Share Modal */}
      {socialShareGuide && selectedListingId && (
        <SocialMediaManagerModal
          isOpen={true}
          onClose={() => setSocialShareGuide(null)}
          listingId={selectedListingId}
          contentType="guide"
          contentId={socialShareGuide.id}
          contentTitle={socialShareGuide.title}
        />
      )}
    </div>
  );
}

/**
 * GuideManager - Wrapped with ErrorBoundary
 */
export function GuideManager() {
  return (
    <ErrorBoundary componentName="GuideManager">
      <GuideManagerContent />
    </ErrorBoundary>
  );
}

export default GuideManager;
