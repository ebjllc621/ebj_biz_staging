/**
 * NewestCreatorsRow - Three-card display of newest creators with established profiles
 *
 * @tier SIMPLE
 * @generated DNA v11.4.0
 * @authority CLAUDE.md
 *
 * Displays 3 cards showing the newest creators who have an established
 * creator profile (affiliate marketer, internet personality, or podcaster).
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import Image from 'next/image';
import { Users, Star, MapPin, ExternalLink } from 'lucide-react';
import { getAvatarInitials } from '@core/utils/avatar';

interface CreatorSummary {
  id: number;
  profile_type: 'affiliate_marketer' | 'internet_personality' | 'podcaster';
  display_name: string;
  headline: string | null;
  avatar_url: string | null;
  location: string | null;
  rating: number | null;
  review_count: number;
  slug: string;
  created_at: string;
}

interface NewestCreatorsRowProps {
  className?: string;
}

const PROFILE_TYPE_LABEL: Record<string, string> = {
  affiliate_marketer: 'Affiliate Marketer',
  internet_personality: 'Internet Personality',
  podcaster: 'Podcaster',
};

const PROFILE_TYPE_COLOR: Record<string, string> = {
  affiliate_marketer: 'bg-orange-100 text-orange-700',
  internet_personality: 'bg-indigo-100 text-indigo-700',
  podcaster: 'bg-green-100 text-green-700',
};

const PROFILE_TYPE_GRADIENT: Record<string, string> = {
  affiliate_marketer: 'from-[#ed6437] to-[#f59e0b]',
  internet_personality: 'from-indigo-500 to-pink-500',
  podcaster: 'from-emerald-500 to-teal-500',
};

function getCreatorLink(creator: CreatorSummary): string {
  switch (creator.profile_type) {
    case 'internet_personality':
      return `/internet-personalities/${creator.slug}`;
    case 'podcaster':
      return `/podcasters/${creator.slug}`;
    case 'affiliate_marketer':
      return `/affiliate-marketers/${creator.slug}`;
    default:
      return '#';
  }
}

function CreatorCardSkeleton() {
  return (
    <div className="animate-pulse bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
      <div className="h-20 bg-gray-200" />
      <div className="px-5 pb-5 -mt-8 relative">
        <div className="w-16 h-16 rounded-full bg-gray-300 border-4 border-white" />
        <div className="mt-3 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function NewestCreatorsRow({ className = '' }: NewestCreatorsRowProps) {
  const [creators, setCreators] = useState<CreatorSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchNewestCreators() {
      try {
        // Fetch newest creator profiles — use the admin API with sort=newest, limit 3
        // Fall back to public endpoint if available
        const response = await fetch('/api/content/creators?sort=newest&limit=3', {
          credentials: 'include',
        });

        if (!response.ok) {
          // Try alternative: fetch from admin endpoint (may 403 for non-admin)
          return;
        }

        const result = await response.json();
        if (!result.success) return;

        const data = result.data?.creators || result.data?.items || result.data || [];
        if (mounted && Array.isArray(data)) {
          setCreators(data.slice(0, 3));
        }
      } catch {
        // Silent fail — this section is supplementary
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    fetchNewestCreators();
    return () => { mounted = false; };
  }, []);

  if (isLoading) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-[#ed6437]" />
          <h2 className="text-lg font-bold text-gray-900">Welcome our newest Creators!</h2>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <CreatorCardSkeleton />
          <CreatorCardSkeleton />
          <CreatorCardSkeleton />
        </div>
      </div>
    );
  }

  if (creators.length === 0) return null;

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-[#ed6437]" />
        <h2 className="text-lg font-bold text-gray-900">Newest Creators</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {creators.map((creator) => (
          <Link
            key={`${creator.profile_type}-${creator.id}`}
            href={getCreatorLink(creator) as Route}
            className="group block"
          >
            <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow border border-gray-100 h-full">
              {/* Color banner */}
              <div className={`h-20 bg-gradient-to-r ${PROFILE_TYPE_GRADIENT[creator.profile_type] || 'from-gray-400 to-gray-500'} relative`}>
                {/* Profile type badge */}
                <div className="absolute top-3 right-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${PROFILE_TYPE_COLOR[creator.profile_type] || 'bg-gray-100 text-gray-700'}`}>
                    {PROFILE_TYPE_LABEL[creator.profile_type] || creator.profile_type}
                  </span>
                </div>
              </div>

              {/* Avatar + Info */}
              <div className="px-5 pb-5 -mt-8 relative">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-full border-4 border-white shadow-md overflow-hidden bg-[#022641] flex items-center justify-center">
                  {creator.avatar_url ? (
                    <Image
                      src={creator.avatar_url}
                      alt={creator.display_name}
                      width={64}
                      height={64}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <span className="text-white font-bold text-lg">
                      {getAvatarInitials(creator.display_name)}
                    </span>
                  )}
                </div>

                {/* Name + Info */}
                <div className="mt-3">
                  <h3 className="text-base font-bold text-[#022641] group-hover:text-[#ed6437] transition-colors line-clamp-1">
                    {creator.display_name}
                  </h3>
                  {creator.headline && (
                    <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">
                      {creator.headline}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    {creator.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {creator.location}
                      </span>
                    )}
                    {creator.rating != null && Number(creator.rating) > 0 && (
                      <span className="flex items-center gap-1 text-amber-500">
                        <Star className="w-3 h-3 fill-amber-400" />
                        {Number(creator.rating).toFixed(1)}
                        {creator.review_count > 0 && (
                          <span className="text-gray-400">({creator.review_count})</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* View profile link */}
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-[#ed6437] group-hover:underline">
                  View Profile
                  <ExternalLink className="w-3 h-3" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default NewestCreatorsRow;
