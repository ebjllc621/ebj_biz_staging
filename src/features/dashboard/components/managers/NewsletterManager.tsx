/**
 * NewsletterManager - Newsletter Management (CRUD)
 *
 * @description Manage newsletters with CRUD operations via /api/dashboard/listings/[listingId]/newsletters
 * @component Client Component
 * @tier ADVANCED
 * @generated ComponentBuilder v3.0
 * @phase Tier 2 Content Types - Phase N7A
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier2_Phases/PHASE_N7A_DASHBOARD_NEWSLETTER_MANAGER.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use ErrorBoundary (ADVANCED tier requirement)
 * - Orange theme (#ed6437) for action buttons
 * - BizModal for all modals (MANDATORY via NewsletterFormModal)
 * - fetchWithCsrf for all mutations
 * - Creator Suite add-on gating
 * - Follows ContentManager.tsx pattern exactly
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, AlertCircle, Mail, Eye, Pencil, Trash2, ToggleLeft, Clock, BookOpen, Send, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import type { Route } from 'next';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { useListingData } from '@features/dashboard/hooks/useListingData';
import { fetchWithCsrf } from '@core/utils/csrf';
import { EmptyState } from '../shared/EmptyState';
import { TierLimitBanner } from '../shared/TierLimitBanner';
import { ConfirmDeleteModal } from '../shared/ConfirmDeleteModal';
import { NewsletterFormModal } from './newsletter/NewsletterFormModal';
import { NewsletterPreviewModal } from './newsletter/NewsletterPreviewModal';
import { SendConfirmationModal } from './newsletter/SendConfirmationModal';
import { NewsletterAnalyticsDashboard } from './newsletter/NewsletterAnalyticsDashboard';
import { SocialMediaManagerModal } from './content/SocialMediaManagerModal';
import type { Newsletter } from '@core/types/newsletter';

// ============================================================================
// TYPES
// ============================================================================

interface NewsletterCounts {
  total: number;
  draft: number;
  published: number;
  scheduled: number;
  archived: number;
}

const NEWSLETTER_LIMITS: Record<string, number> = {
  essentials: 5,
  plus: 15,
  preferred: 50,
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
    case 'scheduled':
      return 'bg-blue-100 text-blue-700';
    case 'archived':
      return 'bg-yellow-100 text-yellow-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function formatDate(date: Date | string | null): string {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getNewsletterInitialData(item: Newsletter) {
  return {
    title: item.title,
    excerpt: item.excerpt || '',
    web_content: item.web_content || '',
    featured_image: item.featured_image || '',
    category_id: item.category_id?.toString() || '',
    tags: (item.tags || []).join(', '),
    reading_time: item.reading_time?.toString() || '',
    issue_number: item.issue_number?.toString() || '',
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

function NewsletterManagerContent() {
  const { selectedListingId } = useListingContext();
  const { listing } = useListingData(selectedListingId);

  // Data state
  const [items, setItems] = useState<Newsletter[]>([]);
  const [counts, setCounts] = useState<NewsletterCounts>({ total: 0, draft: 0, published: 0, scheduled: 0, archived: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Creator Suite gating
  const [hasCreatorSuite, setHasCreatorSuite] = useState<boolean | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Newsletter | null>(null);
  const [deletingItem, setDeletingItem] = useState<Newsletter | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Analytics state (Phase N8)
  const [analyticsNewsletterId, setAnalyticsNewsletterId] = useState<number | null>(null);
  const [analyticsNewsletterTitle, setAnalyticsNewsletterTitle] = useState('');

  // Preview + Send state (Phase N7B)
  const [previewingItem, setPreviewingItem] = useState<Newsletter | null>(null);
  const [sendingItem, setSendingItem] = useState<Newsletter | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [socialShareNewsletter, setSocialShareNewsletter] = useState<Newsletter | null>(null);

  const tier = listing?.tier || 'essentials';
  const limit = NEWSLETTER_LIMITS[tier] ?? 5;
  const canAddMore = counts.total < limit;

  // Fetch newsletters
  const fetchNewsletters = useCallback(async () => {
    if (!selectedListingId) return;

    setIsLoading(true);
    setError(null);

    try {
      const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
      const response = await fetch(
        `/api/dashboard/listings/${selectedListingId}/newsletters?page=1&limit=50${statusParam}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        if (response.status === 403) {
          setHasCreatorSuite(false);
          return;
        }
        throw new Error('Failed to fetch newsletters');
      }

      const result = await response.json();
      if (result.success) {
        setItems(result.data.newsletters || []);
        if (result.data.counts) setCounts(result.data.counts);
        setHasCreatorSuite(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load newsletters');
    } finally {
      setIsLoading(false);
    }
  }, [selectedListingId, statusFilter]);

  useEffect(() => {
    fetchNewsletters();
  }, [fetchNewsletters]);

  // Handle create
  const handleCreate = useCallback(async (data: Record<string, unknown>) => {
    if (!selectedListingId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(
        `/api/dashboard/listings/${selectedListingId}/newsletters`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to create newsletter');
      }

      await fetchNewsletters();
      setShowCreateModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create newsletter');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedListingId, fetchNewsletters]);

  // Handle update
  const handleUpdate = useCallback(async (data: Record<string, unknown>) => {
    if (!editingItem || !selectedListingId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(
        `/api/dashboard/listings/${selectedListingId}/newsletters`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newsletterId: editingItem.id, ...data }),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to update newsletter');
      }

      await fetchNewsletters();
      setEditingItem(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update newsletter');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [editingItem, selectedListingId, fetchNewsletters]);

  // Handle publish / archive / re-draft cycle
  const handlePublish = useCallback(async (item: Newsletter) => {
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
        `/api/dashboard/listings/${selectedListingId}/newsletters`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newsletterId: item.id, status: nextStatus }),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to update status');
      }

      await fetchNewsletters();
      if (nextStatus === 'published') {
        setSocialShareNewsletter(item);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  }, [selectedListingId, fetchNewsletters]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!deletingItem || !selectedListingId) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(
        `/api/dashboard/listings/${selectedListingId}/newsletters`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newsletterId: deletingItem.id }),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to delete newsletter');
      }

      await fetchNewsletters();
      setDeletingItem(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete newsletter');
    } finally {
      setIsDeleting(false);
    }
  }, [deletingItem, selectedListingId, fetchNewsletters]);

  // Handle send click — fetch subscriber count, then show confirmation
  const handleSendClick = useCallback(async (item: Newsletter) => {
    if (!selectedListingId) return;

    try {
      const response = await fetch(
        `/api/dashboard/listings/${selectedListingId}/newsletters?page=1&limit=1`,
        { credentials: 'include' }
      );

      if (!response.ok) throw new Error('Failed to fetch subscriber info');

      const result = await response.json();
      const count = result.data?.subscriberCount ?? 0;

      if (count === 0) {
        setError('No active subscribers. Add subscribers before sending.');
        return;
      }

      setSubscriberCount(count);
      setSendingItem(item);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check subscribers');
    }
  }, [selectedListingId]);

  // Handle send confirmation
  const handleSend = useCallback(async () => {
    if (!sendingItem || !selectedListingId) return;

    setIsSending(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(
        `/api/dashboard/listings/${selectedListingId}/newsletters/${sendingItem.id}/send`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to send newsletter');
      }

      await fetchNewsletters();
      setSendingItem(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send newsletter');
    } finally {
      setIsSending(false);
    }
  }, [sendingItem, selectedListingId, fetchNewsletters]);

  // Show analytics dashboard if viewing analytics
  if (analyticsNewsletterId) {
    return (
      <NewsletterAnalyticsDashboard
        listingId={selectedListingId!}
        newsletterId={analyticsNewsletterId}
        newsletterTitle={analyticsNewsletterTitle}
        onBack={() => setAnalyticsNewsletterId(null)}
      />
    );
  }

  // ============================================================================
  // Creator Suite not active — show upgrade prompt
  // ============================================================================

  if (hasCreatorSuite === false) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="bg-orange-50 rounded-full p-6 mb-4">
          <Mail className="w-12 h-12 text-[#ed6437]" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Creator Suite Required</h2>
        <p className="text-gray-600 max-w-md mb-2">
          Send newsletters directly to your subscribers to keep them informed and grow your audience.
        </p>
        <ul className="text-sm text-gray-500 mb-6 space-y-1">
          <li>Create and publish newsletter issues</li>
          <li>Manage subscriber lists</li>
          <li>Track open and click rates</li>
          <li>Schedule future sends</li>
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
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Newsletters</h2>
          <p className="text-sm text-gray-600 mt-1">
            {counts.total} of {limit === 9999 ? 'unlimited' : limit} newsletters used
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={!canAddMore || isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Create Newsletter
        </button>
      </div>

      {/* Status Filter Bar */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0">
          {STATUS_FILTERS.map(({ id, label }) => {
            const count = id === 'all' ? counts.total : (counts[id as keyof NewsletterCounts] as number) ?? 0;
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
        itemType="newsletters"
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

      {/* Newsletter List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#ed6437] animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No Newsletters Yet"
          description="Create your first newsletter to start communicating with your subscribers"
          action={{
            label: 'Create Newsletter',
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
                <div className="flex items-center gap-1 flex-shrink-0">
                  {item.issue_number && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                      #{item.issue_number}
                    </span>
                  )}
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
                {item.reading_time && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.reading_time} min read
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  Issue
                </span>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {item.view_count ?? 0} views
                </span>
                <span>
                  {item.open_count ?? 0} opens
                </span>
                <span>
                  {item.click_count ?? 0} clicks
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
                <button
                  onClick={() => setPreviewingItem(item)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  title="Preview"
                >
                  <Eye className="w-3 h-3" />
                  Preview
                </button>
                {(item.status === 'draft' || item.status === 'scheduled') && (
                  <button
                    onClick={() => handleSendClick(item)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-[#ed6437] rounded-lg hover:bg-[#d55a31] transition-colors"
                    title="Send to subscribers"
                  >
                    <Send className="w-3 h-3" />
                    Send
                  </button>
                )}
                {item.status === 'published' && item.sent_at && (
                  <button
                    onClick={() => {
                      setAnalyticsNewsletterId(item.id);
                      setAnalyticsNewsletterTitle(item.title);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    title="View Analytics"
                  >
                    <BarChart3 className="w-3 h-3" />
                    Analytics
                  </button>
                )}
                <button
                  onClick={() => setEditingItem(item)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  title="Edit"
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </button>
                <button
                  onClick={() => handlePublish(item)}
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
      <NewsletterFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
      />

      {/* Edit Modal */}
      {editingItem && (
        <NewsletterFormModal
          isOpen={true}
          onClose={() => setEditingItem(null)}
          onSubmit={handleUpdate}
          isSubmitting={isSubmitting}
          initialData={getNewsletterInitialData(editingItem)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <ConfirmDeleteModal
          isOpen={true}
          onClose={() => setDeletingItem(null)}
          onConfirm={handleDelete}
          itemType="newsletter"
          itemName={deletingItem.title}
          isDeleting={isDeleting}
        />
      )}

      {/* Preview Modal (Phase N7B) */}
      {previewingItem && (
        <NewsletterPreviewModal
          isOpen={true}
          onClose={() => setPreviewingItem(null)}
          newsletter={previewingItem}
        />
      )}

      {/* Send Confirmation Modal (Phase N7B) */}
      {sendingItem && (
        <SendConfirmationModal
          isOpen={true}
          onClose={() => { setSendingItem(null); setIsSending(false); }}
          onConfirm={handleSend}
          newsletter={sendingItem}
          subscriberCount={subscriberCount}
          isSending={isSending}
        />
      )}

      {/* Social Media Share Modal */}
      {socialShareNewsletter && selectedListingId && (
        <SocialMediaManagerModal
          isOpen={true}
          onClose={() => setSocialShareNewsletter(null)}
          listingId={selectedListingId}
          contentType="newsletter"
          contentId={socialShareNewsletter.id}
          contentTitle={socialShareNewsletter.title}
        />
      )}
    </div>
  );
}

/**
 * NewsletterManager - Wrapped with ErrorBoundary
 */
export function NewsletterManager() {
  return (
    <ErrorBoundary componentName="NewsletterManager">
      <NewsletterManagerContent />
    </ErrorBoundary>
  );
}

export default NewsletterManager;
