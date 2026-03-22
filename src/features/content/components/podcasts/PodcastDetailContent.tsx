/**
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 1B - Podcast Detail Page
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import Link from 'next/link';
import type { Route } from 'next';
import type { ContentPodcast } from '@core/services/ContentService';

interface PodcastDetailContentProps {
  podcast: ContentPodcast;
  className?: string;
}

/**
 * PodcastDetailContent — renders plain text description and show notes
 * No HTML sanitization required — podcast descriptions are plain text
 */
export function PodcastDetailContent({ podcast, className = '' }: PodcastDetailContentProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:p-8 ${className}`}>
      {/* About This Episode */}
      <h2 className="text-lg font-bold text-biz-navy mb-4">About This Episode</h2>

      {podcast.description ? (
        <p className="text-gray-700 leading-relaxed whitespace-pre-line">
          {podcast.description}
        </p>
      ) : (
        <p className="text-gray-500 italic">No description available.</p>
      )}

      {/* Show Notes Placeholder */}
      <div className="mt-8 pt-6 border-t border-gray-100">
        <h2 className="text-lg font-bold text-biz-navy mb-4">Show Notes</h2>
        <p className="text-gray-500 italic text-sm">Show notes coming soon.</p>
      </div>

      {/* Full Tag List */}
      {podcast.tags.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Tags</p>
          <div className="flex flex-wrap gap-2">
            {podcast.tags.map((tag, index) => (
              <Link
                key={index}
                href={`/content?tag=${encodeURIComponent(tag)}` as Route}
                className="text-sm text-teal-600 bg-teal-50 px-3 py-1 rounded hover:bg-teal-100 transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PodcastDetailContent;
