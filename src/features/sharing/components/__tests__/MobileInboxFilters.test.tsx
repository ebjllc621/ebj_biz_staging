/**
 * Unit tests for MobileInboxFilters component
 *
 * Tests filter pills, badge counts, and touch interactions.
 *
 * @tier SIMPLE
 * @phase Technical Debt Remediation - Phase 5 (P3: Component Tests)
 * @coverage 80%+ target
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileInboxFilters } from '../MobileInboxFilters';

// Mock navigator.vibrate
const mockVibrate = vi.fn();

describe('MobileInboxFilters', () => {
  const mockOnFilterChange = vi.fn();

  const defaultProps = {
    activeFilter: 'all' as const,
    onFilterChange: mockOnFilterChange,
    counts: {
      all: 15,
      unread: 5,
      saved: 3
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock navigator.vibrate
    Object.defineProperty(navigator, 'vibrate', {
      value: mockVibrate,
      configurable: true,
      writable: true
    });
  });

  // ============================================================================
  // Filter Pills Rendering
  // ============================================================================
  describe('Filter Pills Rendering', () => {
    it('renders all filter pills', () => {
      render(<MobileInboxFilters {...defaultProps} />);

      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Unread')).toBeInTheDocument();
      expect(screen.getByText('Saved')).toBeInTheDocument();
    });

    it('renders pills as buttons', () => {
      render(<MobileInboxFilters {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);
    });
  });

  // ============================================================================
  // Active State
  // ============================================================================
  describe('Active State', () => {
    it('applies active styles to current filter', () => {
      render(<MobileInboxFilters {...defaultProps} activeFilter="all" />);

      const allButton = screen.getByText('All').closest('button');
      expect(allButton).toHaveClass('bg-blue-600', 'text-white');
    });

    it('applies inactive styles to non-active filters', () => {
      render(<MobileInboxFilters {...defaultProps} activeFilter="all" />);

      const unreadButton = screen.getByText('Unread').closest('button');
      expect(unreadButton).toHaveClass('bg-gray-100', 'text-gray-700');
    });

    it('highlights unread filter when active', () => {
      render(<MobileInboxFilters {...defaultProps} activeFilter="unread" />);

      const unreadButton = screen.getByText('Unread').closest('button');
      expect(unreadButton).toHaveClass('bg-blue-600', 'text-white');
    });

    it('highlights saved filter when active', () => {
      render(<MobileInboxFilters {...defaultProps} activeFilter="saved" />);

      const savedButton = screen.getByText('Saved').closest('button');
      expect(savedButton).toHaveClass('bg-blue-600', 'text-white');
    });
  });

  // ============================================================================
  // Badge Counts
  // ============================================================================
  describe('Badge Counts', () => {
    it('renders badge counts', () => {
      render(<MobileInboxFilters {...defaultProps} />);

      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('does not render badge when count is 0', () => {
      const countsWithZero = { all: 0, unread: 5, saved: 3 };
      render(
        <MobileInboxFilters
          {...defaultProps}
          counts={countsWithZero}
        />
      );

      // All button should not have a badge span
      const allButton = screen.getByText('All').closest('button');
      const badge = allButton?.querySelector('.rounded-full');
      expect(badge).toBeNull();
    });

    it('shows 99+ for counts over 99', () => {
      const largeCounts = { all: 150, unread: 5, saved: 3 };
      render(
        <MobileInboxFilters
          {...defaultProps}
          counts={largeCounts}
        />
      );

      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('applies active badge styles', () => {
      render(<MobileInboxFilters {...defaultProps} activeFilter="all" />);

      const allButton = screen.getByText('All').closest('button');
      const badge = allButton?.querySelector('.rounded-full');
      expect(badge).toHaveClass('bg-white', 'text-blue-600');
    });

    it('applies inactive badge styles', () => {
      render(<MobileInboxFilters {...defaultProps} activeFilter="all" />);

      const unreadButton = screen.getByText('Unread').closest('button');
      const badge = unreadButton?.querySelector('.rounded-full');
      expect(badge).toHaveClass('bg-gray-200', 'text-gray-700');
    });
  });

  // ============================================================================
  // Filter Change
  // ============================================================================
  describe('Filter Change', () => {
    it('calls onFilterChange with correct filter when clicked', () => {
      render(<MobileInboxFilters {...defaultProps} />);

      fireEvent.click(screen.getByText('Unread'));
      expect(mockOnFilterChange).toHaveBeenCalledWith('unread');

      fireEvent.click(screen.getByText('Saved'));
      expect(mockOnFilterChange).toHaveBeenCalledWith('saved');

      fireEvent.click(screen.getByText('All'));
      expect(mockOnFilterChange).toHaveBeenCalledWith('all');
    });

    it('triggers haptic feedback on click', () => {
      render(<MobileInboxFilters {...defaultProps} />);

      fireEvent.click(screen.getByText('Unread'));

      expect(mockVibrate).toHaveBeenCalledWith(5);
    });
  });

  // ============================================================================
  // Touch Targets
  // ============================================================================
  describe('Touch Targets', () => {
    it('has minimum touch target size of 44px', () => {
      render(<MobileInboxFilters {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveClass('min-h-[44px]');
      });
    });
  });
});
