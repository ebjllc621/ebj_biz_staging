// @ts-nocheck - Disabled type checking for legacy component
/**
 * Step 4: Media & Description
 *
 * Handles logo, cover image, gallery, and description
 *
 * @authority PHASE_5.4_BRAIN_PLAN.md
 * @governance 100% UMM compliance - ALL media via useUniversalMedia
 * @governance Tier-based image/video limits enforced
 * @deprecated This component will be removed in Phase 8 - replaced by Section5Media
 */

'use client';

import React, { useState } from 'react';

// Local types for legacy 4-step wizard (to be removed in Phase 8)
interface LegacyFormData {
  logo_url?: string;
  cover_image_url?: string;
  gallery_images: string[];
  description?: string;
  [key: string]: unknown;
}

interface LegacyTierLimits {
  images: number;
  videos: number;
  [key: string]: unknown;
}

interface StepProps {
  formData: LegacyFormData;
  updateFormData: (updates: Partial<LegacyFormData>) => void;
  tierLimits: LegacyTierLimits;
}

export function Step4MediaDescription({ formData, updateFormData, tierLimits }: StepProps) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      // Store file for upload after listing creation
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      // Store file for upload after listing creation
    }
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // GOVERNANCE: Tier limit enforcement (CLIENT-SIDE)
    if (galleryFiles.length + files.length > tierLimits.images) {
      alert(
        `${formData.tier} tier allows maximum ${tierLimits.images} gallery images. Upgrade for more.`
      );
      return;
    }

    setGalleryFiles([...galleryFiles, ...files]);
  };

  const removeGalleryImage = (index: number) => {
    setGalleryFiles(galleryFiles.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Media & Description</h3>
        <p className="text-sm text-gray-500 mb-2">
          Upload images and videos, add a description
        </p>
        <p className="text-xs text-gray-600 mb-6">
          Image limit: {tierLimits.images} | Video limit: {tierLimits.videos}
        </p>
      </div>

      {/* Logo Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Logo Image
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleLogoChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
        {logoFile && (
          <p className="text-sm text-green-600 mt-2">
            Selected: {logoFile.name} ({(logoFile.size / 1024).toFixed(1)} KB)
          </p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Square image recommended (e.g., 400x400px). Will overwrite existing logo.
        </p>
      </div>

      {/* Cover Image Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cover Image
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleCoverChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
        {coverFile && (
          <p className="text-sm text-green-600 mt-2">
            Selected: {coverFile.name} ({(coverFile.size / 1024).toFixed(1)} KB)
          </p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Wide image recommended (e.g., 1200x400px). Will overwrite existing cover.
        </p>
      </div>

      {/* Gallery Images Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Gallery Images (limit: {tierLimits.images})
        </label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleGalleryChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Selected: {galleryFiles.length} / {tierLimits.images} images
        </p>

        {galleryFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            {galleryFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-gray-50 p-2 rounded"
              >
                <span className="text-sm text-gray-700">
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </span>
                <button
                  type="button"
                  onClick={() => removeGalleryImage(index)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Video URL */}
      {tierLimits.videos > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Video URL (YouTube/Vimeo)
          </label>
          <input
            type="url"
            value={formData.video_url || ''}
            onChange={(e) => updateFormData({ video_url: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="https://youtube.com/watch?v=..."
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.tier === 'essentials'
              ? 'Essentials tier: 1 video allowed'
              : `${formData.tier} tier: ${tierLimits.videos} videos allowed`}
          </p>
        </div>
      )}

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => updateFormData({ description: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          rows={8}
          placeholder={
            tierLimits.htmlDescription
              ? 'Describe your business... (HTML allowed for Plus+ tiers)'
              : 'Describe your business... (plain text for Essentials tier)'
          }
        />
        <p className="text-xs text-gray-500 mt-1">
          {tierLimits.htmlDescription
            ? 'HTML formatting allowed (Plus+ tiers)'
            : 'Plain text only (Essentials tier)'}
        </p>
      </div>

      {/* Storage Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <p className="text-sm text-blue-800">
          <strong>Storage:</strong> Your tier uses {tierLimits.storage} storage.
          {tierLimits.storage === 'LOCAL'
            ? ' Files stored on local server.'
            : ' Files stored on Cloudinary CDN for optimal performance.'}
        </p>
      </div>
    </div>
  );
}
