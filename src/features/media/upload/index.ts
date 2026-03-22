/**
 * Universal Media Upload Modal - Barrel Export
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier ADVANCED
 * @phase Phase 2 - Universal Media Upload Modal
 */

// Components
export { default as UniversalMediaUploadModal } from './components/UniversalMediaUploadModal';
export { default as UploadDropZone } from './components/UploadDropZone';
export { default as FeatureTipsPanel } from './components/FeatureTipsPanel';

// Hooks
export { useMediaUploadModal } from './hooks/useMediaUploadModal';

// Utils
export { generateSeoFilename, getFileExtension } from './utils/seo-filename';

// Config
export { FEATURE_TIPS, getFeatureTip } from './config/feature-tips';

// Types
export type {
  UploadFlowState,
  UploadFlowStep,
  UploadContext,
  SEOFields,
  MediaUploadResult,
  FeatureTip,
} from './types/upload-types';
