/**
 * MediaLightbox - Fullscreen Image Viewer
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4 - Gallery & Media
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Fullscreen overlay with dark backdrop
 * - Previous/Next navigation with arrows
 * - Keyboard navigation (Arrow keys, ESC)
 * - Image counter (1 of N)
 * - Close button
 * - Click outside to close
 * - Accessible focus management
 * - Portal rendering for z-index isolation
 *
 * @see docs/pages/layouts/listings/details/phases/PHASE_4_BRAIN_PLAN.md
 */
'use client';

import { useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';

interface LightboxImage {
  url: string;
  alt: string;
}

interface MediaLightboxProps {
  /** Array of images to display */
  images: LightboxImage[];
  /** Current image index */
  currentIndex: number;
  /** Callback when lightbox should close */
  onClose: () => void;
  /** Callback when navigating to different image */
  onNavigate: (_index: number) => void;
  /** Listing name for accessibility */
  listingName: string;
}

export function MediaLightbox({
  images,
  currentIndex,
  onClose,
  onNavigate,
  listingName
}: MediaLightboxProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Navigate to previous image
  const goToPrevious = useCallback(() => {
    if (images.length === 0) return;
    const newIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
    onNavigate(newIndex);
  }, [currentIndex, images.length, onNavigate]);

  // Navigate to next image
  const goToNext = useCallback(() => {
    if (images.length === 0) return;
    const newIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1;
    onNavigate(newIndex);
  }, [currentIndex, images.length, onNavigate]);

  // Keyboard navigation
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

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Focus trap
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const currentImage = images[currentIndex];
  if (!currentImage) return null;

  const lightboxContent = (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`${listingName} gallery viewer`}
      tabIndex={-1}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90"
        onClick={handleBackdropClick}
      />

      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white"
        aria-label="Close gallery"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Previous Button */}
      {images.length > 1 && (
        <button
          onClick={goToPrevious}
          className="absolute left-4 z-10 p-2 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Previous image"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}

      {/* Next Button */}
      {images.length > 1 && (
        <button
          onClick={goToNext}
          className="absolute right-4 z-10 p-2 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Next image"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {/* Image Container */}
      <div className="relative max-w-[90vw] max-h-[85vh] flex items-center justify-center">
        <Image
          src={currentImage.url}
          alt={currentImage.alt}
          width={1200}
          height={800}
          className="max-w-full max-h-[85vh] object-contain"
          priority
        />
      </div>

      {/* Image Counter */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-black/50 text-white text-sm rounded-full">
          {currentIndex + 1} of {images.length}
        </div>
      )}
    </div>
  );

  // Render via portal for z-index isolation
  if (typeof window === 'undefined') return null;
  return createPortal(lightboxContent, document.body);
}

export default MediaLightbox;
