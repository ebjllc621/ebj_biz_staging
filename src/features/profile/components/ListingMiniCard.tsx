/**
 * ListingMiniCard - Associated Listing Display Card
 *
 * @tier ADVANCED
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/pages/layouts/userProfile/phases/PHASE_4B_BRAIN_PLAN.md
 *
 * GOVERNANCE COMPLIANCE:
 * - Client component ('use client' directive)
 * - Path aliases (@features/, @components/)
 * - Lucide React icons only
 * - next/image for Image components
 * - next/link for Link components
 *
 * Layout:
 * - Hero section (full width): cover image, logo badge, type badge
 * - Contact section (40% width): mini map, open/closed status, contact links
 * - Reviews carousel (60% width): latest reviews with navigation
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Route } from 'next';
import {
  MapPin,
  Star,
  Phone,
  Mail,
  Globe,
  Navigation,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface LatestReview {
  id: number;
  rating: number;
  title: string | null;
  review_text: string;
  created_at: string;
  user_display_name: string;
}

export interface UserListingWithReviews {
  id: number;
  name: string;
  slug: string;
  type: string;
  tier: 'essentials' | 'plus' | 'preferred' | 'premium';
  claimed: boolean;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  business_hours: Record<string, { openTime: string; closeTime: string }> | null;
  average_rating: number;
  review_count: number;
  latest_reviews: LatestReview[];
  user_role: 'owner' | 'manager' | 'user';
}

export interface ListingMiniCardProps {
  /** Listing data with reviews */
  listing: UserListingWithReviews;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate if business is currently open
 */
function isCurrentlyOpen(businessHours: Record<string, { openTime: string; closeTime: string }> | null): boolean {
  if (!businessHours || typeof businessHours !== 'object') return false;

  const now = new Date();
  const today = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const todayHours = Object.keys(businessHours).find(key => key.toLowerCase() === today);
  if (!todayHours) return false;

  const hours = businessHours[todayHours];
  if (!hours || !hours.openTime || !hours.closeTime) return false;

  const openParts = hours.openTime.split(':').map(Number);
  const closeParts = hours.closeTime.split(':').map(Number);
  const [openHours = 0, openMinutes = 0] = openParts;
  const [closeHours = 0, closeMinutes = 0] = closeParts;

  const openTime = openHours * 60 + openMinutes;
  const closeTime = closeHours * 60 + closeMinutes;

  return currentTime >= openTime && currentTime <= closeTime;
}

/**
 * Get today's hours display string
 */
function getTodayHours(businessHours: Record<string, { openTime: string; closeTime: string }> | null): string {
  if (!businessHours || typeof businessHours !== 'object') return 'Hours not available';

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const todayHours = Object.keys(businessHours).find(key => key.toLowerCase() === today);

  if (!todayHours) return 'Closed today';

  const hours = businessHours[todayHours];
  if (!hours || !hours.openTime || !hours.closeTime) return 'Closed today';

  const formatTime = (time: string) => {
    const parts = time.split(':');
    const hoursNum = parseInt(parts[0] || '0');
    const minutesNum = parseInt(parts[1] || '0');
    const period = hoursNum >= 12 ? 'PM' : 'AM';
    const displayHours = hoursNum % 12 || 12;
    return `${displayHours}:${minutesNum.toString().padStart(2, '0')} ${period}`;
  };

  return `${formatTime(hours.openTime)} - ${formatTime(hours.closeTime)}`;
}

/**
 * Format review date as relative time
 */
function formatReviewDate(dateString: string): string {
  const now = new Date();
  const reviewDate = new Date(dateString);
  const diffMs = now.getTime() - reviewDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  }
  return reviewDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// ============================================================================
// STAR RATING COMPONENT
// ============================================================================

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
}

// ============================================================================
// LISTINGMINICARD COMPONENT
// ============================================================================

/**
 * ListingMiniCard - Display associated listing with hero, contact, and reviews
 *
 * @example
 * ```tsx
 * <ListingMiniCard listing={listingData} />
 * ```
 */
export function ListingMiniCard({ listing }: ListingMiniCardProps) {
  const [reviewIndex, setReviewIndex] = useState(0);

  const location = [listing.city, listing.state].filter(Boolean).join(', ');
  const listingUrl = `/listings/${listing.slug}` as Route;

  // Calculate open status
  const isOpen = useMemo(() => isCurrentlyOpen(listing.business_hours), [listing.business_hours]);
  const todayHours = useMemo(() => getTodayHours(listing.business_hours), [listing.business_hours]);

  // Tier-based marker colors
  const markerColors: Record<string, string> = {
    essentials: '0x4285F4',
    plus: '0x22c55e',
    preferred: '0x9333ea',
    premium: '0xeab308'
  };

  const markerColor = markerColors[listing.tier] || markerColors.essentials;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Build mini map URL
  const miniMapUrl =
    listing.latitude && listing.longitude && apiKey
      ? `https://maps.googleapis.com/maps/api/staticmap?center=${listing.latitude},${listing.longitude}&zoom=14&size=300x150&markers=color:${markerColor}%7C${listing.latitude},${listing.longitude}&key=${apiKey}`
      : null;

  // Handle get directions
  const handleDirections = useCallback(() => {
    if (listing.latitude && listing.longitude) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${listing.latitude},${listing.longitude}`,
        '_blank',
        'noopener,noreferrer'
      );
    } else if (listing.address) {
      const fullAddress = [listing.address, listing.city, listing.state]
        .filter(Boolean)
        .join(', ');
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`,
        '_blank',
        'noopener,noreferrer'
      );
    }
  }, [listing]);

  // Review navigation
  const nextReview = useCallback(() => {
    if (listing.latest_reviews.length > 0) {
      setReviewIndex((prev) => (prev + 1) % listing.latest_reviews.length);
    }
  }, [listing.latest_reviews.length]);

  const prevReview = useCallback(() => {
    if (listing.latest_reviews.length > 0) {
      setReviewIndex((prev) => (prev - 1 + listing.latest_reviews.length) % listing.latest_reviews.length);
    }
  }, [listing.latest_reviews.length]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Hero Section */}
      <div className="relative w-full h-48 bg-gray-100">
        {/* Cover Image */}
        {listing.cover_image_url ? (
          <Image
            src={listing.cover_image_url}
            alt={listing.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#022641] to-[#022641]/80" />
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* Content Container */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-end gap-3">
            {/* Logo Badge */}
            {listing.logo_url && (
              <div className="relative w-16 h-16 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white flex-shrink-0">
                <Image
                  src={listing.logo_url}
                  alt={`${listing.name} logo`}
                  fill
                  className="object-contain p-1"
                  sizes="64px"
                />
              </div>
            )}

            {/* Business Information */}
            <div className="flex-1 text-white">
              {/* Type Badge */}
              {listing.type && (
                <span className="inline-block bg-biz-orange text-white text-xs font-medium px-3 py-1 rounded-full mb-1">
                  {listing.type}
                </span>
              )}

              {/* Business Name */}
              <h3 className="text-lg font-bold text-white mb-1">{listing.name}</h3>

              {/* Location */}
              {location && (
                <div className="flex items-center gap-1 text-sm text-white/90">
                  <MapPin className="w-3 h-3" />
                  <span>{location}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid: Contact + Reviews */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4">
        {/* Contact Section (40% - 2/5 columns) */}
        <div className="md:col-span-2 space-y-3">
          {/* Mini Map */}
          {miniMapUrl && (
            <button
              onClick={handleDirections}
              className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden group cursor-pointer"
              aria-label="Get directions"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={miniMapUrl}
                alt="Location map"
                className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <MapPin className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          )}

          {/* Open/Closed Status */}
          <div className="flex items-center justify-between">
            <span
              className={`text-sm font-medium px-2 py-1 rounded ${
                isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {isOpen ? 'Open Now' : 'Closed'}
            </span>
            <span className="text-xs text-gray-600">{todayHours}</span>
          </div>

          {/* Contact Links */}
          <div className="space-y-2">
            {listing.phone && (
              <Link
                href={`tel:${listing.phone}`}
                className="flex items-center gap-2 text-sm text-gray-700 hover:text-[#022641] transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>{listing.phone}</span>
              </Link>
            )}
            {listing.email && (
              <Link
                href={`mailto:${listing.email}`}
                className="flex items-center gap-2 text-sm text-gray-700 hover:text-[#022641] transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span className="truncate">{listing.email}</span>
              </Link>
            )}
            {listing.website && (
              <Link
                href={listing.website as Route}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-700 hover:text-[#022641] transition-colors"
              >
                <Globe className="w-4 h-4" />
                <span className="truncate">Visit Website</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            )}
          </div>

          {/* Get Directions Button */}
          {(listing.latitude || listing.address) && (
            <button
              onClick={handleDirections}
              className="w-full flex items-center justify-center gap-2 bg-[#022641] text-white px-4 py-2 rounded-lg hover:bg-[#033a5f] transition-colors text-sm font-medium"
            >
              <Navigation className="w-4 h-4" />
              Get Directions
            </button>
          )}

          {/* View Listing Link */}
          <Link
            href={listingUrl}
            className="block text-center text-sm text-[#F79D3D] hover:text-[#022641] font-medium transition-colors"
          >
            View Full Listing →
          </Link>
        </div>

        {/* Reviews Section (60% - 3/5 columns) */}
        <div className="md:col-span-3">
          {/* Rating Summary */}
          <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <StarRating rating={Math.round(listing.average_rating)} />
              <span className="text-lg font-bold text-gray-900">
                {listing.average_rating > 0 ? listing.average_rating.toFixed(1) : 'No reviews'}
              </span>
            </div>
            {listing.review_count > 0 && (
              <span className="text-sm text-gray-600">({listing.review_count} reviews)</span>
            )}
          </div>

          {/* Reviews Carousel */}
          {listing.latest_reviews.length > 0 ? (
            <div className="space-y-3">
              {/* Current Review */}
              {listing.latest_reviews[reviewIndex] && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StarRating rating={listing.latest_reviews[reviewIndex].rating} />
                      <span className="text-xs text-gray-500">
                        {formatReviewDate(listing.latest_reviews[reviewIndex].created_at)}
                      </span>
                    </div>
                  </div>

                  {listing.latest_reviews[reviewIndex].title && (
                    <h4 className="font-semibold text-sm text-gray-900">
                      {listing.latest_reviews[reviewIndex].title}
                    </h4>
                  )}

                  <p className="text-sm text-gray-700 line-clamp-3">
                    {listing.latest_reviews[reviewIndex].review_text}
                  </p>

                  <p className="text-xs text-gray-500">
                    — {listing.latest_reviews[reviewIndex].user_display_name}
                  </p>
                </div>
              )}

              {/* Navigation Controls */}
              {listing.latest_reviews.length > 1 && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <div className="flex gap-2">
                    <button
                      onClick={prevReview}
                      className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                      aria-label="Previous review"
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={nextReview}
                      className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                      aria-label="Next review"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>

                  {/* Dot Indicators */}
                  <div className="flex gap-1">
                    {listing.latest_reviews.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setReviewIndex(idx)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          idx === reviewIndex ? 'bg-[#022641]' : 'bg-gray-300'
                        }`}
                        aria-label={`Go to review ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <Star className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No reviews yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ListingMiniCard;
