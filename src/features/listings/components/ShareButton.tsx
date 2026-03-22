'use client';

import { Share2 } from 'lucide-react';
import type { ListingShareData } from '@features/listings/hooks/useShareModal';

interface ShareButtonProps {
  listing: ListingShareData;
  onClick: () => void;
  variant?: 'icon' | 'button';
  className?: string;
}

export function ShareButton({ onClick, variant = 'icon', className = '' }: ShareButtonProps) {
  if (variant === 'button') {
    return (
      <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2 bg-[#022641]/10 text-[#022641] rounded-lg hover:bg-[#022641]/20 transition-colors ${className}`}
      >
        <Share2 className="w-4 h-4" />
        <span className="text-sm font-medium">Share</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center w-10 h-10 rounded-full border border-[#022641] bg-[#022641]/10 text-[#022641] hover:bg-[#022641]/20 transition-colors ${className}`}
      aria-label="Share listing"
      title="Share"
    >
      <Share2 className="w-5 h-5" />
    </button>
  );
}
