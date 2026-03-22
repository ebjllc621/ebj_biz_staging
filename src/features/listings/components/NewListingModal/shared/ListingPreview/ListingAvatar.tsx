/**
 * ListingAvatar - Logo Display with Fallback
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier ENTERPRISE
 * @phase Phase 5 - Section 5 Media
 *
 * FEATURES:
 * - Image preloading to eliminate flash
 * - Deterministic color fallback based on name
 * - Loading skeleton state
 * - Error handling
 * - Size-responsive rounded corners
 */

'use client';

import { useState, useEffect } from 'react';

// ============================================================================
// CONSTANTS
// ============================================================================

// Bizconekt palette: orange, navy, gray, and their light variants
const PALETTE = [
  { bg: 'bg-[#ed6437]', text: 'text-white' }, // Orange
  { bg: 'bg-[#022641]', text: 'text-white' }, // Navy
  { bg: 'bg-[#b0b3b8]', text: 'text-[#022641]' }, // Gray
  { bg: 'bg-orange-100', text: 'text-[#ed6437]' }, // Light Orange
  { bg: 'bg-blue-100', text: 'text-[#022641]' }, // Light Navy
  { bg: 'bg-gray-100', text: 'text-[#8d918d]' }, // Light Gray
];

// ============================================================================
// UTILITIES
// ============================================================================

function hashString(str: string): number {
  // Simple hash for deterministic color assignment
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

// ============================================================================
// TYPES
// ============================================================================

interface ListingAvatarProps {
  name: string;
  logo?: string | null;
  size?: number; // px, default 64
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ListingAvatar({
  name,
  logo,
  size = 64,
  className = ''
}: ListingAvatarProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isPreloading, setIsPreloading] = useState(!!logo);

  // Dynamic rounded corners based on size for optimal appearance
  const getRoundedClass = (size: number) => {
    if (size >= 160) return 'rounded-2xl'; // Large logos (hero banners)
    if (size >= 80) return 'rounded-xl';   // Medium logos
    return 'rounded-lg';                   // Small logos (cards, lists)
  };

  const roundedClass = getRoundedClass(size);

  // Preload image to eliminate flash effect
  useEffect(() => {
    if (!logo) {
      setIsPreloading(false);
      return;
    }

    setImageLoaded(false);
    setImageError(false);
    setIsPreloading(true);

    const img = new Image();

    img.onload = () => {
      setImageLoaded(true);
      setImageError(false);
      setIsPreloading(false);
    };

    img.onerror = () => {
      setImageLoaded(false);
      setImageError(true);
      setIsPreloading(false);
    };

    img.src = logo;
  }, [logo]);

  // Deterministic color assignment for fallback avatar
  const colorIdx = hashString(name || 'listing') % PALETTE.length;
  const paletteItem = PALETTE[colorIdx];
  const bg = paletteItem?.bg || 'bg-[#022641]';
  const text = paletteItem?.text || 'text-white';

  // Show loading skeleton while preloading
  if (isPreloading) {
    return (
      <div
        className={`${roundedClass} bg-gray-300 animate-pulse ${className}`}
        style={{ width: size, height: size }}
        aria-label={`Loading ${name} avatar`}
      />
    );
  }

  // Show logo image if loaded successfully
  if (logo && imageLoaded && !imageError) {
    return (
      <img
        src={logo}
        alt={name}
        className={`${roundedClass} object-cover object-center transition-opacity duration-300 ${className}`}
        style={{ width: size, height: size }}
        onError={() => {
          // This should not happen since we preloaded, but fallback just in case
          setImageError(true);
          setImageLoaded(false);
        }}
      />
    );
  }

  // Show fallback avatar (when no logo, failed to load, or error)
  return (
    <div
      className={`flex items-center justify-center ${roundedClass} font-bold uppercase ${bg} ${text} transition-opacity duration-300 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      aria-label={name}
    >
      {name?.charAt(0) || '?'}
    </div>
  );
}
