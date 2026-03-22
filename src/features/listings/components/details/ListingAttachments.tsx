/**
 * ListingAttachments - Downloadable Files and Documents
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 7 - Feature Component Enhancements
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Downloadable documents list
 * - File type icons (PDF, DOC, XLS, etc.)
 * - File size display
 * - Download count
 * - Categories: Brochures, Menus, Catalogs, Legal docs
 * - Empty state returns null
 *
 * @see docs/pages/layouts/listings/details/detailspageenhance/phases/PHASE_7_BRAIN_PLAN.md
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Paperclip, Download, FileText, FileSpreadsheet, File, Settings } from 'lucide-react';
import type { Listing } from '@core/services/ListingService';

interface Attachment {
  id: number;
  filename: string;
  display_name: string;
  file_type: string;
  file_size: number;
  category?: string;
  download_count: number;
  url: string;
  created_at: string;
}

interface ListingAttachmentsProps {
  /** Listing data */
  listing: Listing;
  /** Whether in edit mode */
  isEditing?: boolean;
}

/**
 * Get file type icon based on extension
 */
function getFileIcon(fileType: string) {
  const ext = fileType.toLowerCase();

  if (ext.includes('pdf')) {
    return FileText;
  }
  if (ext.includes('sheet') || ext.includes('xlsx') || ext.includes('xls') || ext.includes('csv')) {
    return FileSpreadsheet;
  }
  return File;
}

/**
 * Format file size
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ListingAttachments({ listing, isEditing }: ListingAttachmentsProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch attachments
  useEffect(() => {
    let isMounted = true;

    async function fetchAttachments() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/listings/${listing.id}/attachments`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch attachments');
        }

        const result = await response.json();
        if (isMounted && result.success) {
          setAttachments(result.data || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load attachments');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchAttachments();

    return () => {
      isMounted = false;
    };
  }, [listing.id]);

  // Show empty state in edit mode when no attachments
  if (isEditing && !isLoading && attachments.length === 0) {
    return (
      <section className="bg-white rounded-lg shadow-sm p-6 border-2 border-dashed border-gray-300">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <Paperclip className="w-6 h-6 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              Downloads & Attachments
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              No attachments yet. Upload brochures, menus, or other documents.
            </p>
            <Link
              href={`/dashboard/listings/${String(listing.id)}/attachments` as any}
              className="inline-flex items-center gap-2 px-4 py-2 bg-biz-navy text-white text-sm font-medium rounded-md hover:bg-biz-navy/90 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Configure
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Return null in published mode when no attachments
  if (!isLoading && attachments.length === 0) {
    return null;
  }

  return (
    <section className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-biz-navy flex items-center gap-2">
          <Paperclip className="w-5 h-5 text-biz-orange" />
          Downloads & Attachments
          {!isLoading && attachments.length > 0 && (
            <span className="text-sm font-normal text-gray-500">
              ({attachments.length})
            </span>
          )}
        </h2>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-4">
          {error}
        </div>
      )}

      {/* Attachments List */}
      {!isLoading && !error && attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const FileIcon = getFileIcon(attachment.file_type);

            return (
              <div
                key={attachment.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow flex items-center justify-between gap-4"
              >
                {/* File Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileIcon className="w-8 h-8 text-biz-orange flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {attachment.display_name}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span>{formatFileSize(attachment.file_size)}</span>
                      {attachment.download_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Download className="w-3 h-3" />
                          {attachment.download_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Download Button */}
                <a
                  href={attachment.url}
                  download={attachment.filename}
                  className="flex-shrink-0 px-4 py-2 bg-biz-orange text-white rounded-lg hover:bg-biz-orange/90 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
