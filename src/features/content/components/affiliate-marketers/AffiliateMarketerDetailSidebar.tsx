/**
 * AffiliateMarketerDetailSidebar - Sticky sidebar for affiliate marketer detail page
 *
 * @component Client Component
 * @tier ADVANCED
 * @phase Tier 3 Creator Profiles - Phase 3B
 * @governance Build Map v2.1 ENHANCED
 *
 * Renders: Quick Stats, Rate Card, Audience Demographics, Contact CTA, Social Links.
 * Implements sticky scroll behavior at 400px threshold.
 */
'use client';

import { useState, useEffect } from 'react';
import { Eye, Briefcase, Users, TrendingUp, Star, DollarSign, Share2, Globe, ExternalLink } from 'lucide-react';
import type { AffiliateMarketerProfile } from '@core/types/affiliate-marketer';
import { ContentSubscribeCard } from '@features/content/components/shared/ContentSubscribeCard';

interface AffiliateMarketerDetailSidebarProps {
  marketer: AffiliateMarketerProfile;
  onContactClick?: () => void;
  className?: string;
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

export function AffiliateMarketerDetailSidebar({
  marketer,
  onContactClick,
  className,
}: AffiliateMarketerDetailSidebarProps) {
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsSticky(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const hasSocialContent =
    (marketer.social_links && Object.keys(marketer.social_links).length > 0) ||
    !!marketer.website_url;

  const hasAudienceContent =
    marketer.audience_size > 0 ||
    (marketer.audience_demographics !== null &&
      Object.keys(marketer.audience_demographics ?? {}).length > 0);

  const hasCommission =
    marketer.commission_range_min !== null || marketer.commission_range_max !== null;
  const hasFlatFee = marketer.flat_fee_min !== null || marketer.flat_fee_max !== null;

  return (
    <aside
      className={`space-y-4 ${isSticky ? 'lg:sticky lg:top-4' : ''} ${className ?? ''}`}
    >
      {/* 1. Quick Stats */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-base font-semibold text-biz-navy mb-4">Quick Stats</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Profile Views</p>
              <p className="text-sm font-semibold text-gray-900">
                {marketer.view_count.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Briefcase className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Campaigns</p>
              <p className="text-sm font-semibold text-gray-900">
                {marketer.campaign_count.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Businesses Helped</p>
              <p className="text-sm font-semibold text-gray-900">
                {marketer.businesses_helped.toLocaleString()}
              </p>
            </div>
          </div>
          {marketer.avg_conversion_rate !== null && (
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Avg Conversion Rate</p>
                <p className="text-sm font-semibold text-gray-900">
                  {Number(marketer.avg_conversion_rate).toFixed(1)}%
                </p>
              </div>
            </div>
          )}
          {marketer.rating_count > 0 && (
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Rating</p>
                <p className="text-sm font-semibold text-gray-900">
                  {Number(marketer.rating_average).toFixed(1)} / 5.0
                  <span className="text-gray-500 font-normal ml-1">
                    ({marketer.rating_count})
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content Subscribe Card */}
      <ContentSubscribeCard
        followType="marketer_profile"
        targetId={marketer.id}
        targetName={marketer.display_name}
      />

      {/* 2. Rate Card (GENESIS pattern) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-base font-semibold text-biz-navy mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-biz-orange" />
          Rate Card
        </h3>
        {hasCommission || hasFlatFee ? (
          <div className="space-y-3">
            {hasCommission && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">
                  Commission Rate
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {marketer.commission_range_min !== null && marketer.commission_range_max !== null
                    ? `${marketer.commission_range_min}% - ${marketer.commission_range_max}%`
                    : marketer.commission_range_min !== null
                    ? `From ${marketer.commission_range_min}%`
                    : `Up to ${marketer.commission_range_max}%`}
                </p>
              </div>
            )}
            {hasFlatFee && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Flat Fee</p>
                <p className="text-sm font-semibold text-gray-900">
                  {marketer.flat_fee_min !== null && marketer.flat_fee_max !== null
                    ? `$${marketer.flat_fee_min.toLocaleString()} - $${marketer.flat_fee_max.toLocaleString()}`
                    : marketer.flat_fee_min !== null
                    ? `From $${marketer.flat_fee_min.toLocaleString()}`
                    : `Up to $${marketer.flat_fee_max!.toLocaleString()}`}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Contact for rates</p>
        )}
      </div>

      {/* 3. Audience Demographics */}
      {hasAudienceContent && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-biz-navy mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-biz-orange" />
            Audience
          </h3>
          {marketer.audience_size > 0 && (
            <div className="flex justify-between mb-3">
              <span className="text-gray-600 text-sm">Followers</span>
              <span className="font-medium text-sm">
                {marketer.audience_size.toLocaleString()}
              </span>
            </div>
          )}
          {marketer.audience_demographics &&
            Object.entries(marketer.audience_demographics).map(([key, value]) => (
              <div key={key} className="flex justify-between py-1">
                <span className="text-gray-600 text-sm capitalize">{key}</span>
                <span className="font-medium text-sm">{String(value)}</span>
              </div>
            ))}
        </div>
      )}

      {/* 4. Contact CTA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <button
          onClick={onContactClick}
          className="w-full bg-biz-orange text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
        >
          Hire This Marketer
        </button>
        {marketer.contact_count > 0 && (
          <p className="text-center text-xs text-gray-500 mt-2">
            {marketer.contact_count.toLocaleString()} businesses have reached out
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
          {marketer.website_url && (
            <a
              href={marketer.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-biz-navy transition-colors mb-3"
            >
              <Globe className="w-4 h-4 text-gray-400" />
              <span className="truncate">{marketer.website_url.replace(/^https?:\/\//, '')}</span>
            </a>
          )}

          {/* Social platform icons */}
          {marketer.social_links && Object.entries(marketer.social_links).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(marketer.social_links).map(([key, url]) => {
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
