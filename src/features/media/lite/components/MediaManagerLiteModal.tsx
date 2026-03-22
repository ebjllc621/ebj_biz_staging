/**
 * MediaManagerLiteModal - Top-Level Media Manager Modal
 *
 * BizModal (maxWidth="4xl") with view-switching between:
 * - 'grid': FeatureSelectorGrid showing all 5 features
 * - 'feature': FeatureMediaView for the selected feature
 *
 * Uses useMediaManagerLite hook for all state management.
 *
 * @tier ADVANCED
 * @phase Phase 5 - Media Manager Lite (User Dashboard)
 */

'use client';

import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import BizModal, { BizModalButton } from '@/components/BizModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { FeatureSelectorGrid } from './FeatureSelectorGrid';
import { FeatureMediaView } from './FeatureMediaView';
import { useMediaManagerLite } from '../hooks/useMediaManagerLite';
import { FEATURE_CONFIGS } from '../config/feature-media-configs';
import type { MediaManagerLiteModalProps, MediaFeatureKey } from '../types/media-manager-lite-types';

// ============================================================================
// INNER COMPONENT
// ============================================================================

function MediaManagerLiteModalContent({
  isOpen,
  onClose,
  listingId
}: MediaManagerLiteModalProps) {
  const {
    currentView,
    selectedFeature,
    navigateToFeature,
    navigateToGrid,

    listing,
    isLoading,
    error,

    featureSummaries,
    featureMedia,
    isLoadingMedia,

    addMedia,
    removeMedia,
    reorderMedia,
    replaceMedia,
    updateMediaSEO,

    attachments,
    deleteAttachment,
    refreshAttachments,

    refreshListing,
    isUpdating,
    updateError,
    clearUpdateError
  } = useMediaManagerLite({ listingId });

  const tier = listing?.tier ?? 'essentials';

  // Resolve current feature config
  const currentFeatureConfig = selectedFeature
    ? FEATURE_CONFIGS.find(f => f.key === selectedFeature)
    : null;

  // Resolve current feature summary
  const currentSummary = selectedFeature
    ? featureSummaries.find(s => s.config.key === selectedFeature)
    : null;

  // --------------------------------------------------------------------------
  // MODAL TITLE
  // --------------------------------------------------------------------------

  const modalTitle = currentView === 'feature' && currentFeatureConfig
    ? currentFeatureConfig.label
    : 'Media Manager';

  // --------------------------------------------------------------------------
  // FOOTER
  // --------------------------------------------------------------------------

  const footer = (
    <div className="flex justify-end">
      <BizModalButton variant="secondary" onClick={onClose}>
        Close
      </BizModalButton>
    </div>
  );

  // --------------------------------------------------------------------------
  // BODY CONTENT
  // --------------------------------------------------------------------------

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-[#ed6437] animate-spin" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-sm">Failed to load listing data</p>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => void refreshListing()}
            className="text-sm text-red-600 hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      );
    }

    if (!listing) return null;

    // Grid view
    if (currentView === 'grid') {
      return (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Manage all media for <span className="font-medium text-gray-900">{listing.name}</span>
          </p>
          <FeatureSelectorGrid
            summaries={featureSummaries}
            onSelectFeature={(key: MediaFeatureKey) => navigateToFeature(key)}
            tier={tier}
          />
        </div>
      );
    }

    // Feature view
    if (currentView === 'feature' && currentFeatureConfig && currentSummary) {
      return (
        <FeatureMediaView
          config={currentFeatureConfig}
          items={featureMedia}
          attachments={attachments}
          isLoading={isLoadingMedia}
          currentCount={currentSummary.currentCount}
          maxCount={currentSummary.maxCount}
          tier={tier}
          listingId={listingId}
          listingName={listing.name}
          onBack={navigateToGrid}
          onAddMedia={(url) => addMedia(currentFeatureConfig.key, url)}
          onRemoveMedia={(itemId) => removeMedia(currentFeatureConfig.key, itemId)}
          onReorderMedia={(ids) => reorderMedia(currentFeatureConfig.key, ids)}
          onReplaceMedia={(url) => replaceMedia(currentFeatureConfig.key, url)}
          updateMediaSEO={updateMediaSEO}
          onDeleteAttachment={deleteAttachment}
          onRefresh={async () => {
            if (currentFeatureConfig.storagePattern === 'table') {
              await refreshAttachments();
            } else {
              await refreshListing();
            }
          }}
          isUpdating={isUpdating}
          updateError={updateError}
          clearUpdateError={clearUpdateError}
        />
      );
    }

    return null;
  };

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      maxWidth="4xl"
      closeOnBackdropClick={false}
      footer={footer}
    >
      {renderBody()}
    </BizModal>
  );
}

/**
 * MediaManagerLiteModal - Wrapped with ErrorBoundary (ADVANCED tier requirement)
 */
export function MediaManagerLiteModal(props: MediaManagerLiteModalProps) {
  return (
    <ErrorBoundary componentName="MediaManagerLiteModal">
      <MediaManagerLiteModalContent {...props} />
    </ErrorBoundary>
  );
}

export default MediaManagerLiteModal;
