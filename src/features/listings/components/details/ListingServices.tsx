/**
 * ListingServices - Service Offerings with Booking
 *
 * @component Client Component
 * @tier ADVANCED
 * @phase Phase 7 - Feature Component Enhancements
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Services list with pricing
 * - Nested service providers (team members)
 * - Book Now button (links to booking system)
 * - Service duration and price display
 * - Category grouping
 * - Empty state returns null
 *
 * @see docs/pages/layouts/listings/details/detailspageenhance/phases/PHASE_7_BRAIN_PLAN.md
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Briefcase, Clock, DollarSign, ExternalLink, User, Settings } from 'lucide-react';
import type { Listing } from '@core/services/ListingService';

interface ServiceProvider {
  id: number;
  name: string;
  avatar_url?: string;
  title: string;
  available: boolean;
}

interface Service {
  id: number;
  name: string;
  description?: string;
  category?: string;
  duration_minutes?: number;
  price?: number;
  price_type: 'fixed' | 'starting_at' | 'hourly' | 'custom';
  providers?: ServiceProvider[];
  booking_url?: string;
}

interface ListingServicesProps {
  /** Listing data */
  listing: Listing;
  /** Whether in edit mode */
  isEditing?: boolean;
}

/**
 * Format service price
 */
function formatServicePrice(price: number | undefined, priceType: Service['price_type']): string {
  if (!price) return 'Contact for pricing';

  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(price);

  switch (priceType) {
    case 'starting_at':
      return `from ${formattedPrice}`;
    case 'hourly':
      return `${formattedPrice}/hr`;
    case 'fixed':
      return formattedPrice;
    case 'custom':
    default:
      return formattedPrice;
  }
}

/**
 * Format service duration
 */
function formatDuration(minutes: number | undefined): string {
  if (!minutes) return '';

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${mins} min`;
}

export function ListingServices({ listing, isEditing }: ListingServicesProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch services
  useEffect(() => {
    let isMounted = true;

    async function fetchServices() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/listings/${listing.id}/services`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch services');
        }

        const result = await response.json();
        if (isMounted && result.success) {
          setServices(result.data || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load services');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchServices();

    return () => {
      isMounted = false;
    };
  }, [listing.id]);

  // Group services by category
  const groupedServices = services.reduce<Record<string, Service[]>>((acc, service) => {
    const category = service.category || 'Other Services';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(service);
    return acc;
  }, {});

  // Show empty state in edit mode when no services
  if (isEditing && !isLoading && services.length === 0) {
    return (
      <section className="bg-white rounded-lg shadow-sm p-6 border-2 border-dashed border-gray-300">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              Services
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              No services yet. Add your service offerings with pricing and booking.
            </p>
            <Link
              href={`/dashboard/listings/${String(listing.id)}/services` as any}
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

  // Return null in published mode when no services
  if (!isLoading && services.length === 0) {
    return null;
  }

  return (
    <section className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-biz-navy flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-biz-orange" />
          Services
          {!isLoading && services.length > 0 && (
            <span className="text-sm font-normal text-gray-500">
              ({services.length})
            </span>
          )}
        </h2>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
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

      {/* Services List */}
      {!isLoading && !error && services.length > 0 && (
        <div className="space-y-6">
          {Object.entries(groupedServices).map(([category, categoryServices]) => (
            <div key={category}>
              {/* Category Header */}
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{category}</h3>

              {/* Services in Category */}
              <div className="space-y-3">
                {categoryServices.map((service) => (
                  <div
                    key={service.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Service Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 mb-1">{service.name}</h4>
                        {service.description && (
                          <p className="text-sm text-gray-600 mb-2">{service.description}</p>
                        )}

                        {/* Duration and Price */}
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          {service.duration_minutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatDuration(service.duration_minutes)}
                            </span>
                          )}
                          <span className="flex items-center gap-1 font-semibold text-biz-navy">
                            <DollarSign className="w-4 h-4" />
                            {formatServicePrice(service.price, service.price_type)}
                          </span>
                        </div>

                        {/* Providers */}
                        {service.providers && service.providers.length > 0 && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <User className="w-4 h-4" />
                            <span>
                              Providers: {service.providers.map(p => p.name).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Book Now Button */}
                      {service.booking_url && (
                        <a
                          href={service.booking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 px-4 py-2 bg-biz-orange text-white rounded-lg hover:bg-biz-orange/90 transition-colors flex items-center gap-2 text-sm font-medium"
                        >
                          Book Now
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
