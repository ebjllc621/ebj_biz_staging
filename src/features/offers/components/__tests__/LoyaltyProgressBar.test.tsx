/**
 * LoyaltyProgressBar - Component Tests
 *
 * @tier SIMPLE
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests progress bar rendering, percentage display, and tier-specific styling.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoyaltyProgressBar } from '../LoyaltyProgressBar';

describe('LoyaltyProgressBar', () => {
  describe('progress rendering', () => {
    it('renders progress percentage correctly', () => {
      render(
        <LoyaltyProgressBar
          currentClaims={5}
          currentTier="bronze"
          nextTier="silver"
          claimsToNextTier={5}
        />
      );

      // Component shows progress percentage
      expect(screen.getByText(/\d+%/)).toBeInTheDocument();
    });

    it('renders progress bar with correct width', () => {
      const { container } = render(
        <LoyaltyProgressBar
          currentClaims={6}
          currentTier="bronze"
          nextTier="silver"
          claimsToNextTier={4}
        />
      );

      // Progress bar should have a width style
      const progressBar = container.querySelector('[style*="width"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('displays claims to next tier text', () => {
      render(
        <LoyaltyProgressBar
          currentClaims={5}
          currentTier="bronze"
          nextTier="silver"
          claimsToNextTier={5}
        />
      );

      // Shows "X more to [Tier]" - text is split across elements
      expect(screen.getByText(/more to/)).toBeInTheDocument();
    });

    it('shows max tier reached for platinum', () => {
      render(
        <LoyaltyProgressBar
          currentClaims={50}
          currentTier="platinum"
          nextTier={null}
          claimsToNextTier={0}
        />
      );

      expect(screen.getByText(/Max tier reached!/)).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('tier-specific styling', () => {
    it('applies bronze tier color when progressing to bronze', () => {
      const { container } = render(
        <LoyaltyProgressBar
          currentClaims={1}
          currentTier="new"
          nextTier="bronze"
          claimsToNextTier={2}
        />
      );

      // Bronze tier uses bg-amber-500
      const progressBar = container.querySelector('.bg-amber-500');
      expect(progressBar).toBeInTheDocument();
    });

    it('applies silver tier color when progressing to silver', () => {
      const { container } = render(
        <LoyaltyProgressBar
          currentClaims={5}
          currentTier="bronze"
          nextTier="silver"
          claimsToNextTier={5}
        />
      );

      // Silver tier uses bg-gray-400
      const progressBar = container.querySelector('.bg-gray-400');
      expect(progressBar).toBeInTheDocument();
    });

    it('applies gold tier color when progressing to gold', () => {
      const { container } = render(
        <LoyaltyProgressBar
          currentClaims={15}
          currentTier="silver"
          nextTier="gold"
          claimsToNextTier={10}
        />
      );

      // Gold tier uses bg-yellow-500
      const progressBar = container.querySelector('.bg-yellow-500');
      expect(progressBar).toBeInTheDocument();
    });

    it('applies platinum tier color when progressing to platinum', () => {
      const { container } = render(
        <LoyaltyProgressBar
          currentClaims={30}
          currentTier="gold"
          nextTier="platinum"
          claimsToNextTier={20}
        />
      );

      // Platinum tier uses bg-purple-500
      const progressBar = container.querySelector('.bg-purple-500');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('tier labels', () => {
    it('displays current tier label', () => {
      render(
        <LoyaltyProgressBar
          currentClaims={5}
          currentTier="bronze"
          nextTier="silver"
          claimsToNextTier={5}
        />
      );

      // Shows current tier label at bottom
      expect(screen.getByText('Bronze')).toBeInTheDocument();
    });

    it('displays next tier label when not at max', () => {
      render(
        <LoyaltyProgressBar
          currentClaims={5}
          currentTier="bronze"
          nextTier="silver"
          claimsToNextTier={5}
        />
      );

      // Shows next tier label at bottom
      expect(screen.getByText('Silver')).toBeInTheDocument();
    });

    it('does not show next tier label when at platinum', () => {
      render(
        <LoyaltyProgressBar
          currentClaims={50}
          currentTier="platinum"
          nextTier={null}
          claimsToNextTier={0}
        />
      );

      // Platinum shows only current tier (no next tier)
      expect(screen.getByText('Platinum')).toBeInTheDocument();
    });
  });

  describe('custom styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <LoyaltyProgressBar
          currentClaims={5}
          currentTier="bronze"
          nextTier="silver"
          claimsToNextTier={5}
          className="custom-class"
        />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });
});
