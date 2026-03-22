/**
 * ShareProfileButton - Reusable button for sharing user profiles
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @brain-plan docs/pages/layouts/home/user/user_profile/phases/PHASE_1_SHAREPROFILEBUTTON_BRAIN_PLAN.md
 *
 * Features:
 * - Web Share API on supported mobile devices
 * - Modal fallback for desktop browsers
 * - Consistent styling with profile action buttons
 * - Customizable button content via children prop
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Share2 } from 'lucide-react';
import { ShareProfileModal } from './ShareProfileModal';

export interface ShareProfileButtonProps {
  /** Profile data to share */
  profile: {
    id: number;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  /** Optional callback when share completes */
  onShareComplete?: () => void;
  /** Optional custom className for button styling */
  className?: string;
  /** Optional children to override default button content */
  children?: React.ReactNode;
}

export function ShareProfileButton({
  profile,
  onShareComplete,
  className,
  children
}: ShareProfileButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Construct profile URL
  const profileUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/profile/${profile.username}`
    : `/profile/${profile.username}`;

  const displayName = profile.display_name || profile.username;

  // Check for Web Share API support
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  // Handle share button click
  const handleShare = useCallback(async () => {
    if (canNativeShare) {
      try {
        await navigator.share({
          title: `${displayName}'s Profile on Bizconekt`,
          text: `Check out ${displayName}'s profile on Bizconekt`,
          url: profileUrl
        });
        onShareComplete?.();
      } catch (err) {
        // User cancelled share (AbortError) - do nothing
        // Other errors fall back to modal
        if ((err as Error).name !== 'AbortError') {
          setIsModalOpen(true);
        }
      }
    } else {
      setIsModalOpen(true);
    }
  }, [canNativeShare, displayName, profileUrl, onShareComplete]);

  // Default button styling (matches SendMessageButton pattern)
  const defaultClassName = "flex items-center gap-2 px-4 py-2 bg-white text-[#022641] border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium";

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        className={className || defaultClassName}
      >
        <Share2 className="w-4 h-4" />
        {children || 'Share Profile'}
      </button>

      <ShareProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        profile={profile}
        profileUrl={profileUrl}
        onShareComplete={onShareComplete}
      />
    </>
  );
}
