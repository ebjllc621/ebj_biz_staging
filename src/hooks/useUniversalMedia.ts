/**
 * useUniversalMedia - Client-side Media Management Hook
 *
 * React hook for Universal Media Manager operations.
 * Provides complete media management functionality with automatic loading,
 * upload handling, and state management.
 *
 * @authority Universal Media Manager compliance
 * @see .cursor/rules/universal-media-manager.mdc
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { MediaFile } from '@core/services/media';

interface UseUniversalMediaOptions {
  /** Entity type (listing, user, etc.) */
  entityType: string;
  /** Entity ID */
  entityId: string;
  /** Optional subfolder */
  subfolder?: string;
  /** Auto-load files on mount */
  autoLoad?: boolean;
  /** Maximum number of files to load */
  limit?: number;
  /** Polling interval for auto-refresh (ms) */
  pollInterval?: number;
}

interface UploadOptions {
  /** File to upload */
  file: File;
  /** Whether to generate thumbnail */
  generateThumbnail?: boolean;
  /** Progress callback */
  onProgress?: (progress: number) => void;
}

interface UseUniversalMediaReturn {
  /** Array of media files */
  media: MediaFile[];
  /** Primary (first) media file */
  primaryMedia: MediaFile | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  /** Upload progress (0-100) */
  uploadProgress: number;
  /** Whether upload is in progress */
  isUploading: boolean;

  // Actions
  /** Load/refresh media files */
  loadMedia: () => Promise<void>;
  /** Upload a new file */
  uploadMedia: (options: UploadOptions) => Promise<MediaFile>;
  /** Delete a file */
  deleteMedia: (fileId: string) => Promise<boolean>;
  /** Get primary media file */
  getPrimaryMedia: () => MediaFile | null;
  /** Clear error state */
  clearError: () => void;
  /** Reset all state */
  reset: () => void;
}

/**
 * Universal Media Manager Hook
 */
export function useUniversalMedia(options: UseUniversalMediaOptions): UseUniversalMediaReturn {
  const {
    entityType,
    entityId,
    subfolder,
    autoLoad = true,
    limit = 50,
    pollInterval,
  } = options;

  // State
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Load media files from API
   */
  const loadMedia = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      const params = new URLSearchParams({
        entityType,
        entityId,
        limit: limit.toString(),
      });

      if (subfolder) {
        params.append('subfolder', subfolder);
      }

      const response = await fetch(`/api/media/upload?${params}`, {
        method: 'GET',
        signal: abortControllerRef.current.signal,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to load media files');
      }

      setMedia(data.data.files || []);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Request was cancelled, don't set error
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to load media files';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [entityType, entityId, subfolder, limit]);

  /**
   * Upload a new media file
   */
  const uploadMedia = useCallback(async (uploadOptions: UploadOptions): Promise<MediaFile> => {
    const { file, generateThumbnail = true, onProgress } = uploadOptions;

    try {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);

      // Validate file
      if (!file || file.size === 0) {
        throw new Error('No file selected or file is empty');
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', entityType);
      formData.append('entityId', entityId);
      formData.append('generateThumbnail', generateThumbnail.toString());

      if (subfolder) {
        formData.append('subfolder', subfolder);
      }

      // Upload with progress tracking
      const uploadedFile = await uploadWithProgress(formData, (progress) => {
        setUploadProgress(progress);
        onProgress?.(progress);
      });

      // Refresh media list
      await loadMedia();

      return uploadedFile;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload file';
      setError(errorMessage);
      throw err;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [entityType, entityId, subfolder, loadMedia]);

  /**
   * Delete a media file
   */
  const deleteMedia = useCallback(async (fileId: string): Promise<boolean> => {
    try {
      setError(null);

      const params = new URLSearchParams({
        fileId,
        deleteThumbnail: 'true',
      });

      const response = await fetch(`/api/media/upload?${params}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to delete file');
      }

      // Remove from local state
      setMedia((prev) => prev.filter(file => file.id !== fileId));

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete file';
      setError(errorMessage);
      return false;
    }
  }, []);

  /**
   * Get primary media file (first/newest)
   */
  const getPrimaryMedia = useCallback((): MediaFile | null => {
    return media.length > 0 ? (media[0] ?? null) : null;
  }, [media]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setMedia([]);
    setError(null);
    setUploadProgress(0);
    setIsUploading(false);
    setIsLoading(false);

    // Cancel ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Auto-load on mount and dependency changes
  useEffect(() => {
    if (autoLoad && entityType && entityId) {
      loadMedia();
    }
  }, [autoLoad, entityType, entityId, subfolder, loadMedia]);

  // Setup polling
  useEffect(() => {
    if (pollInterval && pollInterval > 0) {
      pollIntervalRef.current = setInterval(() => {
        if (!isLoading && !isUploading) {
          loadMedia();
        }
      }, pollInterval);

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };
    }
  }, [pollInterval, isLoading, isUploading, loadMedia]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  return {
    media,
    primaryMedia: getPrimaryMedia(),
    isLoading,
    error,
    uploadProgress,
    isUploading,
    loadMedia,
    uploadMedia,
    deleteMedia,
    getPrimaryMedia,
    clearError,
    reset,
  };
}

/**
 * Upload file with progress tracking
 */
async function uploadWithProgress(
  formData: FormData,
  onProgress: (progress: number) => void
): Promise<MediaFile> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    // Handle completion
    xhr.addEventListener('load', async () => {
      try {
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText);
          if (data.success) {
            resolve(data.data.file);
          } else {
            reject(new Error(data.error?.message || 'Upload failed'));
          }
        } else {
          const errorData = JSON.parse(xhr.responseText).catch(() => null);
          reject(new Error(errorData?.error?.message || `Upload failed with status ${xhr.status}`));
        }
      } catch (err) {
        reject(new Error('Failed to parse upload response'));
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload was cancelled'));
    });

    // Start upload
    xhr.open('POST', '/api/media/upload');
    xhr.withCredentials = true;
    xhr.send(formData);
  });
}

export default useUniversalMedia;