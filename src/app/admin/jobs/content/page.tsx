/**
 * Admin Market Content Manager
 *
 * CRUD interface for managing job market content articles (trends, salary guides,
 * skills reports, industry outlooks, hiring tips).
 *
 * @tier STANDARD
 * @phase Jobs Phase 6A - Market Insights Completion
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/integrationPointRef/jobs/phases/PHASE_6_PLAN.md
 *
 * @see src/app/admin/jobs/community/page.tsx - Canon pattern
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { AdminTableTemplate, TableColumn, TableAction } from '@/components/admin/templates/AdminTableTemplate';
import {
  AdminPageHeader,
  AdminStatsPanel,
  type StatSection,
} from '@/components/admin/shared';
import { useAuth } from '@core/hooks/useAuth';
import { BizModal } from '@/components/ui/BizModal';
import { fetchWithCsrf } from '@core/utils/csrf';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import type { ContentType } from '@features/jobs/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MarketContent {
  id: number;
  content_type: ContentType;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  cover_image_url: string | null;
  regions: string[] | null;
  job_categories: number[] | null;
  published_date: string | null;
  status: string;
  author_user_id: number | null;
  author_name: string | null;
  view_count: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

interface ContentFormData {
  title: string;
  content_type: ContentType | '';
  summary: string;
  content: string;
  cover_image_url: string;
  is_featured: boolean;
  status: string;
}

const EMPTY_FORM: ContentFormData = {
  title: '',
  content_type: '',
  summary: '',
  content: '',
  cover_image_url: '',
  is_featured: false,
  status: 'draft',
};

// ---------------------------------------------------------------------------
// Display Maps
// ---------------------------------------------------------------------------

const contentTypeLabels: Record<string, string> = {
  trends: 'Market Trends',
  salary_guide: 'Salary Guide',
  skills_report: 'Skills Report',
  industry_outlook: 'Industry Outlook',
  hiring_tips: 'Hiring Tips',
};

const contentTypeColors: Record<string, string> = {
  trends: 'bg-blue-100 text-blue-800',
  salary_guide: 'bg-green-100 text-green-800',
  skills_report: 'bg-purple-100 text-purple-800',
  industry_outlook: 'bg-orange-100 text-orange-800',
  hiring_tips: 'bg-yellow-100 text-yellow-800',
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending_review: 'bg-yellow-100 text-yellow-800',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-red-100 text-red-800',
};

// ---------------------------------------------------------------------------
// Inner Component
// ---------------------------------------------------------------------------

function AdminMarketContentManager() {
  const { user } = useAuth();

  const [contents, setContents] = useState<MarketContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPublished, setTotalPublished] = useState(0);
  const [totalDraft, setTotalDraft] = useState(0);
  const [totalViews, setTotalViews] = useState(0);

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<MarketContent | null>(null);
  const [formData, setFormData] = useState<ContentFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingContent, setDeletingContent] = useState<MarketContent | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchContents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/jobs/content?limit=100', {
        credentials: 'include',
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to load market content');
      }

      const items: MarketContent[] = result.data?.items || [];
      setContents(items);

      // Compute derived stats
      setTotalPublished(items.filter(i => i.status === 'published').length);
      setTotalDraft(items.filter(i => i.status === 'draft').length);
      setTotalViews(items.reduce((sum, i) => sum + (i.view_count || 0), 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load market content');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContents();
  }, [fetchContents]);

  // ---------------------------------------------------------------------------
  // Create / Edit
  // ---------------------------------------------------------------------------

  const openCreateModal = () => {
    setEditingContent(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setFormModalOpen(true);
  };

  const openEditModal = (content: MarketContent) => {
    setEditingContent(content);
    setFormData({
      title: content.title,
      content_type: content.content_type,
      summary: content.summary || '',
      content: content.content,
      cover_image_url: content.cover_image_url || '',
      is_featured: content.is_featured,
      status: content.status,
    });
    setFormError(null);
    setFormModalOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!formData.title.trim()) {
      setFormError('Title is required.');
      return;
    }
    if (!formData.content_type) {
      setFormError('Content type is required.');
      return;
    }
    if (!formData.content.trim()) {
      setFormError('Content body is required.');
      return;
    }

    setFormLoading(true);
    setFormError(null);

    try {
      const payload = {
        title: formData.title.trim(),
        content_type: formData.content_type,
        summary: formData.summary.trim() || undefined,
        content: formData.content.trim(),
        cover_image_url: formData.cover_image_url.trim() || undefined,
        is_featured: formData.is_featured,
        ...(editingContent ? { id: editingContent.id, status: formData.status } : {}),
      };

      const response = await fetchWithCsrf('/api/admin/jobs/content', {
        method: editingContent ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to save content');
      }

      setFormModalOpen(false);
      setEditingContent(null);
      setFormData(EMPTY_FORM);
      await fetchContents();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save content');
    } finally {
      setFormLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Toggle Featured
  // ---------------------------------------------------------------------------

  const handleToggleFeatured = async (content: MarketContent) => {
    try {
      const response = await fetchWithCsrf('/api/admin/jobs/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: content.id, is_featured: !content.is_featured }),
        credentials: 'include',
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to update featured status');
      }

      await fetchContents();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update featured status');
    }
  };

  // ---------------------------------------------------------------------------
  // Publish / Unpublish
  // ---------------------------------------------------------------------------

  const handleTogglePublish = async (content: MarketContent) => {
    const newStatus = content.status === 'published' ? 'draft' : 'published';
    const label = newStatus === 'published' ? 'publish' : 'unpublish';
    if (!confirm(`${label.charAt(0).toUpperCase() + label.slice(1)} "${content.title}"?`)) return;

    try {
      const response = await fetchWithCsrf('/api/admin/jobs/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: content.id, status: newStatus }),
        credentials: 'include',
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || `Failed to ${label} content`);
      }

      await fetchContents();
    } catch (err) {
      alert(err instanceof Error ? err.message : `Failed to ${newStatus} content`);
    }
  };

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  const openDeleteModal = (content: MarketContent) => {
    setDeletingContent(content);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingContent) return;

    setDeleteLoading(true);
    try {
      const response = await fetchWithCsrf(`/api/admin/jobs/content?id=${deletingContent.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to delete content');
      }

      setDeleteModalOpen(false);
      setDeletingContent(null);
      await fetchContents();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete content');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  const statSections: StatSection[] = [
    {
      title: 'Market Content',
      items: [
        { label: 'Total Articles', value: loading ? '-' : contents.length },
        { label: 'Published', value: loading ? '-' : totalPublished },
        { label: 'Drafts', value: loading ? '-' : totalDraft },
        { label: 'Total Views', value: loading ? '-' : totalViews.toLocaleString() },
      ],
    },
  ];

  // ---------------------------------------------------------------------------
  // Table Columns
  // ---------------------------------------------------------------------------

  const columns: TableColumn<MarketContent>[] = [
    {
      key: 'title',
      header: 'Title',
      accessor: (item) => (
        <div>
          <div className="font-medium text-gray-900 line-clamp-1">{item.title}</div>
          {item.summary && (
            <div className="text-xs text-gray-500 line-clamp-1 mt-0.5">{item.summary}</div>
          )}
        </div>
      ),
    },
    {
      key: 'content_type',
      header: 'Type',
      accessor: (item) => (
        <span
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            contentTypeColors[item.content_type] || 'bg-gray-100 text-gray-800'
          }`}
        >
          {contentTypeLabels[item.content_type] || item.content_type}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (item) => (
        <span
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            statusColors[item.status] || 'bg-gray-100 text-gray-800'
          }`}
        >
          {item.status.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'published_date',
      header: 'Published',
      accessor: (item) =>
        item.published_date ? (
          <span className="text-sm text-gray-600">
            {new Date(item.published_date).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
    {
      key: 'view_count',
      header: 'Views',
      accessor: (item) => (
        <span className="text-sm text-gray-600">{item.view_count.toLocaleString()}</span>
      ),
    },
    {
      key: 'is_featured',
      header: 'Featured',
      accessor: (item) => (
        <span
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            item.is_featured ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {item.is_featured ? 'Yes' : 'No'}
        </span>
      ),
    },
  ];

  // ---------------------------------------------------------------------------
  // Table Actions
  // ---------------------------------------------------------------------------

  const actions: TableAction<MarketContent>[] = [
    {
      label: 'Edit',
      variant: 'primary',
      onClick: openEditModal,
    },
    {
      label: 'Toggle Featured',
      variant: 'secondary',
      onClick: handleToggleFeatured,
    },
    {
      label: 'Publish / Unpublish',
      variant: 'secondary',
      onClick: handleTogglePublish,
    },
    {
      label: 'Delete',
      variant: 'danger',
      onClick: openDeleteModal,
    },
  ];

  // ---------------------------------------------------------------------------
  // Guard
  // ---------------------------------------------------------------------------

  if (!user) {
    return <div className="p-6 text-center text-gray-500">Loading...</div>;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Market Content Manager"
        onCreateNew={openCreateModal}
        createLabel="+ New Article"
      />

      <AdminStatsPanel sections={statSections} loading={loading} />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
          <button
            onClick={fetchContents}
            className="ml-3 text-sm underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      <AdminTableTemplate
        title="All Market Content"
        data={contents}
        columns={columns}
        actions={actions}
        loading={loading}
        emptyMessage="No market content articles yet. Create one to get started."
        rowKey={(item) => item.id}
      />

      {/* Create / Edit Modal */}
      <BizModal
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingContent(null);
          setFormData(EMPTY_FORM);
          setFormError(null);
        }}
        title={editingContent ? 'Edit Article' : 'Create Article'}
        size="large"
      >
        <div className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {formError}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Article title"
            />
          </div>

          {/* Content Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.content_type}
              onChange={(e) => setFormData(prev => ({ ...prev, content_type: e.target.value as ContentType | '' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select type...</option>
              <option value="trends">Market Trends</option>
              <option value="salary_guide">Salary Guide</option>
              <option value="skills_report">Skills Report</option>
              <option value="industry_outlook">Industry Outlook</option>
              <option value="hiring_tips">Hiring Tips</option>
            </select>
          </div>

          {/* Summary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
            <textarea
              value={formData.summary}
              onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief summary displayed in cards..."
            />
          </div>

          {/* Content Body */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="Full article content..."
            />
          </div>

          {/* Cover Image URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image URL</label>
            <input
              type="text"
              value={formData.cover_image_url}
              onChange={(e) => setFormData(prev => ({ ...prev, cover_image_url: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://..."
            />
          </div>

          {/* Status (edit only) */}
          {editingContent && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="draft">Draft</option>
                <option value="pending_review">Pending Review</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          )}

          {/* Featured */}
          <div className="flex items-center gap-2">
            <input
              id="is_featured"
              type="checkbox"
              checked={formData.is_featured}
              onChange={(e) => setFormData(prev => ({ ...prev, is_featured: e.target.checked }))}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="is_featured" className="text-sm font-medium text-gray-700">
              Mark as Featured
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setFormModalOpen(false);
                setEditingContent(null);
                setFormData(EMPTY_FORM);
                setFormError(null);
              }}
              disabled={formLoading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleFormSubmit}
              disabled={formLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {formLoading ? 'Saving...' : editingContent ? 'Save Changes' : 'Create Article'}
            </button>
          </div>
        </div>
      </BizModal>

      {/* Delete Confirmation Modal */}
      <BizModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeletingContent(null);
        }}
        title="Delete Article"
        size="small"
      >
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            Are you sure you want to delete{' '}
            <span className="font-medium text-gray-900">{deletingContent?.title}</span>? This
            action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setDeleteModalOpen(false);
                setDeletingContent(null);
              }}
              disabled={deleteLoading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {deleteLoading ? 'Deleting...' : 'Delete Article'}
            </button>
          </div>
        </div>
      </BizModal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Default export with ErrorBoundary wrapper
// ---------------------------------------------------------------------------

export default function AdminMarketContentPage() {
  return (
    <ErrorBoundary componentName="AdminMarketContentPage">
      <AdminMarketContentManager />
    </ErrorBoundary>
  );
}
