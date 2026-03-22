/**
 * ContentFilterBar - Component Tests
 *
 * @tier STANDARD
 * @phase Phase 7 - Testing & Validation
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests rendering, search input, dropdown filters, clear functionality, and callback invocations for ContentFilterBar component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContentFilterBar } from '../ContentFilterBar';

// Mock useContentFilters hook
const mockSetSearchQuery = vi.fn();
const mockSetSortOption = vi.fn();
const mockSetContentType = vi.fn();
const mockClearFilters = vi.fn();

vi.mock('@/features/content/hooks/useContentFilters', () => ({
  useContentFilters: () => ({
    filters: {
      q: '',
      sort: 'category_featured',
      type: 'all',
    },
    setSearchQuery: mockSetSearchQuery,
    setSortOption: mockSetSortOption,
    setContentType: mockSetContentType,
    clearFilters: mockClearFilters,
    activeFilterCount: 0,
    isDebouncing: false,
  }),
}));

describe('ContentFilterBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render search input', () => {
      render(<ContentFilterBar />);

      const searchInput = screen.getByPlaceholderText('Search articles, videos, podcasts...');
      expect(searchInput).toBeInTheDocument();
    });

    it('should render sort dropdown', () => {
      render(<ContentFilterBar />);

      const sortDropdown = screen.getByLabelText('Sort by');
      expect(sortDropdown).toBeInTheDocument();
    });

    it('should render content type dropdown', () => {
      render(<ContentFilterBar />);

      const typeDropdown = screen.getByLabelText('Content type');
      expect(typeDropdown).toBeInTheDocument();
    });

    it('should render all sort options', () => {
      render(<ContentFilterBar />);

      expect(screen.getByText('Featured')).toBeInTheDocument();
      expect(screen.getByText('Most Recent')).toBeInTheDocument();
      expect(screen.getByText('Most Popular')).toBeInTheDocument();
      expect(screen.getByText('A-Z')).toBeInTheDocument();
    });

    it('should render all content type options', () => {
      render(<ContentFilterBar />);

      expect(screen.getByText('All Content')).toBeInTheDocument();
      expect(screen.getByText('Articles')).toBeInTheDocument();
      expect(screen.getByText('Videos')).toBeInTheDocument();
      expect(screen.getByText('Podcasts')).toBeInTheDocument();
    });

    it('should not render clear filters button when no active filters', () => {
      render(<ContentFilterBar />);

      expect(screen.queryByText(/Clear Filters/)).not.toBeInTheDocument();
    });
  });

  describe('search input', () => {
    it('should update local state on input change', () => {
      render(<ContentFilterBar />);

      const searchInput = screen.getByPlaceholderText('Search articles, videos, podcasts...');
      fireEvent.change(searchInput, { target: { value: 'react tutorial' } });

      expect(searchInput).toHaveValue('react tutorial');
    });

    it('should call setSearchQuery on input change', () => {
      render(<ContentFilterBar />);

      const searchInput = screen.getByPlaceholderText('Search articles, videos, podcasts...');
      fireEvent.change(searchInput, { target: { value: 'react' } });

      expect(mockSetSearchQuery).toHaveBeenCalledWith('react');
    });

    it('should show clear button when search has value', () => {
      render(<ContentFilterBar />);

      const searchInput = screen.getByPlaceholderText('Search articles, videos, podcasts...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      const clearButton = screen.getByLabelText('Clear search');
      expect(clearButton).toBeInTheDocument();
    });

    it('should clear search when clear button clicked', () => {
      render(<ContentFilterBar />);

      const searchInput = screen.getByPlaceholderText('Search articles, videos, podcasts...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      const clearButton = screen.getByLabelText('Clear search');
      fireEvent.click(clearButton);

      expect(searchInput).toHaveValue('');
      expect(mockSetSearchQuery).toHaveBeenCalledWith('');
    });
  });

  describe('sort dropdown', () => {
    it('should show default sort value', () => {
      render(<ContentFilterBar />);

      const sortDropdown = screen.getByLabelText('Sort by') as HTMLSelectElement;
      expect(sortDropdown.value).toBe('category_featured');
    });

    it('should call setSortOption on change', () => {
      render(<ContentFilterBar />);

      const sortDropdown = screen.getByLabelText('Sort by');
      fireEvent.change(sortDropdown, { target: { value: 'recent' } });

      expect(mockSetSortOption).toHaveBeenCalledWith('recent');
    });
  });

  describe('content type dropdown', () => {
    it('should show default type value', () => {
      render(<ContentFilterBar />);

      const typeDropdown = screen.getByLabelText('Content type') as HTMLSelectElement;
      expect(typeDropdown.value).toBe('all');
    });

    it('should call setContentType on change', () => {
      render(<ContentFilterBar />);

      const typeDropdown = screen.getByLabelText('Content type');
      fireEvent.change(typeDropdown, { target: { value: 'article' } });

      expect(mockSetContentType).toHaveBeenCalledWith('article');
    });
  });

  describe('active filters display', () => {
    it('should not show clear filters button when no active filters', () => {
      render(<ContentFilterBar />);

      expect(screen.queryByText(/Clear Filters/)).not.toBeInTheDocument();
    });
  });

  describe('mobile functionality', () => {
    it('should render mobile toggle button', () => {
      render(<ContentFilterBar />);

      const toggleButton = screen.getByLabelText('Toggle filters');
      expect(toggleButton).toBeInTheDocument();
    });

    it('should toggle mobile menu when button clicked', () => {
      render(<ContentFilterBar />);

      const toggleButton = screen.getByLabelText('Toggle filters');

      // Initially collapsed
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

      // Click to expand
      fireEvent.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');

      // Click to collapse
      fireEvent.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('debouncing indicator', () => {
    it('should not show spinner when not debouncing', () => {
      const { container } = render(<ContentFilterBar />);

      // Spinner should not be present when not debouncing
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper labels for screen readers', () => {
      render(<ContentFilterBar />);

      expect(screen.getByLabelText('Search content')).toBeInTheDocument();
      expect(screen.getByLabelText('Sort by')).toBeInTheDocument();
      expect(screen.getByLabelText('Content type')).toBeInTheDocument();
    });

    it('should have aria-expanded on mobile toggle', () => {
      render(<ContentFilterBar />);

      const toggleButton = screen.getByLabelText('Toggle filters');
      expect(toggleButton).toHaveAttribute('aria-expanded');
    });

    it('should have aria-label for clear search button', () => {
      render(<ContentFilterBar />);

      const searchInput = screen.getByPlaceholderText('Search articles, videos, podcasts...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      const clearButton = screen.getByLabelText('Clear search');
      expect(clearButton).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply container styling', () => {
      const { container } = render(<ContentFilterBar />);

      const filterBar = container.querySelector('.bg-white.rounded-lg.border.shadow-sm');
      expect(filterBar).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<ContentFilterBar className="custom-class" />);

      const filterBar = container.querySelector('.custom-class');
      expect(filterBar).toBeInTheDocument();
    });

    it('should use biz-orange theme colors', () => {
      render(<ContentFilterBar />);

      const searchInput = screen.getByPlaceholderText('Search articles, videos, podcasts...');
      expect(searchInput).toHaveClass('focus:ring-biz-orange');
    });
  });
});
