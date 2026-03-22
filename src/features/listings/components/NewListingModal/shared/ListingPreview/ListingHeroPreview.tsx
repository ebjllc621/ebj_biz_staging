/**
 * ListingHeroPreview - Desktop/Mobile Hero Preview Component
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier ENTERPRISE
 * @phase Phase 5 - Section 5 Media
 *
 * FEATURES:
 * - Desktop/Mobile view toggle
 * - Scaled preview of hero section
 * - Star rating display
 * - Logo overlay on cover image
 * - CTA button mockups
 */

'use client';

import { useState } from 'react';
import BizButton from '@/components/BizButton';
import ListingAvatar from './ListingAvatar';

// ============================================================================
// UTILITIES
// ============================================================================

const typeLabel = (type?: string | number) => {
  if (!type) return 'Business';
  const typeStr = typeof type === 'number' ? String(type) : type;
  const map: Record<string, string> = {
    '1': 'Business',
    '2': 'Non-Profit',
    '3': 'Government',
    '4': 'Professional Association',
    '5': 'Other Group',
    '6': 'Creator',
    business: 'Business',
    nonProfit: 'Non-Profit',
    government: 'Government',
    professionalAssociation: 'Professional Association',
    otherGroup: 'Other Group',
    creator: 'Creator',
  };
  return map[typeStr] || typeStr.charAt(0).toUpperCase() + typeStr.slice(1);
};

const renderStars = (rating: number) => {
  return Array.from({ length: 5 }, (_, i) => (
    <svg
      key={i}
      className={`w-5 h-5 ${i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}`}
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  ));
};

// ============================================================================
// TYPES
// ============================================================================

interface ListingHeroPreviewProps {
  name: string;
  slogan?: string;
  type?: string | number;
  logo?: string | null;
  coverImage?: string | null;
  originalCoverImage?: string | null;
  showViewToggle?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ListingHeroPreview({
  name,
  slogan,
  type,
  logo,
  coverImage,
  originalCoverImage,
  showViewToggle = false,
}: ListingHeroPreviewProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  // For mobile, we want to simulate using the original uploaded image with object-cover behavior
  // For desktop, we use the cropped/scaled version
  const heroImg = viewMode === 'mobile' && originalCoverImage
    ? originalCoverImage
    : (coverImage || '/images/placeholder.png');

  // Scale factors for different view modes
  const scaleConfig = {
    desktop: {
      scale: 0.4,
      baseWidth: 1920,
      baseHeight: 900, // Reduced from 1200 to eliminate excess white space
      containerWidth: 768,
      containerHeight: 360 // Reduced from 480 to match new baseHeight
    },
    mobile: {
      scale: 0.8,
      baseWidth: 375,
      baseHeight: 480, // Compact mobile layout: h-40 (160px) cover + logo + info box
      containerWidth: 300,
      containerHeight: 384 // 480px * 0.8 scale = 384px for realistic mobile preview
    }
  };

  const config = scaleConfig[viewMode];

  return (
    <div className="mb-8">
      {/* View Toggle */}
      {showViewToggle && (
        <div className="flex justify-center mb-4">
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setViewMode('desktop');
              }}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'desktop'
                  ? 'bg-white text-[#022641] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Live Desktop Preview
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setViewMode('mobile');
              }}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'mobile'
                  ? 'bg-white text-[#022641] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Live Mobile Preview
            </button>
          </div>
        </div>
      )}

      {/* Scaled Preview Container */}
      <div
        className="border border-gray-300 rounded-lg overflow-hidden bg-[#fefefe] shadow-lg mx-auto"
        style={{ maxWidth: `${config.containerWidth + 40}px` }}
      >
        <div className="text-xs text-gray-500 px-3 py-2 bg-gray-50 border-b border-gray-200 text-center">
          {viewMode === 'desktop' ? 'Desktop View (1920px scaled to fit)' : 'Mobile View (375px scaled to fit)'}
        </div>

        {/* Scaled Preview Viewport */}
        <div className="flex justify-center items-start bg-[#fefefe] p-4">
          <div
            className="relative bg-[#fefefe] overflow-hidden border border-gray-200 rounded-sm"
            style={{
              width: `${config.containerWidth}px`,
              height: `${config.containerHeight}px`,
            }}
          >
            {viewMode === 'mobile' ? (
              /* Mobile: Natural layout without transform scaling */
              <div className="relative w-full h-full">
                <div className="relative h-40 bg-gradient-to-br from-[#002641] to-[#8d918d] flex flex-col items-center justify-end w-full">
                  {/* Cover Image with natural object-cover */}
                  <div className="absolute inset-0">
                    <img
                      src={heroImg}
                      alt={`${name} cover`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-40"></div>
                  </div>

                  {/* Logo - Mobile size */}
                  <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-1/2 z-30">
                    {logo ? (
                      <div className="w-20 h-20 rounded-xl overflow-hidden shadow-lg ring-2 ring-white bg-white mx-auto">
                        <img
                          src={logo}
                          alt={`${name} logo`}
                          className="w-full h-full object-contain object-center"
                          style={{ borderRadius: '0.75rem' }}
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 mx-auto">
                        <ListingAvatar name={name} size={80} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Info Box - Mobile */}
                <div className="relative z-10 flex flex-col items-center w-full px-2">
                  <div className="mx-auto bg-white rounded-xl shadow-lg px-4 py-4 mt-12 max-w-sm w-full flex flex-col items-center border border-gray-100">
                    {/* Business Type, Stars, Reviews */}
                    <div className="flex flex-col items-center justify-center mb-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#ed6437] text-white mb-2">
                        {typeLabel(type)}
                      </span>
                      <div className="flex items-center space-x-1">
                        {renderStars(4.5)}
                        <span className="text-xs text-[#002641] ml-1">4.5 (34 reviews)</span>
                      </div>
                    </div>

                    {/* Business Name */}
                    <h1 className="text-2xl font-bold text-[#002641] text-center mb-1">{name || 'Your Business Name'}</h1>

                    {/* Slogan/Short Description */}
                    {slogan && (
                      <p className="text-sm text-[#8d918d] text-center mb-3">
                        {slogan}
                      </p>
                    )}

                    {/* CTA Buttons */}
                    <div className="flex flex-col gap-2 w-full">
                      <BizButton variant="primary" className="w-full text-sm py-2">
                        Leave Review
                      </BizButton>
                      <BizButton variant="neutral" className="w-full text-sm py-2">
                        Get Quote
                      </BizButton>
                      <BizButton variant="secondary" className="w-full text-sm py-2">
                        Save
                      </BizButton>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Desktop: Scaled down version - centered using transform */
              <div
                className="absolute left-1/2"
                style={{
                  width: `${config.baseWidth}px`,
                  height: `${config.baseHeight}px`,
                  transform: `translateX(-50%) scale(${config.scale})`,
                  transformOrigin: 'top center'
                }}
              >
                {/* Full-size Hero Section */}
                <div className="relative h-[600px] bg-gradient-to-br from-[#002641] to-[#8d918d] flex flex-col items-center justify-end w-full">
                  {/* Cover Image */}
                  <div className="absolute inset-0">
                    <img
                      src={heroImg}
                      alt={`${name} cover`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-40"></div>
                  </div>

                  {/* Logo - Square with rounded corners */}
                  <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-1/2 z-30">
                    {logo ? (
                      <div className="w-44 h-44 rounded-2xl overflow-hidden shadow-lg ring-4 ring-white bg-white mx-auto">
                        <img
                          src={logo}
                          alt={`${name} logo`}
                          className="w-full h-full object-contain object-center"
                          style={{ borderRadius: '1rem' }}
                        />
                      </div>
                    ) : (
                      <div className="w-44 h-44 mx-auto">
                        <ListingAvatar name={name} size={176} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Info Box */}
                <div className="relative z-10 flex flex-col items-center w-full px-4">
                  <div className="mx-auto bg-white rounded-xl shadow-lg px-6 py-6 mt-24 max-w-2xl w-full flex flex-col items-center border border-gray-100">
                    {/* Business Type, Stars, Reviews */}
                    <div className="flex flex-col md:flex-row md:items-center md:space-x-4 mb-2 items-center justify-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#ed6437] text-white mb-2 md:mb-0">
                        {typeLabel(type)}
                      </span>
                      <div className="flex items-center space-x-1">
                        {renderStars(4.5)}
                        <span className="text-sm text-[#002641] ml-2">4.5 (34 reviews)</span>
                      </div>
                    </div>

                    {/* Business Name */}
                    <h1 className="text-4xl font-bold text-[#002641] text-center mb-1">{name || 'Your Business Name'}</h1>

                    {/* Slogan/Short Description */}
                    {slogan && (
                      <p className="text-base md:text-lg text-[#8d918d] text-center mb-4">
                        {slogan}
                      </p>
                    )}

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                      <BizButton variant="primary" className="w-full sm:w-auto">
                        Leave Review
                      </BizButton>
                      <BizButton variant="neutral" className="w-full sm:w-auto">
                        Get Quote
                      </BizButton>
                      <BizButton variant="secondary" className="w-full sm:w-auto">
                        Save
                      </BizButton>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
