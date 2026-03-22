/**
 * InternetPersonalityDetailSidebar - Sticky sidebar for internet personality detail page
 *
 * @component Client Component
 * @tier ADVANCED
 * @phase Tier 3 Creator Profiles - Phase 3B
 * @governance Build Map v2.1 ENHANCED
 *
 * Renders: Platform Stats, Rate Card, Collaboration Types, Contact CTA (with media kit), Social Links.
 * Implements sticky scroll behavior at 400px threshold.
 */
'use client';

import { useState, useEffect } from 'react';
import { Eye, Users, Handshake, Star, DollarSign, Share2, Globe, ExternalLink, CheckCircle } from 'lucide-react';
import type { InternetPersonalityProfile } from '@core/types/internet-personality';
import { ContentSubscribeCard } from '@features/content/components/shared/ContentSubscribeCard';

interface InternetPersonalityDetailSidebarProps {
  personality: InternetPersonalityProfile;
  onCollaborateClick?: () => void;
  className?: string;
}

// Format total reach with K/M suffix
function formatReach(reach: number): string {
  if (reach >= 1_000_000) {
    return `${(reach / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (reach >= 1_000) {
    return `${(reach / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return reach.toLocaleString();
}

// Social platform definitions — inline (not imported from listings feature)
const SOCIAL_PLATFORMS = [
  {
    key: 'facebook',
    label: 'Facebook',
    color: '#1877F2',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    key: 'instagram',
    label: 'Instagram',
    color: '#E4405F',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  {
    key: 'twitter',
    label: 'X (Twitter)',
    color: '#000000',
    aliases: ['x'],
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    color: '#0A66C2',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    key: 'youtube',
    label: 'YouTube',
    color: '#FF0000',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    color: '#000000',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z" />
      </svg>
    ),
  },
] as const;

// Match a social_links key to a platform definition (case-insensitive)
function matchPlatform(key: string) {
  const lower = key.toLowerCase();
  return SOCIAL_PLATFORMS.find((p) => {
    if (p.key === lower) return true;
    if ('aliases' in p && Array.from(p.aliases as readonly string[]).includes(lower)) return true;
    return false;
  });
}

export function InternetPersonalityDetailSidebar({
  personality,
  onCollaborateClick,
  className,
}: InternetPersonalityDetailSidebarProps) {
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsSticky(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const hasSocialContent =
    (personality.social_links && Object.keys(personality.social_links).length > 0) ||
    !!personality.website_url;

  const hasRateCard =
    personality.rate_card !== null &&
    Object.keys(personality.rate_card ?? {}).length > 0;

  return (
    <aside
      className={`space-y-4 ${isSticky ? 'lg:sticky lg:top-4' : ''} ${className ?? ''}`}
    >
      {/* 1. Platform Stats */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-base font-semibold text-biz-navy mb-4">Stats</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Profile Views</p>
              <p className="text-sm font-semibold text-gray-900">
                {personality.view_count.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Total Reach</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatReach(personality.total_reach)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Handshake className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Collaborations</p>
              <p className="text-sm font-semibold text-gray-900">
                {personality.collaboration_count.toLocaleString()}
              </p>
            </div>
          </div>
          {personality.avg_engagement_rate !== null &&
            personality.avg_engagement_rate !== undefined && (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  <span className="text-gray-400 text-xs font-bold">%</span>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Avg Engagement Rate</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {Number(personality.avg_engagement_rate).toFixed(1)}%
                  </p>
                </div>
              </div>
            )}
          {personality.rating_count > 0 && (
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Rating</p>
                <p className="text-sm font-semibold text-gray-900">
                  {Number(personality.rating_average).toFixed(1)} / 5.0
                  <span className="text-gray-500 font-normal ml-1">
                    ({personality.rating_count})
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content Subscribe Card */}
      <ContentSubscribeCard
        followType="personality_profile"
        targetId={personality.id}
        targetName={personality.display_name}
      />

      {/* 2. Rate Card (GENESIS — IP version, key-value from JSON) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-base font-semibold text-biz-navy mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-biz-orange" />
          Rate Card
        </h3>
        {hasRateCard ? (
          <div className="space-y-3">
            {Object.entries(personality.rate_card!).map(([key, value]) => (
              <div key={key}>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5 capitalize">
                  {key.replace(/_/g, ' ')}
                </p>
                <p className="text-sm font-semibold text-gray-900">{String(value)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Contact for collaboration rates</p>
        )}
      </div>

      {/* 3. Collaboration Types */}
      {personality.collaboration_types && personality.collaboration_types.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-biz-navy mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-biz-orange" />
            Open To
          </h3>
          <div className="space-y-2">
            {personality.collaboration_types.map((type) => (
              <div key={type} className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>{type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Contact CTA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <button
          onClick={onCollaborateClick}
          className="w-full bg-biz-orange text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
        >
          Request Collaboration
        </button>
        {personality.media_kit_url && (
          <a
            href={personality.media_kit_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 w-full block text-center border border-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm"
          >
            Download Media Kit
          </a>
        )}
        {personality.management_contact && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            Management: {personality.management_contact}
          </p>
        )}
        {personality.contact_count > 0 && (
          <p className="text-center text-xs text-gray-500 mt-2">
            {personality.contact_count.toLocaleString()} brands have reached out
          </p>
        )}
      </div>

      {/* 5. Social Links */}
      {hasSocialContent && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-biz-navy mb-4 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-biz-orange" />
            Connect
          </h3>

          {/* Website */}
          {personality.website_url && (
            <a
              href={personality.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-biz-navy transition-colors mb-3"
            >
              <Globe className="w-4 h-4 text-gray-400" />
              <span className="truncate">
                {personality.website_url.replace(/^https?:\/\//, '')}
              </span>
            </a>
          )}

          {/* Social platform icons */}
          {personality.social_links && Object.entries(personality.social_links).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(personality.social_links).map(([key, url]) => {
                const platform = matchPlatform(key);
                if (platform) {
                  return (
                    <a
                      key={key}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={platform.label}
                      style={{ '--platform-color': platform.color } as React.CSSProperties}
                      className="p-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all group"
                    >
                      <span className="text-gray-500 group-hover:text-[var(--platform-color)] transition-colors block">
                        {platform.icon}
                      </span>
                    </a>
                  );
                }
                // Unknown platform — generic link icon
                return (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={key}
                    className="p-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all group"
                  >
                    <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-biz-navy transition-colors" />
                  </a>
                );
              })}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
