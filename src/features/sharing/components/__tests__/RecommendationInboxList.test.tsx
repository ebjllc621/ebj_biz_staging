/**
 * Unit tests for RecommendationInboxList component
 *
 * Tests loading states, error states, empty states, and list rendering.
 *
 * @tier STANDARD
 * @phase Technical Debt Remediation - Phase 5 (P3: Component Tests)
 * @coverage 80%+ target
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RecommendationInboxList } from '../RecommendationInboxList';
import type { SharingWithPreview } from '@features/contacts/types/sharing';

// Mock useIsMobile hook
const mockUseIsMobile = vi.fn(() => false);

vi.mock('@core/hooks/useMediaQuery', () => ({
  useIsMobile: () => mockUseIsMobile()
}));

// Mock RecommendationInboxItem
vi.mock('../RecommendationInboxItem', () => ({
  RecommendationInboxItem: vi.fn(({ entityPreview }) => (
    <div data-testid="inbox-item">{entityPreview?.title}</div>
  ))
}));

// Mock MobileRecommendationInbox
vi.mock('../MobileRecommendationInbox', () => ({
  MobileRecommendationInbox: vi.fn(() => (
    <div data-testid="mobile-inbox">Mobile Inbox</div>
  ))
}));

describe('RecommendationInboxList', () => {
  const mockOnMarkViewed = vi.fn();
  const mockOnToggleSaved = vi.fn();
  const mockOnHide = vi.fn();

  const createMockRecommendation = (overrides: Partial<SharingWithPreview> = {}): SharingWithPreview => ({
    id: 1,
    sender_user_id: 100,
    recipient_user_id: 200,
    entity_type: 'listing',
    entity_id: '456',
    status: 'pending',
    referral_code: 'TEST123',
    reward_status: 'pending',
    reward_points: 5,
    created_at: new Date(),
    updated_at: new Date(),
    viewed_at: null,
    is_saved: false,
    is_helpful: null,
    helpful_at: null,
    thank_message: null,
    thanked_at: null,
    entity_preview: {
      id: '456',
      name: 'Test Listing',
      type: 'listing',
      title: 'Test Listing'
    },
    sender_name: 'John Doe',
    sender_avatar: '/avatars/john.jpg',
    ...overrides
  });

  const defaultProps = {
    recommendations: [createMockRecommendation()],
    isLoading: false,
    error: null,
    onMarkViewed: mockOnMarkViewed,
    onToggleSaved: mockOnToggleSaved
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIsMobile.mockReturnValue(false);
  });

  // ============================================================================
  // Loading State
  // ============================================================================
  describe('Loading State', () => {
    it('shows loading spinner when isLoading is true', () => {
      render(<RecommendationInboxList {...defaultProps} isLoading={true} />);
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('does not show items when loading', () => {
      render(<RecommendationInboxList {...defaultProps} isLoading={true} />);
      expect(screen.queryByTestId('inbox-item')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Error State
  // ============================================================================
  describe('Error State', () => {
    it('shows error message when error is present', () => {
      render(<RecommendationInboxList {...defaultProps} error="Failed to load" />);
      expect(screen.getByText('Failed to load recommendations')).toBeInTheDocument();
    });

    it('does not show items when error', () => {
      render(<RecommendationInboxList {...defaultProps} error="Failed to load" />);
      expect(screen.queryByTestId('inbox-item')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Empty State
  // ============================================================================
  describe('Empty State', () => {
    it('shows empty state when no recommendations', () => {
      render(<RecommendationInboxList {...defaultProps} recommendations={[]} />);
      expect(screen.getByText('No recommendations yet')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // List Rendering
  // ============================================================================
  describe('List Rendering', () => {
    it('renders list of recommendations', () => {
      const recommendations = [
        createMockRecommendation({ id: 1, entity_preview: { id: '1', name: 'First', type: 'listing', title: 'First Listing' } }),
        createMockRecommendation({ id: 2, entity_preview: { id: '2', name: 'Second', type: 'listing', title: 'Second Listing' } })
      ];
      render(<RecommendationInboxList {...defaultProps} recommendations={recommendations} />);

      expect(screen.getAllByTestId('inbox-item')).toHaveLength(2);
    });
  });

  // ============================================================================
  // Mobile Behavior
  // ============================================================================
  describe('Mobile Behavior', () => {
    it('renders MobileRecommendationInbox on mobile for received tab', () => {
      mockUseIsMobile.mockReturnValue(true);
      render(<RecommendationInboxList {...defaultProps} isSentTab={false} />);

      expect(screen.getByTestId('mobile-inbox')).toBeInTheDocument();
    });

    it('renders regular list on mobile for sent tab', () => {
      mockUseIsMobile.mockReturnValue(true);
      render(<RecommendationInboxList {...defaultProps} isSentTab={true} />);

      expect(screen.queryByTestId('mobile-inbox')).not.toBeInTheDocument();
      expect(screen.getByTestId('inbox-item')).toBeInTheDocument();
    });

    it('renders regular list on desktop', () => {
      mockUseIsMobile.mockReturnValue(false);
      render(<RecommendationInboxList {...defaultProps} />);

      expect(screen.queryByTestId('mobile-inbox')).not.toBeInTheDocument();
      expect(screen.getByTestId('inbox-item')).toBeInTheDocument();
    });
  });
});
