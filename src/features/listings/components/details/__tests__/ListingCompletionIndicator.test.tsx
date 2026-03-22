/**
 * ListingCompletionIndicator Unit Tests
 *
 * @phase Claim Listing Phase 8
 * @tier STANDARD
 * @coverage 16 test cases
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ListingCompletionIndicator } from '../ListingCompletionIndicator';
import type { ListingCompletionResult } from '../../utils/calculateListingCompleteness';

describe('ListingCompletionIndicator', () => {
  const createCompletion = (percentage: number, missingRequired = 0, missingOptional = 0): ListingCompletionResult => ({
    percentage,
    missingRequired: Array(missingRequired).fill(null).map((_, i) => ({
      key: `field_${i}` as any,
      label: `Field ${i + 1}`,
      weight: 0.1,
      required: true,
    })),
    missingOptional: Array(missingOptional).fill(null).map((_, i) => ({
      key: `opt_field_${i}` as any,
      label: `Optional Field ${i + 1}`,
      weight: 0.05,
      required: false,
    })),
    completedRequired: 7 - missingRequired,
    completedOptional: 7 - missingOptional,
    totalRequired: 7,
    totalOptional: 7,
  });

  const mockOnEditClick = vi.fn();

  describe('Visibility', () => {
    it('returns null when percentage >= 100', () => {
      const completion = createCompletion(100);
      const { container } = render(
        <ListingCompletionIndicator
          completion={completion}
          onEditClick={mockOnEditClick}
          variant="compact"
          isOwner={true}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('returns null when isOwner is false', () => {
      const completion = createCompletion(50, 3);
      const { container } = render(
        <ListingCompletionIndicator
          completion={completion}
          onEditClick={mockOnEditClick}
          variant="compact"
          isOwner={false}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders when percentage < 100 and isOwner is true', () => {
      const completion = createCompletion(75);
      render(
        <ListingCompletionIndicator
          completion={completion}
          onEditClick={mockOnEditClick}
          variant="compact"
          isOwner={true}
        />
      );

      expect(screen.getByText('Listing Completion')).toBeInTheDocument();
    });
  });

  describe('Compact Variant', () => {
    it('displays percentage correctly', () => {
      const completion = createCompletion(65);
      render(
        <ListingCompletionIndicator
          completion={completion}
          onEditClick={mockOnEditClick}
          variant="compact"
          isOwner={true}
        />
      );

      expect(screen.getByText('65%')).toBeInTheDocument();
    });

    it('shows correct missing field count', () => {
      const completion = createCompletion(50, 3);
      render(
        <ListingCompletionIndicator
          completion={completion}
          onEditClick={mockOnEditClick}
          variant="compact"
          isOwner={true}
        />
      );

      expect(screen.getByText(/3 required fields missing/i)).toBeInTheDocument();
    });

    it('renders progress bar with correct width', () => {
      const completion = createCompletion(75);
      const { container } = render(
        <ListingCompletionIndicator
          completion={completion}
          onEditClick={mockOnEditClick}
          variant="compact"
          isOwner={true}
        />
      );

      const progressBar = container.querySelector('.bg-yellow-500');
      expect(progressBar).toHaveStyle({ width: '75%' });
    });

    it('calls onEditClick when link clicked', () => {
      const completion = createCompletion(50, 2);
      render(
        <ListingCompletionIndicator
          completion={completion}
          onEditClick={mockOnEditClick}
          variant="compact"
          isOwner={true}
        />
      );

      const editButton = screen.getByRole('button', { name: /complete your listing/i });
      fireEvent.click(editButton);

      expect(mockOnEditClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Detailed Variant', () => {
    it('displays percentage correctly', () => {
      const completion = createCompletion(80);
      render(
        <ListingCompletionIndicator
          completion={completion}
          onEditClick={mockOnEditClick}
          variant="detailed"
          isOwner={true}
        />
      );

      expect(screen.getByText('80%')).toBeInTheDocument();
    });

    it('shows completed/total field counts', () => {
      const completion = createCompletion(70, 2, 1);
      render(
        <ListingCompletionIndicator
          completion={completion}
          onEditClick={mockOnEditClick}
          variant="detailed"
          isOwner={true}
        />
      );

      expect(screen.getByText(/5\/7 required fields completed/i)).toBeInTheDocument();
      expect(screen.getByText(/6\/7 optional fields completed/i)).toBeInTheDocument();
    });

    it('lists missing required fields (max 3)', () => {
      const completion = createCompletion(60, 2);
      render(
        <ListingCompletionIndicator
          completion={completion}
          onEditClick={mockOnEditClick}
          variant="detailed"
          isOwner={true}
        />
      );

      expect(screen.getByText(/missing required fields/i)).toBeInTheDocument();
      expect(screen.getByText('Field 1')).toBeInTheDocument();
      expect(screen.getByText('Field 2')).toBeInTheDocument();
    });

    it('shows "+N more..." when > 3 missing fields', () => {
      const completion = createCompletion(40, 5);
      render(
        <ListingCompletionIndicator
          completion={completion}
          onEditClick={mockOnEditClick}
          variant="detailed"
          isOwner={true}
        />
      );

      expect(screen.getByText(/\+2 more\.\.\./i)).toBeInTheDocument();
    });

    it('calls onEditClick when button clicked', () => {
      mockOnEditClick.mockClear();
      const completion = createCompletion(70, 2);
      render(
        <ListingCompletionIndicator
          completion={completion}
          onEditClick={mockOnEditClick}
          variant="detailed"
          isOwner={true}
        />
      );

      const editButton = screen.getByRole('button', { name: /complete your listing/i });
      fireEvent.click(editButton);

      expect(mockOnEditClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Progress Colors', () => {
    it('shows green for >= 80%', () => {
      const completion = createCompletion(85);
      const { container } = render(
        <ListingCompletionIndicator
          completion={completion}
          onEditClick={mockOnEditClick}
          variant="compact"
          isOwner={true}
        />
      );

      const progressBar = container.querySelector('.bg-green-500');
      expect(progressBar).toBeInTheDocument();
    });

    it('shows yellow for >= 60%', () => {
      const completion = createCompletion(65);
      const { container } = render(
        <ListingCompletionIndicator
          completion={completion}
          onEditClick={mockOnEditClick}
          variant="compact"
          isOwner={true}
        />
      );

      const progressBar = container.querySelector('.bg-yellow-500');
      expect(progressBar).toBeInTheDocument();
    });

    it('shows orange for >= 40%', () => {
      const completion = createCompletion(45);
      const { container } = render(
        <ListingCompletionIndicator
          completion={completion}
          onEditClick={mockOnEditClick}
          variant="compact"
          isOwner={true}
        />
      );

      const progressBar = container.querySelector('.bg-orange-500');
      expect(progressBar).toBeInTheDocument();
    });

    it('shows red for < 40%', () => {
      const completion = createCompletion(35);
      const { container } = render(
        <ListingCompletionIndicator
          completion={completion}
          onEditClick={mockOnEditClick}
          variant="compact"
          isOwner={true}
        />
      );

      const progressBar = container.querySelector('.bg-red-500');
      expect(progressBar).toBeInTheDocument();
    });
  });
});
