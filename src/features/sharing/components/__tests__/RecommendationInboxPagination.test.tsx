/**
 * Unit tests for RecommendationInboxPagination component
 *
 * Tests pagination controls, navigation, disabled states, and display text.
 *
 * @tier SIMPLE
 * @phase Technical Debt Remediation - Phase 5 (P3: Component Tests)
 * @coverage 80%+ target
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecommendationInboxPagination } from '../RecommendationInboxPagination';

describe('RecommendationInboxPagination', () => {
  const mockOnPageChange = vi.fn();

  const defaultProps = {
    currentPage: 1,
    totalPages: 5,
    total: 50,
    pageSize: 10,
    onPageChange: mockOnPageChange
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Render States
  // ============================================================================
  describe('Render States', () => {
    it('renders pagination controls', () => {
      render(<RecommendationInboxPagination {...defaultProps} />);

      expect(screen.getByText('Page 1 of 5')).toBeInTheDocument();
    });

    it('returns null when totalPages is 1', () => {
      const { container } = render(
        <RecommendationInboxPagination {...defaultProps} totalPages={1} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('returns null when totalPages is 0', () => {
      const { container } = render(
        <RecommendationInboxPagination {...defaultProps} totalPages={0} />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  // ============================================================================
  // Display Text
  // ============================================================================
  describe('Display Text', () => {
    it('shows correct item range on first page', () => {
      render(<RecommendationInboxPagination {...defaultProps} currentPage={1} />);
      expect(screen.getByText('Showing 1 to 10 of 50 recommendations')).toBeInTheDocument();
    });

    it('shows correct item range on middle page', () => {
      render(<RecommendationInboxPagination {...defaultProps} currentPage={3} />);
      expect(screen.getByText('Showing 21 to 30 of 50 recommendations')).toBeInTheDocument();
    });

    it('shows correct item range on last page with partial results', () => {
      render(
        <RecommendationInboxPagination
          {...defaultProps}
          currentPage={5}
          total={45}
        />
      );
      expect(screen.getByText('Showing 41 to 45 of 45 recommendations')).toBeInTheDocument();
    });

    it('shows current page number', () => {
      render(<RecommendationInboxPagination {...defaultProps} currentPage={3} />);
      expect(screen.getByText('Page 3 of 5')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Previous Button
  // ============================================================================
  describe('Previous Button', () => {
    it('is disabled on first page', () => {
      render(<RecommendationInboxPagination {...defaultProps} currentPage={1} />);

      const buttons = screen.getAllByRole('button');
      const prevButton = buttons[0];
      expect(prevButton).toBeDisabled();
    });

    it('is enabled on page 2 and above', () => {
      render(<RecommendationInboxPagination {...defaultProps} currentPage={2} />);

      const buttons = screen.getAllByRole('button');
      const prevButton = buttons[0];
      expect(prevButton).not.toBeDisabled();
    });

    it('calls onPageChange with previous page number', () => {
      render(<RecommendationInboxPagination {...defaultProps} currentPage={3} />);

      const buttons = screen.getAllByRole('button');
      const prevButton = buttons[0];
      fireEvent.click(prevButton);

      expect(mockOnPageChange).toHaveBeenCalledWith(2);
    });
  });

  // ============================================================================
  // Next Button
  // ============================================================================
  describe('Next Button', () => {
    it('is disabled on last page', () => {
      render(<RecommendationInboxPagination {...defaultProps} currentPage={5} />);

      const buttons = screen.getAllByRole('button');
      const nextButton = buttons[1];
      expect(nextButton).toBeDisabled();
    });

    it('is enabled on pages before last', () => {
      render(<RecommendationInboxPagination {...defaultProps} currentPage={4} />);

      const buttons = screen.getAllByRole('button');
      const nextButton = buttons[1];
      expect(nextButton).not.toBeDisabled();
    });

    it('calls onPageChange with next page number', () => {
      render(<RecommendationInboxPagination {...defaultProps} currentPage={2} />);

      const buttons = screen.getAllByRole('button');
      const nextButton = buttons[1];
      fireEvent.click(nextButton);

      expect(mockOnPageChange).toHaveBeenCalledWith(3);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    it('handles total less than pageSize', () => {
      render(
        <RecommendationInboxPagination
          currentPage={1}
          totalPages={2}
          total={15}
          pageSize={10}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByText('Showing 1 to 10 of 15 recommendations')).toBeInTheDocument();
    });

    it('handles exactly one full page remaining', () => {
      render(
        <RecommendationInboxPagination
          currentPage={5}
          totalPages={5}
          total={50}
          pageSize={10}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByText('Showing 41 to 50 of 50 recommendations')).toBeInTheDocument();
    });
  });
});
