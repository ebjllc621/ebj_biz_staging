/**
 * SocialLinksManager - Manage Social Media Links
 *
 * @description Edit social media platform links (Facebook, Instagram, Twitter, LinkedIn, TikTok, YouTube)
 * @component Client Component
 * @tier ADVANCED
 * @generated ComponentBuilder v3.0
 * @phase Phase 7 - Core Listing Manager Pages
 */
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Edit2, X, Check, AlertCircle, Facebook, Instagram, Twitter, Linkedin, Music, Youtube, Loader2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { useListingData } from '@features/dashboard/hooks/useListingData';
import { useListingUpdate } from '@features/dashboard/hooks/useListingUpdate';

interface SocialMediaLinks {
  facebook: string;
  instagram: string;
  twitter: string;
  linkedin: string;
  tiktok: string;
  youtube: string;
}

const SOCIAL_PLATFORMS = [
  { key: 'facebook' as const, label: 'Facebook', icon: Facebook, placeholder: 'https://facebook.com/yourbusiness' },
  { key: 'instagram' as const, label: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/yourbusiness' },
  { key: 'twitter' as const, label: 'Twitter', icon: Twitter, placeholder: 'https://twitter.com/yourbusiness' },
  { key: 'linkedin' as const, label: 'LinkedIn', icon: Linkedin, placeholder: 'https://linkedin.com/company/yourbusiness' },
  { key: 'tiktok' as const, label: 'TikTok', icon: Music, placeholder: 'https://tiktok.com/@yourbusiness' },
  { key: 'youtube' as const, label: 'YouTube', icon: Youtube, placeholder: 'https://youtube.com/@yourbusiness' },
];

const DEFAULT_SOCIAL: SocialMediaLinks = {
  facebook: '',
  instagram: '',
  twitter: '',
  linkedin: '',
  tiktok: '',
  youtube: ''
};

function SocialLinksManagerContent() {
  const { selectedListingId, refreshListings } = useListingContext();
  const { listing, isLoading: isLoadingData, error: loadError, refreshListing } = useListingData(selectedListingId);
  const { updateListing, isUpdating, error: updateError, clearError } = useListingUpdate(selectedListingId);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<SocialMediaLinks>(DEFAULT_SOCIAL);

  // Initialize from full listing data
  useEffect(() => {
    if (listing) {
      const social = listing.social_media || {};
      setFormData({
        facebook: social.facebook || '',
        instagram: social.instagram || '',
        twitter: social.twitter || '',
        linkedin: social.linkedin || '',
        tiktok: social.tiktok || '',
        youtube: social.youtube || ''
      });
    }
  }, [listing]);

  const handleEdit = useCallback(() => {
    clearError();
    setIsEditing(true);
  }, [clearError]);

  const handleCancel = useCallback(() => {
    if (listing) {
      const social = listing.social_media || {};
      setFormData({
        facebook: social.facebook || '',
        instagram: social.instagram || '',
        twitter: social.twitter || '',
        linkedin: social.linkedin || '',
        tiktok: social.tiktok || '',
        youtube: social.youtube || ''
      });
    }
    clearError();
    setIsEditing(false);
  }, [listing, clearError]);

  const handleSave = useCallback(async () => {
    try {
      await updateListing({
        social_media: formData
      });
      await refreshListing();
      await refreshListings();
      setIsEditing(false);
    } catch {
      // Error already set in hook
    }
  }, [formData, updateListing, refreshListing, refreshListings]);

  const handleChange = useCallback((platform: keyof SocialMediaLinks, value: string) => {
    setFormData({ ...formData, [platform]: value });
  }, [formData]);

  // Loading state
  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[#ed6437] animate-spin" />
      </div>
    );
  }

  // Error loading data
  if (loadError) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span>{loadError}</span>
        <button
          onClick={() => refreshListing()}
          className="ml-auto px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!listing) {
    return <div className="text-center py-8 text-gray-600">No listing selected</div>;
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Social Media Links</h2>
        {!isEditing ? (
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={isUpdating}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isUpdating}
              className="flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors disabled:opacity-50"
            >
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isUpdating ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Error Display */}
      {updateError && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{updateError}</span>
        </div>
      )}

      {/* View Mode */}
      {!isEditing ? (
        <div className="space-y-3">
          {SOCIAL_PLATFORMS.map((platform) => {
            const value = formData[platform.key];
            const Icon = platform.icon;

            return (
              <div key={platform.key} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                <Icon className="w-5 h-5 text-gray-400" />
                <div className="flex-1">
                  <span className="font-medium text-gray-700">{platform.label}</span>
                  <p className="text-sm text-gray-600 truncate">{value || 'Not set'}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Edit Mode
        <div className="space-y-4">
          {SOCIAL_PLATFORMS.map((platform) => {
            const Icon = platform.icon;

            return (
              <div key={platform.key}>
                <label htmlFor={platform.key} className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  {platform.label}
                </label>
                <input
                  type="url"
                  id={platform.key}
                  value={formData[platform.key]}
                  onChange={(e) => handleChange(platform.key, e.target.value)}
                  placeholder={platform.placeholder}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * SocialLinksManager - Wrapped with ErrorBoundary
 */
export function SocialLinksManager() {
  return (
    <ErrorBoundary componentName="SocialLinksManager">
      <SocialLinksManagerContent />
    </ErrorBoundary>
  );
}

export default SocialLinksManager;
