/**
 * TrendingBadge - Component Tests
 *
 * @tier SIMPLE
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests trending badge variants (default, hot, compact).
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrendingBadge } from '../TrendingBadge';

describe('TrendingBadge', () => {
  describe('default variant', () => {
    it('renders "Trending" text', () => {
      render(<TrendingBadge />);

      expect(screen.getByText('Trending')).toBeInTheDocument();
    });

    it('applies default styling', () => {
      const { container } = render(<TrendingBadge variant="default" />);

      const badge = container.querySelector('span');
      expect(badge).toHaveClass('bg-orange-100', 'text-orange-700');
    });

    it('renders TrendingUp icon', () => {
      const { container } = render(<TrendingBadge />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('hot variant', () => {
    it('renders "Hot Deal!" text', () => {
      render(<TrendingBadge variant="hot" />);

      expect(screen.getByText('Hot Deal!')).toBeInTheDocument();
    });

    it('applies hot styling with gradient', () => {
      const { container } = render(<TrendingBadge variant="hot" />);

      const badge = container.querySelector('span');
      expect(badge).toHaveClass('bg-gradient-to-r', 'from-red-500', 'to-orange-500', 'animate-pulse');
    });

    it('renders Flame icon', () => {
      render(<TrendingBadge variant="hot" />);

      // Flame icon should be present
      expect(screen.getByText('Hot Deal!')).toBeInTheDocument();
    });
  });

  describe('compact variant', () => {
    it('renders "Trending" text', () => {
      render(<TrendingBadge variant="compact" />);

      expect(screen.getByText('Trending')).toBeInTheDocument();
    });

    it('applies compact styling', () => {
      const { container } = render(<TrendingBadge variant="compact" />);

      const badge = container.querySelector('span');
      expect(badge).toHaveClass('bg-orange-100', 'text-orange-700', 'rounded-full', 'text-xs');
    });
  });

  describe('custom className', () => {
    it('applies custom className to default variant', () => {
      const { container } = render(<TrendingBadge className="custom-class" />);

      const badge = container.querySelector('span');
      expect(badge).toHaveClass('custom-class');
    });

    it('applies custom className to hot variant', () => {
      const { container } = render(<TrendingBadge variant="hot" className="custom-hot" />);

      const badge = container.querySelector('span');
      expect(badge).toHaveClass('custom-hot');
    });

    it('applies custom className to compact variant', () => {
      const { container } = render(<TrendingBadge variant="compact" className="custom-compact" />);

      const badge = container.querySelector('span');
      expect(badge).toHaveClass('custom-compact');
    });
  });
});
