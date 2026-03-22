/**
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 1C - Video Detail Page
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { Tag } from 'lucide-react';
import type { ContentVideo } from '@core/services/ContentService';

interface VideoDetailContentProps {
  video: ContentVideo;
  className?: string;
}

/**
 * VideoDetailContent — renders plain text description and tags
 * No HTML sanitization required — video descriptions are plain text
 */
export function VideoDetailContent({ video, className = '' }: VideoDetailContentProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:p-8 ${className}`}>
      {/* About This Video */}
      <h2 className="text-lg font-bold text-biz-navy mb-4">About This Video</h2>

      {video.description ? (
        <p className="text-gray-700 leading-relaxed whitespace-pre-line">
          {video.description}
        </p>
      ) : (
        <p className="text-gray-500 italic">No description available.</p>
      )}

      {/* Full Tag List */}
      {video.tags.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" />
            Tags
          </p>
          <div className="flex flex-wrap gap-2">
            {video.tags.map((tag, index) => (
              <Link
                key={index}
                href={`/content?tag=${encodeURIComponent(tag)}` as Route}
                className="text-sm text-purple-600 bg-purple-50 px-3 py-1 rounded hover:bg-purple-100 transition-colors"
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

export default VideoDetailContent;
