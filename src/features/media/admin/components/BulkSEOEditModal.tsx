/**
 * BulkSEOEditModal - Spreadsheet-style bulk SEO metadata editing
 *
 * Presents a table with columns: Thumbnail | Filename + SEOHealthBadge | Alt Text | Title
 * Tracks edits per fileId. Changed rows highlighted bg-yellow-50.
 * Saves via /api/admin/media/seo PUT endpoint.
 *
 * @tier ADVANCED
 * @phase Phase 4B - Batch Operations + SEO + Context Menus
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { BizModal, BizModalButton } from '@/components/ui/BizModal';
import { SEOHealthBadge } from './SEOHealthBadge';
import { File, FileImage } from 'lucide-react';
import type { DirectoryEntry } from '@features/media/directory/types/directory-types';

// ============================================================================
// TYPES
// ============================================================================

export interface SEOUpdateEntry {
  fileId?: number;
  filePath: string;
  fileUrl?: string;
  altText: string;
  titleText: string;
}

export interface BulkSEOEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: DirectoryEntry[];
  onSave: (_updates: SEOUpdateEntry[]) => Promise<void>;
  isSaving?: boolean;
}

interface SEOEditState {
  altText: string;
  titleText: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function buildInitialState(files: DirectoryEntry[]): Map<string, SEOEditState> {
  const map = new Map<string, SEOEditState>();
  for (const file of files) {
    map.set(file.path, {
      altText: file.altText ?? '',
      titleText: file.titleText ?? '',
    });
  }
  return map;
}

function isImageFile(file: DirectoryEntry): boolean {
  return (file.mimeType ?? '').startsWith('image/');
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BulkSEOEditModal({
  isOpen,
  onClose,
  files,
  onSave,
  isSaving = false,
}: BulkSEOEditModalProps) {
  const [edits, setEdits] = useState<Map<string, SEOEditState>>(() => buildInitialState(files));

  // Note: edits are initialized from files via useState(() => buildInitialState(files))
  // and reset via the key prop pattern (BulkSEOEditModalWithReset)

  // Track which file paths have been modified from original
  const changedPaths = useMemo(() => {
    const changed = new Set<string>();
    for (const file of files) {
      const edit = edits.get(file.path);
      if (!edit) continue;
      const origAlt = file.altText ?? '';
      const origTitle = file.titleText ?? '';
      if (edit.altText !== origAlt || edit.titleText !== origTitle) {
        changed.add(file.path);
      }
    }
    return changed;
  }, [edits, files]);

  const handleAltChange = useCallback((filePath: string, value: string) => {
    setEdits((prev) => {
      const next = new Map(prev);
      const current = next.get(filePath) ?? { altText: '', titleText: '' };
      next.set(filePath, { ...current, altText: value });
      return next;
    });
  }, []);

  const handleTitleChange = useCallback((filePath: string, value: string) => {
    setEdits((prev) => {
      const next = new Map(prev);
      const current = next.get(filePath) ?? { altText: '', titleText: '' };
      next.set(filePath, { ...current, titleText: value });
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (changedPaths.size === 0 || isSaving) return;

    const updates: SEOUpdateEntry[] = [];
    for (const file of files) {
      if (!changedPaths.has(file.path)) continue;
      const edit = edits.get(file.path) ?? { altText: '', titleText: '' };
      updates.push({
        fileId: file.mediaFileId,
        filePath: file.path,
        fileUrl: file.url,
        altText: edit.altText,
        titleText: edit.titleText,
      });
    }

    await onSave(updates);
  }, [changedPaths, edits, files, isSaving, onSave]);

  const handleClose = useCallback(() => {
    if (!isSaving) {
      onClose();
    }
  }, [isSaving, onClose]);

  const title = `Edit SEO Metadata (${files.length} ${files.length === 1 ? 'file' : 'files'})`;

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      maxWidth="lg"
      closeOnBackdropClick={!isSaving}
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-sm text-gray-500">
            {changedPaths.size > 0 ? (
              <span className="text-orange-600 font-medium">{changedPaths.size} change{changedPaths.size !== 1 ? 's' : ''}</span>
            ) : (
              'No changes'
            )}
          </span>
          <div className="flex gap-3">
            <BizModalButton
              variant="secondary"
              onClick={handleClose}
              disabled={isSaving}
            >
              Cancel
            </BizModalButton>
            <BizModalButton
              variant="primary"
              onClick={() => void handleSave()}
              disabled={changedPaths.size === 0 || isSaving}
            >
              {isSaving ? 'Saving...' : 'Save All Changes'}
            </BizModalButton>
          </div>
        </div>
      }
    >
      {/* Reset edits on open - using key prop pattern via onOpen workaround */}
      <div className="space-y-3">
        <p className="text-xs text-gray-500">
          Edit alt text and title for each file. Changed rows are highlighted.
          Tab between fields to navigate.
        </p>

        {files.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">
            No files to edit
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="w-10 px-2 py-2" aria-label="Thumbnail" />
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    File
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Alt Text
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Title
                  </th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => {
                  const edit = edits.get(file.path) ?? { altText: '', titleText: '' };
                  const isChanged = changedPaths.has(file.path);

                  return (
                    <tr
                      key={file.path}
                      className={`border-b border-gray-100 ${isChanged ? 'bg-yellow-50' : 'hover:bg-gray-50'} transition-colors`}
                    >
                      {/* Thumbnail */}
                      <td className="w-10 px-2 py-2">
                        {isImageFile(file) && file.url ? (
                          // eslint-disable-next-line @next/next/no-img-element -- Admin thumbnail preview: external URLs not routed through next/image
                          <img
                            src={file.url}
                            alt={file.name}
                            className="w-8 h-8 object-cover rounded"
                            loading="lazy"
                          />
                        ) : (
                          isImageFile(file) ? (
                            <FileImage className="w-8 h-8 text-green-400" />
                          ) : (
                            <File className="w-8 h-8 text-gray-300" />
                          )
                        )}
                      </td>

                      {/* Filename + SEO badge */}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <SEOHealthBadge
                            altText={edit.altText}
                            titleText={edit.titleText}
                            size="sm"
                          />
                          <span
                            className="text-xs text-gray-700 truncate max-w-[140px]"
                            title={file.name}
                          >
                            {file.name}
                          </span>
                        </div>
                      </td>

                      {/* Alt Text input */}
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={edit.altText}
                          onChange={(e) => handleAltChange(file.path, e.target.value)}
                          placeholder="Describe the image..."
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                          aria-label={`Alt text for ${file.name}`}
                        />
                      </td>

                      {/* Title input */}
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={edit.titleText}
                          onChange={(e) => handleTitleChange(file.path, e.target.value)}
                          placeholder="Image title..."
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                          aria-label={`Title for ${file.name}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </BizModal>
  );
}

// Reset internal state when modal opens with new files
export function BulkSEOEditModalWithReset(props: BulkSEOEditModalProps) {
  return <BulkSEOEditModal key={props.isOpen ? 'open' : 'closed'} {...props} />;
}

export default BulkSEOEditModal;
