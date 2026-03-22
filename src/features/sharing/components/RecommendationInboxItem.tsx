/**
 * RecommendationInboxItem - Single recommendation item in inbox
 *
 * Displays a received recommendation with sender info, entity preview, and action buttons.
 * Includes helpful/unhelpful rating, save/unsave, and hide functionality.
 *
 * @tier STANDARD
 * @phase Phase 3 - Inbox & Discovery
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/userrecommendations/phases/PHASE_3_BRAIN_PLAN.md
 *
 * @example
 * ```tsx
 * import { RecommendationInboxItem } from '@features/sharing/components';
 *
 * function InboxList({ recommendations }) {
 *   return recommendations.map(rec => (
 *     <RecommendationInboxItem
 *       key={rec.id}
 *       id={rec.id}
 *       entityType={rec.entity_type}
 *       sender={rec.sender}
 *       entityPreview={rec.entity_preview}
 *       message={rec.referral_message}
 *       sentAt={rec.created_at}
 *       isSaved={rec.is_saved}
 *       onMarkViewed={() => markAsViewed(rec.id)}
 *       onToggleSaved={() => toggleSaved(rec.id)}
 *     />
 *   ));
 * }
 * ```
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { MoreVertical, Star, Building, Calendar, User, Eye, EyeOff, Heart } from 'lucide-react';
import { getAvatarInitials } from '@core/utils/avatar';
import type { EntityType, EntityPreview } from '@features/contacts/types/sharing';
import { HelpfulRatingButtons } from './HelpfulRatingButtons';

interface Sender {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface RecommendationInboxItemProps {
  id: number;
  entityType: EntityType;
  entityPreview: EntityPreview | null;
  message: string | null;
  sender: Sender;
  createdAt: Date;
  viewedAt: Date | null;
  isSaved: boolean;
  isSent?: boolean;
  // Phase 4: Feedback props
  isHelpful?: boolean | null;
  thankedAt?: Date | null;
  onMarkViewed: (id: number) => void;
  onToggleSaved: (id: number) => void;
  onHide?: (id: number) => void;
  // Phase 4: Feedback handlers
  onMarkHelpful?: (id: number, isHelpful: boolean) => Promise<void>;
  onSendThank?: (id: number) => void;
}

const ENTITY_TYPE_ICONS: Record<string, typeof Building> = {
  listing: Building,
  event: Calendar,
  user: User
};

/**
 * Format relative time
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}

export function RecommendationInboxItem({
  id,
  entityType,
  entityPreview,
  message,
  sender,
  createdAt,
  viewedAt,
  isSaved,
  isSent = false,
  isHelpful,
  thankedAt,
  onMarkViewed,
  onToggleSaved,
  onHide,
  onMarkHelpful,
  onSendThank
}: RecommendationInboxItemProps) {
  const [showMenu, setShowMenu] = useState(false);

  const isUnread = !viewedAt && !isSent;
  const EntityIcon = ENTITY_TYPE_ICONS[entityType] || Building;

  const handleMarkRead = () => {
    if (!viewedAt && !isSent) {
      onMarkViewed(id);
    }
  };

  const handleMarkHelpful = async (helpful: boolean) => {
    if (onMarkHelpful) {
      await onMarkHelpful(id, helpful);
    }
  };

  const handleSendThank = () => {
    if (onSendThank) {
      onSendThank(id);
    }
  };

  const senderName = sender.display_name || sender.username;
  const initials = getAvatarInitials(senderName);

  return (
    <div
      className={`relative flex items-start gap-4 p-4 rounded-lg border transition-colors overflow-hidden ${
        isUnread
          ? 'bg-orange-50 border-orange-200 cursor-pointer'
          : 'bg-white border-gray-200 hover:bg-gray-50'
      }`}
      onClick={isUnread ? handleMarkRead : undefined}
      role={isUnread ? 'button' : undefined}
      tabIndex={isUnread ? 0 : undefined}
    >
      {/* Unread Indicator */}
      {isUnread && (
        <div className="absolute top-4 left-2 w-2 h-2 bg-orange-500 rounded-full" />
      )}

      {/* Sender Avatar */}
      <div className="flex-shrink-0">
        {sender.avatar_url ? (
          <img
            src={sender.avatar_url}
            alt={senderName}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium text-sm">
            {initials}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-gray-900">
            {isSent ? 'You' : senderName}
          </span>
          <span className="text-gray-500 text-sm">
            {isSent ? 'recommended' : 'recommended to you'}
          </span>
          <span className="text-gray-400 text-sm">
            {formatRelativeTime(createdAt)}
          </span>
        </div>

        {/* Message Preview */}
        {message && (
          <p className="text-gray-600 text-sm line-clamp-2 mb-2">
            &quot;{message}&quot;
          </p>
        )}

        {/* Entity Preview Card */}
        {entityPreview && (
          <Link
            href={entityPreview.url as Route}
            onClick={(e) => { e.stopPropagation(); handleMarkRead(); }}
            className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-orange-300 transition-colors overflow-hidden max-w-full"
          >
            {entityPreview.image_url ? (
              <img
                src={entityPreview.image_url}
                alt={entityPreview.title}
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                <EntityIcon className="w-6 h-6 text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">
                {entityPreview.title}
              </div>
              {entityPreview.description && (
                <div className="text-sm text-gray-500 truncate">
                  {entityPreview.description}
                </div>
              )}
            </div>
          </Link>
        )}

        {/* Phase 4: Feedback UI - Only show for received recommendations */}
        {!isSent && onMarkHelpful && (
          <div className="mt-3 flex items-center justify-between gap-4 pt-3 border-t border-gray-200">
            <HelpfulRatingButtons
              currentRating={isHelpful ?? null}
              onRate={handleMarkHelpful}
            />
            {!thankedAt && onSendThank && (
              <button
                onClick={handleSendThank}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-colors"
              >
                <Heart className="w-4 h-4" />
                Say Thanks
              </button>
            )}
            {thankedAt && (
              <span className="flex items-center gap-1 text-sm text-gray-500">
                <Heart className="w-4 h-4 text-pink-500" />
                Thanked
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-2">
        {/* Read Status Indicator */}
        {!isSent && (
          <div className="text-gray-400" title={viewedAt ? 'Viewed' : 'Unread'}>
            {viewedAt ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
          </div>
        )}

        {/* Save Button */}
        {!isSent && (
          <button
            onClick={() => onToggleSaved(id)}
            className={`p-1 rounded-full transition-colors ${
              isSaved
                ? 'text-yellow-500 hover:text-yellow-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
            title={isSaved ? 'Remove from saved' : 'Save'}
          >
            <Star className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
          </button>
        )}

        {/* More Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 min-w-[160px]">
                {entityPreview && (
                  <Link
                    href={entityPreview.url as Route}
                    onClick={() => setShowMenu(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    View {entityType}
                  </Link>
                )}
                {!isSent && onHide && (
                  <>
                    <hr className="my-1 border-gray-100" />
                    <button
                      onClick={() => {
                        onHide(id);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Hide recommendation
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default RecommendationInboxItem;
