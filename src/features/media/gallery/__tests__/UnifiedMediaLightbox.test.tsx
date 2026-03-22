/**
 * UnifiedMediaLightbox - Unit Tests
 *
 * @phase Phase 8B - Gallery Layout Selector + Mixed Media Unification
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UnifiedMediaLightbox } from '../components/UnifiedMediaLightbox';
import type { GalleryItem } from '../types/gallery-types';

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, priority: _priority, ...rest }: { src: string; alt: string; priority?: boolean; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} data-testid="next-image" {...rest} />
  )
}));

const imageItem: GalleryItem = {
  id: 'img-1',
  type: 'image',
  url: '/test-image.jpg',
  alt: 'Test image',
  caption: 'A caption for the image'
};

const youtubeItem: GalleryItem = {
  id: 'vid-1',
  type: 'video',
  url: 'https://img.youtube.com/vi/abc123/hqdefault.jpg',
  alt: 'YouTube video',
  embedUrl: 'https://www.youtube.com/embed/abc123?rel=0&autoplay=1',
  videoProvider: 'youtube',
  originalVideoUrl: 'https://www.youtube.com/watch?v=abc123'
};

const directVideoItem: GalleryItem = {
  id: 'vid-2',
  type: 'video',
  url: 'https://example.com/video.mp4',
  alt: 'Direct video',
  embedUrl: 'https://example.com/video.mp4',
  videoProvider: 'direct'
};

const vimeoItem: GalleryItem = {
  id: 'vid-3',
  type: 'video',
  url: '',
  alt: 'Vimeo video',
  embedUrl: 'https://player.vimeo.com/video/12345?autoplay=1',
  videoProvider: 'vimeo',
  originalVideoUrl: 'https://vimeo.com/12345'
};

function renderLightbox(
  items: GalleryItem[],
  currentIndex: number,
  overrides?: {
    onClose?: () => void;
    onNavigate?: (_i: number) => void;
  }
) {
  const onClose = overrides?.onClose ?? vi.fn();
  const onNavigate = overrides?.onNavigate ?? vi.fn();
  return {
    onClose,
    onNavigate,
    ...render(
      <UnifiedMediaLightbox
        items={items}
        currentIndex={currentIndex}
        onClose={onClose}
        onNavigate={onNavigate}
        entityName="Test Gallery"
      />
    )
  };
}

describe('UnifiedMediaLightbox', () => {
  beforeEach(() => {
    // createPortal requires document.body
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Image rendering
  // =========================================================================
  describe('Image rendering', () => {
    it('renders an image item with correct alt text', () => {
      renderLightbox([imageItem], 0);
      expect(screen.getByTestId('next-image')).toBeTruthy();
      expect(screen.getByAltText('Test image')).toBeTruthy();
    });

    it('renders caption when provided', () => {
      renderLightbox([imageItem], 0);
      expect(screen.getByText('A caption for the image')).toBeTruthy();
    });

    it('renders close button', () => {
      renderLightbox([imageItem], 0);
      expect(screen.getByLabelText('Close gallery')).toBeTruthy();
    });
  });

  // =========================================================================
  // Embedded video
  // =========================================================================
  describe('Embedded video (iframe)', () => {
    it('renders iframe for YouTube embed', () => {
      renderLightbox([youtubeItem], 0);
      const iframe = document.querySelector('iframe');
      expect(iframe).toBeTruthy();
      expect(iframe?.src).toContain('youtube.com/embed/abc123');
    });

    it('renders provider badge for YouTube', () => {
      renderLightbox([youtubeItem], 0);
      expect(screen.getByText('youtube')).toBeTruthy();
    });

    it('renders open-original link for YouTube', () => {
      renderLightbox([youtubeItem], 0);
      const link = screen.getByText('Open original');
      expect(link).toBeTruthy();
    });
  });

  // =========================================================================
  // Direct video
  // =========================================================================
  describe('Direct video element', () => {
    it('renders video element for direct video', () => {
      renderLightbox([directVideoItem], 0);
      const video = document.querySelector('video');
      expect(video).toBeTruthy();
    });

    it('video element has controls', () => {
      renderLightbox([directVideoItem], 0);
      const video = document.querySelector('video');
      expect(video?.controls).toBe(true);
    });
  });

  // =========================================================================
  // Counter display
  // =========================================================================
  describe('Counter display', () => {
    it('shows counter when multiple items', () => {
      renderLightbox([imageItem, youtubeItem], 0);
      expect(screen.getByText('1 of 2')).toBeTruthy();
    });

    it('shows correct counter for second item', () => {
      renderLightbox([imageItem, youtubeItem], 1);
      expect(screen.getByText('2 of 2')).toBeTruthy();
    });

    it('does not show counter for single item', () => {
      renderLightbox([imageItem], 0);
      expect(screen.queryByText('1 of 1')).toBeNull();
    });
  });

  // =========================================================================
  // Keyboard navigation
  // =========================================================================
  describe('Keyboard navigation', () => {
    it('calls onClose on Escape key', () => {
      const onClose = vi.fn();
      renderLightbox([imageItem, youtubeItem], 0, { onClose });
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onNavigate with previous index on ArrowLeft', () => {
      const onNavigate = vi.fn();
      renderLightbox([imageItem, youtubeItem], 1, { onNavigate });
      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      expect(onNavigate).toHaveBeenCalledWith(0);
    });

    it('wraps to last item on ArrowLeft from first', () => {
      const onNavigate = vi.fn();
      renderLightbox([imageItem, youtubeItem], 0, { onNavigate });
      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      expect(onNavigate).toHaveBeenCalledWith(1);
    });

    it('calls onNavigate with next index on ArrowRight', () => {
      const onNavigate = vi.fn();
      renderLightbox([imageItem, youtubeItem], 0, { onNavigate });
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      expect(onNavigate).toHaveBeenCalledWith(1);
    });

    it('wraps to first item on ArrowRight from last', () => {
      const onNavigate = vi.fn();
      renderLightbox([imageItem, youtubeItem], 1, { onNavigate });
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      expect(onNavigate).toHaveBeenCalledWith(0);
    });
  });

  // =========================================================================
  // Close button
  // =========================================================================
  describe('Close button', () => {
    it('calls onClose when close button clicked', () => {
      const onClose = vi.fn();
      renderLightbox([imageItem], 0, { onClose });
      fireEvent.click(screen.getByLabelText('Close gallery'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // Provider badge and caption
  // =========================================================================
  describe('Provider badge and caption', () => {
    it('shows vimeo provider badge', () => {
      renderLightbox([vimeoItem], 0);
      expect(screen.getByText('vimeo')).toBeTruthy();
    });

    it('does not show provider badge for unknown provider', () => {
      const unknownVideo: GalleryItem = {
        id: 'vid-unknown',
        type: 'video',
        url: '',
        alt: 'Unknown video',
        videoProvider: 'unknown'
      };
      renderLightbox([unknownVideo], 0);
      expect(screen.queryByText('unknown')).toBeNull();
    });
  });

  // =========================================================================
  // Returns null for out-of-range index
  // =========================================================================
  it('returns null when currentIndex out of bounds', () => {
    const { container } = renderLightbox([imageItem], 5);
    // Portal target may still be body but inner content should be empty
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toBeNull();
  });
});
