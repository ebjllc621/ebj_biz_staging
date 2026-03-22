/**
 * DisplayToggle - Component Tests
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
import { DisplayToggle } from '../DisplayToggle';

describe('DisplayToggle', () => {
  const mockOnModeChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render grid and list buttons', () => {
      render(<DisplayToggle mode="grid" onModeChange={mockOnModeChange} />);

      expect(screen.getByLabelText('Grid view')).toBeInTheDocument();
      expect(screen.getByLabelText('List view')).toBeInTheDocument();
    });

    it('should show active state for grid mode', () => {
      render(<DisplayToggle mode="grid" onModeChange={mockOnModeChange} />);

      const gridButton = screen.getByLabelText('Grid view');
      expect(gridButton).toHaveClass('bg-biz-navy', 'text-white');
    });

    it('should show active state for list mode', () => {
      render(<DisplayToggle mode="list" onModeChange={mockOnModeChange} />);

      const listButton = screen.getByLabelText('List view');
      expect(listButton).toHaveClass('bg-biz-navy', 'text-white');
    });

    it('should show inactive state for non-selected button', () => {
      render(<DisplayToggle mode="grid" onModeChange={mockOnModeChange} />);

      const listButton = screen.getByLabelText('List view');
      expect(listButton).toHaveClass('bg-white', 'text-gray-700');
    });

    it('should render with custom className', () => {
      const { container } = render(
        <DisplayToggle mode="grid" onModeChange={mockOnModeChange} className="custom-class" />
      );

      const toggle = container.firstChild;
      expect(toggle).toHaveClass('custom-class');
    });

    it('should render grid and list icons', () => {
      const { container } = render(<DisplayToggle mode="grid" onModeChange={mockOnModeChange} />);

      // Icons are rendered (checking for SVG elements)
      const icons = container.querySelectorAll('svg');
      expect(icons).toHaveLength(2); // Grid icon + List icon
    });

    it('should render button text on desktop', () => {
      render(<DisplayToggle mode="grid" onModeChange={mockOnModeChange} />);

      // Text is hidden on mobile (sm:inline)
      expect(screen.getByText('Grid')).toBeInTheDocument();
      expect(screen.getByText('List')).toBeInTheDocument();
    });
  });

  describe('interaction', () => {
    it('should call onModeChange with grid when grid button clicked', () => {
      render(<DisplayToggle mode="list" onModeChange={mockOnModeChange} />);

      const gridButton = screen.getByLabelText('Grid view');
      fireEvent.click(gridButton);

      expect(mockOnModeChange).toHaveBeenCalledWith('grid');
      expect(mockOnModeChange).toHaveBeenCalledTimes(1);
    });

    it('should call onModeChange with list when list button clicked', () => {
      render(<DisplayToggle mode="grid" onModeChange={mockOnModeChange} />);

      const listButton = screen.getByLabelText('List view');
      fireEvent.click(listButton);

      expect(mockOnModeChange).toHaveBeenCalledWith('list');
      expect(mockOnModeChange).toHaveBeenCalledTimes(1);
    });

    it('should allow clicking the same mode again', () => {
      render(<DisplayToggle mode="grid" onModeChange={mockOnModeChange} />);

      const gridButton = screen.getByLabelText('Grid view');
      fireEvent.click(gridButton);

      expect(mockOnModeChange).toHaveBeenCalledWith('grid');
    });
  });

  describe('accessibility', () => {
    it('should have role="group"', () => {
      render(<DisplayToggle mode="grid" onModeChange={mockOnModeChange} />);

      expect(screen.getByRole('group')).toBeInTheDocument();
    });

    it('should have aria-label on container', () => {
      render(<DisplayToggle mode="grid" onModeChange={mockOnModeChange} />);

      expect(screen.getByLabelText('Display mode')).toBeInTheDocument();
    });

    it('should have aria-pressed=true on active grid button', () => {
      render(<DisplayToggle mode="grid" onModeChange={mockOnModeChange} />);

      const gridButton = screen.getByLabelText('Grid view');
      expect(gridButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should have aria-pressed=false on inactive grid button', () => {
      render(<DisplayToggle mode="list" onModeChange={mockOnModeChange} />);

      const gridButton = screen.getByLabelText('Grid view');
      expect(gridButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('should have aria-pressed=true on active list button', () => {
      render(<DisplayToggle mode="list" onModeChange={mockOnModeChange} />);

      const listButton = screen.getByLabelText('List view');
      expect(listButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should have aria-pressed=false on inactive list button', () => {
      render(<DisplayToggle mode="grid" onModeChange={mockOnModeChange} />);

      const listButton = screen.getByLabelText('List view');
      expect(listButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('should have descriptive aria-labels on buttons', () => {
      render(<DisplayToggle mode="grid" onModeChange={mockOnModeChange} />);

      expect(screen.getByLabelText('Grid view')).toBeInTheDocument();
      expect(screen.getByLabelText('List view')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply border styling', () => {
      const { container } = render(<DisplayToggle mode="grid" onModeChange={mockOnModeChange} />);

      const toggle = container.firstChild;
      expect(toggle).toHaveClass('border', 'border-gray-300', 'rounded-lg');
    });

    it('should apply transition classes', () => {
      render(<DisplayToggle mode="grid" onModeChange={mockOnModeChange} />);

      const gridButton = screen.getByLabelText('Grid view');
      expect(gridButton).toHaveClass('transition-colors');
    });

    it('should apply overflow hidden', () => {
      const { container } = render(<DisplayToggle mode="grid" onModeChange={mockOnModeChange} />);

      const toggle = container.firstChild;
      expect(toggle).toHaveClass('overflow-hidden');
    });
  });
});
