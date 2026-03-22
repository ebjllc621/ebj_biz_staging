/**
 * Unit tests for HelpfulRatingButtons component
 *
 * Tests rating interactions, loading states, disabled states, and already-rated display.
 *
 * @tier SIMPLE
 * @phase Technical Debt Remediation - Phase 5 (P3: Component Tests)
 * @coverage 80%+ target
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HelpfulRatingButtons } from '../HelpfulRatingButtons';

describe('HelpfulRatingButtons', () => {
  const mockOnRate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Initial State (Not Rated)
  // ============================================================================
  describe('Initial State (Not Rated)', () => {
    it('renders "Was this helpful?" text when not rated', () => {
      render(<HelpfulRatingButtons currentRating={null} onRate={mockOnRate} />);
      expect(screen.getByText('Was this helpful?')).toBeInTheDocument();
    });

    it('renders thumbs up button', () => {
      render(<HelpfulRatingButtons currentRating={null} onRate={mockOnRate} />);
      expect(screen.getByTitle('Yes, helpful')).toBeInTheDocument();
    });

    it('renders thumbs down button', () => {
      render(<HelpfulRatingButtons currentRating={null} onRate={mockOnRate} />);
      expect(screen.getByTitle('Not helpful')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Rating Interactions
  // ============================================================================
  describe('Rating Interactions', () => {
    it('calls onRate with true when thumbs up clicked', async () => {
      mockOnRate.mockResolvedValueOnce(undefined);
      render(<HelpfulRatingButtons currentRating={null} onRate={mockOnRate} />);

      fireEvent.click(screen.getByTitle('Yes, helpful'));

      await waitFor(() => {
        expect(mockOnRate).toHaveBeenCalledWith(true);
      });
    });

    it('calls onRate with false when thumbs down clicked', async () => {
      mockOnRate.mockResolvedValueOnce(undefined);
      render(<HelpfulRatingButtons currentRating={null} onRate={mockOnRate} />);

      fireEvent.click(screen.getByTitle('Not helpful'));

      await waitFor(() => {
        expect(mockOnRate).toHaveBeenCalledWith(false);
      });
    });

    it('does not call onRate when already rated', () => {
      render(<HelpfulRatingButtons currentRating={true} onRate={mockOnRate} />);

      // Already rated - buttons shouldn't exist
      expect(screen.queryByTitle('Yes, helpful')).not.toBeInTheDocument();
      expect(mockOnRate).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Loading State
  // ============================================================================
  describe('Loading State', () => {
    it('shows loading state while rating', async () => {
      // Create a promise that we can control
      let resolveRate: () => void;
      const ratePromise = new Promise<void>((resolve) => {
        resolveRate = resolve;
      });
      mockOnRate.mockReturnValue(ratePromise);

      render(<HelpfulRatingButtons currentRating={null} onRate={mockOnRate} />);

      fireEvent.click(screen.getByTitle('Yes, helpful'));

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Rating...')).toBeInTheDocument();
      });

      // Resolve the promise
      resolveRate!();

      await waitFor(() => {
        expect(screen.queryByText('Rating...')).not.toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Already Rated States
  // ============================================================================
  describe('Already Rated States', () => {
    it('shows "Marked as helpful" when rated true', () => {
      render(<HelpfulRatingButtons currentRating={true} onRate={mockOnRate} />);
      expect(screen.getByText('Marked as helpful')).toBeInTheDocument();
    });

    it('shows "Rated" when rated false', () => {
      render(<HelpfulRatingButtons currentRating={false} onRate={mockOnRate} />);
      expect(screen.getByText('Rated')).toBeInTheDocument();
    });

    it('hides rating buttons when already rated', () => {
      render(<HelpfulRatingButtons currentRating={true} onRate={mockOnRate} />);
      expect(screen.queryByTitle('Yes, helpful')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Not helpful')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Disabled State
  // ============================================================================
  describe('Disabled State', () => {
    it('disables buttons when disabled prop is true', () => {
      render(<HelpfulRatingButtons currentRating={null} onRate={mockOnRate} disabled={true} />);

      const helpfulButton = screen.getByTitle('Yes, helpful');
      const notHelpfulButton = screen.getByTitle('Not helpful');

      expect(helpfulButton).toBeDisabled();
      expect(notHelpfulButton).toBeDisabled();
    });

    it('does not call onRate when disabled and clicked', () => {
      render(<HelpfulRatingButtons currentRating={null} onRate={mockOnRate} disabled={true} />);

      fireEvent.click(screen.getByTitle('Yes, helpful'));
      expect(mockOnRate).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    it('prevents duplicate ratings on double-click', async () => {
      let resolveRate: () => void;
      const ratePromise = new Promise<void>((resolve) => {
        resolveRate = resolve;
      });
      mockOnRate.mockReturnValue(ratePromise);

      render(<HelpfulRatingButtons currentRating={null} onRate={mockOnRate} />);

      const helpfulButton = screen.getByTitle('Yes, helpful');

      // Click twice rapidly
      fireEvent.click(helpfulButton);
      fireEvent.click(helpfulButton);

      // Should only call once
      expect(mockOnRate).toHaveBeenCalledTimes(1);

      resolveRate!();
    });
  });
});
