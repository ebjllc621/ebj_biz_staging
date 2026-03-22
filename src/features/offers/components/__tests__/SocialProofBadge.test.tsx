/**
 * SocialProofBadge - Component Tests
 *
 * @tier SIMPLE
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests "X claimed today" badge rendering, trending variant, and empty state.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SocialProofBadge from '../SocialProofBadge';

describe('SocialProofBadge', () => {
  describe('rendering', () => {
    it('renders claims count correctly', () => {
      render(<SocialProofBadge claimsToday={5} />);

      expect(screen.getByText(/5 claimed today/)).toBeInTheDocument();
    });

    it('renders "claimed" for single claim', () => {
      render(<SocialProofBadge claimsToday={1} />);

      expect(screen.getByText(/1 claimed today/)).toBeInTheDocument();
    });

    it('renders people icon', () => {
      const { container } = render(<SocialProofBadge claimsToday={5} />);

      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('trending variant', () => {
    it('applies trending styling when trending is true', () => {
      const { container } = render(<SocialProofBadge claimsToday={10} trending />);

      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveClass('bg-green-100', 'text-green-700', 'border-green-300');
    });

    it('applies default styling when trending is false', () => {
      const { container } = render(<SocialProofBadge claimsToday={5} trending={false} />);

      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-700', 'border-gray-300');
    });

    it('shows trending icon when trending is true', () => {
      const { container } = render(<SocialProofBadge claimsToday={10} trending />);

      const icons = container.querySelectorAll('svg');
      // Should have 2 icons: people + trending arrow
      expect(icons.length).toBe(2);
    });

    it('does not show trending icon when trending is false', () => {
      const { container } = render(<SocialProofBadge claimsToday={5} trending={false} />);

      const icons = container.querySelectorAll('svg');
      // Should have only 1 icon: people
      expect(icons.length).toBe(1);
    });
  });

  describe('empty state', () => {
    it('renders nothing when claimsToday is 0', () => {
      const { container } = render(<SocialProofBadge claimsToday={0} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('accessibility', () => {
    it('has role="status"', () => {
      const { container } = render(<SocialProofBadge claimsToday={5} />);

      const badge = container.querySelector('[role="status"]');
      expect(badge).toBeInTheDocument();
    });

    it('has aria-label for single claim', () => {
      const { container } = render(<SocialProofBadge claimsToday={1} />);

      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveAttribute('aria-label', '1 person claimed today');
    });

    it('has aria-label for multiple claims', () => {
      const { container } = render(<SocialProofBadge claimsToday={5} />);

      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveAttribute('aria-label', '5 people claimed today');
    });

    it('includes trending in aria-label when trending', () => {
      const { container } = render(<SocialProofBadge claimsToday={10} trending />);

      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveAttribute('aria-label', '10 people claimed today, trending');
    });
  });

  describe('custom className', () => {
    it('applies custom className', () => {
      const { container } = render(<SocialProofBadge claimsToday={5} className="custom-class" />);

      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveClass('custom-class');
    });
  });
});
