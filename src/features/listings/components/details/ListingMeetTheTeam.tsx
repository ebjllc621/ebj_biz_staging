/**
 * ListingMeetTheTeam - Team Members Display
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4 - Missing Components
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Responsive grid of team member cards (1/2/3/4 cols)
 * - Avatar display with getAvatarInitials fallback
 * - Shows name, role, bio, contact info
 * - Filters to only is_visible: true members
 * - Edit mode empty state with configure link
 * - Published mode returns null if no visible members
 *
 * @see docs/pages/layouts/listings/details/detailspageenhance/3-1-26/phases/PHASE_4_BRAIN_PLAN.md
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Mail, Phone, Settings } from 'lucide-react';
import { getAvatarInitials } from '@core/utils/avatar';
import type { Listing } from '@core/services/ListingService';

interface TeamMember {
  id: number;
  name: string;
  role: string | null;
  bio: string | null;
  photo_url: string | null;
  email: string | null;
  phone: string | null;
  is_visible: boolean;
}

interface ListingMeetTheTeamProps {
  /** Listing data */
  listing: Listing;
  /** Whether in edit mode */
  isEditing?: boolean;
}

export function ListingMeetTheTeam({ listing, isEditing }: ListingMeetTheTeamProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch team members
  useEffect(() => {
    let isMounted = true;

    async function fetchMembers() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/listings/${listing.id}/team`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch team members');
        }

        const result = await response.json();
        if (isMounted && result.success) {
          // Filter to only visible members for published view
          const allMembers = result.data?.members || [];
          const visibleMembers = isEditing
            ? allMembers
            : allMembers.filter((m: TeamMember) => m.is_visible);
          setMembers(visibleMembers);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load team members');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchMembers();

    return () => {
      isMounted = false;
    };
  }, [listing.id, isEditing]);

  // Show empty state in edit mode when no members
  if (isEditing && !isLoading && members.length === 0) {
    return (
      <section className="bg-white rounded-lg shadow-sm p-6 border-2 border-dashed border-gray-300">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              Meet the Team
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              No team members yet. Showcase your team to build trust.
            </p>
            <Link
              href={`/dashboard/listings/${String(listing.id)}/team` as any}
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

  // Return null in published mode when no visible members
  if (!isLoading && members.length === 0) {
    return null;
  }

  return (
    <section className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-biz-navy flex items-center gap-2">
          <Users className="w-6 h-6 text-biz-orange" />
          Meet the Team
          {!isLoading && members.length > 0 && (
            <span className="text-sm font-normal text-gray-500">
              ({members.length})
            </span>
          )}
        </h2>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
              <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto"></div>
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

      {/* Team Members Grid */}
      {!isLoading && !error && members.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {members.map((member) => (
            <div
              key={member.id}
              className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow text-center"
            >
              {/* Avatar */}
              <div className="mb-4">
                {member.photo_url ? (
                  <img
                    src={member.photo_url}
                    alt={member.name}
                    className="w-20 h-20 rounded-full object-cover mx-auto"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-biz-orange text-white flex items-center justify-center text-2xl font-bold mx-auto">
                    {getAvatarInitials(member.name)}
                  </div>
                )}
              </div>

              {/* Name & Role */}
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {member.name}
              </h3>
              {member.role && (
                <p className="text-sm text-biz-orange font-medium mb-3">
                  {member.role}
                </p>
              )}

              {/* Bio */}
              {member.bio && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {member.bio}
                </p>
              )}

              {/* Contact Info */}
              {(member.email || member.phone) && (
                <div className="space-y-2 pt-4 border-t border-gray-100">
                  {member.email && (
                    <a
                      href={`mailto:${member.email}`}
                      className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-biz-orange transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{member.email}</span>
                    </a>
                  )}
                  {member.phone && (
                    <a
                      href={`tel:${member.phone}`}
                      className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-biz-orange transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      {member.phone}
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
