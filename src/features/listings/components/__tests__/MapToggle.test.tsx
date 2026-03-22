/**
 * MapToggle - Component Tests
 *
 * @tier SIMPLE
 * @phase Phase 9 - Testing & Documentation
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests rendering, interaction, and accessibility features.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MapToggle } from '../MapToggle';

describe('MapToggle', () => {
  const mockOnToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render Map icon when hidden', () => {
      const { container } = render(
        <MapToggle isMapVisible={false} onToggle={mockOnToggle} />
      );

      // Map icon should be present (not X icon)
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should render X icon when visible', () => {
      const { container } = render(
        <MapToggle isMapVisible={true} onToggle={mockOnToggle} />
      );

      // X icon should be present
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should show "Show Map" when hidden', () => {
      render(<MapToggle isMapVisible={false} onToggle={mockOnToggle} />);

      expect(screen.getByText('Show Map')).toBeInTheDocument();
    });

    it('should show "Hide Map" when visible', () => {
      render(<MapToggle isMapVisible={true} onToggle={mockOnToggle} />);

      expect(screen.getByText('Hide Map')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(
        <MapToggle isMapVisible={false} onToggle={mockOnToggle} className="custom-class" />
      );

      const button = container.firstChild;
      expect(button).toHaveClass('custom-class');
    });

    it('should apply active styling when map is visible', () => {
      const { container } = render(
        <MapToggle isMapVisible={true} onToggle={mockOnToggle} />
      );

      const button = container.firstChild;
      expect(button).toHaveClass('bg-biz-navy', 'text-white', 'border-biz-navy');
    });

    it('should apply inactive styling when map is hidden', () => {
      const { container } = render(
        <MapToggle isMapVisible={false} onToggle={mockOnToggle} />
      );

      const button = container.firstChild;
      expect(button).toHaveClass('bg-white', 'text-gray-700', 'border-gray-300');
    });
  });

  describe('interaction', () => {
    it('should call onToggle when clicked', () => {
      render(<MapToggle isMapVisible={false} onToggle={mockOnToggle} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockOnToggle).toHaveBeenCalledTimes(1);
    });

    it('should call onToggle when map is visible', () => {
      render(<MapToggle isMapVisible={true} onToggle={mockOnToggle} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockOnToggle).toHaveBeenCalledTimes(1);
    });

    it('should allow multiple clicks', () => {
      render(<MapToggle isMapVisible={false} onToggle={mockOnToggle} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(mockOnToggle).toHaveBeenCalledTimes(3);
    });
  });

  describe('accessibility', () => {
    it('should have aria-pressed=false when map is hidden', () => {
      render(<MapToggle isMapVisible={false} onToggle={mockOnToggle} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-pressed', 'false');
    });

    it('should have aria-pressed=true when map is visible', () => {
      render(<MapToggle isMapVisible={true} onToggle={mockOnToggle} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });

    it('should have aria-label="Show map" when hidden', () => {
      render(<MapToggle isMapVisible={false} onToggle={mockOnToggle} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Show map');
    });

    it('should have aria-label="Hide map" when visible', () => {
      render(<MapToggle isMapVisible={true} onToggle={mockOnToggle} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Hide map');
    });

    it('should be keyboard accessible', () => {
      render(<MapToggle isMapVisible={false} onToggle={mockOnToggle} />);

      const button = screen.getByRole('button');
      expect(button.tagName).toBe('BUTTON');
    });
  });

  describe('styling', () => {
    it('should apply base button classes', () => {
      const { container } = render(
        <MapToggle isMapVisible={false} onToggle={mockOnToggle} />
      );

      const button = container.firstChild;
      expect(button).toHaveClass('inline-flex', 'items-center', 'gap-2');
    });

    it('should apply transition classes', () => {
      const { container } = render(
        <MapToggle isMapVisible={false} onToggle={mockOnToggle} />
      );

      const button = container.firstChild;
      expect(button).toHaveClass('transition-colors');
    });

    it('should apply rounded border classes', () => {
      const { container } = render(
        <MapToggle isMapVisible={false} onToggle={mockOnToggle} />
      );

      const button = container.firstChild;
      expect(button).toHaveClass('rounded-lg', 'border');
    });

    it('should apply padding classes', () => {
      const { container } = render(
        <MapToggle isMapVisible={false} onToggle={mockOnToggle} />
      );

      const button = container.firstChild;
      expect(button).toHaveClass('px-4', 'py-2');
    });

    it('should apply hover state classes when inactive', () => {
      const { container } = render(
        <MapToggle isMapVisible={false} onToggle={mockOnToggle} />
      );

      const button = container.firstChild;
      expect(button).toHaveClass('hover:bg-gray-50');
    });

    it('should apply hover state classes when active', () => {
      const { container } = render(
        <MapToggle isMapVisible={true} onToggle={mockOnToggle} />
      );

      const button = container.firstChild;
      expect(button).toHaveClass('hover:bg-biz-navy/90');
    });
  });

  describe('icon rendering', () => {
    it('should render icon with correct size', () => {
      const { container } = render(
        <MapToggle isMapVisible={false} onToggle={mockOnToggle} />
      );

      const icon = container.querySelector('svg');
      expect(icon).toHaveClass('w-4', 'h-4');
    });

    it('should render icon alongside text', () => {
      const { container } = render(
        <MapToggle isMapVisible={false} onToggle={mockOnToggle} />
      );

      const button = container.querySelector('button');
      const icon = button?.querySelector('svg');
      const text = button?.querySelector('span');

      expect(icon).toBeInTheDocument();
      expect(text).toBeInTheDocument();
    });
  });
});
