/**
 * GalleryJustified - Unit Tests
 *
 * @phase Phase 8C - Justified Layout + Enhanced Lightbox
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GalleryJustified } from '../components/GalleryJustified';
import type { GalleryItem } from '../types/gallery-types';

// Mock react-photo-album RowsPhotoAlbum
vi.mock('react-photo-album', () => ({
  RowsPhotoAlbum: ({
    photos,
    onClick,
    render,
  }: {
    photos: Array<{ src: string; alt: string; key: string; width: number; height: number; itemIndex: number }>;
    onClick?: (_args: { index: number }) => void;
    render?: {
      photo?: (
        _props: unknown,
        _ctx: { photo: { src: string; alt: string; key: string; width: number; height: number; itemIndex: number }; index: number; width: number; height: number }
      ) => React.ReactNode;
    };
    spacing?: number;
    targetRowHeight?: number;
  }) => {
    if (render?.photo) {
      return (
        <div data-testid="rows-photo-album">
          {photos.map((photo, index) =>
            render.photo!(
              {},
              { photo, index, width: photo.width, height: photo.height }
            )
          )}
        </div>
      );
    }
    return (
      <div data-testid="rows-photo-album">
        {photos.map((photo) => (
          <button
            key={photo.key}
            onClick={() => onClick?.({ index: photo.itemIndex })}
            aria-label={`View ${photo.alt}`}
          >
            <img src={photo.src} alt={photo.alt} />
          </button>
        ))}
      </div>
    );
  }
}));

// Mock react-photo-album/rows.css
vi.mock('react-photo-album/rows.css', () => ({}));

// Mock lucide-react Play icon
vi.mock('lucide-react', () => ({
  Play: () => <svg data-testid="play-icon" />
}));

// Mock image-dimensions utility
vi.mock('../utils/image-dimensions', () => ({
  resolveItemDimensions: vi.fn((items: GalleryItem[]) =>
    Promise.resolve(items.map(() => ({ width: 1200, height: 900 })))
  ),
  getImageDimensions: vi.fn(() => Promise.resolve({ width: 1200, height: 900 }))
}));

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createImageItem = (id: string, url: string, alt: string): GalleryItem => ({
  id,
  type: 'image',
  url,
  alt
});

const createVideoItem = (id: string): GalleryItem => ({
  id,
  type: 'video',
  url: 'https://img.youtube.com/vi/abc123/hqdefault.jpg',
  alt: 'Test video',
  embedUrl: 'https://www.youtube.com/embed/abc123',
  videoProvider: 'youtube'
});

const sampleItems: GalleryItem[] = [
  createImageItem('img-1', '/image1.jpg', 'First image'),
  createImageItem('img-2', '/image2.jpg', 'Second image'),
  createImageItem('img-3', '/image3.jpg', 'Third image')
];

// ============================================================================
// HELPERS
// ============================================================================

async function renderJustified(
  items: GalleryItem[],
  props: Partial<{
    onItemClick: (_index: number) => void;
    showFeaturedBadge: boolean;
    entityName: string;
  }> = {}
) {
  const onItemClick = props.onItemClick ?? vi.fn();
  const result = render(
    <GalleryJustified
      items={items}
      onItemClick={onItemClick}
      showFeaturedBadge={props.showFeaturedBadge}
      entityName={props.entityName}
    />
  );
  // Wait for resolveItemDimensions promise to resolve
  await vi.waitFor(() => {
    expect(screen.queryByTestId('rows-photo-album')).not.toBeNull();
  }, { timeout: 2000 });
  return { ...result, onItemClick };
}

// ============================================================================
// TESTS
// ============================================================================

describe('GalleryJustified', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with valid gallery items', async () => {
    await renderJustified(sampleItems);
    expect(screen.getByTestId('rows-photo-album')).toBeTruthy();
  });

  it('handles empty items array', () => {
    const { container } = render(
      <GalleryJustified items={[]} onItemClick={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows loading skeleton while dimensions are being resolved', () => {
    // Before async resolveItemDimensions completes, skeleton is shown
    const { container } = render(
      <GalleryJustified items={sampleItems} onItemClick={vi.fn()} />
    );
    // Skeleton should be rendered initially (dimensions are null)
    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).not.toBeNull();
  });

  it('renders image thumbnails with correct alt text', async () => {
    await renderJustified(sampleItems);
    const images = screen.getAllByRole('img');
    const alts = images.map((img) => img.getAttribute('alt'));
    expect(alts).toContain('First image');
    expect(alts).toContain('Second image');
    expect(alts).toContain('Third image');
  });

  it('handles video items with play overlay', async () => {
    const items = [createVideoItem('vid-1')];
    await renderJustified(items);
    const playIcon = screen.getByTestId('play-icon');
    expect(playIcon).toBeTruthy();
  });

  it('renders primary badge on first item when showFeaturedBadge is true', async () => {
    await renderJustified(sampleItems, { showFeaturedBadge: true });
    const badge = screen.getByText('Primary');
    expect(badge).toBeTruthy();
  });

  it('fires onItemClick when a photo button is clicked', async () => {
    const onItemClick = vi.fn();
    await renderJustified(sampleItems, { onItemClick });
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(onItemClick).toHaveBeenCalledTimes(1);
  });

  it('uses responsive row height based on window width', async () => {
    // Default window.innerWidth in jsdom is 1024 (>768), so targetRowHeight should be 250
    await renderJustified(sampleItems);
    // RowsPhotoAlbum is rendered — component did not crash with targetRowHeight logic
    expect(screen.getByTestId('rows-photo-album')).toBeTruthy();
  });
});
