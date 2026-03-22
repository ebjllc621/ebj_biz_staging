/**
 * OffersFilterBar - Component Tests
 *
 * @tier STANDARD
 * @phase Phase 9 - Testing & Validation
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests rendering, interactions, and filter operations for OffersFilterBar component.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OffersFilterBar } from '../OffersFilterBar';

// Mock useOffersFilters hook
const mockSetSearchQuery = vi.fn();
const mockSetSortOption = vi.fn();
const mockSetOfferType = vi.fn();
const mockClearFilters = vi.fn();

vi.mock('@/features/offers/hooks/useOffersFilters', () => ({
  useOffersFilters: () => ({
    filters: {
      q: '',
      sort: 'priority',
      page: 1,
      offerType: undefined,
    },
    setSearchQuery: mockSetSearchQuery,
    setSortOption: mockSetSortOption,
    setOfferType: mockSetOfferType,
    clearFilters: mockClearFilters,
    activeFilterCount: 0,
    isDebouncing: false,
  }),
}));

describe('OffersFilterBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render search input', () => {
      render(<OffersFilterBar />);

      expect(screen.getByPlaceholderText('Search offers...')).toBeInTheDocument();
    });

    it('should render sort dropdown', () => {
      render(<OffersFilterBar />);

      expect(screen.getByLabelText('Sort by')).toBeInTheDocument();
    });

    it('should render all sort options', () => {
      render(<OffersFilterBar />);

      const sortDropdown = screen.getByLabelText('Sort by') as HTMLSelectElement;
      const options = Array.from(sortDropdown.options).map(opt => opt.value);

      expect(options).toContain('priority');
      expect(options).toContain('price_low');
      expect(options).toContain('price_high');
      expect(options).toContain('ending_soon');
      expect(options).toContain('discount');
      expect(options).toContain('distance');
    });

    it('should render offer type dropdown', () => {
      render(<OffersFilterBar />);

      expect(screen.getByLabelText('Offer type')).toBeInTheDocument();
    });

    it('should render all offer type options', () => {
      render(<OffersFilterBar />);

      const offerTypeDropdown = screen.getByLabelText('Offer type') as HTMLSelectElement;
      const options = Array.from(offerTypeDropdown.options).map(opt => opt.textContent);

      expect(options).toContain('All Types');
      expect(options).toContain('Discounts');
      expect(options).toContain('Coupons');
      expect(options).toContain('Products');
      expect(options).toContain('Services');
    });

    it('should not render clear filters button when no active filters', () => {
      render(<OffersFilterBar />);

      expect(screen.queryByText(/Clear Filters/)).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call setSearchQuery when search input changes', () => {
      render(<OffersFilterBar />);

      const searchInput = screen.getByPlaceholderText('Search offers...');
      fireEvent.change(searchInput, { target: { value: 'test search' } });

      expect(mockSetSearchQuery).toHaveBeenCalledWith('test search');
    });

    it('should call setSortOption when sort dropdown changes', () => {
      render(<OffersFilterBar />);

      const sortDropdown = screen.getByLabelText('Sort by');
      fireEvent.change(sortDropdown, { target: { value: 'price_low' } });

      expect(mockSetSortOption).toHaveBeenCalledWith('price_low');
    });

    it('should call setOfferType when offer type dropdown changes', () => {
      render(<OffersFilterBar />);

      const offerTypeDropdown = screen.getByLabelText('Offer type');
      fireEvent.change(offerTypeDropdown, { target: { value: 'discount' } });

      expect(mockSetOfferType).toHaveBeenCalledWith('discount');
    });

    it('should clear search input when X button clicked', () => {
      render(<OffersFilterBar />);

      const searchInput = screen.getByPlaceholderText('Search offers...') as HTMLInputElement;

      // Simulate entering text
      fireEvent.change(searchInput, { target: { value: 'test' } });

      // Find and click clear button
      const clearButton = screen.getByLabelText('Clear search');
      fireEvent.click(clearButton);

      expect(mockSetSearchQuery).toHaveBeenCalledWith('');
    });
  });

  describe('active filters', () => {
    it('should not display clear filters button when no active filters', () => {
      render(<OffersFilterBar />);

      expect(screen.queryByText(/Clear Filters/)).not.toBeInTheDocument();
    });
  });

  describe('mobile behavior', () => {
    it('should render mobile toggle button', () => {
      render(<OffersFilterBar />);

      expect(screen.getByLabelText('Toggle filters')).toBeInTheDocument();
    });

    it('should toggle filter visibility on mobile', () => {
      const { container } = render(<OffersFilterBar />);

      const toggleButton = screen.getByLabelText('Toggle filters');

      // Initially collapsed
      const filterControls = container.querySelector('.md\\:block');
      expect(filterControls).toHaveClass('hidden');

      // Expand
      fireEvent.click(toggleButton);
      expect(filterControls).toHaveClass('block');

      // Collapse again
      fireEvent.click(toggleButton);
      expect(filterControls).toHaveClass('hidden');
    });
  });

  describe('accessibility', () => {
    it('should have proper labels for all inputs', () => {
      render(<OffersFilterBar />);

      expect(screen.getByLabelText('Search offers')).toBeInTheDocument();
      expect(screen.getByLabelText('Sort by')).toBeInTheDocument();
      expect(screen.getByLabelText('Offer type')).toBeInTheDocument();
    });

    it('should have aria-expanded on mobile toggle', () => {
      render(<OffersFilterBar />);

      const toggleButton = screen.getByLabelText('Toggle filters');
      expect(toggleButton).toHaveAttribute('aria-expanded');
    });
  });
});
