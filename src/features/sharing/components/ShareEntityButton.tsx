/**
 * ShareEntityButton - Button to trigger entity recommendation modal
 *
 * Displays a share icon button that opens either ShareEntityModal (desktop)
 * or MobileShareSheet (mobile) based on screen size.
 *
 * @tier SIMPLE
 * @phase Phase 1 - Core Recommendation Flow
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/userrecommendations/phases/PHASE_1_BRAIN_PLAN.md
 *
 * @example
 * ```tsx
 * import { ShareEntityButton } from '@features/sharing/components';
 *
 * // On a listing page
 * function ListingDetails({ listing }) {
 *   return (
 *     <ShareEntityButton
 *       entityType="listing"
 *       entityId={listing.id}
 *       entityPreview={{
 *         title: listing.title,
 *         description: listing.description,
 *         image_url: listing.image_url,
 *         url: `/listings/${listing.id}`
 *       }}
 *       onShareSuccess={() => toast.success('Shared!')}
 *     />
 *   );
 * }
 *
 * // Minimal usage
 * <ShareEntityButton entityType="user" entityId={userId} />
 * ```
 */

'use client';

import React, { useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { useAuth } from '@core/hooks/useAuth';
import { useIsMobile } from '@core/hooks/useMediaQuery';
import type { EntityType, EntityPreview } from '@features/contacts/types/sharing';
import { ShareEntityModal } from './ShareEntityModal';
import { MobileShareSheet } from './MobileShareSheet';

interface ShareEntityButtonProps {
  /** Type of entity to share */
  entityType: EntityType;
  /** ID of entity to share */
  entityId: string;
  /** Optional pre-loaded entity preview */
  entityPreview?: EntityPreview | null;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Optional callback after successful share */
  onShareSuccess?: () => void;
}

export function ShareEntityButton({
  entityType,
  entityId,
  entityPreview = null,
  variant = 'secondary',
  size = 'md',
  className = '',
  onShareSuccess
}: ShareEntityButtonProps) {
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

  // Determine button styles based on variant and size
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors disabled:opacity-50';

  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
    ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const buttonClasses = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={buttonClasses}
        aria-label="Recommend"
      >
        <BadgeCheck className={iconSizes[size]} />
        <span>Recommend</span>
      </button>

      {/* Use MobileShareSheet on mobile, ShareEntityModal on desktop */}
      {isMobile ? (
        <MobileShareSheet
          isOpen={isModalOpen}
          onClose={handleClose}
          entityType={entityType}
          entityId={entityId}
          entityPreview={entityPreview}
          onShareSuccess={onShareSuccess}
        />
      ) : (
        <ShareEntityModal
          isOpen={isModalOpen}
          onClose={handleClose}
          entityType={entityType}
          entityId={entityId}
          entityPreview={entityPreview}
          onShareSuccess={onShareSuccess}
        />
      )}
    </>
  );
}
