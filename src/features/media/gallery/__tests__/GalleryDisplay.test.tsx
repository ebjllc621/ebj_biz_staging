/**
 * GalleryDisplay - Unit Tests
 *
 * @phase Phase 8B - Gallery Layout Selector + Mixed Media Unification
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GalleryDisplay } from '../components/GalleryDisplay';
import type { GalleryItem } from '../types/gallery-types';

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...rest }: { src: string; alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...rest} />
  )
}));

// Mock next/dynamic to return synchronous components in tests
vi.mock('next/dynamic', () => ({
  default: (
    importFn: () => Promise<{ default: React.ComponentType<unknown> }>
  ) => {
    let Component: React.ComponentType<unknown> | null = null;
    importFn().then((mod) => {
      Component = mod.default;
    });
    // Return a wrapper that renders once the component resolves
    const MockDynamic = (props: unknown) => {
      if (!Component) return <div data-testid="dynamic-loading" />;
      return <Component {...(props as object)} />;
    };
    MockDynamic.displayName = 'MockDynamic';
    return MockDynamic;
  }
}));

// Mock ErrorBoundary to pass children through
vi.mock('@/components/common/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Mock GalleryGrid, GalleryMasonry, GalleryCarousel
vi.mock('../components/GalleryGrid', () => ({
  GalleryGrid: ({ items }: { items: GalleryItem[] }) => (
    <div data-testid="gallery-grid">
      {items.map((item) => (
        <img key={item.id} src={item.url} alt={item.alt} />
      ))}
    </div>
  )
}));

vi.mock('../components/GalleryMasonry', () => ({
  GalleryMasonry: ({ items }: { items: GalleryItem[] }) => (
    <div data-testid="gallery-masonry">
      {items.map((item) => (
        <img key={item.id} src={item.url} alt={item.alt} />
      ))}
    </div>
  )
}));

vi.mock('../components/GalleryCarousel', () => ({
  GalleryCarousel: ({ items }: { items: GalleryItem[] }) => (
    <div data-testid="gallery-carousel">
      {items.map((item) => (
        <img key={item.id} src={item.url} alt={item.alt} />
      ))}
    </div>
  )
}));

// Mock UnifiedMediaLightbox
vi.mock('../components/UnifiedMediaLightbox', () => ({
  UnifiedMediaLightbox: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="lightbox">
      <button onClick={onClose}>Close</button>
    </div>
  )
}));

const createImageItem = (id: string, url: string, alt: string): GalleryItem => ({
  id,
  type: 'image',
  url,
  alt
});

describe('GalleryDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders null when items array is empty', () => {
    const { container } = render(<GalleryDisplay items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders GalleryGrid by default when items provided', () => {
    const items = [createImageItem('1', '/img1.jpg', 'Image 1')];
    render(<GalleryDisplay items={items} />);
    expect(screen.getByTestId('gallery-grid')).toBeTruthy();
  });

  it('renders items with correct alt text in grid', () => {
    const items = [
      createImageItem('1', '/img1.jpg', 'First image'),
      createImageItem('2', '/img2.jpg', 'Second image')
    ];
    render(<GalleryDisplay items={items} layout="grid" />);
    expect(screen.getByAltText('First image')).toBeTruthy();
    expect(screen.getByAltText('Second image')).toBeTruthy();
  });

  it('renders GalleryMasonry when layout is masonry', () => {
    const items = [createImageItem('1', '/img1.jpg', 'Image 1')];
    render(<GalleryDisplay items={items} layout="masonry" />);
    expect(screen.getByTestId('gallery-masonry')).toBeTruthy();
  });

  it('renders GalleryCarousel when layout is carousel', () => {
    const items = [createImageItem('1', '/img1.jpg', 'Image 1')];
    render(<GalleryDisplay items={items} layout="carousel" />);
    expect(screen.getByTestId('gallery-carousel')).toBeTruthy();
  });

  it('does not render lightbox initially', () => {
    const items = [createImageItem('1', '/img1.jpg', 'Image 1')];
    render(<GalleryDisplay items={items} enableLightbox={true} />);
    expect(screen.queryByTestId('lightbox')).toBeNull();
  });

  it('applies className to wrapper', () => {
    const items = [createImageItem('1', '/img1.jpg', 'Image 1')];
    const { container } = render(
      <GalleryDisplay items={items} className="custom-gallery" />
    );
    expect(container.querySelector('.custom-gallery')).toBeTruthy();
  });

  it('passes entityName to layout renderer', () => {
    const items = [createImageItem('1', '/img1.jpg', 'Image 1')];
    // Just verifying no errors thrown with entityName
    expect(() =>
      render(<GalleryDisplay items={items} entityName="Test Business" />)
    ).not.toThrow();
  });

  it('renders with showFeaturedBadge without errors', () => {
    const items = [
      createImageItem('1', '/img1.jpg', 'Image 1'),
      createImageItem('2', '/img2.jpg', 'Image 2')
    ];
    expect(() =>
      render(<GalleryDisplay items={items} showFeaturedBadge={true} />)
    ).not.toThrow();
  });
});
