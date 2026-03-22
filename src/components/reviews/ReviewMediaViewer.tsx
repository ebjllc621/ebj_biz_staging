/**
 * ReviewMediaViewer - Full-Screen Review Media Lightbox
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 7 - Review Media & Advanced Features
 * @governance Build Map v2.1 ENHANCED
 *
 * Adapted from src/features/listings/components/details/MediaLightbox.tsx.
 * Handles images, video file URLs, and video embeds (YouTube/Vimeo/Rumble).
 * Renders via portal for z-index isolation.
 * Keyboard: ESC closes, ArrowLeft/ArrowRight navigates.
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export interface ReviewMediaViewerProps {
  media: string[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

function isVideoEmbed(url: string): boolean {
  return /youtube\.com|youtu\.be|vimeo\.com|rumble\.com/i.test(url);
}

function isVideoFile(url: string): boolean {
  return /\.(mp4|webm|mov)$/i.test(url);
}

function getEmbedUrl(url: string): string {
  // YouTube
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([\w-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  // Rumble (embed URLs pass through unchanged; share URLs approximated)
  const rumbleMatch = url.match(/rumble\.com\/embed\/([\w-]+)/);
  if (rumbleMatch) return `https://rumble.com/embed/${rumbleMatch[1]}`;
  return url;
}

export function ReviewMediaViewer({
  media,
  currentIndex,
  onClose,
  onNavigate,
}: ReviewMediaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const current = media[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < media.length - 1;

  const goToPrev = useCallback(() => {
    if (hasPrev) onNavigate(currentIndex - 1);
  }, [hasPrev, currentIndex, onNavigate]);

  const goToNext = useCallback(() => {
    if (hasNext) onNavigate(currentIndex + 1);
  }, [hasNext, currentIndex, onNavigate]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
    },
    [onClose, goToPrev, goToNext]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    containerRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  if (!current) return null;

  const content = (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Review media viewer"
      tabIndex={-1}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90"
        onClick={onClose}
      />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white"
        aria-label="Close viewer"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Counter */}
      {media.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-black/50 text-white text-sm rounded-full">
          {currentIndex + 1} of {media.length}
        </div>
      )}

      {/* Previous */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); goToPrev(); }}
          className="absolute left-4 z-10 p-2 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Previous"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}

      {/* Next */}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); goToNext(); }}
          className="absolute right-4 z-10 p-2 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Next"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {/* Media content */}
      <div
        className="relative max-w-[90vw] max-h-[85vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {isVideoEmbed(current) ? (
          <iframe
            src={getEmbedUrl(current)}
            className="w-[min(90vw,900px)] aspect-video rounded-lg"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title={`Review video ${currentIndex + 1}`}
          />
        ) : isVideoFile(current) ? (
          <video
            src={current}
            controls
            className="max-w-[90vw] max-h-[85vh] rounded-lg"
          />
        ) : (
          <Image
            src={current}
            alt={`Review media ${currentIndex + 1}`}
            width={1200}
            height={800}
            className="max-w-[90vw] max-h-[85vh] object-contain"
            priority
          />
        )}
      </div>
    </div>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(content, document.body);
}

export default ReviewMediaViewer;
