/**
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase G3 - Guide Detail Page
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import { Bookmark, Share2, Flag } from 'lucide-react';
import { RecommendButton } from '@features/sharing/components/RecommendButton';
import type { Guide } from '@core/types/guide';

interface GuideActionBarProps {
  guide: Guide;
  onShareClick: () => void;
  onBookmarkClick: () => void;
  onReportClick: () => void;
  isBookmarked?: boolean;
  onRecommendSuccess?: () => void;
}

/**
 * GuideActionBar — fixed mobile action bar (hidden on desktop)
 * Provides quick access to bookmark, share, report, and recommend actions.
 */
export function GuideActionBar({
  guide,
  onShareClick,
  onBookmarkClick,
  onReportClick,
  isBookmarked = false,
  onRecommendSuccess
}: GuideActionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 lg:hidden z-40 bg-white border-t border-gray-200 shadow-lg">
      <div className="flex items-center justify-around px-4 py-3 pb-safe">
        {/* Bookmark */}
        <button
          onClick={onBookmarkClick}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark guide'}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
            isBookmarked
              ? 'text-biz-orange'
              : 'text-gray-500 hover:text-biz-orange'
          }`}
        >
          <Bookmark className="w-5 h-5" fill={isBookmarked ? 'currentColor' : 'none'} />
          <span className="text-xs font-medium">Save</span>
        </button>

        {/* Share */}
        <button
          onClick={onShareClick}
          aria-label="Share guide"
          className="flex flex-col items-center gap-1 p-2 rounded-lg text-gray-500 hover:text-biz-navy transition-colors"
        >
          <Share2 className="w-5 h-5" />
          <span className="text-xs font-medium">Share</span>
        </button>

        {/* Report */}
        <button
          onClick={onReportClick}
          aria-label="Report guide"
          className="flex flex-col items-center gap-1 p-2 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Flag className="w-5 h-5" />
          <span className="text-xs font-medium">Report</span>
        </button>

        {/* RecommendButton */}
        <RecommendButton
          entityType="guide"
          entityId={guide.id.toString()}
          entityPreview={{
            title: guide.title,
            description: guide.excerpt || guide.overview?.substring(0, 200) || '',
            image_url: guide.featured_image || null,
            url: `/guides/${guide.slug || ''}`
          }}
          variant="secondary"
          size="sm"
          className="!py-2 !px-3 !border !rounded-lg !font-semibold !text-xs !whitespace-nowrap [&>svg]:w-4 [&>svg]:h-4 [&>svg]:flex-shrink-0"
          onRecommendSuccess={onRecommendSuccess}
        />
      </div>
    </div>
  );
}

export default GuideActionBar;
