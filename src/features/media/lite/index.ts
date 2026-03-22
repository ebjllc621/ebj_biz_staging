/**
 * Media Manager Lite - Barrel Export
 *
 * @phase Phase 5 - Media Manager Lite (User Dashboard)
 */

export { MediaManagerLiteModal } from './components/MediaManagerLiteModal';
export { FeatureCard, FeatureCardFromSummary } from './components/FeatureCard';
export { FeatureSelectorGrid } from './components/FeatureSelectorGrid';
export { FeatureMediaView } from './components/FeatureMediaView';
export { ImageSEOEditModal } from './components/ImageSEOEditModal';
export { useMediaManagerLite } from './hooks/useMediaManagerLite';
export { FEATURE_CONFIGS, getFeatureConfig, getFeatureTierLimit } from './config/feature-media-configs';

export type { MediaManagerLiteModalProps, MediaFeatureKey, FeatureConfig, FeatureMediaItem, FeatureSummary, MediaManagerLiteView } from './types/media-manager-lite-types';
