// GOVERNANCE: React 18 hooks compliance
// GOVERNANCE: MediaService for all operations
// GOVERNANCE: Proper error handling and loading states
// PHASE 2.1: Universal Media Manager (UMM) Hook
// @compliance E2.6 - Updated types for provider-based MediaService

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MediaService,
  EntityMediaRelationship,
  UploadOptions,
  MediaFileWithRelationship,
} from '@core/services/media/MediaService';

interface UseUniversalMediaOptions {
  entityType: string;
  entityId: number;
  mediaType?: EntityMediaRelationship['media_type'];
  autoLoad?: boolean;
}

interface UseUniversalMediaResult {
  media: MediaFileWithRelationship[];
  primaryMedia: MediaFileWithRelationship | null;
  isLoading: boolean;
  error: Error | null;
  uploadMedia: (file: File, options: Partial<UploadOptions>) => Promise<void>;
  deleteMedia: (mediaId: number) => Promise<void>;
  reloadMedia: () => Promise<void>;
  getPrimaryMedia: (mediaType: EntityMediaRelationship['media_type']) => Promise<MediaFileWithRelationship | null>;
}

export function useUniversalMedia(options: UseUniversalMediaOptions): UseUniversalMediaResult {
  const [media, setMedia] = useState<MediaFileWithRelationship[]>([]);
  const [primaryMedia, setPrimaryMedia] = useState<MediaFileWithRelationship | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mediaService = new MediaService();

  const loadMedia = useCallback(async () => {
    if (!options.entityId) return;

    setIsLoading(true);
    setError(null);

    try {
      const results = await mediaService.getMediaForEntity({
        entityType: options.entityType,
        entityId: options.entityId,
        mediaType: options.mediaType
      });
      setMedia(results);

      // Set primary media if mediaType specified
      if (options.mediaType) {
        const primary = results.find(m => m.is_primary) || null;
        setPrimaryMedia(primary);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load media'));
    } finally {
      setIsLoading(false);
    }
  }, [options.entityType, options.entityId, options.mediaType]);

  useEffect(() => {
    if (options.autoLoad) {
      loadMedia();
    }
  }, [loadMedia, options.autoLoad]);

  const uploadMedia = useCallback(async (file: File, uploadOptions: Partial<UploadOptions>) => {
    setIsLoading(true);
    setError(null);

    try {
      const buffer = await file.arrayBuffer();
      await mediaService.uploadMedia({
        entityType: options.entityType as 'user' | 'document' | 'site' | 'listing' | 'offer' | 'event' | 'temporary' | 'marketing',
        entityId: options.entityId,
        mediaType: options.mediaType || 'gallery',
        file: Buffer.from(buffer),
        filename: file.name,
        mimeType: file.type,
        ...uploadOptions
      });
      await loadMedia();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to upload media'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [options.entityType, options.entityId, options.mediaType, loadMedia]);

  const deleteMedia = useCallback(async (mediaId: number) => {
    setIsLoading(true);
    setError(null);

    try {
      await mediaService.deleteMedia(mediaId);
      await loadMedia();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete media'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadMedia]);

  const getPrimaryMedia = useCallback(async (mediaType: EntityMediaRelationship['media_type']) => {
    try {
      return await mediaService.getPrimaryMedia(options.entityType, options.entityId, mediaType);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to get primary media'));
      return null;
    }
  }, [options.entityType, options.entityId]);

  return {
    media,
    primaryMedia,
    isLoading,
    error,
    uploadMedia,
    deleteMedia,
    reloadMedia: loadMedia,
    getPrimaryMedia
  };
}
