/**
 * SEOManager - Manage Listing SEO Settings
 *
 * @description Edit SEO settings: meta title, meta description
 * @component Client Component
 * @tier ADVANCED
 * @generated ComponentBuilder v3.0
 * @phase Phase 11 - Contact Info & SEO Management
 * @authority docs/pages/layouts/listings/details/userdash/MASTER_INDEX_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use ErrorBoundary (ADVANCED tier requirement)
 * - Orange theme (#ed6437) for edit/save buttons
 * - Inline editing pattern (view/edit toggle, no modal)
 * - Uses useListingData hook to fetch FULL listing data
 * - Uses useListingUpdate hook for mutations
 * - Refreshes data after save
 */
'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Edit2, X, Check, AlertCircle, Loader2, Search, FileText, Eye, Globe } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { useListingData } from '@features/dashboard/hooks/useListingData';
import { useListingUpdate } from '@features/dashboard/hooks/useListingUpdate';

// ============================================================================
// CONSTANTS
// ============================================================================

const META_TITLE_MAX_LENGTH = 60;  // Google truncates around 60 chars
const META_TITLE_IDEAL_MIN = 30;
const META_DESCRIPTION_MAX_LENGTH = 160; // Google truncates around 155-160 chars
const META_DESCRIPTION_IDEAL_MIN = 70;

// ============================================================================
// TYPES
// ============================================================================

interface SEOFormData {
  metaTitle: string;
  metaDescription: string;
}

type SEOScore = 'excellent' | 'good' | 'fair' | 'poor';

interface SEOAnalysis {
  titleScore: SEOScore;
  titleFeedback: string;
  descriptionScore: SEOScore;
  descriptionFeedback: string;
  overallScore: SEOScore;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Analyze SEO fields and provide feedback
 */
function analyzeSEO(title: string, description: string, businessName: string): SEOAnalysis {
  // Title analysis
  let titleScore: SEOScore = 'excellent';
  let titleFeedback = '';
  const titleLength = title.length;

  if (!title || titleLength === 0) {
    titleScore = 'poor';
    titleFeedback = 'No title set - will use business name as fallback';
  } else if (titleLength < META_TITLE_IDEAL_MIN) {
    titleScore = 'fair';
    titleFeedback = `Title is short (${titleLength}/${META_TITLE_MAX_LENGTH}). Consider adding more descriptive keywords.`;
  } else if (titleLength > META_TITLE_MAX_LENGTH) {
    titleScore = 'fair';
    titleFeedback = `Title may be truncated in search results (${titleLength}/${META_TITLE_MAX_LENGTH})`;
  } else {
    titleFeedback = `Good length (${titleLength}/${META_TITLE_MAX_LENGTH})`;
  }

  // Description analysis
  let descriptionScore: SEOScore = 'excellent';
  let descriptionFeedback = '';
  const descLength = description.length;

  if (!description || descLength === 0) {
    descriptionScore = 'poor';
    descriptionFeedback = 'No description set - will use business description as fallback';
  } else if (descLength < META_DESCRIPTION_IDEAL_MIN) {
    descriptionScore = 'fair';
    descriptionFeedback = `Description is short (${descLength}/${META_DESCRIPTION_MAX_LENGTH}). Add more detail to improve click-through rates.`;
  } else if (descLength > META_DESCRIPTION_MAX_LENGTH) {
    descriptionScore = 'fair';
    descriptionFeedback = `Description may be truncated (${descLength}/${META_DESCRIPTION_MAX_LENGTH})`;
  } else {
    descriptionFeedback = `Good length (${descLength}/${META_DESCRIPTION_MAX_LENGTH})`;
  }

  // Check if business name is included
  const firstWord = businessName.toLowerCase().split(' ')[0] || '';
  if (title && firstWord && !title.toLowerCase().includes(firstWord)) {
    if (titleScore === 'excellent') {
      titleScore = 'good';
      titleFeedback += ' Consider including your business name.';
    }
  }

  // Overall score
  const scores = [titleScore, descriptionScore];
  let overallScore: SEOScore = 'excellent';
  if (scores.includes('poor')) {
    overallScore = 'poor';
  } else if (scores.includes('fair')) {
    overallScore = 'fair';
  } else if (scores.includes('good')) {
    overallScore = 'good';
  }

  return {
    titleScore,
    titleFeedback,
    descriptionScore,
    descriptionFeedback,
    overallScore
  };
}

/**
 * Get color class for score
 */
function getScoreColor(score: SEOScore): string {
  switch (score) {
    case 'excellent':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'good':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'fair':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'poor':
      return 'text-red-600 bg-red-50 border-red-200';
  }
}

/**
 * Get character count color
 */
function getCharCountColor(current: number, max: number, idealMin: number): string {
  if (current === 0) return 'text-gray-400';
  if (current > max) return 'text-red-500';
  if (current < idealMin) return 'text-yellow-500';
  return 'text-green-500';
}

// ============================================================================
// COMPONENT
// ============================================================================

function SEOManagerContent() {
  const { selectedListingId, refreshListings } = useListingContext();
  const { listing, isLoading: isLoadingData, error: loadError, refreshListing } = useListingData(selectedListingId);
  const { updateListing, isUpdating, error: updateError, clearError } = useListingUpdate(selectedListingId);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<SEOFormData>({
    metaTitle: '',
    metaDescription: ''
  });

  // Initialize form data from full listing data (CANON 6)
  useEffect(() => {
    if (listing) {
      setFormData({
        metaTitle: listing.meta_title || '',
        metaDescription: listing.meta_description || ''
      });
    }
  }, [listing]);

  // Calculate SEO analysis
  const seoAnalysis = useMemo(() => {
    return analyzeSEO(
      formData.metaTitle,
      formData.metaDescription,
      listing?.name || ''
    );
  }, [formData.metaTitle, formData.metaDescription, listing?.name]);

  // Preview values (what will actually be shown in search)
  const previewTitle = formData.metaTitle || listing?.name || 'Business Name';
  const previewDescription = formData.metaDescription || listing?.description?.slice(0, 160) || 'Business description...';
  const previewUrl = listing?.slug ? `bizconekt.com/listings/${listing.slug}` : 'bizconekt.com/listings/...';

  const handleEdit = useCallback(() => {
    clearError();
    setIsEditing(true);
  }, [clearError]);

  const handleCancel = useCallback(() => {
    if (listing) {
      setFormData({
        metaTitle: listing.meta_title || '',
        metaDescription: listing.meta_description || ''
      });
    }
    clearError();
    setIsEditing(false);
  }, [listing, clearError]);

  const handleSave = useCallback(async () => {
    try {
      // Pass objects directly - CANON 3: No JSON.stringify in component
      await updateListing({
        meta_title: formData.metaTitle || undefined,
        meta_description: formData.metaDescription || undefined
      });

      await refreshListing();
      await refreshListings();
      setIsEditing(false);
    } catch {
      // Error already set in hook
    }
  }, [formData, updateListing, refreshListing, refreshListings]);

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
    return (
      <div className="text-center py-8 text-gray-600">
        No listing selected
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">SEO Settings</h2>
          <p className="text-sm text-gray-500 mt-1">
            Optimize how your listing appears in search engine results
          </p>
        </div>
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

      {/* SEO Score Overview */}
      <div className={`border rounded-lg p-4 ${getScoreColor(seoAnalysis.overallScore)}`}>
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5" />
          <div>
            <p className="font-medium capitalize">SEO Score: {seoAnalysis.overallScore}</p>
            <p className="text-sm opacity-80">
              {seoAnalysis.overallScore === 'excellent' && 'Your SEO settings are optimized for search engines'}
              {seoAnalysis.overallScore === 'good' && 'Your SEO settings are good with minor improvements possible'}
              {seoAnalysis.overallScore === 'fair' && 'Consider improving your SEO settings for better visibility'}
              {seoAnalysis.overallScore === 'poor' && 'SEO settings need attention to improve search visibility'}
            </p>
          </div>
        </div>
      </div>

      {/* Search Preview */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
          <Eye className="w-4 h-4" />
          <span>Search Result Preview</span>
        </div>
        <div className="border border-gray-100 rounded-lg p-4 bg-gray-50">
          {/* Google-style preview */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Globe className="w-4 h-4" />
              <span className="truncate">{previewUrl}</span>
            </div>
            <h3 className="text-xl text-blue-600 hover:underline cursor-pointer truncate">
              {previewTitle.length > 60 ? previewTitle.slice(0, 57) + '...' : previewTitle}
            </h3>
            <p className="text-sm text-gray-600 line-clamp-2">
              {previewDescription.length > 160 ? previewDescription.slice(0, 157) + '...' : previewDescription}
            </p>
          </div>
        </div>
      </div>

      {/* View/Edit Mode */}
      {!isEditing ? (
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {/* Meta Title */}
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-10 h-10 bg-[#ed6437]/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FileText className="w-5 h-5 text-[#ed6437]" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-500">Meta Title</label>
                  <p className="text-gray-900 mt-0.5">
                    {formData.metaTitle || <span className="text-gray-400 italic">Using business name: {listing.name}</span>}
                  </p>
                  <p className={`text-xs mt-1 ${getScoreColor(seoAnalysis.titleScore).split(' ')[0]}`}>
                    {seoAnalysis.titleFeedback}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Meta Description */}
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-10 h-10 bg-[#ed6437]/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Search className="w-5 h-5 text-[#ed6437]" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-500">Meta Description</label>
                  <p className="text-gray-900 mt-0.5">
                    {formData.metaDescription || (
                      <span className="text-gray-400 italic">
                        Using business description: {listing.description?.slice(0, 100)}...
                      </span>
                    )}
                  </p>
                  <p className={`text-xs mt-1 ${getScoreColor(seoAnalysis.descriptionScore).split(' ')[0]}`}>
                    {seoAnalysis.descriptionFeedback}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Edit Mode
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
          {/* Meta Title */}
          <div>
            <label htmlFor="metaTitle" className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" />
                Meta Title
              </span>
            </label>
            <input
              type="text"
              id="metaTitle"
              value={formData.metaTitle}
              onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
              placeholder={listing.name}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              maxLength={255}
            />
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className={`${getScoreColor(seoAnalysis.titleScore).split(' ')[0]}`}>
                {seoAnalysis.titleFeedback}
              </span>
              <span className={getCharCountColor(formData.metaTitle.length, META_TITLE_MAX_LENGTH, META_TITLE_IDEAL_MIN)}>
                {formData.metaTitle.length}/{META_TITLE_MAX_LENGTH}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              The title tag that appears in search results. Include your business name and main keywords.
            </p>
          </div>

          {/* Meta Description */}
          <div>
            <label htmlFor="metaDescription" className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-400" />
                Meta Description
              </span>
            </label>
            <textarea
              id="metaDescription"
              value={formData.metaDescription}
              onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
              placeholder="Describe your business in 160 characters or less..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent resize-none"
              rows={3}
              maxLength={500}
            />
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className={`${getScoreColor(seoAnalysis.descriptionScore).split(' ')[0]}`}>
                {seoAnalysis.descriptionFeedback}
              </span>
              <span className={getCharCountColor(formData.metaDescription.length, META_DESCRIPTION_MAX_LENGTH, META_DESCRIPTION_IDEAL_MIN)}>
                {formData.metaDescription.length}/{META_DESCRIPTION_MAX_LENGTH}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              A brief description of your listing that appears under the title in search results.
              Include a call-to-action to encourage clicks.
            </p>
          </div>

          {/* SEO Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">SEO Tips</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Include your business name and location in the title</li>
              <li>• Use action words in your description (e.g., &quot;Contact us&quot;, &quot;Book now&quot;)</li>
              <li>• Keep title under 60 characters to avoid truncation</li>
              <li>• Keep description between 70-160 characters for best results</li>
              <li>• Include relevant keywords naturally</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * SEOManager - Wrapped with ErrorBoundary
 */
export function SEOManager() {
  return (
    <ErrorBoundary componentName="SEOManager">
      <SEOManagerContent />
    </ErrorBoundary>
  );
}

export default SEOManager;
