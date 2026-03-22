/**
 * RecommendationInboxList - List wrapper for inbox items
 *
 * Responsive list container that switches between desktop and mobile layouts.
 * Handles loading states and empty states automatically.
 *
 * @tier STANDARD
 * @phase Phase 3 - Inbox & Discovery
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/userrecommendations/phases/PHASE_3_BRAIN_PLAN.md
 *
 * @example
 * ```tsx
 * import { RecommendationInboxList } from '@features/sharing/components';
 *
 * function InboxPage() {
 *   const { data, isLoading, error } = useRecommendations();
 *
 *   return (
 *     <RecommendationInboxList
 *       recommendations={data}
 *       isLoading={isLoading}
 *       error={error}
 *       onMarkViewed={handleMarkViewed}
 *       onToggleSaved={handleToggleSaved}
 *     />
 *   );
 * }
 * ```
 */

'use client';

import { Loader2, Inbox } from 'lucide-react';
import { useIsMobile } from '@core/hooks/useMediaQuery';
import { RecommendationInboxItem } from './RecommendationInboxItem';
import { MobileRecommendationInbox } from './MobileRecommendationInbox';
import type { SharingWithPreview } from '@features/contacts/types/sharing';

interface RecommendationInboxListProps {
  recommendations: SharingWithPreview[];
  isLoading: boolean;
  error: string | null;
  isSentTab?: boolean;
  onMarkViewed: (id: number) => void;
  onToggleSaved: (id: number) => void;
  onHide?: (id: number) => void;
  // Phase 4: Feedback handlers
  onMarkHelpful?: (id: number, isHelpful: boolean) => Promise<void>;
  onSendThank?: (id: number) => void;
}

export function RecommendationInboxList({
  recommendations,
  isLoading,
  error,
  isSentTab = false,
  onMarkViewed,
  onToggleSaved,
  onHide,
  onMarkHelpful,
  onSendThank
}: RecommendationInboxListProps) {
  const isMobile = useIsMobile();

  // Use MobileRecommendationInbox on mobile (only for received tab)
  if (isMobile && !isSentTab) {
    return <MobileRecommendationInbox />;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-2">Failed to load recommendations</p>
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    );
  }

  // Empty state
  if (recommendations.length === 0) {
    return (
      <div className="text-center py-12">
        <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="font-medium text-gray-900 mb-1">
          {isSentTab ? 'No recommendations sent' : 'No recommendations yet'}
        </h3>
        <p className="text-gray-500 text-sm">
          {isSentTab
            ? 'Share businesses, events, or connections with others.'
            : 'When someone recommends something to you, it will appear here.'}
        </p>
      </div>
    );
  }

  // Recommendations list
  return (
    <div className="space-y-3">
      {recommendations.map((rec) => (
        <RecommendationInboxItem
          key={rec.id}
          id={rec.id}
          entityType={rec.entity_type}
          entityPreview={rec.entity_preview || null}
          message={rec.referral_message}
          sender={rec.sender}
          createdAt={rec.created_at}
          viewedAt={rec.viewed_at}
          isSaved={rec.is_saved || false}
          isSent={isSentTab}
          isHelpful={rec.is_helpful}
          thankedAt={rec.thanked_at}
          onMarkViewed={onMarkViewed}
          onToggleSaved={onToggleSaved}
          onHide={onHide}
          onMarkHelpful={onMarkHelpful}
          onSendThank={onSendThank}
        />
      ))}
    </div>
  );
}

export default RecommendationInboxList;
