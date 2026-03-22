/**
 * ConnectionClaimsBadge - Component Tests
 *
 * @tier SIMPLE
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests connection claims badge rendering and maxDisplay limiting.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectionClaimsBadge } from '../ConnectionClaimsBadge';

describe('ConnectionClaimsBadge', () => {
  describe('rendering', () => {
    it('renders connection count', () => {
      render(<ConnectionClaimsBadge count={3} />);

      expect(screen.getByText(/3/)).toBeInTheDocument();
      expect(screen.getByText(/friends claimed this/)).toBeInTheDocument();
    });

    it('renders "friend" for single connection', () => {
      render(<ConnectionClaimsBadge count={1} />);

      expect(screen.getByText(/1/)).toBeInTheDocument();
      expect(screen.getByText(/friend claimed this/)).toBeInTheDocument();
    });

    it('renders Users icon', () => {
      const { container } = render(<ConnectionClaimsBadge count={3} />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('applies correct styling', () => {
      const { container } = render(<ConnectionClaimsBadge count={3} />);

      const badge = container.querySelector('span');
      expect(badge).toHaveClass('bg-blue-50', 'text-blue-700');
    });
  });

  describe('maxDisplay limiting', () => {
    it('shows exact count when under maxDisplay', () => {
      render(<ConnectionClaimsBadge count={3} maxDisplay={5} />);

      expect(screen.getByText(/^3$/)).toBeInTheDocument();
    });

    it('shows "maxDisplay+" when over maxDisplay', () => {
      render(<ConnectionClaimsBadge count={10} maxDisplay={5} />);

      expect(screen.getByText(/5\+/)).toBeInTheDocument();
    });

    it('defaults to maxDisplay of 5', () => {
      render(<ConnectionClaimsBadge count={8} />);

      expect(screen.getByText(/5\+/)).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('renders nothing when count is 0', () => {
      const { container } = render(<ConnectionClaimsBadge count={0} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('custom className', () => {
    it('applies custom className', () => {
      const { container } = render(<ConnectionClaimsBadge count={3} className="custom-class" />);

      const badge = container.querySelector('span');
      expect(badge).toHaveClass('custom-class');
    });
  });
});
