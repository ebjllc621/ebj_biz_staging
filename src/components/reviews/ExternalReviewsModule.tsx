/**
 * ExternalReviewsModule - Display module for external provider reviews
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 6A - Task 6.5: External Reviews Display Module
 * @governance Build Map v2.1 ENHANCED
 *
 * COMPLIANCE:
 * - Attribution + linkback MANDATORY (per Google TOS)
 * - Google logo MANDATORY when displaying Google reviews (per Google branding guidelines)
 * - Review text NEVER in schema.org/JSON-LD markup
 * - No interaction buttons (no helpful voting, no response, no report)
 * - Visually distinct from native reviews (bg-blue-50)
 * - Shows max 5 reviews per provider (Google API hard limit)
 *
 * @authority docs/reviews/bizconekt_google_reviews_compliance_report.md
 */

'use client';

import { useState, useEffect } from 'react';
import { StarRating } from '@/components/reviews/StarRating';
import type { ExternalReviewSource, ExternalReviewDisplay } from '@core/services/ExternalReviewAdapterService';

// ---------------------------------------------------------------------------
// Provider Logo SVGs (inline to avoid external asset dependencies)
// ---------------------------------------------------------------------------

function GoogleLogo({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function YelpLogo({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.16 12.594l-4.995 1.433c-.96.276-1.74-.8-1.176-1.63l2.905-4.308a1.072 1.072 0 0 1 1.596-.206l2.039 1.726c.676.573.48 1.594-.37 1.985zm-3.12 5.96l-2.4-1.2c-.89-.446-.89-1.756 0-2.2l4.8-2.4c.89-.446 1.88.2 1.69 1.1l-.6 3c-.18.89-1.2 1.34-1.89.9zm-4.44 2.26l-.6-3c-.18-.89.6-1.68 1.49-1.34l4.8 1.8c.89.334.89 1.556 0 1.89l-2.4.9c-.67.25-1.42.1-1.89-.45zm-1.2-5.76V10.8c0-1 1.12-1.58 1.9-.98l4.08 3.12c.78.6.42 1.82-.56 1.94l-4.08.48c-.74.08-1.34-.48-1.34-1.22zM3.84 3.594c-.18-.89.6-1.68 1.49-1.34l4.8 1.8c.89.334.89 1.556 0 1.89l-4.8 1.8c-.89.334-1.68-.45-1.49-1.35V3.594z" fill="#D32323" />
    </svg>
  );
}

function FacebookLogo({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2" />
    </svg>
  );
}

function ProviderLogo({ provider, className }: { provider: string; className?: string }) {
  switch (provider) {
    case 'google': return <GoogleLogo className={className} />;
    case 'yelp': return <YelpLogo className={className} />;
    case 'facebook': return <FacebookLogo className={className} />;
    default: return null;
  }
}

export interface ExternalReviewsModuleProps {
  listingId: number;
  className?: string;
}

interface ProviderData {
  provider: string;
  source: ExternalReviewSource;
  reviews: ExternalReviewDisplay[];
}

interface ExternalReviewsResponse {
  providers: ProviderData[];
}

interface ProviderBranding {
  bg: string;
  border: string;
  divider: string;
  avatarBg: string;
  avatarText: string;
  avatarBorder: string;
  linkColor: string;
  attributionBorder: string;
  label: string;
  attribution: string;
  linkText: string;
}

const PROVIDER_BRANDING: Record<string, ProviderBranding> = {
  google: {
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    divider: 'border-blue-200',
    avatarBg: 'bg-blue-200',
    avatarText: 'text-blue-700',
    avatarBorder: 'border-b-blue-100',
    linkColor: 'text-blue-600 hover:text-blue-800',
    attributionBorder: 'border-blue-100',
    label: 'Google Reviews',
    attribution: 'Reviews from Google',
    linkText: 'View all reviews on Google',
  },
  yelp: {
    bg: 'bg-red-50',
    border: 'border-red-100',
    divider: 'border-red-200',
    avatarBg: 'bg-red-200',
    avatarText: 'text-red-700',
    avatarBorder: 'border-b-red-100',
    linkColor: 'text-red-600 hover:text-red-800',
    attributionBorder: 'border-red-100',
    label: 'Yelp Reviews',
    attribution: 'Reviews from Yelp',
    linkText: 'View all reviews on Yelp',
  },
  facebook: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
    divider: 'border-indigo-200',
    avatarBg: 'bg-indigo-200',
    avatarText: 'text-indigo-700',
    avatarBorder: 'border-b-indigo-100',
    linkColor: 'text-indigo-600 hover:text-indigo-800',
    attributionBorder: 'border-indigo-100',
    label: 'Facebook Reviews',
    attribution: 'Reviews from Facebook',
    linkText: 'View all reviews on Facebook',
  },
};

function getProviderBranding(provider: string): ProviderBranding {
  return PROVIDER_BRANDING[provider] ?? {
    bg: 'bg-gray-50',
    border: 'border-gray-100',
    divider: 'border-gray-200',
    avatarBg: 'bg-gray-200',
    avatarText: 'text-gray-700',
    avatarBorder: 'border-b-gray-100',
    linkColor: 'text-gray-600 hover:text-gray-800',
    attributionBorder: 'border-gray-100',
    label: `${provider.charAt(0).toUpperCase()}${provider.slice(1)} Reviews`,
    attribution: `Reviews from ${provider.charAt(0).toUpperCase()}${provider.slice(1)}`,
    linkText: 'View all reviews',
  };
}

/**
 * Generate initials from an author name for the avatar fallback.
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1] ?? '') : '';
  if (!last) return first.charAt(0).toUpperCase();
  return (first.charAt(0) + last.charAt(0)).toUpperCase();
}

/**
 * Truncate review text to a maximum character count.
 */
function truncateText(text: string, max: number = 200): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '…';
}

function formatProviderName(provider: string): string {
  const names: Record<string, string> = { google: 'Google', yelp: 'Yelp', facebook: 'Facebook' };
  return names[provider] ?? provider.charAt(0).toUpperCase() + provider.slice(1);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ExternalReviewCardProps {
  review: ExternalReviewDisplay;
  branding: ProviderBranding;
}

function ExternalReviewCard({ review, branding }: ExternalReviewCardProps) {
  return (
    <div className={`flex gap-3 py-4 border-b ${branding.border} last:border-b-0`}>
      {/* Author avatar */}
      <div className="flex-shrink-0">
        {review.profile_photo_url ? (
          <img
            src={review.profile_photo_url}
            alt={review.author_name}
            className="w-9 h-9 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className={`w-9 h-9 rounded-full ${branding.avatarBg} flex items-center justify-center ${branding.avatarText} text-sm font-semibold`}>
            {getInitials(review.author_name)}
          </div>
        )}
      </div>

      {/* Review content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-800 text-sm">{review.author_name}</span>
          <StarRating rating={review.rating} size="sm" interactive={false} />
        </div>
        <p className="text-gray-600 text-sm mt-1 leading-relaxed">
          {truncateText(review.text)}
        </p>
        <p className="text-gray-400 text-xs mt-1">{review.relative_time}</p>
      </div>
    </div>
  );
}

interface ProviderSectionProps {
  data: ProviderData;
}

function ProviderSection({ data }: ProviderSectionProps) {
  const { provider, source, reviews } = data;
  const displayedReviews = reviews.slice(0, 5);
  const viewAllUrl = source.canonical_url ?? undefined;
  const branding = getProviderBranding(provider);
  const totalCount = source.review_count;
  const providerName = formatProviderName(provider);

  return (
    <div className={`${branding.bg} rounded-lg p-5 border ${branding.border}`}>
      {/* Provider header with logo */}
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2.5">
          <ProviderLogo provider={provider} className="w-6 h-6" />
          <span className="font-semibold text-gray-800">{branding.label}</span>
          {source.rating_summary !== null && (
            <span className="flex items-center gap-1 text-sm text-gray-600">
              <StarRating rating={source.rating_summary} size="sm" interactive={false} />
              <span className="font-medium">{source.rating_summary.toFixed(1)}</span>
              {totalCount !== null && (
                <span className="text-gray-400">({totalCount.toLocaleString()} reviews)</span>
              )}
            </span>
          )}
        </div>

        {viewAllUrl && (
          <a
            href={viewAllUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-sm ${branding.linkColor} hover:underline whitespace-nowrap`}
          >
            {branding.linkText} &rarr;
          </a>
        )}
      </div>

      {/* Divider */}
      <hr className={`${branding.divider} mb-3`} />

      {/* Review cards */}
      {displayedReviews.length > 0 ? (
        <div>
          {displayedReviews.map((review, index) => (
            <ExternalReviewCard key={index} review={review} branding={branding} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 py-2">No reviews available at this time.</p>
      )}

      {/* Footer: review count summary + view all CTA */}
      <div className={`mt-3 pt-3 border-t ${branding.attributionBorder} flex items-center justify-between flex-wrap gap-2`}>
        <div className="flex items-center gap-2">
          <ProviderLogo provider={provider} className="w-4 h-4" />
          {displayedReviews.length > 0 && totalCount !== null && totalCount > displayedReviews.length ? (
            <span className="text-sm text-gray-500">
              Showing {displayedReviews.length} of {totalCount.toLocaleString()} reviews
            </span>
          ) : displayedReviews.length > 0 ? (
            <span className="text-sm text-gray-500">
              {displayedReviews.length} review{displayedReviews.length !== 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-xs text-gray-400">{branding.attribution}</span>
          )}
        </div>

        {viewAllUrl && totalCount !== null && totalCount > displayedReviews.length && (
          <a
            href={viewAllUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium ${branding.linkColor} bg-white border ${branding.border} rounded-lg hover:shadow-sm transition-shadow`}
          >
            View all {totalCount.toLocaleString()} reviews on {providerName} &rarr;
          </a>
        )}
      </div>

      {/* Attribution — MANDATORY per provider TOS */}
      <p className="text-xs text-gray-400 mt-2">
        Powered by {providerName}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ExternalReviewsModule({ listingId, className = '' }: ExternalReviewsModuleProps) {
  const [providers, setProviders] = useState<ProviderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchExternalReviews() {
      try {
        const response = await fetch(`/api/external-reviews/${listingId}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          // Silently fail — external reviews are supplementary
          return;
        }

        const result = await response.json() as { success?: boolean; data?: ExternalReviewsResponse };
        if (!cancelled && (result.success || result.data)) {
          const data = result.data as ExternalReviewsResponse;
          if (data?.providers && Array.isArray(data.providers)) {
            // Only keep providers that have at least one review or a valid source
            const activeProviders = data.providers.filter(
              (p) => p.source && (p.reviews.length > 0 || p.source.rating_summary !== null)
            );
            setProviders(activeProviders);
          }
        }
      } catch {
        // Silently fail — external reviews are supplementary, never block listing display
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchExternalReviews();

    return () => {
      cancelled = true;
    };
  }, [listingId]);

  // Don't render anything while loading or if no providers connected
  if (isLoading || providers.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {providers.map((providerData) => (
        <ProviderSection key={providerData.provider} data={providerData} />
      ))}
    </div>
  );
}

export default ExternalReviewsModule;
