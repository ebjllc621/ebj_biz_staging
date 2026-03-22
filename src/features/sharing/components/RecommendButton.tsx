/**
 * RecommendButton - Button to trigger entity recommendation modal
 *
 * Displays a recommend button that opens either RecommendModal (desktop)
 * or MobileRecommendSheet (mobile) based on screen size.
 *
 * This is the primary entry point for the user-to-user recommendation system.
 * Users can recommend listings, events, profiles, and content to their connections.
 *
 * @tier SIMPLE
 * @phase Phase 12 - Recommend Button Deployment
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/userrecommendations/phases/PHASE_12_RECOMMEND_BUTTON_BRAIN_PLAN.md
 *
 * @example
 * ```tsx
 * import { RecommendButton } from '@features/sharing/components';
 *
 * // On a listing page
 * function ListingDetails({ listing }) {
 *   return (
 *     <RecommendButton
 *       entityType="listing"
 *       entityId={listing.id.toString()}
 *       entityPreview={{
 *         title: listing.name,
 *         description: listing.description,
 *         image_url: listing.primary_image_url,
 *         url: `/listings/${listing.slug}`
 *       }}
 *       onRecommendSuccess={() => toast.success('Recommendation sent!')}
 *     />
 *   );
 * }
 *
 * // Minimal usage
 * <RecommendButton entityType="user" entityId={userId.toString()} />
 * ```
 */

'use client';

import React, { useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { useAuth } from '@core/hooks/useAuth';
import { useIsMobile } from '@core/hooks/useMediaQuery';
import type { EntityType, EntityPreview } from '@features/contacts/types/sharing';
import { RecommendModal } from './RecommendModal';
import { MobileRecommendSheet } from './MobileRecommendSheet';

/**
 * Partial entity preview for pre-populating modal
 * type and id are provided separately via entityType and entityId props
 */
export type PartialEntityPreview = Omit<EntityPreview, 'type' | 'id'>;

export interface RecommendButtonProps {
  /** Type of entity to recommend */
  entityType: EntityType;
  /** ID of entity to recommend */
  entityId: string;
  /** Optional pre-loaded entity preview (type and id auto-populated) */
  entityPreview?: PartialEntityPreview | null;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'ghost' | 'mobile';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Show only icon (no text) */
  iconOnly?: boolean;
  /** Optional callback after successful recommendation */
  onRecommendSuccess?: () => void;
}

export function RecommendButton({
  entityType,
  entityId,
  entityPreview = null,
  variant = 'secondary',
  size = 'md',
  className = '',
  iconOnly = false,
  onRecommendSuccess
}: RecommendButtonProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  const handleClick = () => {
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
  };

  // Construct full EntityPreview from partial preview + entityType/entityId
  const fullPreview: EntityPreview | null = entityPreview
    ? { type: entityType, id: entityId, ...entityPreview }
    : null;

  // Mobile variant renders in vertical layout (for MobileActionBar)
  if (variant === 'mobile') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className={`flex flex-col items-center gap-1 px-3 py-2 text-gray-700 hover:text-biz-orange transition-colors active:scale-95 min-w-[44px] ${className}`}
          aria-label="Recommend to a connection"
        >
          <BadgeCheck className="w-5 h-5" />
          <span className="text-xs font-medium">Recommend</span>
        </button>

        <MobileRecommendSheet
          isOpen={isModalOpen}
          onClose={handleClose}
          entityType={entityType}
          entityId={entityId}
          entityPreview={fullPreview}
          onShareSuccess={onRecommendSuccess}
        />
      </>
    );
  }

  // Determine button styles based on variant and size
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors disabled:opacity-50';

  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
    ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  const iconOnlySizeStyles = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-5 h-5'
  };

  const buttonClasses = `${baseStyles} ${variantStyles[variant as 'primary' | 'secondary' | 'ghost']} ${iconOnly ? iconOnlySizeStyles[size] : sizeStyles[size]} ${className}`;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={buttonClasses}
        aria-label="Recommend to a connection"
      >
        <BadgeCheck className={iconSizes[size]} />
        {!iconOnly && <span>Recommend</span>}
      </button>

      {/* Use MobileRecommendSheet on mobile, RecommendModal on desktop */}
      {isMobile ? (
        <MobileRecommendSheet
          isOpen={isModalOpen}
          onClose={handleClose}
          entityType={entityType}
          entityId={entityId}
          entityPreview={fullPreview}
          onShareSuccess={onRecommendSuccess}
        />
      ) : (
        <RecommendModal
          isOpen={isModalOpen}
          onClose={handleClose}
          entityType={entityType}
          entityId={entityId}
          entityPreview={fullPreview}
          onShareSuccess={onRecommendSuccess}
        />
      )}
    </>
  );
}

/**
 * @deprecated Use RecommendButton instead. This alias exists for backward compatibility.
 */
export const ShareEntityButton = RecommendButton;
