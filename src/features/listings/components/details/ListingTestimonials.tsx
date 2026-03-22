/**
 * ListingTestimonials - Customer Testimonials Display
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4 - Missing Components
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Full testimonials list with author, quote, rating stars
 * - Featured testimonials highlighted
 * - Author photo with avatar fallback
 * - 5-star rating display
 * - Edit mode empty state with configure link
 * - Published mode returns null if no visible testimonials
 *
 * @see docs/pages/layouts/listings/details/detailspageenhance/3-1-26/phases/PHASE_4_BRAIN_PLAN.md
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare, Star, Settings } from 'lucide-react';
import { getAvatarInitials } from '@core/utils/avatar';
import type { Listing } from '@core/services/ListingService';

interface Testimonial {
  id: number;
  author_name: string;
  author_title: string | null;
  author_photo_url: string | null;
  testimonial: string;
  rating: number | null;
  date: string | null;
  is_featured: boolean;
}

interface ListingTestimonialsProps {
  /** Listing data */
  listing: Listing;
  /** Whether in edit mode */
  isEditing?: boolean;
}

/**
 * Render star rating
 */
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating
              ? 'text-yellow-400 fill-yellow-400'
              : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
}

export function ListingTestimonials({ listing, isEditing }: ListingTestimonialsProps) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch testimonials
  useEffect(() => {
    let isMounted = true;

    async function fetchTestimonials() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/listings/${listing.id}/testimonials`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch testimonials');
        }

        const result = await response.json();
        if (isMounted && result.success) {
          setTestimonials(result.data?.testimonials || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load testimonials');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchTestimonials();

    return () => {
      isMounted = false;
    };
  }, [listing.id]);

  // Show empty state in edit mode when no testimonials
  if (isEditing && !isLoading && testimonials.length === 0) {
    return (
      <section className="bg-white rounded-lg shadow-sm p-6 border-2 border-dashed border-gray-300">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              Customer Testimonials
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              No testimonials yet. Showcase customer feedback to build credibility.
            </p>
            <Link
              href={`/dashboard/listings/${String(listing.id)}/testimonials` as any}
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

  // Return null in published mode when no testimonials
  if (!isLoading && testimonials.length === 0) {
    return null;
  }

  return (
    <section className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-biz-navy flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-biz-orange" />
          Customer Testimonials
          {!isLoading && testimonials.length > 0 && (
            <span className="text-sm font-normal text-gray-500">
              ({testimonials.length})
            </span>
          )}
        </h2>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-6 animate-pulse">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-5/6"></div>
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

      {/* Testimonials List */}
      {!isLoading && !error && testimonials.length > 0 && (
        <div className="space-y-6">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className={`border rounded-lg p-6 ${
                testimonial.is_featured
                  ? 'border-biz-orange bg-orange-50/30'
                  : 'border-gray-200'
              }`}
            >
              {/* Author Info */}
              <div className="flex items-start gap-4 mb-4">
                {/* Author Photo */}
                <div className="flex-shrink-0">
                  {testimonial.author_photo_url ? (
                    <img
                      src={testimonial.author_photo_url}
                      alt={testimonial.author_name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-biz-orange text-white flex items-center justify-center text-xl font-bold">
                      {getAvatarInitials(testimonial.author_name)}
                    </div>
                  )}
                </div>

                {/* Author Name, Title, Rating */}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {testimonial.author_name}
                  </h3>
                  {testimonial.author_title && (
                    <p className="text-sm text-gray-600 mb-2">
                      {testimonial.author_title}
                    </p>
                  )}
                  {testimonial.rating && (
                    <StarRating rating={testimonial.rating} />
                  )}
                </div>

                {/* Featured Badge */}
                {testimonial.is_featured && (
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-biz-orange text-white">
                      Featured
                    </span>
                  </div>
                )}
              </div>

              {/* Testimonial Text */}
              <blockquote className="text-gray-700 leading-relaxed italic">
                "{testimonial.testimonial}"
              </blockquote>

              {/* Date */}
              {testimonial.date && (
                <p className="text-sm text-gray-500 mt-4">
                  {new Date(testimonial.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
