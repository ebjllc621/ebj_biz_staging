'use client';

import { Shield } from 'lucide-react';
import type { ClaimUIStatus } from '@/features/listings/hooks/useClaimListing';

interface ClaimListingButtonProps {
  claimStatus: ClaimUIStatus;
  isAuthenticated: boolean;
  onClaimClick: () => void;
  variant?: 'desktop' | 'mobile';
}

export function ClaimListingButton({
  claimStatus,
  isAuthenticated,
  onClaimClick,
  variant = 'desktop',
}: ClaimListingButtonProps) {
  // Don't show button if listing is already claimed
  if (claimStatus.isClaimed) {
    return null;
  }

  // Desktop variant
  if (variant === 'desktop') {
    // Not authenticated - show disabled button with tooltip
    if (!isAuthenticated) {
      return (
        <button
          type="button"
          disabled
          title="Sign in to claim this business"
          className="flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed"
        >
          <Shield className="w-5 h-5" />
          <span>Claim This Business</span>
        </button>
      );
    }

    // Has active claim in progress
    if (claimStatus.hasActiveClaim) {
      return (
        <button
          type="button"
          disabled
          className="flex items-center gap-2 px-4 py-2 rounded-md border border-yellow-600 bg-yellow-50 text-yellow-700 cursor-not-allowed"
        >
          <Shield className="w-5 h-5" />
          <span>Claim In Progress</span>
        </button>
      );
    }

    // Can claim - active button
    if (claimStatus.canClaim) {
      return (
        <button
          type="button"
          onClick={onClaimClick}
          className="flex items-center gap-2 px-4 py-2 rounded-md border border-green-600 bg-green-600 text-white hover:bg-green-700 transition-colors"
        >
          <Shield className="w-5 h-5" />
          <span>Claim This Business</span>
        </button>
      );
    }

    return null;
  }

  // Mobile variant
  if (variant === 'mobile') {
    // Not authenticated - show disabled button
    if (!isAuthenticated) {
      return (
        <button
          type="button"
          disabled
          title="Sign in to claim this business"
          className="flex flex-col items-center gap-1 px-3 py-2 text-gray-600 min-w-[44px] cursor-not-allowed"
        >
          <Shield className="w-5 h-5" />
          <span className="text-xs">Claim</span>
        </button>
      );
    }

    // Has active claim in progress
    if (claimStatus.hasActiveClaim) {
      return (
        <button
          type="button"
          disabled
          className="flex flex-col items-center gap-1 px-3 py-2 text-yellow-600 min-w-[44px] cursor-not-allowed"
        >
          <Shield className="w-5 h-5" />
          <span className="text-xs">Pending</span>
        </button>
      );
    }

    // Can claim - active button
    if (claimStatus.canClaim) {
      return (
        <button
          type="button"
          onClick={onClaimClick}
          className="flex flex-col items-center gap-1 px-3 py-2 text-green-600 hover:text-green-700 transition-colors active:scale-95 min-w-[44px]"
        >
          <Shield className="w-5 h-5" />
          <span className="text-xs">Claim</span>
        </button>
      );
    }

    return null;
  }

  return null;
}
