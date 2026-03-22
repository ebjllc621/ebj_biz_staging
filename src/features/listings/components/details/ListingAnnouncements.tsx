/**
 * ListingAnnouncements - Promotional Announcements
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 7 - Feature Component Enhancements (ENHANCED)
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Display 1-3 promotional announcements
 * - Icon/badge for announcement type
 * - CTA buttons ("Learn More", "Book Now", etc.)
 * - Highlight/accent styling
 * - Real data fetching from API
 * - Empty state returns null
 *
 * @see docs/pages/layouts/listings/details/detailspageenhance/phases/PHASE_7_BRAIN_PLAN.md
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Megaphone, ExternalLink, AlertCircle, Settings } from 'lucide-react';
import type { Listing } from '@core/services/ListingService';

interface Announcement {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'promo';
  cta_text?: string;
  cta_url?: string;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
}

interface ListingAnnouncementsProps {
  /** Listing data */
  listing: Listing;
  /** Whether in edit mode */
  isEditing?: boolean;
}

/**
 * Get announcement icon and colors based on type
 */
function getAnnouncementStyle(type: Announcement['type']) {
  const styles = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
      text: 'text-blue-900'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: 'text-yellow-600',
      text: 'text-yellow-900'
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'text-green-600',
      text: 'text-green-900'
    },
    promo: {
      bg: 'bg-gradient-to-br from-biz-orange/10 to-biz-navy/10',
      border: 'border-biz-orange',
      icon: 'text-biz-orange',
      text: 'text-biz-navy'
    }
  };

  return styles[type];
}

export function ListingAnnouncements({ listing, isEditing }: ListingAnnouncementsProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch announcements
  useEffect(() => {
    let isMounted = true;

    async function fetchAnnouncements() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/listings/${listing.id}/announcements`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch announcements');
        }

        const result = await response.json();
        if (isMounted && result.success) {
          // Filter to active announcements only (unless editing)
          const allAnnouncements = result.data || [];
          const activeAnnouncements = isEditing
            ? allAnnouncements
            : allAnnouncements.filter((a: Announcement) => a.is_active);
          setAnnouncements(activeAnnouncements);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load announcements');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchAnnouncements();

    return () => {
      isMounted = false;
    };
  }, [listing.id, isEditing]);

  // Show empty state in edit mode when no announcements
  if (isEditing && !isLoading && announcements.length === 0) {
    return (
      <section className="bg-white rounded-lg shadow-sm p-6 border-2 border-dashed border-gray-300">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <Megaphone className="w-6 h-6 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              Announcements
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              No announcements yet. Create important updates for your visitors.
            </p>
            <Link
              href={`/dashboard/listings/${String(listing.id)}/announcements` as any}
              className="inline-flex items-center gap-2 px-4 py-2 bg-biz-navy text-white text-sm font-medium rounded-md hover:bg-biz-navy/90 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Configure
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Return null in published mode when no announcements
  if (!isLoading && announcements.length === 0) {
    return null;
  }

  return (
    <section className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <h2 className="text-xl font-semibold text-biz-navy flex items-center gap-2 mb-4">
        <Megaphone className="w-5 h-5 text-biz-orange" />
        Announcements
        {!isLoading && announcements.length > 0 && (
          <span className="text-sm font-normal text-gray-500">
            ({announcements.length})
          </span>
        )}
      </h2>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2 w-1/3"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-4">
          {error}
        </div>
      )}

      {/* Announcements List */}
      {!isLoading && !error && announcements.length > 0 && (
        <div className="space-y-4">
          {announcements.map((announcement) => {
          const style = getAnnouncementStyle(announcement.type);

          return (
            <div
              key={announcement.id}
              className={`
                ${style.bg} ${style.border} border-l-4 rounded-lg p-4
              `}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={style.icon}>
                  {announcement.type === 'warning' ? (
                    <AlertCircle className="w-5 h-5" />
                  ) : (
                    <Megaphone className="w-5 h-5" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Title */}
                  <h3 className={`font-semibold ${style.text} mb-1`}>
                    {announcement.title}
                  </h3>

                  {/* Message */}
                  <p className="text-sm text-gray-700 mb-3">
                    {announcement.message}
                  </p>

                  {/* CTA Button */}
                  {announcement.cta_text && announcement.cta_url && (
                    <a
                      href={announcement.cta_url}
                      className={`
                        inline-flex items-center gap-1 text-sm font-medium
                        ${announcement.type === 'promo' ? 'text-biz-orange' : style.icon}
                        hover:underline
                      `}
                    >
                      {announcement.cta_text}
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
          })}
        </div>
      )}
    </section>
  );
}

export default ListingAnnouncements;
