/**
 * Media Services Module
 * Unified exports for media handling services
 *
 * @authority universal-media-manager.mdc
 * @compliance E2.5 - Service Location Migration
 */

// Core service
export { MediaService, getMediaService } from './MediaService';
export type { MediaServiceConfig } from './MediaService';

// Types and interfaces
export type {
  IMediaProvider,
  MediaUploadOptions,
  MediaFile,
  MediaListOptions,
  MediaDeleteOptions,
  MediaProviderType,
  MediaProviderConfig
} from './types';

// Supporting services
export { PolicyRouter, getPolicyRouter } from './PolicyRouter';
export { MirrorService, getMirrorService } from './MirrorService';

// Providers
export { LocalMediaProvider } from './providers/LocalMediaProvider';
export type { LocalMediaProviderConfig } from './providers/LocalMediaProvider';
export { CloudinaryMediaProvider } from './providers/CloudinaryMediaProvider';
export type { CloudinaryMediaProviderConfig } from './providers/CloudinaryMediaProvider';
