/**
 * SharedConnectionsSection - Horizontal scroller displaying mutual connections
 *
 * @tier SIMPLE
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/pages/layouts/home/user/phases/PHASE_4_BRAIN_PLAN.md
 *
 * GOVERNANCE COMPLIANCE:
 * - Client component ('use client' directive)
 * - Path aliases (@features/, @components/)
 * - Lucide React icons only
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { Route } from 'next';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface MutualConnection {
  id: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface SharedConnectionsSectionProps {
  /** Username of the profile being viewed */
  username: string;
  /** Display variant: 'embedded' (gray background) or 'panel' (white with shadow) */
  variant?: 'embedded' | 'panel';
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

interface SharedConnectionsSkeletonProps {
  variant?: 'embedded' | 'panel';
}

function SharedConnectionsSkeleton({ variant = 'embedded' }: SharedConnectionsSkeletonProps) {
  const containerClass = variant === 'panel'
    ? 'bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6 animate-pulse'
    : 'bg-gray-50 rounded-lg p-4 animate-pulse';

  return (
    <div className={containerClass}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 bg-gray-200 rounded" />
        <div className="h-4 w-32 bg-gray-200 rounded" />
      </div>
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-20">
            <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-2" />
            <div className="h-3 w-16 bg-gray-200 rounded mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// CONNECTION AVATAR COMPONENT
// ============================================================================

interface ConnectionAvatarProps {
  connection: MutualConnection;
}

function ConnectionAvatar({ connection }: ConnectionAvatarProps) {
  const displayName = connection.display_name || connection.username;
  const initials = displayName.slice(0, 2).toUpperCase();
  const profileUrl = `/profile/${connection.username}` as Route;

  return (
    <Link
      href={profileUrl}
      className="flex-shrink-0 w-20 text-center group"
    >
      <div className="relative mx-auto mb-2">
        {connection.avatar_url ? (
          <img
            src={connection.avatar_url}
            alt={displayName}
            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm group-hover:border-[#F79D3D] transition-colors"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-[#022641] flex items-center justify-center text-white text-sm font-medium border-2 border-white shadow-sm group-hover:border-[#F79D3D] transition-colors">
            {initials}
          </div>
        )}
      </div>
      <p className="text-xs text-gray-700 truncate group-hover:text-[#022641] transition-colors">
        {displayName}
      </p>
    </Link>
  );
}

// ============================================================================
// SHAREDCONNECTIONSSECTION COMPONENT
// ============================================================================

/**
 * SharedConnectionsSection - Display mutual connections in a horizontal scroller
 *
 * @example
 * ```tsx
 * <SharedConnectionsSection username="johndoe" variant="panel" />
 * ```
 */
export function SharedConnectionsSection({ username, variant = 'embedded' }: SharedConnectionsSectionProps) {
  const [connections, setConnections] = useState<MutualConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  const fetchMutualConnections = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${encodeURIComponent(username)}/connections/mutual`, {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated - don't show error, just show empty
          setConnections([]);
          setIsLoading(false);
          return;
        }
        throw new Error('Failed to fetch mutual connections');
      }

      const result = await response.json() as {
        success: boolean;
        data: {
          mutual_connections: MutualConnection[];
          total: number;
          is_own_profile: boolean;
        }
      };

      if (result.success && result.data) {
        // Don't show for own profile
        if (result.data.is_own_profile) {
          setConnections([]);
        } else {
          setConnections(result.data.mutual_connections);
        }
      } else {
        setConnections([]);
      }
    } catch {
      setError('Failed to load shared connections');
      setConnections([]);
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchMutualConnections();
  }, [fetchMutualConnections]);

  // Scroll handlers
  const scrollContainer = useCallback((direction: 'left' | 'right') => {
    const container = document.getElementById('shared-connections-scroll');
    if (container) {
      const scrollAmount = 200;
      const newPosition = direction === 'left'
        ? Math.max(0, scrollPosition - scrollAmount)
        : scrollPosition + scrollAmount;

      container.scrollTo({ left: newPosition, behavior: 'smooth' });
      setScrollPosition(newPosition);
    }
  }, [scrollPosition]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollPosition(e.currentTarget.scrollLeft);
  }, []);

  // Loading state
  if (isLoading) {
    return <SharedConnectionsSkeleton variant={variant} />;
  }

  // Don't render if no connections or error
  if (error || connections.length === 0) {
    return null;
  }

  const showScrollButtons = connections.length > 4;

  // Determine container styling based on variant
  const containerClass = variant === 'panel'
    ? 'bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6'
    : 'bg-gray-50 rounded-lg p-4';

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#022641]" />
          <h3 className="text-sm font-semibold text-[#022641]">
            Shared Connections ({connections.length})
          </h3>
        </div>

        {/* Scroll buttons */}
        {showScrollButtons && (
          <div className="flex gap-1">
            <button
              onClick={() => scrollContainer('left')}
              disabled={scrollPosition === 0}
              className="p-1 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => scrollContainer('right')}
              className="p-1 rounded-full hover:bg-gray-200 transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        )}
      </div>

      {/* Scrollable connections */}
      <div
        id="shared-connections-scroll"
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-1"
        onScroll={handleScroll}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {connections.map((connection) => (
          <ConnectionAvatar key={connection.id} connection={connection} />
        ))}
      </div>
    </div>
  );
}

export default SharedConnectionsSection;
