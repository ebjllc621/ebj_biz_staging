/**
 * Admin Moderation Queue Page
 *
 * GOVERNANCE COMPLIANCE:
 * - Template: AdminDashboardTemplate with tabs (STANDARD tier)
 * - Authentication: Admin-only access required
 * - Service Boundary: Per-type queries via API routes with proper JOINs
 * - Credentials: 'include' for all fetch requests
 *
 * Features:
 * - Tab-based interface (Listings, Reviews, Events, Content)
 * - Server-side counts per status (pending/approved/rejected)
 * - Approve/Reject workflow with reason
 * - Content preview modal with HTML-safe rendering
 * - Status indicators per content type
 *
 * @authority PHASE_5.2_BRAIN_PLAN.md - Section 3.2.2
 * @component
 * @returns {JSX.Element} Admin moderation interface
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { BizModal, BizModalButton } from '@/components/ui/BizModal';
import { useAuth } from '@core/hooks/useAuth';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type ContentType = 'listings' | 'reviews' | 'events' | 'content';
type ModerationStatus = 'pending' | 'approved' | 'rejected';
type ModerationAction = 'approve' | 'reject';

interface ModerationItem {
  id: number;
  type: ContentType;
  title: string;
  description?: string;
  content?: string;
  status: ModerationStatus;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  moderated_at?: string;
  moderated_by?: number;
  moderation_reason?: string;
  content_type?: string; // article, video, podcast (for content tab)
  rating?: number; // reviews only
  images?: string[] | null; // review media (photos + video URLs)
}

interface ModerationCounts {
  pending: number;
  approved: number;
  rejected: number;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ModerationStats({ counts }: { counts: ModerationCounts }) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
        <div className="text-2xl font-bold text-yellow-700">{counts.pending}</div>
        <div className="text-sm text-yellow-600">Pending Review</div>
      </div>
      <div className="bg-green-50 p-4 rounded border border-green-200">
        <div className="text-2xl font-bold text-green-700">{counts.approved}</div>
        <div className="text-sm text-green-600">Approved</div>
      </div>
      <div className="bg-red-50 p-4 rounded border border-red-200">
        <div className="text-2xl font-bold text-red-700">{counts.rejected}</div>
        <div className="text-sm text-red-600">Rejected</div>
      </div>
    </div>
  );
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

function ContentPreviewModal({
  item,
  isOpen,
  onClose,
  onModerate
}: {
  item: ModerationItem | null;
  isOpen: boolean;
  onClose: () => void;
  onModerate: (action: ModerationAction, reason?: string) => Promise<void>;
}) {
  const [action, setAction] = useState<ModerationAction>('approve');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!item) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      await onModerate(action, reason || undefined);
      setSuccess(true);
      setReason('');
      // Brief success message before closing
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to moderate item');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: ModerationStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
    }
  };

  // Default action based on current status
  const defaultAction: ModerationAction = item.status === 'approved' ? 'reject' : 'approve';

  return (
    <BizModal isOpen={isOpen} onClose={onClose} title="Review Item" size="large">
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <h3 className="text-lg font-medium">{item.title}</h3>
            <div className="text-sm text-gray-500 mt-1">
              {item.created_by_name
                ? `By ${item.created_by_name}`
                : `User #${item.created_by}`
              }
              {' '}on {new Date(item.created_at).toLocaleString()}
            </div>
            {item.content_type && (
              <div className="text-xs text-blue-600 mt-1 capitalize">
                Type: {item.content_type}
              </div>
            )}
            {item.rating !== undefined && item.rating !== null && (
              <div className="text-sm text-amber-600 mt-1">
                Rating: {'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}
              </div>
            )}
          </div>
          <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(item.status)}`}>
            {item.status.toUpperCase()}
          </span>
        </div>

        <div className="space-y-3">
          {item.description && (
            <div>
              <label className="text-sm font-medium text-gray-700">Description</label>
              <div className="mt-1 p-3 bg-gray-50 rounded text-sm">
                {stripHtml(item.description)}
              </div>
            </div>
          )}

          {item.content && (
            <div>
              <label className="text-sm font-medium text-gray-700">Content</label>
              <div className="mt-1 p-3 bg-gray-50 rounded text-sm max-h-64 overflow-y-auto">
                {stripHtml(item.content)}
              </div>
            </div>
          )}
        </div>

        {/* Review Media (images + video) */}
        {item.images && item.images.length > 0 && (
          <div>
            <label className="text-sm font-medium text-gray-700">Attached Media</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {item.images.map((url, idx) => {
                const isVideo = /\.(mp4|webm|mov)$/i.test(url) || /youtube\.com|vimeo\.com|rumble\.com/i.test(url);
                if (isVideo) {
                  if (/\.(mp4|webm|mov)$/i.test(url)) {
                    return (
                      <video key={idx} src={url} controls className="w-40 h-28 rounded-lg object-cover border border-gray-200" />
                    );
                  }
                  return (
                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 hover:bg-blue-100">
                      Video link
                    </a>
                  );
                }
                return (
                  <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Review media ${idx + 1}`} className="w-24 h-24 rounded-lg object-cover border border-gray-200 hover:ring-2 hover:ring-orange-400 transition-all" />
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {item.moderated_at && (
          <div className="bg-blue-50 p-3 rounded text-sm">
            <div className="font-medium text-blue-900">Previous Moderation</div>
            <div className="text-blue-700 mt-1">
              Moderated on {new Date(item.moderated_at).toLocaleString()}
            </div>
            {item.moderation_reason && (
              <div className="text-blue-700 mt-1">
                <strong>Reason:</strong> {item.moderation_reason}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 p-3 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 p-3 rounded text-sm text-green-700 font-medium">
            Item {action === 'approve' ? 'approved' : 'rejected'} successfully!
          </div>
        )}

        <div className="border-t pt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-2">Action</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="approve"
                  checked={action === 'approve'}
                  onChange={() => setAction('approve')}
                  defaultChecked={defaultAction === 'approve'}
                />
                <span className="text-green-700 font-medium">
                  {item.status === 'approved' ? 'Keep Approved' : 'Approve'}
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="reject"
                  checked={action === 'reject'}
                  onChange={() => setAction('reject')}
                  defaultChecked={defaultAction === 'reject'}
                />
                <span className="text-red-700 font-medium">
                  {item.status === 'rejected' ? 'Keep Rejected' : 'Reject'}
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Reason {action === 'reject' && <span className="text-red-600">*</span>}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              rows={3}
              placeholder={action === 'approve' ? 'Optional approval notes' : 'Required rejection reason'}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <BizModalButton variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </BizModalButton>
            <BizModalButton
              variant={action === 'approve' ? 'primary' : 'danger'}
              onClick={handleSubmit}
              disabled={submitting || success || (action === 'reject' && !reason.trim())}
            >
              {submitting ? 'Processing...' : action === 'approve' ? 'Approve' : 'Reject'}
            </BizModalButton>
          </div>
        </div>
      </div>
    </BizModal>
  );
}

function ContentTable({
  items,
  activeTab,
  onSelect
}: {
  items: ModerationItem[];
  activeTab: ContentType;
  onSelect: (item: ModerationItem) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="bg-white p-8 rounded shadow text-center text-gray-500">
        No items to moderate
      </div>
    );
  }

  const getStatusColor = (status: ModerationStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className="bg-white rounded shadow overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium">Title</th>
            {activeTab === 'content' && (
              <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
            )}
            {activeTab === 'reviews' && (
              <th className="px-4 py-3 text-left text-sm font-medium">Rating</th>
            )}
            <th className="px-4 py-3 text-left text-sm font-medium">Created By</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Created</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={`${item.id}-${item.content_type ?? ''}`} className="border-t hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="font-medium">{stripHtml(item.title || '')}</div>
                {item.description && (
                  <div className="text-sm text-gray-500 truncate max-w-md">
                    {stripHtml(item.description)}
                  </div>
                )}
              </td>
              {activeTab === 'content' && (
                <td className="px-4 py-3 text-sm capitalize">
                  {item.content_type ?? '-'}
                </td>
              )}
              {activeTab === 'reviews' && (
                <td className="px-4 py-3 text-sm text-amber-600">
                  {item.rating ? '★'.repeat(item.rating) : '-'}
                </td>
              )}
              <td className="px-4 py-3 text-sm">
                {item.created_by_name ?? `User #${item.created_by}`}
              </td>
              <td className="px-4 py-3 text-sm">
                {new Date(item.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
                  {item.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => onSelect(item)}
                  className="px-3 py-1 bg-[#ed6437] text-white rounded text-sm hover:bg-[#d55a2f]"
                >
                  Review
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AdminModerationPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as ContentType) || 'listings';

  const [activeTab, setActiveTab] = useState<ContentType>(initialTab);
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [counts, setCounts] = useState<ModerationCounts>({ pending: 0, approved: 0, rejected: 0 });
  const [tabPendingCounts, setTabPendingCounts] = useState<Record<ContentType, number>>({
    listings: 0, reviews: 0, events: 0, content: 0,
  });
  const [selectedItem, setSelectedItem] = useState<ModerationItem | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ModerationStatus | 'all'>('pending');
  const [loading, setLoading] = useState(true);

  // Fetch pending counts for all tabs (badge indicators)
  const fetchTabCounts = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/moderation/counts', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        const countsData = data.data ?? data;
        setTabPendingCounts({
          listings: countsData.listings ?? 0,
          reviews: countsData.reviews ?? 0,
          events: countsData.events ?? 0,
          content: countsData.content ?? 0,
        });
      }
    } catch {
      // Silent fail — badges just won't show
    }
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/moderation/${activeTab}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        const responseData = data.data ?? data;
        setItems(responseData.items ?? []);
        if (responseData.counts) {
          setCounts(responseData.counts);
        }
      }
    } catch {
      // Network error - items stay empty
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchItems();
      fetchTabCounts();
    }
  }, [user, fetchItems, fetchTabCounts]);

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

  const handleModerate = async (itemId: number, action: ModerationAction, reason?: string): Promise<void> => {
    const item = items.find(i => i.id === itemId);
    const response = await fetch(`/api/admin/moderation/${activeTab}/${itemId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        reason,
        contentType: item?.content_type // needed for content tab
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const msg = errorData?.error?.message || `Server returned ${response.status}`;
      throw new Error(msg);
    }

    // Refresh the list and tab counts after successful moderation
    await Promise.all([fetchItems(), fetchTabCounts()]);
  };

  const filteredItems = filterStatus === 'all'
    ? items
    : items.filter(item => item.status === filterStatus);

  const tabs: { key: ContentType; label: string }[] = [
    { key: 'listings', label: 'Listings' },
    { key: 'reviews', label: 'Reviews' },
    { key: 'events', label: 'Events' },
    { key: 'content', label: 'Content' },
  ];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Moderation Queue</h1>
        <p className="text-gray-600">Review and approve user-submitted content across the platform</p>
      </div>

      <div className="border-b mb-6">
        <div className="flex gap-4">
          {tabs.map(tab => {
            const pendingCount = tabPendingCounts[tab.key];
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-4 py-2 font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-[#ed6437] text-[#ed6437]'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center px-1.5 text-xs font-bold text-white bg-red-500 rounded-full">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {!loading && <ModerationStats counts={counts} />}

      <div className="mb-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as ModerationStatus | 'all')}
          className="px-4 py-2 border rounded"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending Only</option>
          <option value="approved">Approved Only</option>
          <option value="rejected">Rejected Only</option>
        </select>
      </div>

      {loading ? (
        <div className="bg-white p-8 rounded shadow text-center text-gray-500">
          Loading...
        </div>
      ) : (
        <ContentTable
          items={filteredItems}
          activeTab={activeTab}
          onSelect={(item) => {
            setSelectedItem(item);
            setPreviewModalOpen(true);
          }}
        />
      )}

      <ContentPreviewModal
        item={selectedItem}
        isOpen={previewModalOpen}
        onClose={() => {
          setPreviewModalOpen(false);
          setSelectedItem(null);
        }}
        onModerate={async (action, reason) => {
          if (selectedItem) {
            return handleModerate(selectedItem.id, action, reason);
          }
        }}
      />
    </>
  );
}
