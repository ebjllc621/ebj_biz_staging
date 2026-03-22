/**
 * SidebarTestimonialsCard - Featured Testimonial Quote
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase R3 - Sidebar Feature Correction
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Single featured/highest-rated testimonial
 * - Quote text (line-clamp-3)
 * - Author name
 * - Returns null if no testimonials
 *
 * @see docs/pages/layouts/listings/details/userdash/phases/PHASE_R3_BRAIN_PLAN.md
 */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Quote } from 'lucide-react';
import type { Listing } from '@core/services/ListingService';

interface Testimonial {
  id: number;
  text: string;
  author_name?: string;
  rating?: number;
  featured?: boolean;
}

interface SidebarTestimonialsCardProps {
  /** Listing data */
  listing: Listing;
}

export function SidebarTestimonialsCard({ listing }: SidebarTestimonialsCardProps) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch testimonials
  useEffect(() => {
    let isMounted = true;

    async function fetchTestimonials() {
      setIsLoading(true);

      try {
        // Try testimonials endpoint first, fallback to reviews
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
        // Silently fail - component returns null on error
        if (isMounted) {
          setTestimonials([]);
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

  // Get featured or highest-rated testimonial
  const featuredTestimonial = useMemo(() => {
    if (testimonials.length === 0) return null;

    // First try to find a featured testimonial
    const featured = testimonials.find(t => t.featured);
    if (featured) return featured;

    // Otherwise, return highest-rated or first testimonial
    const sorted = [...testimonials].sort((a, b) => {
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      return ratingB - ratingA;
    });

    return sorted[0] || null;
  }, [testimonials]);

  // Return null if loading or no testimonials
  if (isLoading || !featuredTestimonial) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg overflow-hidden p-3">
      <div className="relative">
        {/* Quote Icon */}
        <Quote className="w-6 h-6 text-gray-300 mb-2" />

        {/* Quote Text */}
        <blockquote className="text-sm text-gray-700 mb-3 line-clamp-3 leading-relaxed">
          {featuredTestimonial.text}
        </blockquote>

        {/* Author */}
        {featuredTestimonial.author_name && (
          <div className="text-xs font-medium text-gray-900">
            — {featuredTestimonial.author_name}
          </div>
        )}
      </div>
    </div>
  );
}

export default SidebarTestimonialsCard;
