/**
 * useMediaUploadModal hook tests
 *
 * @tier ADVANCED
 * @phase Phase 7a - Unit Tests
 * @authority docs/media/galleryformat/phases/PHASE_7_UI_TESTING_INTEGRATION_BRAIN_PLAN.md
 * @target 70%+ coverage
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useMediaUploadModal } from '../useMediaUploadModal';
import type { UploadContext, SEOFields } from '../../types/upload-types';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@core/hooks/useUniversalMedia', () => ({
  useUniversalMedia: vi.fn(() => ({
    uploadMedia: vi.fn().mockResolvedValue({ id: 1, url: 'https://example.com/test.jpg' }),
    media: [],
    isLoading: false,
  })),
}));

vi.mock('../../utils/seo-filename', () => ({
  generateSeoFilename: vi.fn((_alt: string, _ctx: string | undefined, ext: string | undefined) =>
    `test-seo-filename.${ext ?? 'jpg'}`
  ),
  getFileExtension: vi.fn(() => 'jpg'),
}));

// ---------------------------------------------------------------------------
// Global URL method mocks
// ---------------------------------------------------------------------------

const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();

global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

// ---------------------------------------------------------------------------
// Default test context
// ---------------------------------------------------------------------------

const defaultContext: UploadContext = {
  entityType: 'listing',
  entityId: 42,
  mediaType: 'gallery',
  contextName: 'Test Listing',
};

function renderUploadHook(overrides: Partial<{ isOpen: boolean; context: UploadContext }> = {}) {
  const context = overrides.context ?? defaultContext;
  const isOpen = overrides.isOpen ?? true;

  return renderHook(() =>
    useMediaUploadModal({
      uploadContext: context,
      isOpen,
      onUploadComplete: vi.fn(),
    })
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useMediaUploadModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateObjectURL.mockReturnValue('blob:mock-url');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial state', () => {
    it('should start in idle step', () => {
      const { result } = renderUploadHook();
      expect(result.current.flowState.step).toBe('idle');
    });

    it('should have null selectedFile initially', () => {
      const { result } = renderUploadHook();
      expect(result.current.flowState.selectedFile).toBeNull();
    });

    it('should have null previewUrl initially', () => {
      const { result } = renderUploadHook();
      expect(result.current.flowState.previewUrl).toBeNull();
    });

    it('should have null croppedDataUrl initially', () => {
      const { result } = renderUploadHook();
      expect(result.current.flowState.croppedDataUrl).toBeNull();
    });

    it('should have null errorMessage initially', () => {
      const { result } = renderUploadHook();
      expect(result.current.flowState.errorMessage).toBeNull();
    });

    it('should have uploadProgress 0 initially', () => {
      const { result } = renderUploadHook();
      expect(result.current.flowState.uploadProgress).toBe(0);
    });

    it('should have isCropperOpen false initially', () => {
      const { result } = renderUploadHook();
      expect(result.current.isCropperOpen).toBe(false);
    });
  });

  describe('handleFileSelect', () => {
    it('should transition to file-selected step', () => {
      const { result } = renderUploadHook();
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      act(() => {
        result.current.handleFileSelect(file);
      });

      expect(result.current.flowState.step).toBe('file-selected');
    });

    it('should set selectedFile', () => {
      const { result } = renderUploadHook();
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      act(() => {
        result.current.handleFileSelect(file);
      });

      expect(result.current.flowState.selectedFile).toBe(file);
    });

    it('should create and set previewUrl via URL.createObjectURL', () => {
      const { result } = renderUploadHook();
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      act(() => {
        result.current.handleFileSelect(file);
      });

      expect(mockCreateObjectURL).toHaveBeenCalledWith(file);
      expect(result.current.flowState.previewUrl).toBe('blob:mock-url');
    });

    it('should reset croppedDataUrl from any previous state', () => {
      const { result } = renderUploadHook();
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      act(() => {
        result.current.handleFileSelect(file);
      });
      act(() => {
        result.current.handleOpenCropper();
      });
      act(() => {
        result.current.handleCropApplied('data:image/jpeg;base64,abc', { width: 100, height: 100, x: 0, y: 0 });
      });

      // Select a new file - should reset cropped data
      const file2 = new File(['content2'], 'test2.jpg', { type: 'image/jpeg' });
      act(() => {
        result.current.handleFileSelect(file2);
      });

      expect(result.current.flowState.croppedDataUrl).toBeNull();
    });
  });

  describe('handleClearFile', () => {
    it('should return to idle step', () => {
      const { result } = renderUploadHook();
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      act(() => {
        result.current.handleFileSelect(file);
      });
      act(() => {
        result.current.handleClearFile();
      });

      expect(result.current.flowState.step).toBe('idle');
    });

    it('should clear selectedFile', () => {
      const { result } = renderUploadHook();
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      act(() => {
        result.current.handleFileSelect(file);
      });
      act(() => {
        result.current.handleClearFile();
      });

      expect(result.current.flowState.selectedFile).toBeNull();
    });

    it('should clear previewUrl', () => {
      const { result } = renderUploadHook();
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      act(() => {
        result.current.handleFileSelect(file);
      });
      act(() => {
        result.current.handleClearFile();
      });

      expect(result.current.flowState.previewUrl).toBeNull();
    });
  });

  describe('handleOpenCropper', () => {
    it('should transition to cropping step', () => {
      const { result } = renderUploadHook();
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      act(() => {
        result.current.handleFileSelect(file);
      });
      act(() => {
        result.current.handleOpenCropper();
      });

      expect(result.current.flowState.step).toBe('cropping');
    });

    it('should set isCropperOpen to true', () => {
      const { result } = renderUploadHook();
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      act(() => {
        result.current.handleFileSelect(file);
      });
      act(() => {
        result.current.handleOpenCropper();
      });

      expect(result.current.isCropperOpen).toBe(true);
    });
  });

  describe('handleCropApplied', () => {
    it('should return to file-selected step after crop', () => {
      const { result } = renderUploadHook();
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      act(() => { result.current.handleFileSelect(file); });
      act(() => { result.current.handleOpenCropper(); });
      act(() => {
        result.current.handleCropApplied('data:image/jpeg;base64,abc', { width: 100, height: 100, x: 0, y: 0 });
      });

      expect(result.current.flowState.step).toBe('file-selected');
    });

    it('should set croppedDataUrl', () => {
      const { result } = renderUploadHook();
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      act(() => { result.current.handleFileSelect(file); });
      act(() => { result.current.handleOpenCropper(); });
      act(() => {
        result.current.handleCropApplied('data:image/jpeg;base64,abc', { width: 100, height: 100, x: 0, y: 0 });
      });

      expect(result.current.flowState.croppedDataUrl).toBe('data:image/jpeg;base64,abc');
    });

    it('should set isCropperOpen to false after crop applied', () => {
      const { result } = renderUploadHook();
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      act(() => { result.current.handleFileSelect(file); });
      act(() => { result.current.handleOpenCropper(); });
      act(() => {
        result.current.handleCropApplied('data:image/jpeg;base64,abc', { width: 100, height: 100, x: 0, y: 0 });
      });

      expect(result.current.isCropperOpen).toBe(false);
    });
  });

  describe('handleCropCancelled', () => {
    it('should return to file-selected step after crop cancel', () => {
      const { result } = renderUploadHook();
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      act(() => { result.current.handleFileSelect(file); });
      act(() => { result.current.handleOpenCropper(); });
      act(() => { result.current.handleCropCancelled(); });

      expect(result.current.flowState.step).toBe('file-selected');
    });

    it('should set isCropperOpen to false after cancel', () => {
      const { result } = renderUploadHook();
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      act(() => { result.current.handleFileSelect(file); });
      act(() => { result.current.handleOpenCropper(); });
      act(() => { result.current.handleCropCancelled(); });

      expect(result.current.isCropperOpen).toBe(false);
    });

    it('should keep croppedDataUrl null after cancel (no crop was applied)', () => {
      const { result } = renderUploadHook();
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      act(() => { result.current.handleFileSelect(file); });
      act(() => { result.current.handleOpenCropper(); });
      act(() => { result.current.handleCropCancelled(); });

      expect(result.current.flowState.croppedDataUrl).toBeNull();
    });
  });

  describe('handleUpload', () => {
    it('should not change state when no file is selected', async () => {
      const { result } = renderUploadHook();
      const seoFields: SEOFields = { altText: 'A description', titleText: '' };

      await act(async () => {
        await result.current.handleUpload(seoFields);
      });

      expect(result.current.flowState.step).toBe('idle');
    });

    it('should not change state when altText is empty', async () => {
      const { result } = renderUploadHook();
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      act(() => { result.current.handleFileSelect(file); });

      const seoFields: SEOFields = { altText: '   ', titleText: '' };

      await act(async () => {
        await result.current.handleUpload(seoFields);
      });

      expect(result.current.flowState.step).toBe('file-selected');
    });

    it('should transition to complete after successful upload', async () => {
      const { result } = renderUploadHook();
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      act(() => { result.current.handleFileSelect(file); });

      const seoFields: SEOFields = { altText: 'A beautiful photo', titleText: 'Gallery image' };

      await act(async () => {
        await result.current.handleUpload(seoFields);
      });

      expect(result.current.flowState.step).toBe('complete');
    });

    it('should set uploadProgress to 100 on complete', async () => {
      const { result } = renderUploadHook();
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      act(() => { result.current.handleFileSelect(file); });

      await act(async () => {
        await result.current.handleUpload({ altText: 'Description', titleText: '' });
      });

      expect(result.current.flowState.uploadProgress).toBe(100);
    });

    it('should transition to error when uploadMedia throws', async () => {
      // Override the module-level uploadMedia mock to reject for this test
      const { useUniversalMedia } = await import('@core/hooks/useUniversalMedia');
      const throwingUploadMedia = vi.fn().mockRejectedValue(new Error('Network error'));
      (useUniversalMedia as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        uploadMedia: throwingUploadMedia,
        media: [],
        isLoading: false,
      }));

      const { result } = renderHook(() =>
        useMediaUploadModal({
          uploadContext: defaultContext,
          isOpen: true,
        })
      );

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      act(() => { result.current.handleFileSelect(file); });

      await act(async () => {
        await result.current.handleUpload({ altText: 'Description', titleText: '' });
      });

      expect(result.current.flowState.step).toBe('error');
      expect(result.current.flowState.errorMessage).toBe('Network error');

      // Restore default mock for subsequent tests
      (useUniversalMedia as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        uploadMedia: vi.fn().mockResolvedValue({ id: 1, url: 'https://example.com/test.jpg' }),
        media: [],
        isLoading: false,
      }));
    });
  });

  describe('handleReset', () => {
    it('should return to idle from any state', () => {
      const { result } = renderUploadHook();
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      act(() => { result.current.handleFileSelect(file); });
      act(() => { result.current.handleReset(); });

      expect(result.current.flowState.step).toBe('idle');
    });

    it('should clear selectedFile on reset', () => {
      const { result } = renderUploadHook();
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      act(() => { result.current.handleFileSelect(file); });
      act(() => { result.current.handleReset(); });

      expect(result.current.flowState.selectedFile).toBeNull();
    });
  });

  describe('isOpen behavior', () => {
    it('should reset to idle when isOpen transitions to false', () => {
      const { result, rerender } = renderHook(
        ({ isOpen }: { isOpen: boolean }) =>
          useMediaUploadModal({
            uploadContext: defaultContext,
            isOpen,
          }),
        { initialProps: { isOpen: true } }
      );

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      act(() => { result.current.handleFileSelect(file); });
      expect(result.current.flowState.step).toBe('file-selected');

      rerender({ isOpen: false });

      expect(result.current.flowState.step).toBe('idle');
    });
  });

  describe('URL cleanup', () => {
    it('should call URL.revokeObjectURL when previewUrl changes', () => {
      const { result } = renderUploadHook();
      const file1 = new File(['content1'], 'test1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['content2'], 'test2.jpg', { type: 'image/jpeg' });

      mockCreateObjectURL
        .mockReturnValueOnce('blob:url-1')
        .mockReturnValueOnce('blob:url-2');

      act(() => { result.current.handleFileSelect(file1); });
      act(() => { result.current.handleFileSelect(file2); });

      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:url-1');
    });
  });
});
