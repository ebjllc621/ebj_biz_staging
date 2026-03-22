/**
 * ImageSEOEditModal - SEO Metadata Editor for a Single Media Item
 *
 * BizModal for editing alt_text and title_text on a single image.
 * Used in FeatureMediaView for per-item SEO editing.
 *
 * @tier STANDARD
 * @phase Phase 5 - Media Manager Lite (User Dashboard)
 */

'use client';

import React, { useState, useEffect } from 'react';
import BizModal, { BizModalButton } from '@/components/BizModal';

// ============================================================================
// TYPES
// ============================================================================

export interface ImageSEOEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  currentAltText: string;
  currentTitleText: string;
  onSave: (_altText: string, _titleText: string) => Promise<void>;
  isSaving: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ImageSEOEditModal({
  isOpen,
  onClose,
  imageUrl,
  currentAltText,
  currentTitleText,
  onSave,
  isSaving
}: ImageSEOEditModalProps) {
  const [altText, setAltText] = useState(currentAltText);
  const [titleText, setTitleText] = useState(currentTitleText);

  // Sync form values when modal opens/closes or props change
  useEffect(() => {
    if (isOpen) {
      setAltText(currentAltText);
      setTitleText(currentTitleText);
    }
  }, [isOpen, currentAltText, currentTitleText]);

  const handleSave = async () => {
    await onSave(altText, titleText);
  };

  const altTextLength = altText.length;
  const titleTextLength = titleText.length;
  const isValidAltText = altText.trim().length > 0;

  const footer = (
    <div className="flex justify-end gap-3">
      <BizModalButton variant="secondary" onClick={onClose} disabled={isSaving}>
        Cancel
      </BizModalButton>
      <BizModalButton
        variant="primary"
        onClick={handleSave}
        disabled={isSaving || !isValidAltText}
      >
        {isSaving ? 'Saving...' : 'Save SEO'}
      </BizModalButton>
    </div>
  );

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit SEO Metadata"
      maxWidth="md"
      closeOnBackdropClick={false}
      footer={footer}
    >
      <div className="space-y-5">
        {/* Image preview */}
        {imageUrl && (
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Media preview"
              className="max-h-40 max-w-full rounded-lg object-contain border border-gray-200"
            />
          </div>
        )}

        {/* Alt text field */}
        <div>
          <label
            htmlFor="seo-alt-text"
            className="block text-sm font-semibold text-gray-900 mb-1"
          >
            Alt text <span className="text-red-500">*</span>
          </label>
          <input
            id="seo-alt-text"
            type="text"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            disabled={isSaving}
            placeholder="Describe what is in this image..."
            maxLength={255}
            className={[
              'w-full rounded-md border px-3 py-2 text-sm text-gray-900 placeholder-gray-400',
              'focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent',
              'disabled:bg-gray-50 disabled:cursor-not-allowed',
              isValidAltText ? 'border-gray-300' : 'border-orange-300'
            ].join(' ')}
            aria-required="true"
            aria-describedby="seo-alt-hint"
          />
          <div className="flex items-center justify-between mt-1">
            <p id="seo-alt-hint" className="text-xs text-gray-500">
              Required. Used by screen readers and search engines.
            </p>
            <span className="text-xs text-gray-400">
              {altTextLength}/255
            </span>
          </div>
        </div>

        {/* Title text field */}
        <div>
          <label
            htmlFor="seo-title-text"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Title text{' '}
            <span className="text-xs font-normal text-gray-400">(optional, max 60 chars)</span>
          </label>
          <input
            id="seo-title-text"
            type="text"
            value={titleText}
            onChange={(e) => setTitleText(e.target.value)}
            disabled={isSaving}
            placeholder="Shown as tooltip on hover..."
            maxLength={60}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
          <div className="flex justify-end mt-1">
            <span className={`text-xs ${titleTextLength >= 55 ? 'text-amber-500' : 'text-gray-400'}`}>
              {titleTextLength}/60
            </span>
          </div>
        </div>
      </div>
    </BizModal>
  );
}

export default ImageSEOEditModal;
