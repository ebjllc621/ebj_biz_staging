'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import BizModal from '@/components/BizModal/BizModal';
import { X, Loader2, Upload, Link as LinkIcon, Film } from 'lucide-react';
import { fetchCsrfToken } from '@core/utils/csrf';
import { parseVideoUrl } from '@features/media/gallery';

// @tier STANDARD
// @phase Video Gallery Manager

/* eslint-disable no-unused-vars */
export interface VideoAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (videoUrls: string[]) => Promise<void>;
  isSubmitting: boolean;
  maxVideos: number;
  listingId: number | string;
}
/* eslint-enable no-unused-vars */

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ACCEPTED_VIDEO_TYPES = 'video/mp4,video/webm,video/quicktime';
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

export default function VideoAddModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  maxVideos,
  listingId,
}: VideoAddModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');

  // Upload tab state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  // URL tab state
  const [pendingUrls, setPendingUrls] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  // Shared state
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setActiveTab('upload');
    setSelectedFiles([]);
    setIsDragOver(false);
    setIsUploading(false);
    setUploadProgress(0);
    setUploadErrors([]);
    setPendingUrls([]);
    setUrlInput('');
    setUrlError(null);
    setValidationErrors([]);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

  const handleClose = useCallback(() => {
    if (isUploading || isSubmitting) return;
    onClose();
  }, [isUploading, isSubmitting, onClose]);

  const validateFiles = useCallback((files: File[]): { valid: File[]; errors: string[] } => {
    const valid: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type)) {
        errors.push(`"${file.name}" is not a supported video format (MP4, WebM, MOV only)`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        errors.push(`"${file.name}" exceeds the 100MB size limit (${formatFileSize(file.size)})`);
        continue;
      }
      valid.push(file);
    }

    return { valid, errors };
  }, []);

  const addFiles = useCallback(
    (newFiles: File[]) => {
      const { valid, errors } = validateFiles(newFiles);
      if (errors.length > 0) {
        setValidationErrors((prev) => [...prev, ...errors]);
      }
      if (valid.length > 0) {
        setSelectedFiles((prev) => {
          const existingNames = new Set(prev.map((f) => f.name));
          const unique = valid.filter((f) => !existingNames.has(f.name));
          return [...prev, ...unique];
        });
      }
    },
    [validateFiles]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(Array.from(e.target.files));
        e.target.value = '';
      }
    },
    [addFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        addFiles(files);
      }
    },
    [addFiles]
  );

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const isValidVideoUrl = useCallback((url: string): boolean => {
    try {
      const parsed = parseVideoUrl(url);
      if (parsed.provider !== 'unknown') return true;
      const lower = url.toLowerCase();
      return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov');
    } catch {
      return false;
    }
  }, []);

  const getProviderLabel = useCallback((url: string): string => {
    try {
      const parsed = parseVideoUrl(url);
      if (parsed.provider !== 'unknown') {
        return parsed.provider.charAt(0).toUpperCase() + parsed.provider.slice(1);
      }
    } catch {
      // fall through
    }
    return 'Direct URL';
  }, []);

  const handleAddUrl = useCallback(() => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setUrlError('Please enter a URL');
      return;
    }
    if (!isValidVideoUrl(trimmed)) {
      setUrlError('Invalid video URL. Supported: YouTube, Vimeo, TikTok, or direct .mp4/.webm/.mov links');
      return;
    }
    if (pendingUrls.includes(trimmed)) {
      setUrlError('This URL has already been added');
      return;
    }
    setPendingUrls((prev) => [...prev, trimmed]);
    setUrlInput('');
    setUrlError(null);
  }, [urlInput, isValidVideoUrl, pendingUrls]);

  const handleUrlInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddUrl();
      }
    },
    [handleAddUrl]
  );

  const removeUrl = useCallback((index: number) => {
    setPendingUrls((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const uploadFile = useCallback(
    async (file: File, csrfToken: string): Promise<string> => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', 'listings');
      formData.append('entityId', String(listingId));
      formData.append('mediaType', 'video-gallery');

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        headers: {
          'x-csrf-token': csrfToken,
        },
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Upload failed for "${file.name}"`);
      }

      const data = await response.json();
      // API returns { success, data: { file: { url, ... }, message } }
      const fileUrl = data?.data?.file?.url;
      if (!fileUrl) {
        throw new Error(`No URL returned for "${file.name}"`);
      }
      return fileUrl as string;
    },
    [listingId]
  );

  const handleSubmit = useCallback(async () => {
    if (isUploading || isSubmitting) return;

    const hasFiles = selectedFiles.length > 0;
    const hasUrls = pendingUrls.length > 0;

    if (!hasFiles && !hasUrls) {
      setValidationErrors(['Please add at least one video file or URL']);
      return;
    }

    setValidationErrors([]);
    setUploadErrors([]);

    const uploadedUrls: string[] = [];
    const errors: string[] = [];

    if (hasFiles) {
      setIsUploading(true);
      setUploadProgress(0);

      let csrfToken: string | null = '';
      try {
        csrfToken = await fetchCsrfToken();
        if (!csrfToken) {
          setUploadErrors(['Failed to get security token. Please try again.']);
          setIsUploading(false);
          return;
        }
      } catch {
        setUploadErrors(['Failed to get security token. Please try again.']);
        setIsUploading(false);
        return;
      }

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        if (!file) continue;
        try {
          const url = await uploadFile(file, csrfToken);
          uploadedUrls.push(url);
        } catch (err) {
          const message = err instanceof Error ? err.message : `Failed to upload "${file.name}"`;
          errors.push(message);
        }
        setUploadProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
      }

      setIsUploading(false);

      if (errors.length > 0) {
        setUploadErrors(errors);
        if (uploadedUrls.length === 0 && pendingUrls.length === 0) return;
      }
    }

    const allUrls = [...uploadedUrls, ...pendingUrls];

    if (allUrls.length === 0) return;

    try {
      await onSubmit(allUrls);
      resetState();
    } catch {
      setValidationErrors(['Failed to save videos. Please try again.']);
    }
  }, [
    isUploading,
    isSubmitting,
    selectedFiles,
    pendingUrls,
    uploadFile,
    onSubmit,
    resetState,
  ]);

  const totalCount = selectedFiles.length + pendingUrls.length;
  const canSubmit = totalCount > 0 && !isUploading && !isSubmitting;

  return (
    <BizModal isOpen={isOpen} onClose={handleClose} title="Add Videos" maxWidth="lg">
      <div className="flex flex-col gap-4">
        {/* Tab Switcher */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'upload'
                ? 'text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            style={activeTab === 'upload' ? { backgroundColor: '#ed6437' } : {}}
          >
            <Upload className="w-4 h-4" />
            Upload File
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'url'
                ? 'text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            style={activeTab === 'url' ? { backgroundColor: '#ed6437' } : {}}
          >
            <LinkIcon className="w-4 h-4" />
            Paste URL
          </button>
        </div>

        {/* Upload File Tab */}
        {activeTab === 'upload' && (
          <div className="flex flex-col gap-3">
            {/* Drag and Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragOver
                  ? 'border-orange-400 bg-orange-50'
                  : 'border-gray-300 hover:border-orange-400 hover:bg-gray-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_VIDEO_TYPES}
                multiple
                onChange={handleFileInputChange}
                className="hidden"
              />
              <Film className="w-10 h-10 mx-auto mb-3 text-gray-400" />
              <p className="text-sm font-medium text-gray-700 mb-1">
                {isDragOver ? 'Drop videos here' : 'Drag and drop videos here'}
              </p>
              <p className="text-xs text-gray-500 mb-2">or click to browse</p>
              <p className="text-xs text-gray-400">MP4, WebM, MOV — up to 100MB per file</p>
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-gray-700">
                  {selectedFiles.length} of {maxVideos} videos selected
                </p>
                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-md border border-gray-200"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Film className="w-4 h-4 text-gray-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-gray-700 truncate">{file.name}</p>
                          <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                        className="ml-2 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%`, backgroundColor: '#ed6437' }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Paste URL Tab */}
        {activeTab === 'url' && (
          <div className="flex flex-col gap-3">
            {/* URL Input */}
            <div className="flex gap-2">
              <div className="flex-1 flex flex-col gap-1">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => {
                    setUrlInput(e.target.value);
                    setUrlError(null);
                  }}
                  onKeyDown={handleUrlInputKeyDown}
                  placeholder="Paste YouTube, Vimeo, TikTok, or other video URL"
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                    urlError
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-gray-300 focus:ring-orange-200 focus:border-orange-400'
                  }`}
                />
                {urlError && (
                  <p className="text-xs text-red-500">{urlError}</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleAddUrl}
                className="px-4 py-2 text-sm font-medium text-white rounded-md transition-colors shrink-0"
                style={{ backgroundColor: '#ed6437' }}
              >
                Add
              </button>
            </div>

            {/* Pending URLs List */}
            {pendingUrls.length > 0 && (
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                {pendingUrls.map((url, index) => (
                  <div
                    key={`${url}-${index}`}
                    className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-md border border-gray-200"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <LinkIcon className="w-4 h-4 text-gray-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-500">
                          {getProviderLabel(url)}
                        </p>
                        <p className="text-sm text-gray-700 truncate">{url}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeUrl(index)}
                      className="ml-2 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                      aria-label="Remove URL"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {pendingUrls.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">
                No URLs added yet. Paste a video link and click Add.
              </p>
            )}
          </div>
        )}

        {/* Upload Errors */}
        {uploadErrors.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm font-medium text-red-700 mb-1">Some uploads failed:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {uploadErrors.map((err, i) => (
                <li key={i} className="text-xs text-red-600">{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            {validationErrors.map((err, i) => (
              <p key={i} className="text-sm text-red-600">{err}</p>
            ))}
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          {totalCount > 0 && (
            <p className="text-xs text-gray-500">
              {totalCount} video{totalCount !== 1 ? 's' : ''} ready to add
            </p>
          )}
          {totalCount === 0 && <div />}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isUploading || isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: canSubmit ? '#ed6437' : undefined }}
            >
              {(isUploading || isSubmitting) && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              {isUploading
                ? 'Uploading...'
                : isSubmitting
                ? 'Saving...'
                : 'Add Videos'}
            </button>
          </div>
        </div>
      </div>
    </BizModal>
  );
}
