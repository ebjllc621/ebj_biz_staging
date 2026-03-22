/**
 * DirectoryBreadcrumb component tests
 *
 * @tier STANDARD
 * @phase Phase 7a - Unit Tests
 * @authority docs/media/galleryformat/phases/PHASE_7_UI_TESTING_INTEGRATION_BRAIN_PLAN.md
 * @target 70%+ coverage
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DirectoryBreadcrumb } from '../DirectoryBreadcrumb';
import type { BreadcrumbItem } from '../DirectoryBreadcrumb';

describe('DirectoryBreadcrumb', () => {
  const defaultProps = {
    breadcrumbs: [
      { label: 'Media Root', path: '/' },
      { label: 'listings', path: '/listings' },
      { label: 'gallery', path: '/listings/gallery' },
    ] as BreadcrumbItem[],
    onNavigate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  describe('Empty breadcrumbs', () => {
    it('should render nothing when breadcrumbs array is empty', () => {
      const { container } = render(
        <DirectoryBreadcrumb breadcrumbs={[]} onNavigate={vi.fn()} />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  describe('Rendering', () => {
    it('should render nav element with correct aria-label', () => {
      render(<DirectoryBreadcrumb {...defaultProps} />);
      expect(screen.getByRole('navigation', { name: /directory navigation/i })).toBeInTheDocument();
    });

    it('should render all breadcrumb labels', () => {
      render(<DirectoryBreadcrumb {...defaultProps} />);
      expect(screen.getByText('Media Root')).toBeInTheDocument();
      expect(screen.getByText('listings')).toBeInTheDocument();
      expect(screen.getByText('gallery')).toBeInTheDocument();
    });

    it('should mark last segment with aria-current="page"', () => {
      render(<DirectoryBreadcrumb {...defaultProps} />);
      const currentSegment = screen.getByText('gallery').closest('[aria-current="page"]');
      expect(currentSegment).toBeInTheDocument();
    });

    it('should NOT mark first segment with aria-current="page"', () => {
      render(<DirectoryBreadcrumb {...defaultProps} />);
      const root = screen.getByText('Media Root');
      expect(root.closest('[aria-current="page"]')).toBeNull();
    });

    it('should render separator chevrons between segments', () => {
      const { container } = render(<DirectoryBreadcrumb {...defaultProps} />);
      // 3 breadcrumbs → 2 separators
      // ChevronRight renders as SVG with aria-hidden="true"
      const separators = container.querySelectorAll('svg[aria-hidden="true"]');
      // Some SVGs are icons (Home, Folder) plus separators
      // At minimum 2 chevron separators should be present between 3 crumbs
      expect(separators.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Single breadcrumb (root only)
  // ---------------------------------------------------------------------------

  describe('Single breadcrumb (root only)', () => {
    it('should render root as non-clickable when only one breadcrumb', () => {
      render(
        <DirectoryBreadcrumb
          breadcrumbs={[{ label: 'Media Root', path: '/' }]}
          onNavigate={vi.fn()}
        />
      );
      // Last (only) segment should be a span, not a button
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.getByText('Media Root')).toBeInTheDocument();
    });

    it('should mark single root with aria-current="page"', () => {
      render(
        <DirectoryBreadcrumb
          breadcrumbs={[{ label: 'Media Root', path: '/' }]}
          onNavigate={vi.fn()}
        />
      );
      expect(screen.getByText('Media Root').closest('[aria-current="page"]')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Navigation buttons
  // ---------------------------------------------------------------------------

  describe('Navigation buttons', () => {
    it('should render ancestor segments as clickable buttons', () => {
      render(<DirectoryBreadcrumb {...defaultProps} />);
      // 'Media Root' and 'listings' are ancestors (not last) → buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
    });

    it('should NOT render last segment as a button', () => {
      render(<DirectoryBreadcrumb {...defaultProps} />);
      const buttons = screen.getAllByRole('button');
      const buttonTexts = buttons.map((b) => b.textContent);
      expect(buttonTexts).not.toContain('gallery');
    });

    it('should call onNavigate with correct path when ancestor button clicked', () => {
      render(<DirectoryBreadcrumb {...defaultProps} />);
      // 'listings' is the second segment (index 1), with path '/listings'
      const listingsButton = screen.getByRole('button', { name: /listings/i });
      fireEvent.click(listingsButton);
      expect(defaultProps.onNavigate).toHaveBeenCalledWith('/listings');
    });

    it('should call onNavigate with root path when root button clicked', () => {
      render(<DirectoryBreadcrumb {...defaultProps} />);
      // 'Media Root' is the first segment (index 0), with path '/'
      const rootButton = screen.getByRole('button', { name: /media root/i });
      fireEvent.click(rootButton);
      expect(defaultProps.onNavigate).toHaveBeenCalledWith('/');
    });

    it('should not call onNavigate when last segment area is interacted with', () => {
      render(<DirectoryBreadcrumb {...defaultProps} />);
      // 'gallery' is last - it's a span, click should not trigger onNavigate
      fireEvent.click(screen.getByText('gallery'));
      expect(defaultProps.onNavigate).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Two-segment case
  // ---------------------------------------------------------------------------

  describe('Two-segment breadcrumbs', () => {
    it('should render root as button and last as non-clickable', () => {
      render(
        <DirectoryBreadcrumb
          breadcrumbs={[
            { label: 'Media Root', path: '/' },
            { label: 'listings', path: '/listings' },
          ]}
          onNavigate={defaultProps.onNavigate}
        />
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('listings').closest('[aria-current="page"]')).toBeInTheDocument();
    });

    it('should call onNavigate with root path when root clicked in two-segment case', () => {
      render(
        <DirectoryBreadcrumb
          breadcrumbs={[
            { label: 'Media Root', path: '/' },
            { label: 'listings', path: '/listings' },
          ]}
          onNavigate={defaultProps.onNavigate}
        />
      );
      fireEvent.click(screen.getByRole('button'));
      expect(defaultProps.onNavigate).toHaveBeenCalledWith('/');
    });
  });
});
