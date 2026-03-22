/**
 * NewsletterPreviewModal - Email Preview Modal
 *
 * Renders newsletter content in an email-preview container.
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Tier 2 Content Types - Phase N7B
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier2_Phases/PHASE_N7B_NEWSLETTER_PREVIEW_SEND.md
 */
'use client';

import React from 'react';
import BizModal from '@/components/BizModal/BizModal';
import { Clock, Eye, BookOpen } from 'lucide-react';
import type { Newsletter } from '@core/types/newsletter';

// ============================================================================
// Types
// ============================================================================

export interface NewsletterPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  newsletter: Newsletter;
}

// ============================================================================
// Helpers
// ============================================================================

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-700';
    case 'published': return 'bg-green-100 text-green-700';
    case 'scheduled': return 'bg-blue-100 text-blue-700';
    case 'archived': return 'bg-yellow-100 text-yellow-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

// ============================================================================
// Component
// ============================================================================

export function NewsletterPreviewModal({ isOpen, onClose, newsletter }: NewsletterPreviewModalProps) {
  const content = newsletter.email_html || newsletter.web_content || '';

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Newsletter Preview"
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Title */}
        <div>
          <h2 className="text-xl font-bold text-gray-900">{newsletter.title}</h2>
          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
            {newsletter.issue_number && (
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                Issue #{newsletter.issue_number}
              </span>
            )}
            {newsletter.reading_time && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {newsletter.reading_time} min read
              </span>
            )}
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${getStatusBadgeClass(newsletter.status)}`}>
              {newsletter.status}
            </span>
          </div>
        </div>

        {/* Email Preview Container */}
        <div
          className="mx-auto border border-gray-200 rounded-lg bg-white shadow-sm overflow-auto"
          style={{ maxWidth: '600px', maxHeight: '500px' }}
        >
          {content ? (
            <div
              className="p-6 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <div className="p-6 text-center text-gray-400">
              <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No content to preview</p>
            </div>
          )}
        </div>

        {/* Stats Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200 text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span>{newsletter.subscriber_count_at_send ?? 0} subscribers at send</span>
            <span>{newsletter.view_count ?? 0} views</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </BizModal>
  );
}

export default NewsletterPreviewModal;
