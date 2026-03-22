/**
 * ListingQuickFacts - Key Business Metrics Display
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 7 - Feature Component Enhancements
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Grid display of key business metrics
 * - Conditional rendering (only show populated metrics)
 * - Edit mode shows placeholders for empty metrics
 * - Icons from lucide-react
 * - Responsive grid layout
 *
 * @see docs/pages/layouts/listings/details/detailspageenhance/phases/PHASE_7_BRAIN_PLAN.md
 */
'use client';

import { Calendar, Users, DollarSign, Tag, MapPin, Star } from 'lucide-react';
import type { Listing } from '@core/services/ListingService';

interface ListingQuickFactsProps {
  /** Listing data */
  listing: Listing;
  /** Whether in edit mode (shows placeholders) */
  isEditing?: boolean;
}

interface QuickFact {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null;
  show: boolean;
}

export function ListingQuickFacts({ listing, isEditing }: ListingQuickFactsProps) {
  // Build quick facts array
  // Note: Using optional chaining for fields that may not exist on Listing interface
  const facts: QuickFact[] = [
    {
      icon: Calendar,
      label: 'Founded',
      value: (listing as any).founded_year ? String((listing as any).founded_year) : null,
      show: !!(listing as any).founded_year || !!isEditing
    },
    {
      icon: Users,
      label: 'Employees',
      value: (listing as any).employee_count ? String((listing as any).employee_count) : null,
      show: !!(listing as any).employee_count || !!isEditing
    },
    {
      icon: DollarSign,
      label: 'Price Range',
      value: (listing as any).price_range || null,
      show: !!(listing as any).price_range || !!isEditing
    },
    {
      icon: Tag,
      label: 'Specialties',
      value: (listing as any).specialties_count ? `${(listing as any).specialties_count} specialties` : null,
      show: !!(listing as any).specialties_count || !!isEditing
    },
    {
      icon: MapPin,
      label: 'Locations',
      value: (listing as any).location_count ? String((listing as any).location_count) : '1',
      show: ((listing as any).location_count && (listing as any).location_count > 1) || !!isEditing
    },
    {
      icon: Star,
      label: 'Rating',
      value: (listing as any).average_rating
        ? `${(listing as any).average_rating.toFixed(1)} (${(listing as any).review_count || 0} reviews)`
        : null,
      show: !!(listing as any).average_rating || !!isEditing
    }
  ];

  // Filter to only visible facts
  const visibleFacts = facts.filter(f => f.show);

  // Don't render if no facts and not editing
  if (visibleFacts.length === 0 && !isEditing) {
    return null;
  }

  return (
    <section className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <h2 className="text-xl font-semibold text-biz-navy mb-4">Quick Facts</h2>

      {/* Facts Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {visibleFacts.map((fact) => {
          const IconComponent = fact.icon;

          return (
            <div key={fact.label} className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <IconComponent className="w-5 h-5 text-biz-orange" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-500 font-medium">{fact.label}</div>
                <div className="text-base text-gray-900 font-semibold truncate">
                  {fact.value || (
                    <span className="text-gray-400 italic">Not set</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
