/**
 * UnifiedMediaLightbox - Canonical lightbox for images and videos
 *
 * @deprecated Phase 8C - Superseded by PhotoSwipeLightbox.
 * Retained as internal fallback. Not exported from barrel files.
 * @see src/features/media/gallery/components/PhotoSwipeLightbox.tsx
 *
 * Supports images, embed providers (YouTube/Vimeo/etc), and direct video files.
 * Based on MediaLightbox pattern with extended video support.
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 8A - Gallery Display Standardization
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import { useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import type { UnifiedMediaLightboxProps, GalleryItem } from '../types/gallery-types';

export function UnifiedMediaLightbox({
  items,
  currentIndex,
  onClose,
  onNavigate,
  entityName
}: UnifiedMediaLightboxProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const goToPrevious = useCallback(() => {
    if (items.length === 0) return;
    onNavigate(currentIndex === 0 ? items.length - 1 : currentIndex - 1);
  }, [currentIndex, items.length, onNavigate]);

  const goToNext = useCallback(() => {
    if (items.length === 0) return;
    onNavigate(currentIndex === items.length - 1 ? 0 : currentIndex + 1);
  }, [currentIndex, items.length, onNavigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goToPrevious, goToNext]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  const currentItem: GalleryItem | undefined = items[currentIndex];
  if (!currentItem) return null;

  const isVideo = currentItem.type === 'video';
  const hasEmbed = isVideo && currentItem.embedUrl && currentItem.videoProvider !== 'direct';
  const isDirect = isVideo && currentItem.videoProvider === 'direct';

  const lightboxContent = (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`${entityName} gallery viewer`}
      tabIndex={-1}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90" onClick={handleBackdropClick} />

      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white"
        aria-label="Close gallery"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Previous */}
      {items.length > 1 && (
        <button
          onClick={goToPrevious}
          className="absolute left-4 z-10 p-2 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Previous item"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}

      {/* Next */}
      {items.length > 1 && (
        <button
          onClick={goToNext}
          className="absolute right-4 z-10 p-2 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Next item"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {/* Media Area */}
      <div className="relative max-w-[90vw] max-h-[85vh] flex flex-col items-center justify-center gap-3 z-10">
        {/* Image */}
        {!isVideo && (
          <div className="relative">
            <Image
              src={currentItem.url}
              alt={currentItem.alt}
              width={1200}
              height={800}
              className="max-w-full max-h-[85vh] object-contain"
              priority
            />
          </div>
        )}

        {/* Embedded Video (YouTube, Vimeo, Dailymotion, Rumble) */}
        {hasEmbed && (
          <div className="relative w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden">
            <iframe
              src={currentItem.embedUrl!}
              title={`${entityName} video`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        )}

        {/* Direct Video File */}
        {isDirect && (
          <div className="relative w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden">
            <video
              src={currentItem.embedUrl || currentItem.url}
              controls
              autoPlay
              className="w-full h-full"
            >
              <p className="text-white p-4">Your browser does not support video playback.</p>
            </video>
          </div>
        )}

        {/* Caption */}
        {currentItem.caption && (
          <p className="text-white/80 text-sm text-center max-w-lg">{currentItem.caption}</p>
        )}

        {/* Provider Badge + Open Original for videos */}
        {isVideo && currentItem.videoProvider && currentItem.videoProvider !== 'unknown' && (
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 bg-black/50 text-white text-xs rounded capitalize">
              {currentItem.videoProvider}
            </span>
            {currentItem.originalVideoUrl && (
              <a
                href={currentItem.originalVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-white/70 hover:text-white text-xs transition-colors"
              >
                Open original
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Counter */}
      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-black/50 text-white text-sm rounded-full">
          {currentIndex + 1} of {items.length}
        </div>
      )}
    </div>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(lightboxContent, document.body);
}

export default UnifiedMediaLightbox;
