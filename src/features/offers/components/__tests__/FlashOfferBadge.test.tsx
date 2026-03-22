/**
 * FlashOfferBadge - Component Tests
 *
 * @tier SIMPLE
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests rendering, urgency level styling, icon display, and missing urgency handling.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FlashOfferBadge from '../FlashOfferBadge';

describe('FlashOfferBadge', () => {
  describe('rendering', () => {
    it('renders "FLASH DEAL" text', () => {
      render(<FlashOfferBadge />);

      expect(screen.getByText('FLASH DEAL')).toBeInTheDocument();
    });

    it('renders Zap icon', () => {
      const { container } = render(<FlashOfferBadge />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('has correct ARIA attributes', () => {
      const { container } = render(<FlashOfferBadge />);

      const badge = container.querySelector('span[role="status"]');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('urgency level styling', () => {
    it('applies normal urgency styling', () => {
      const { container } = render(<FlashOfferBadge urgencyLevel="normal" />);

      const badge = container.querySelector('span');
      expect(badge).toHaveClass('bg-orange-500');
      expect(badge).toHaveClass('text-white');
      expect(badge).not.toHaveClass('animate-pulse');
    });

    it('applies high urgency styling', () => {
      const { container } = render(<FlashOfferBadge urgencyLevel="high" />);

      const badge = container.querySelector('span');
      expect(badge).toHaveClass('bg-red-500');
      expect(badge).toHaveClass('text-white');
      expect(badge).toHaveClass('animate-pulse');
    });

    it('applies critical urgency styling', () => {
      const { container } = render(<FlashOfferBadge urgencyLevel="critical" />);

      const badge = container.querySelector('span');
      expect(badge).toHaveClass('bg-red-700');
      expect(badge).toHaveClass('text-white');
      expect(badge).toHaveClass('animate-pulse');
      expect(badge).toHaveClass('font-bold');
    });

    it('defaults to normal urgency when not specified', () => {
      const { container } = render(<FlashOfferBadge />);

      const badge = container.querySelector('span');
      expect(badge).toHaveClass('bg-orange-500');
    });
  });

  describe('edge cases', () => {
    it('handles custom className', () => {
      const { container } = render(<FlashOfferBadge className="custom-class" />);

      const badge = container.querySelector('span');
      expect(badge).toHaveClass('custom-class');
    });

    it('combines custom className with urgency styling', () => {
      const { container } = render(
        <FlashOfferBadge urgencyLevel="high" className="my-custom" />
      );

      const badge = container.querySelector('span');
      expect(badge).toHaveClass('bg-red-500');
      expect(badge).toHaveClass('my-custom');
    });
  });
});
