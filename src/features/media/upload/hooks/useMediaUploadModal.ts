'use client';

/**
 * useMediaUploadModal - State machine hook for the universal media upload flow
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier ADVANCED
 * @phase Phase 2 - Universal Media Upload Modal
 *
 * Flow: idle -> file-selected -> cropping -> uploading -> complete -> error
 *
 * MANDATORY: ALL uploads use useUniversalMedia hook. NO direct API calls.
 * MANDATORY: Preview Object URLs cleaned up via URL.revokeObjectURL() in useEffect.
 * MANDATORY: Alt text required before crop/upload proceeds.
 */

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { useUniversalMedia } from '@core/hooks/useUniversalMedia';
import { generateSeoFilename, getFileExtension } from '../utils/seo-filename';
import type { UploadFlowState, UploadContext, SEOFields, MediaUploadResult } from '../types/upload-types';
import type { CropMetadata } from '@features/listings/components/NewListingModal/shared/ImageCropper';

// ============================================================================
// STATE MACHINE
// ============================================================================

type Action =
  | { type: 'FILE_SELECTED'; file: File; previewUrl: string }
  | { type: 'CLEAR_FILE' }
  | { type: 'OPEN_CROPPER' }
  | { type: 'CROP_APPLIED'; croppedDataUrl: string; cropMetadata: CropMetadata }
  | { type: 'CROP_CANCELLED' }
  | { type: 'UPLOAD_START' }
  | { type: 'UPLOAD_PROGRESS'; progress: number }
  | { type: 'UPLOAD_COMPLETE' }
  | { type: 'UPLOAD_ERROR'; message: string }
  | { type: 'RESET' };

function initialState(): UploadFlowState {
  return {
    step: 'idle',
    selectedFile: null,
    previewUrl: null,
    croppedDataUrl: null,
    cropMetadata: null,
    uploadProgress: 0,
    errorMessage: null,
  };
}

function reducer(state: UploadFlowState, action: Action): UploadFlowState {
  switch (action.type) {
    case 'FILE_SELECTED':
      return {
        ...initialState(),
        step: 'file-selected',
        selectedFile: action.file,
        previewUrl: action.previewUrl,
      };

    case 'CLEAR_FILE':
      return initialState();

    case 'OPEN_CROPPER':
      return { ...state, step: 'cropping' };

    case 'CROP_APPLIED':
      return {
        ...state,
        step: 'file-selected',
        croppedDataUrl: action.croppedDataUrl,
        cropMetadata: action.cropMetadata,
      };

    case 'CROP_CANCELLED':
      return { ...state, step: 'file-selected' };

    case 'UPLOAD_START':
      return { ...state, step: 'uploading', uploadProgress: 0, errorMessage: null };

    case 'UPLOAD_PROGRESS':
      return { ...state, uploadProgress: action.progress };

    case 'UPLOAD_COMPLETE':
      return { ...state, step: 'complete', uploadProgress: 100 };

    case 'UPLOAD_ERROR':
      return { ...state, step: 'error', errorMessage: action.message };

    case 'RESET':
      return initialState();

    default:
      return state;
  }
}

// ============================================================================
// HOOK INTERFACE
// ============================================================================

interface UseMediaUploadModalOptions {
  uploadContext: UploadContext;
  /** Called after a successful upload */
  onUploadComplete?: (_result: MediaUploadResult) => void;
  /** Whether the parent modal is currently open (drives reset on close) */
  isOpen: boolean;
}

interface UseMediaUploadModalResult {
  flowState: UploadFlowState;
  /** Whether the cropper sub-modal should be open */
  isCropperOpen: boolean;
  /** Handle file selected from UploadDropZone */
  handleFileSelect: (_file: File) => void;
  /** Clear the selected file and return to idle */
  handleClearFile: () => void;
  /** Open the cropper for the current file */
  handleOpenCropper: () => void;
  /** Receive cropped result from EnhancedImageCropperModal */
  handleCropApplied: (_croppedDataUrl: string, _metadata: CropMetadata) => void;
  /** User cancelled out of the cropper */
  handleCropCancelled: () => void;
  /** Trigger the actual upload (requires altText) */
  handleUpload: (_seoFields: SEOFields) => Promise<void>;
  /** Reset to idle state */
  handleReset: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useMediaUploadModal({
  uploadContext,
  onUploadComplete,
  isOpen,
}: UseMediaUploadModalOptions): UseMediaUploadModalResult {

  const [flowState, dispatch] = useReducer(reducer, undefined, initialState);

  // Track the current preview URL for revoking on cleanup
  const prevPreviewUrlRef = useRef<string | null>(null);

  // Set up the UMM hook — entity context from caller
  const { uploadMedia } = useUniversalMedia({
    entityType: uploadContext.entityType,
    entityId: uploadContext.entityId,
    mediaType: uploadContext.mediaType as Parameters<typeof useUniversalMedia>[0]['mediaType'],
    autoLoad: false,
  });

  // --------------------------------------------------------------------------
  // Object URL cleanup: revoke previous preview URL when it changes or unmounts
  // --------------------------------------------------------------------------

  useEffect(() => {
    const prev = prevPreviewUrlRef.current;
    const current = flowState.previewUrl;

    if (prev && prev !== current) {
      URL.revokeObjectURL(prev);
    }
    prevPreviewUrlRef.current = current;
  }, [flowState.previewUrl]);

  // Revoke on unmount
  useEffect(() => {
    return () => {
      if (prevPreviewUrlRef.current) {
        URL.revokeObjectURL(prevPreviewUrlRef.current);
        prevPreviewUrlRef.current = null;
      }
    };
  }, []);

  // --------------------------------------------------------------------------
  // Reset when modal closes
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (!isOpen) {
      dispatch({ type: 'RESET' });
    }
  }, [isOpen]);

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------

  const handleFileSelect = useCallback((file: File) => {
    const previewUrl = URL.createObjectURL(file);
    dispatch({ type: 'FILE_SELECTED', file, previewUrl });
  }, []);

  const handleClearFile = useCallback(() => {
    dispatch({ type: 'CLEAR_FILE' });
  }, []);

  const handleOpenCropper = useCallback(() => {
    dispatch({ type: 'OPEN_CROPPER' });
  }, []);

  const handleCropApplied = useCallback((croppedDataUrl: string, metadata: CropMetadata) => {
    dispatch({ type: 'CROP_APPLIED', croppedDataUrl, cropMetadata: metadata });
  }, []);

  const handleCropCancelled = useCallback(() => {
    dispatch({ type: 'CROP_CANCELLED' });
  }, []);

  const handleUpload = useCallback(
    async (seoFields: SEOFields) => {
      const { selectedFile, croppedDataUrl } = flowState;

      if (!selectedFile) return;
      if (!seoFields.altText.trim()) return;

      dispatch({ type: 'UPLOAD_START' });

      try {
        let fileToUpload: File;

        if (croppedDataUrl) {
          // Convert cropped data URL to File
          const response = await fetch(croppedDataUrl);
          const blob = await response.blob();
          const ext = getFileExtension(selectedFile.name, selectedFile.type);
          const seoFilename = generateSeoFilename(
            seoFields.altText,
            uploadContext.contextName,
            ext
          );
          fileToUpload = new File([blob], seoFilename, { type: blob.type || selectedFile.type });
        } else {
          // Use original file but rename to SEO filename
          const ext = getFileExtension(selectedFile.name, selectedFile.type);
          const seoFilename = generateSeoFilename(
            seoFields.altText,
            uploadContext.contextName,
            ext
          );
          fileToUpload = new File([selectedFile], seoFilename, { type: selectedFile.type });
        }

        dispatch({ type: 'UPLOAD_PROGRESS', progress: 30 });

        await uploadMedia(fileToUpload, {
          mediaType: uploadContext.mediaType as Parameters<typeof uploadMedia>[1]['mediaType'],
          altText: seoFields.altText.trim(),
          titleText: seoFields.titleText?.trim() || undefined,
          seoFilename: fileToUpload.name,
        } as Parameters<typeof uploadMedia>[1]);

        dispatch({ type: 'UPLOAD_PROGRESS', progress: 100 });
        dispatch({ type: 'UPLOAD_COMPLETE' });

        onUploadComplete?.({
          success: true,
          file: fileToUpload,
          seoFilename: fileToUpload.name,
          altText: seoFields.altText.trim(),
          titleText: seoFields.titleText?.trim() || undefined,
          cropMetadata: flowState.cropMetadata ?? undefined,
          previewUrl: flowState.croppedDataUrl ?? flowState.previewUrl ?? undefined,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Upload failed. Please try again.';
        dispatch({ type: 'UPLOAD_ERROR', message });

        onUploadComplete?.({ success: false, errorMessage: message });
      }
    },
    [flowState, uploadMedia, uploadContext, onUploadComplete]
  );

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  // --------------------------------------------------------------------------
  // Derived state
  // --------------------------------------------------------------------------

  const isCropperOpen = flowState.step === 'cropping';

  return {
    flowState,
    isCropperOpen,
    handleFileSelect,
    handleClearFile,
    handleOpenCropper,
    handleCropApplied,
    handleCropCancelled,
    handleUpload,
    handleReset,
  };
}
