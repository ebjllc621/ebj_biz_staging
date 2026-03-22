/**
 * LoyaltyTierBadge - Component Tests
 *
 * @tier SIMPLE
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests loyalty tier badge rendering with tier-specific styling.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoyaltyTierBadge from '../LoyaltyTierBadge';
import type { LoyaltyTier } from '@features/offers/types';

describe('LoyaltyTierBadge', () => {
  describe('tier rendering', () => {
    it('renders Bronze tier correctly', () => {
      const { container } = render(<LoyaltyTierBadge tier="bronze" />);

      expect(screen.getByText('Bronze Member')).toBeInTheDocument();
      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveClass('bg-orange-100', 'text-orange-700', 'border-orange-300');
      expect(screen.getByText('🥉')).toBeInTheDocument();
    });

    it('renders Silver tier correctly', () => {
      const { container } = render(<LoyaltyTierBadge tier="silver" />);

      expect(screen.getByText('Silver Member')).toBeInTheDocument();
      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-700', 'border-gray-400');
      expect(screen.getByText('🥈')).toBeInTheDocument();
    });

    it('renders Gold tier correctly', () => {
      const { container } = render(<LoyaltyTierBadge tier="gold" />);

      expect(screen.getByText('Gold Member')).toBeInTheDocument();
      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-700', 'border-yellow-400');
      expect(screen.getByText('🥇')).toBeInTheDocument();
    });

    it('renders Platinum tier correctly', () => {
      const { container } = render(<LoyaltyTierBadge tier="platinum" />);

      expect(screen.getByText('Platinum Member')).toBeInTheDocument();
      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveClass('bg-purple-100', 'text-purple-700', 'border-purple-400');
      expect(screen.getByText('💎')).toBeInTheDocument();
    });

    it('renders nothing for "new" tier', () => {
      const { container } = render(<LoyaltyTierBadge tier="new" />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('accessibility', () => {
    it('has role="status"', () => {
      const { container } = render(<LoyaltyTierBadge tier="gold" />);

      const badge = container.querySelector('[role="status"]');
      expect(badge).toBeInTheDocument();
    });

    it('has descriptive aria-label', () => {
      const { container } = render(<LoyaltyTierBadge tier="silver" />);

      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveAttribute('aria-label', 'Silver loyalty tier');
    });

    it('hides emoji icon from screen readers', () => {
      render(<LoyaltyTierBadge tier="bronze" />);

      const emoji = screen.getByText('🥉');
      expect(emoji).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('custom className', () => {
    it('applies custom className', () => {
      const { container } = render(<LoyaltyTierBadge tier="gold" className="custom-class" />);

      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveClass('custom-class');
    });
  });
});
