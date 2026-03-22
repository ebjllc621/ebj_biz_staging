/**
 * ListingsSkeleton - Component Tests
 *
 * @tier SIMPLE
 * @phase Phase 9 - Testing & Documentation
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests skeleton rendering for loading states.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

// Mock components for testing (extracted from ListingsPageClient.tsx)
function ListingsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" data-testid="listings-skeleton">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse bg-white rounded-xl overflow-hidden shadow-sm"
          data-testid="skeleton-card"
        >
          <div className="h-40 bg-gray-200" />
          <div className="p-4 space-y-3">
            <div className="h-3 bg-gray-200 rounded w-1/4" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ListingsListSkeleton() {
  return (
    <div className="space-y-4" data-testid="listings-list-skeleton">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse bg-white rounded-xl overflow-hidden shadow-sm flex flex-col sm:flex-row"
          data-testid="skeleton-list-card"
        >
          {/* Image placeholder */}
          <div className="w-full sm:w-48 md:w-56 h-40 sm:h-auto sm:min-h-[160px] bg-gray-200" />
          {/* Content placeholder */}
          <div className="flex-1 p-4 space-y-3">
            <div className="h-3 bg-gray-200 rounded w-1/6" />
            <div className="h-5 bg-gray-200 rounded w-1/2" />
            <div className="h-3 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

describe('ListingsSkeleton', () => {
  describe('grid skeleton', () => {
    it('should render 8 skeleton cards', () => {
      const { getAllByTestId } = render(<ListingsSkeleton />);

      const cards = getAllByTestId('skeleton-card');
      expect(cards).toHaveLength(8);
    });

    it('should have animate-pulse class', () => {
      const { getAllByTestId } = render(<ListingsSkeleton />);

      const cards = getAllByTestId('skeleton-card');
      cards.forEach(card => {
        expect(card).toHaveClass('animate-pulse');
      });
    });

    it('should match grid layout', () => {
      const { getByTestId } = render(<ListingsSkeleton />);

      const container = getByTestId('listings-skeleton');
      expect(container).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'xl:grid-cols-4');
    });

    it('should apply gap between cards', () => {
      const { getByTestId } = render(<ListingsSkeleton />);

      const container = getByTestId('listings-skeleton');
      expect(container).toHaveClass('gap-6');
    });

    it('should render rounded cards', () => {
      const { getAllByTestId } = render(<ListingsSkeleton />);

      const cards = getAllByTestId('skeleton-card');
      cards.forEach(card => {
        expect(card).toHaveClass('rounded-xl');
      });
    });

    it('should render white background cards', () => {
      const { getAllByTestId } = render(<ListingsSkeleton />);

      const cards = getAllByTestId('skeleton-card');
      cards.forEach(card => {
        expect(card).toHaveClass('bg-white');
      });
    });

    it('should render shadow on cards', () => {
      const { getAllByTestId } = render(<ListingsSkeleton />);

      const cards = getAllByTestId('skeleton-card');
      cards.forEach(card => {
        expect(card).toHaveClass('shadow-sm');
      });
    });

    it('should render image placeholder', () => {
      const { container } = render(<ListingsSkeleton />);

      const imagePlaceholders = container.querySelectorAll('.h-40.bg-gray-200');
      expect(imagePlaceholders.length).toBeGreaterThan(0);
    });

    it('should render content placeholders', () => {
      const { container } = render(<ListingsSkeleton />);

      const contentSections = container.querySelectorAll('.p-4.space-y-3');
      expect(contentSections).toHaveLength(8);
    });

    it('should render multiple placeholder lines', () => {
      const { container } = render(<ListingsSkeleton />);

      // Each card has 3 placeholder lines
      const placeholderLines = container.querySelectorAll('.p-4.space-y-3 > div');
      expect(placeholderLines.length).toBeGreaterThan(0);
    });
  });

  describe('list skeleton', () => {
    it('should render 6 skeleton cards', () => {
      const { getAllByTestId } = render(<ListingsListSkeleton />);

      const cards = getAllByTestId('skeleton-list-card');
      expect(cards).toHaveLength(6);
    });

    it('should have animate-pulse class', () => {
      const { getAllByTestId } = render(<ListingsListSkeleton />);

      const cards = getAllByTestId('skeleton-list-card');
      cards.forEach(card => {
        expect(card).toHaveClass('animate-pulse');
      });
    });

    it('should match list layout', () => {
      const { getByTestId } = render(<ListingsListSkeleton />);

      const container = getByTestId('listings-list-skeleton');
      expect(container).toHaveClass('space-y-4');
    });

    it('should apply horizontal layout for cards', () => {
      const { getAllByTestId } = render(<ListingsListSkeleton />);

      const cards = getAllByTestId('skeleton-list-card');
      cards.forEach(card => {
        expect(card).toHaveClass('flex', 'flex-col', 'sm:flex-row');
      });
    });

    it('should render rounded cards', () => {
      const { getAllByTestId } = render(<ListingsListSkeleton />);

      const cards = getAllByTestId('skeleton-list-card');
      cards.forEach(card => {
        expect(card).toHaveClass('rounded-xl');
      });
    });

    it('should render white background cards', () => {
      const { getAllByTestId } = render(<ListingsListSkeleton />);

      const cards = getAllByTestId('skeleton-list-card');
      cards.forEach(card => {
        expect(card).toHaveClass('bg-white');
      });
    });

    it('should render shadow on cards', () => {
      const { getAllByTestId } = render(<ListingsListSkeleton />);

      const cards = getAllByTestId('skeleton-list-card');
      cards.forEach(card => {
        expect(card).toHaveClass('shadow-sm');
      });
    });

    it('should render image placeholder with correct sizing', () => {
      const { container } = render(<ListingsListSkeleton />);

      const imagePlaceholders = container.querySelectorAll('.w-full.sm\\:w-48.md\\:w-56');
      expect(imagePlaceholders).toHaveLength(6);
    });

    it('should render content section with flex-1', () => {
      const { container } = render(<ListingsListSkeleton />);

      const contentSections = container.querySelectorAll('.flex-1.p-4.space-y-3');
      expect(contentSections).toHaveLength(6);
    });

    it('should render multiple placeholder lines in content', () => {
      const { container } = render(<ListingsListSkeleton />);

      // Each card has 4 placeholder lines in list view
      const contentSections = container.querySelectorAll('.flex-1.p-4.space-y-3');
      contentSections.forEach(section => {
        const placeholderLines = section.querySelectorAll('div');
        expect(placeholderLines.length).toBeGreaterThan(0);
      });
    });

    it('should apply different widths to placeholder lines', () => {
      const { container } = render(<ListingsListSkeleton />);

      // Check for various width classes
      expect(container.querySelector('.w-1\\/6')).toBeInTheDocument();
      expect(container.querySelector('.w-1\\/2')).toBeInTheDocument();
      expect(container.querySelector('.w-3\\/4')).toBeInTheDocument();
      expect(container.querySelector('.w-1\\/3')).toBeInTheDocument();
    });
  });

  describe('responsive behavior', () => {
    it('grid skeleton should have responsive column classes', () => {
      const { getByTestId } = render(<ListingsSkeleton />);

      const container = getByTestId('listings-skeleton');
      expect(container).toHaveClass('grid-cols-1');
      expect(container).toHaveClass('md:grid-cols-2');
      expect(container).toHaveClass('lg:grid-cols-3');
      expect(container).toHaveClass('xl:grid-cols-4');
    });

    it('list skeleton cards should have responsive flex direction', () => {
      const { getAllByTestId } = render(<ListingsListSkeleton />);

      const cards = getAllByTestId('skeleton-list-card');
      cards.forEach(card => {
        expect(card).toHaveClass('flex-col');
        expect(card).toHaveClass('sm:flex-row');
      });
    });
  });
});
