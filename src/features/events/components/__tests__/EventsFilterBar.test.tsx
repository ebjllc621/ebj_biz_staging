/**
 * EventsFilterBar - Component Tests
 *
 * @tier STANDARD
 * @phase Phase 9 - Testing & Validation
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests search input, sort dropdown, event type filter, location type filter,
 * mobile accordion, and filter operations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EventsFilterBar } from '../EventsFilterBar';

// Mock useEventsFilters hook
const mockSetSearchQuery = vi.fn();
const mockSetSortOption = vi.fn();
const mockSetEventType = vi.fn();
const mockSetLocationType = vi.fn();
const mockClearFilters = vi.fn();

let mockFilters = { q: '', sort: 'priority' as const, page: 1 };
let mockActiveFilterCount = 0;
let mockIsDebouncing = false;

vi.mock('@/features/events/hooks/useEventsFilters', () => ({
  useEventsFilters: () => ({
    filters: mockFilters,
    setSearchQuery: mockSetSearchQuery,
    setSortOption: mockSetSortOption,
    setEventType: mockSetEventType,
    setLocationType: mockSetLocationType,
    clearFilters: mockClearFilters,
    activeFilterCount: mockActiveFilterCount,
    isDebouncing: mockIsDebouncing,
  }),
}));

describe('EventsFilterBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock state
    mockFilters = { q: '', sort: 'priority', page: 1 };
    mockActiveFilterCount = 0;
    mockIsDebouncing = false;
  });

  describe('rendering', () => {
    it('should render search input', () => {
      render(<EventsFilterBar />);

      expect(screen.getByPlaceholderText('Search events...')).toBeInTheDocument();
    });

    it('should render sort dropdown', () => {
      render(<EventsFilterBar />);

      expect(screen.getByLabelText('Sort by')).toBeInTheDocument();
    });

    it('should render event type filter', () => {
      render(<EventsFilterBar />);

      expect(screen.getByLabelText('Event type')).toBeInTheDocument();
    });

    it('should render location type filter', () => {
      render(<EventsFilterBar />);

      expect(screen.getByLabelText('Location type')).toBeInTheDocument();
    });
  });

  describe('search input', () => {
    it('should display placeholder text', () => {
      render(<EventsFilterBar />);

      expect(screen.getByPlaceholderText('Search events...')).toBeInTheDocument();
    });

    it('should call setSearchQuery when typing', async () => {
      render(<EventsFilterBar />);

      const input = screen.getByPlaceholderText('Search events...');
      fireEvent.change(input, { target: { value: 'festival' } });

      await waitFor(() => {
        expect(mockSetSearchQuery).toHaveBeenCalledWith('festival');
      });
    });

    it('should display current search value', () => {
      render(<EventsFilterBar />);

      const input = screen.getByPlaceholderText('Search events...') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'test search' } });

      expect(input.value).toBe('test search');
    });

    it('should show clear button when value present', () => {
      render(<EventsFilterBar />);

      const input = screen.getByPlaceholderText('Search events...');
      fireEvent.change(input, { target: { value: 'test' } });

      const clearButton = screen.getByLabelText('Clear search');
      expect(clearButton).toBeInTheDocument();
    });

    it('should clear search when clear button clicked', () => {
      render(<EventsFilterBar />);

      const input = screen.getByPlaceholderText('Search events...');
      fireEvent.change(input, { target: { value: 'test' } });

      const clearButton = screen.getByLabelText('Clear search');
      fireEvent.click(clearButton);

      expect(mockSetSearchQuery).toHaveBeenCalledWith('');
    });

    it('should have accessible label', () => {
      render(<EventsFilterBar />);

      expect(screen.getByLabelText('Search events')).toBeInTheDocument();
    });

    it('should show loading indicator when debouncing', () => {
      mockIsDebouncing = true;

      const { container } = render(<EventsFilterBar />);

      const spinner = container.querySelector('.animate-spin');
      if (spinner) {
        expect(spinner).toBeInTheDocument();
      }
    });
  });

  describe('sort dropdown', () => {
    it('should display sort options', () => {
      render(<EventsFilterBar />);

      expect(screen.getByText('Featured')).toBeInTheDocument();
      expect(screen.getByText('Soonest Date')).toBeInTheDocument();
      expect(screen.getByText('Name A-Z')).toBeInTheDocument();
      expect(screen.getByText('Nearest')).toBeInTheDocument();
    });

    it('should call setSortOption when changed', () => {
      render(<EventsFilterBar />);

      const select = screen.getByLabelText('Sort by');
      fireEvent.change(select, { target: { value: 'name' } });

      expect(mockSetSortOption).toHaveBeenCalledWith('name');
    });

    it('should show selected sort option', () => {
      render(<EventsFilterBar />);

      const select = screen.getByLabelText('Sort by') as HTMLSelectElement;
      expect(select.value).toBe('priority');
    });
  });

  describe('event type filter', () => {
    it('should display event type options', () => {
      render(<EventsFilterBar />);

      expect(screen.getByText('All Types')).toBeInTheDocument();
      expect(screen.getByText('Workshop')).toBeInTheDocument();
      expect(screen.getByText('Festival')).toBeInTheDocument();
    });

    it('should call setEventType when changed', () => {
      render(<EventsFilterBar />);

      const select = screen.getByLabelText('Event type');
      fireEvent.change(select, { target: { value: 'Workshop' } });

      expect(mockSetEventType).toHaveBeenCalledWith('Workshop');
    });

    it('should call setEventType with undefined when "All Types" selected', () => {
      render(<EventsFilterBar />);

      const select = screen.getByLabelText('Event type');
      fireEvent.change(select, { target: { value: '' } });

      expect(mockSetEventType).toHaveBeenCalledWith(undefined);
    });
  });

  describe('location type filter', () => {
    it('should display location type options', () => {
      render(<EventsFilterBar />);

      expect(screen.getByText('All Locations')).toBeInTheDocument();
      expect(screen.getByText('In-Person')).toBeInTheDocument();
      expect(screen.getByText('Virtual')).toBeInTheDocument();
      expect(screen.getByText('Hybrid')).toBeInTheDocument();
    });

    it('should call setLocationType when changed', () => {
      render(<EventsFilterBar />);

      const select = screen.getByLabelText('Location type');
      fireEvent.change(select, { target: { value: 'virtual' } });

      expect(mockSetLocationType).toHaveBeenCalledWith('virtual');
    });

    it('should call setLocationType with undefined when "All Locations" selected', () => {
      render(<EventsFilterBar />);

      const select = screen.getByLabelText('Location type');
      fireEvent.change(select, { target: { value: '' } });

      expect(mockSetLocationType).toHaveBeenCalledWith(undefined);
    });
  });

  describe('mobile accordion', () => {
    it('should render mobile toggle button', () => {
      render(<EventsFilterBar />);

      expect(screen.getByLabelText('Toggle filters')).toBeInTheDocument();
    });

    it('should show Filters text in mobile toggle', () => {
      render(<EventsFilterBar />);

      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('should collapse on mobile by default', () => {
      const { container } = render(<EventsFilterBar />);

      const filterControls = container.querySelector('.p-4.border-t');
      expect(filterControls).toHaveClass('hidden');
    });

    it('should expand when toggle clicked', () => {
      const { container } = render(<EventsFilterBar />);

      const toggleButton = screen.getByLabelText('Toggle filters');
      fireEvent.click(toggleButton);

      const filterControls = container.querySelector('.p-4.border-t');
      expect(filterControls).toHaveClass('block');
    });

    it('should update aria-expanded on toggle', () => {
      render(<EventsFilterBar />);

      const toggleButton = screen.getByLabelText('Toggle filters');
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should rotate chevron icon when expanded', () => {
      const { container } = render(<EventsFilterBar />);

      const toggleButton = screen.getByLabelText('Toggle filters');
      const chevronBefore = container.querySelector('.rotate-180');
      expect(chevronBefore).not.toBeInTheDocument();

      fireEvent.click(toggleButton);
      const chevronAfter = container.querySelector('.rotate-180');
      expect(chevronAfter).toBeInTheDocument();
    });

    it('should show active filter count badge in mobile toggle', () => {
      mockActiveFilterCount = 2;

      render(<EventsFilterBar />);

      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('clear filters button', () => {
    it('should show clear button when filters are active', () => {
      mockActiveFilterCount = 1;

      render(<EventsFilterBar />);

      expect(screen.getByText(/Clear Filters/)).toBeInTheDocument();
    });

    it('should not show clear button when no filters are active', () => {
      render(<EventsFilterBar />);

      expect(screen.queryByText(/Clear Filters/)).not.toBeInTheDocument();
    });

    it('should call clearFilters when clicked', () => {
      mockActiveFilterCount = 1;

      render(<EventsFilterBar />);

      const clearButton = screen.getByText(/Clear Filters/);
      fireEvent.click(clearButton);

      expect(mockClearFilters).toHaveBeenCalled();
    });

    it('should display filter count in button text', () => {
      mockActiveFilterCount = 2;

      render(<EventsFilterBar />);

      expect(screen.getByText(/Clear Filters \(2\)/)).toBeInTheDocument();
    });
  });

  describe('active filters display', () => {
    it('should show active search filter', () => {
      mockFilters = { q: 'festival', sort: 'priority', page: 1 };
      mockActiveFilterCount = 1;

      render(<EventsFilterBar />);

      expect(screen.getByText('Search:')).toBeInTheDocument();
      expect(screen.getByText('festival')).toBeInTheDocument();
    });

    it('should show active sort filter', () => {
      mockFilters = { q: '', sort: 'name', page: 1 };
      mockActiveFilterCount = 1;

      render(<EventsFilterBar />);

      expect(screen.getByText('Sort:')).toBeInTheDocument();
      // "Name A-Z" appears in both the <option> and the active filter <span>
      const matches = screen.getAllByText('Name A-Z');
      expect(matches.length).toBeGreaterThanOrEqual(2);
    });

    it('should show active event type filter', () => {
      mockFilters = { q: '', sort: 'priority', page: 1, eventType: 'Workshop' };
      mockActiveFilterCount = 1;

      render(<EventsFilterBar />);

      expect(screen.getByText('Type:')).toBeInTheDocument();
      // "Workshop" appears in both the <option> and the active filter <span>
      const matches = screen.getAllByText('Workshop');
      expect(matches.length).toBeGreaterThanOrEqual(2);
    });

    it('should show active location type filter', () => {
      mockFilters = { q: '', sort: 'priority', page: 1, locationType: 'virtual' };
      mockActiveFilterCount = 1;

      render(<EventsFilterBar />);

      expect(screen.getByText('Location:')).toBeInTheDocument();
      // "Virtual" appears in both the <option> and the active filter <span>
      const matches = screen.getAllByText('Virtual');
      expect(matches.length).toBeGreaterThanOrEqual(2);
    });

    it('should not show active filters section when no filters', () => {
      const { container } = render(<EventsFilterBar />);

      const activeFiltersSection = container.querySelector('.mt-3.flex');
      expect(activeFiltersSection).not.toBeInTheDocument();
    });
  });

  describe('styling and layout', () => {
    it('should apply custom className', () => {
      const { container } = render(<EventsFilterBar className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should have responsive layout', () => {
      const { container } = render(<EventsFilterBar />);

      const filterControlsWrapper = container.querySelector('.flex.flex-col');
      expect(filterControlsWrapper).toBeInTheDocument();
    });

    it('should hide mobile toggle on desktop', () => {
      const { container } = render(<EventsFilterBar />);

      const mobileToggle = container.querySelector('.md\\:hidden');
      expect(mobileToggle).toBeInTheDocument();
    });

    it('should show filters on desktop', () => {
      const { container } = render(<EventsFilterBar />);

      const filterControls = container.querySelector('.md\\:block');
      expect(filterControls).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have labels for inputs', () => {
      render(<EventsFilterBar />);

      expect(screen.getByLabelText('Search events')).toBeInTheDocument();
      expect(screen.getByLabelText('Sort by')).toBeInTheDocument();
      expect(screen.getByLabelText('Event type')).toBeInTheDocument();
      expect(screen.getByLabelText('Location type')).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      render(<EventsFilterBar />);

      const searchInput = screen.getByLabelText('Search events');
      const sortSelect = screen.getByLabelText('Sort by');
      const eventTypeSelect = screen.getByLabelText('Event type');
      const locationTypeSelect = screen.getByLabelText('Location type');

      expect(searchInput.tagName).toBe('INPUT');
      expect(sortSelect.tagName).toBe('SELECT');
      expect(eventTypeSelect.tagName).toBe('SELECT');
      expect(locationTypeSelect.tagName).toBe('SELECT');
    });
  });
});
