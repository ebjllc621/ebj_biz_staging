/**
 * Unit tests for RecommendationInboxFilters component
 *
 * Tests tab navigation, entity type filtering, badge counts, and state changes.
 *
 * @tier SIMPLE
 * @phase Technical Debt Remediation - Phase 5 (P3: Component Tests)
 * @coverage 80%+ target
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecommendationInboxFilters } from '../RecommendationInboxFilters';

describe('RecommendationInboxFilters', () => {
  const mockOnTabChange = vi.fn();
  const mockOnEntityTypeChange = vi.fn();

  const defaultProps = {
    activeTab: 'all' as const,
    onTabChange: mockOnTabChange,
    entityTypeFilter: 'all' as const,
    onEntityTypeChange: mockOnEntityTypeChange
  };

  const mockCounts = {
    all: 15,
    received: 8,
    sent: 5,
    saved: 2,
    unread: 4
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Tab Navigation
  // ============================================================================
  describe('Tab Navigation', () => {
    it('renders all tabs', () => {
      render(<RecommendationInboxFilters {...defaultProps} />);

      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Received')).toBeInTheDocument();
      expect(screen.getByText('Sent')).toBeInTheDocument();
      expect(screen.getByText('Saved')).toBeInTheDocument();
    });

    it('calls onTabChange when tab clicked', () => {
      render(<RecommendationInboxFilters {...defaultProps} />);

      fireEvent.click(screen.getByText('Received'));
      expect(mockOnTabChange).toHaveBeenCalledWith('received');

      fireEvent.click(screen.getByText('Sent'));
      expect(mockOnTabChange).toHaveBeenCalledWith('sent');

      fireEvent.click(screen.getByText('Saved'));
      expect(mockOnTabChange).toHaveBeenCalledWith('saved');
    });

    it('applies active styles to current tab', () => {
      render(<RecommendationInboxFilters {...defaultProps} activeTab="received" />);

      const receivedTab = screen.getByText('Received').closest('button');
      expect(receivedTab).toHaveClass('border-orange-500', 'text-orange-600');
    });

    it('applies inactive styles to non-active tabs', () => {
      render(<RecommendationInboxFilters {...defaultProps} activeTab="received" />);

      const allTab = screen.getByText('All').closest('button');
      expect(allTab).toHaveClass('border-transparent', 'text-gray-500');
    });
  });

  // ============================================================================
  // Badge Counts
  // ============================================================================
  describe('Badge Counts', () => {
    it('renders badge counts when provided', () => {
      render(<RecommendationInboxFilters {...defaultProps} counts={mockCounts} />);

      expect(screen.getByText('15')).toBeInTheDocument(); // all
      expect(screen.getByText('8')).toBeInTheDocument();  // received
      expect(screen.getByText('5')).toBeInTheDocument();  // sent
      expect(screen.getByText('2')).toBeInTheDocument();  // saved
    });

    it('does not render badge when count is 0', () => {
      const countsWithZero = { ...mockCounts, saved: 0 };
      render(<RecommendationInboxFilters {...defaultProps} counts={countsWithZero} />);

      // Saved tab should not have a badge
      const savedTab = screen.getByText('Saved').closest('button');
      expect(savedTab?.querySelector('.rounded-full')).toBeNull();
    });

    it('does not render badges when counts not provided', () => {
      render(<RecommendationInboxFilters {...defaultProps} />);

      // Should not find any badge elements (spans with rounded-full class inside buttons)
      const tabs = screen.getAllByRole('button');
      tabs.forEach(tab => {
        const badge = tab.querySelector('.rounded-full');
        expect(badge).toBeNull();
      });
    });

    it('applies active badge styles to active tab badge', () => {
      render(<RecommendationInboxFilters {...defaultProps} activeTab="received" counts={mockCounts} />);

      const receivedTab = screen.getByText('Received').closest('button');
      const badge = receivedTab?.querySelector('.rounded-full');
      expect(badge).toHaveClass('bg-orange-100', 'text-orange-600');
    });

    it('applies inactive badge styles to non-active tab badges', () => {
      render(<RecommendationInboxFilters {...defaultProps} activeTab="received" counts={mockCounts} />);

      const allTab = screen.getByText('All').closest('button');
      const badge = allTab?.querySelector('.rounded-full');
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-600');
    });
  });

  // ============================================================================
  // Entity Type Filter
  // ============================================================================
  describe('Entity Type Filter', () => {
    it('renders entity type dropdown', () => {
      render(<RecommendationInboxFilters {...defaultProps} />);

      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    it('renders all entity type options', () => {
      render(<RecommendationInboxFilters {...defaultProps} />);

      expect(screen.getByText('All Types')).toBeInTheDocument();
      expect(screen.getByText('Businesses')).toBeInTheDocument();
      expect(screen.getByText('Events')).toBeInTheDocument();
      expect(screen.getByText('Connections')).toBeInTheDocument();
      expect(screen.getByText('Articles')).toBeInTheDocument();
      expect(screen.getByText('Newsletters')).toBeInTheDocument();
      expect(screen.getByText('Podcasts')).toBeInTheDocument();
      expect(screen.getByText('Videos')).toBeInTheDocument();
    });

    it('calls onEntityTypeChange when selection changes', () => {
      render(<RecommendationInboxFilters {...defaultProps} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'listing' } });

      expect(mockOnEntityTypeChange).toHaveBeenCalledWith('listing');
    });

    it('shows current entity type filter value', () => {
      render(<RecommendationInboxFilters {...defaultProps} entityTypeFilter="event" />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('event');
    });
  });

  // ============================================================================
  // All Tab States
  // ============================================================================
  describe('All Tab States', () => {
    it('handles all activeTab value', () => {
      render(<RecommendationInboxFilters {...defaultProps} activeTab="all" />);

      const allTab = screen.getByText('All').closest('button');
      expect(allTab).toHaveClass('border-orange-500');
    });

    it('handles received activeTab value', () => {
      render(<RecommendationInboxFilters {...defaultProps} activeTab="received" />);

      const receivedTab = screen.getByText('Received').closest('button');
      expect(receivedTab).toHaveClass('border-orange-500');
    });

    it('handles sent activeTab value', () => {
      render(<RecommendationInboxFilters {...defaultProps} activeTab="sent" />);

      const sentTab = screen.getByText('Sent').closest('button');
      expect(sentTab).toHaveClass('border-orange-500');
    });

    it('handles saved activeTab value', () => {
      render(<RecommendationInboxFilters {...defaultProps} activeTab="saved" />);

      const savedTab = screen.getByText('Saved').closest('button');
      expect(savedTab).toHaveClass('border-orange-500');
    });
  });
});
