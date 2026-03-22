/**
 * UserSentRecommendationsScroller - Horizontal Scroller for User's Sent Recommendations
 *
 * Displays recommendations made by the user in a horizontal scroller format.
 * Clicking "See All" expands to a grid view showing all recommendations.
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @dna-version 11.4.0
 *
 * GOVERNANCE COMPLIANCE:
 * - Client component ('use client' directive)
 * - ErrorBoundary wrapper (STANDARD tier requirement)
 * - Path aliases (@features/, @components/, @core/)
 * - Lucide React icons only
 * - Returns null if no recommendations (no empty panel)
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { BadgeCheck, ChevronRight, ChevronLeft, Grid3X3, X, User, Building2, Calendar, FileText } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { getAvatarInitials } from '@core/utils/avatar';
import type { EntityType, EntityPreview, Sharing } from '@features/contacts/types/sharing';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface SentRecommendationWithPreview extends Sharing {
  entity_preview: EntityPreview | null;
  recipient?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface ApiResponse {
  success: boolean;
  data: {
    recommendations: SentRecommendationWithPreview[];
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

export interface UserSentRecommendationsScrollerProps {
  /** Username to fetch recommendations for */
  username: string;
  /** Whether in edit view mode - shows empty state placeholder if true */
  isEditView?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get icon for entity type
 */
function getEntityIcon(entityType: EntityType) {
  switch (entityType) {
    case 'user':
      return User;
    case 'listing':
      return Building2;
    case 'event':
      return Calendar;
    default:
      return FileText;
  }
}

/**
 * Get entity type label
 */
function getEntityTypeLabel(entityType: EntityType): string {
  switch (entityType) {
    case 'user':
      return 'User';
    case 'listing':
      return 'Business';
    case 'event':
      return 'Event';
    case 'article':
      return 'Article';
    case 'newsletter':
      return 'Newsletter';
    case 'podcast':
      return 'Podcast';
    case 'video':
      return 'Video';
    default:
      return 'Content';
  }
}

/**
 * Format relative time
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

// ============================================================================
// RECOMMENDATION CARD COMPONENT
// ============================================================================

interface RecommendationCardProps {
  recommendation: SentRecommendationWithPreview;
  variant: 'scroller' | 'grid';
}

function RecommendationCard({ recommendation, variant }: RecommendationCardProps) {
  const { entity_preview, entity_type, recipient, created_at } = recommendation;
  const Icon = getEntityIcon(entity_type);
  const typeLabel = getEntityTypeLabel(entity_type);
  const timeAgo = formatRelativeTime(new Date(created_at));

  const cardClasses = variant === 'scroller'
    ? 'flex-shrink-0 w-72 snap-start'
    : 'w-full';

  // Get entity URL
  const entityUrl = entity_preview?.url || '#';

  return (
    <div className={`${cardClasses} bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow`}>
      {/* Entity Preview */}
      <Link href={entityUrl as Route} className="block">
        <div className="flex items-start gap-3 mb-3">
          {entity_preview?.image_url ? (
            <img
              src={entity_preview.image_url}
              alt={entity_preview.title}
              className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Icon className="w-7 h-7 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate hover:text-biz-orange transition-colors">
              {entity_preview?.title || 'Unknown'}
            </p>
            <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded mt-1">
              {typeLabel}
            </span>
          </div>
        </div>
      </Link>

      {/* Recipient Info */}
      {recipient && (
        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-500">Recommended to</span>
          <Link
            href={`/profile/${recipient.username}` as Route}
            className="flex items-center gap-2 group"
          >
            {recipient.avatar_url ? (
              <img
                src={recipient.avatar_url}
                alt={recipient.display_name || recipient.username}
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                {getAvatarInitials(recipient.display_name || recipient.username)}
              </div>
            )}
            <span className="text-sm text-gray-700 group-hover:text-biz-orange transition-colors truncate">
              {recipient.display_name || recipient.username}
            </span>
          </Link>
        </div>
      )}

      {/* Timestamp */}
      <p className="text-xs text-gray-400 mt-2">{timeAgo}</p>
    </div>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function ScrollerSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-gray-200 rounded" />
          <div className="h-5 w-48 bg-gray-200 rounded" />
        </div>
        <div className="h-4 w-16 bg-gray-200 rounded" />
      </div>
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-72">
            <div className="bg-gray-100 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 bg-gray-200 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-5 bg-gray-200 rounded w-16" />
                </div>
              </div>
              <div className="h-3 bg-gray-200 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function UserSentRecommendationsScrollerContent({ username, isEditView = false }: UserSentRecommendationsScrollerProps) {
  const [recommendations, setRecommendations] = useState<SentRecommendationWithPreview[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Ref for horizontal scrolling
  const scrollContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      const checkScroll = () => {
        setCanScrollLeft(node.scrollLeft > 0);
        setCanScrollRight(node.scrollLeft < node.scrollWidth - node.clientWidth - 10);
      };
      checkScroll();
      node.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
    }
  }, []);

  // Fetch recommendations
  const fetchRecommendations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch more for expanded view
      const limit = isExpanded ? 50 : 10;
      const response = await fetch(
        `/api/users/${encodeURIComponent(username)}/recommendations/sent?limit=${limit}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        if (response.status === 404) {
          setRecommendations([]);
          setTotal(0);
          setIsLoading(false);
          return;
        }
        throw new Error('Failed to fetch recommendations');
      }

      const result = await response.json() as ApiResponse;

      if (result.success && result.data) {
        setRecommendations(result.data.recommendations);
        setTotal(result.data.total);
      } else {
        setRecommendations([]);
        setTotal(0);
      }
    } catch {
      setError('Failed to load recommendations');
      setRecommendations([]);
    } finally {
      setIsLoading(false);
    }
  }, [username, isExpanded]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // Scroll handlers
  const scrollLeft = useCallback(() => {
    const container = document.getElementById('recommendations-scroll-container');
    if (container) {
      container.scrollBy({ left: -300, behavior: 'smooth' });
    }
  }, []);

  const scrollRight = useCallback(() => {
    const container = document.getElementById('recommendations-scroll-container');
    if (container) {
      container.scrollBy({ left: 300, behavior: 'smooth' });
    }
  }, []);

  // Toggle expanded view
  const handleToggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Loading state
  if (isLoading && recommendations.length === 0) {
    return <ScrollerSkeleton />;
  }

  // Don't render if no recommendations or error (unless in edit view)
  if (error || recommendations.length === 0) {
    // Show empty state placeholder in edit view
    if (isEditView) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BadgeCheck className="w-5 h-5 text-[#022641]" />
              <h3 className="text-lg font-semibold text-[#022641]">
                Recommendations Made
                <span className="text-sm font-normal text-gray-500 ml-2">(0)</span>
              </h3>
            </div>
          </div>
          <div className="text-center py-8 text-gray-500">
            <BadgeCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No recommendations yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Recommendations made by this user will appear here
            </p>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BadgeCheck className="w-5 h-5 text-[#022641]" />
          <h3 className="text-lg font-semibold text-[#022641]">
            Recommendations Made
            <span className="text-sm font-normal text-gray-500 ml-2">({total})</span>
          </h3>
        </div>
        <button
          onClick={handleToggleExpanded}
          className="flex items-center gap-1 text-biz-orange text-sm font-medium hover:underline transition-colors"
        >
          {isExpanded ? (
            <>
              <X className="w-4 h-4" />
              Close
            </>
          ) : (
            <>
              <Grid3X3 className="w-4 h-4" />
              See All
            </>
          )}
        </button>
      </div>

      {/* Content */}
      {isExpanded ? (
        // Expanded Grid View
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.map((rec) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              variant="grid"
            />
          ))}
        </div>
      ) : (
        // Horizontal Scroller
        <div className="relative group/slider">
          {/* Left Arrow */}
          {canScrollLeft && (
            <button
              onClick={scrollLeft}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-opacity hover:bg-gray-50"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-6 w-6 text-gray-600" />
            </button>
          )}

          {/* Scrollable Content */}
          <div
            id="recommendations-scroll-container"
            ref={scrollContainerRef}
            className="flex overflow-x-auto gap-4 scrollbar-hide scroll-smooth snap-x snap-mandatory pb-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {recommendations.map((rec) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                variant="scroller"
              />
            ))}
          </div>

          {/* Right Arrow */}
          {canScrollRight && (
            <button
              onClick={scrollRight}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-opacity hover:bg-gray-50"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-6 w-6 text-gray-600" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXPORTED COMPONENT (WITH ERRORBOUNDARY)
// ============================================================================

/**
 * UserSentRecommendationsScroller - Wrapped with ErrorBoundary (STANDARD tier requirement)
 *
 * @example
 * ```tsx
 * <UserSentRecommendationsScroller username="johndoe" />
 * ```
 */
export function UserSentRecommendationsScroller(props: UserSentRecommendationsScrollerProps) {
  return (
    <ErrorBoundary componentName="UserSentRecommendationsScroller">
      <UserSentRecommendationsScrollerContent {...props} />
    </ErrorBoundary>
  );
}

export default UserSentRecommendationsScroller;
