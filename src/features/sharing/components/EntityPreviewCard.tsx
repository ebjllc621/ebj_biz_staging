/**
 * EntityPreviewCard - Display entity preview for recommendations
 *
 * Shows entity thumbnail, title, description, and optional link in a compact card format.
 * Supports all entity types: user, listing, event, article, newsletter, podcast, video.
 *
 * @tier SIMPLE
 * @phase Phase 1 - Core Recommendation Flow
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/userrecommendations/phases/PHASE_1_BRAIN_PLAN.md
 *
 * @example
 * ```tsx
 * import { EntityPreviewCard } from '@features/sharing/components';
 *
 * function RecommendationForm({ entityPreview }) {
 *   return (
 *     <EntityPreviewCard
 *       preview={{
 *         type: 'listing',
 *         id: '123',
 *         title: 'Best Coffee Shop',
 *         description: 'Amazing espresso and pastries',
 *         image_url: '/uploads/coffee.jpg',
 *         url: '/listings/best-coffee-shop'
 *       }}
 *       showLink={true}
 *     />
 *   );
 * }
 * ```
 */

'use client';

import React from 'react';
import { User, Building, Calendar } from 'lucide-react';
import type { EntityPreview } from '@features/contacts/types/sharing';
import { getAvatarInitials } from '@core/utils/avatar';

interface EntityPreviewCardProps {
  /** Entity preview data */
  preview: EntityPreview;
  /** Whether to show the link */
  showLink?: boolean;
}

export function EntityPreviewCard({ preview, showLink = false }: EntityPreviewCardProps) {
  const Icon = getIconForType(preview.type);

  return (
    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      {/* Entity Image/Icon */}
      <div className="flex-shrink-0">
        {preview.image_url ? (
          <img
            src={preview.image_url}
            alt={preview.title}
            className="w-16 h-16 rounded-lg object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-blue-100 flex items-center justify-center">
            <Icon className="w-8 h-8 text-blue-600" />
          </div>
        )}
      </div>

      {/* Entity Details */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 truncate">
          {preview.title}
        </h3>
        {preview.description && (
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {preview.description}
          </p>
        )}
        {showLink && (
          <a
            href={preview.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-700 mt-2 inline-block"
          >
            View {preview.type}
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * Get icon component for entity type
 */
function getIconForType(type: string) {
  switch (type) {
    case 'user':
      return User;
    case 'listing':
      return Building;
    case 'event':
      return Calendar;
    default:
      return User;
  }
}
