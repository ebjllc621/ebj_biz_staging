/**
 * Unit tests for SwipeableRecommendationCard component
 *
 * Tests card rendering, entity display, sender info, action buttons, and swipe behaviors.
 *
 * @tier STANDARD
 * @phase Technical Debt Remediation - Phase 5 (P3: Component Tests)
 * @coverage 80%+ target
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SwipeableRecommendationCard } from '../SwipeableRecommendationCard';
import type { SharingWithPreview } from '@features/contacts/types/sharing';

// Mock ErrorBoundary
vi.mock('@/components/common/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
}));

// Mock useSwipeGesture
vi.mock('@features/connections/hooks/useSwipeGesture', () => ({
  useSwipeGesture: ({ onSwipeLeft, onSwipeRight }: { onSwipeLeft: () => void; onSwipeRight: () => void }) => ({
    handlers: {
      onTouchStart: vi.fn(),
      onTouchMove: vi.fn(),
      onTouchEnd: vi.fn()
    }
  })
}));

describe('SwipeableRecommendationCard', () => {
  const mockOnSave = vi.fn();
  const mockOnDismiss = vi.fn();

  const createMockRecommendation = (overrides: Partial<SharingWithPreview> = {}): SharingWithPreview => ({
    id: 1,
    sender_user_id: 100,
    recipient_user_id: 200,
    entity_type: 'listing',
    entity_id: '456',
    status: 'pending',
    referral_code: 'TEST123',
    referral_message: 'Check this out!',
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
      title: 'Test Listing',
      description: 'A great test listing',
      url: '/listings/456'
    },
    sender: {
      user_id: 100,
      username: 'johndoe',
      display_name: 'John Doe',
      avatar_url: '/avatars/john.jpg'
    },
    ...overrides
  });

  const defaultProps = {
    recommendation: createMockRecommendation(),
    onSave: mockOnSave,
    onDismiss: mockOnDismiss
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Basic Rendering
  // ============================================================================
  describe('Basic Rendering', () => {
    it('renders entity title', () => {
      render(<SwipeableRecommendationCard {...defaultProps} />);
      expect(screen.getByText('Test Listing')).toBeInTheDocument();
    });

    it('renders entity description', () => {
      render(<SwipeableRecommendationCard {...defaultProps} />);
      expect(screen.getByText('A great test listing')).toBeInTheDocument();
    });

    it('renders sender name', () => {
      render(<SwipeableRecommendationCard {...defaultProps} />);
      expect(screen.getByText(/From John Doe/)).toBeInTheDocument();
    });

    it('renders referral message', () => {
      render(<SwipeableRecommendationCard {...defaultProps} />);
      expect(screen.getByText(/"Check this out!"/)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Unread Indicator
  // ============================================================================
  describe('Unread Indicator', () => {
    it('shows unread indicator when not viewed', () => {
      const { container } = render(<SwipeableRecommendationCard {...defaultProps} />);
      expect(container.querySelector('.bg-blue-500.rounded-full')).toBeInTheDocument();
    });

    it('hides unread indicator when viewed', () => {
      const viewedRec = createMockRecommendation({ viewed_at: new Date() });
      const { container } = render(<SwipeableRecommendationCard {...defaultProps} recommendation={viewedRec} />);
      expect(container.querySelector('.bg-blue-500.rounded-full')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Entity Type Icons
  // ============================================================================
  describe('Entity Type Icons', () => {
    it('shows listing icon for listing type', () => {
      render(<SwipeableRecommendationCard {...defaultProps} />);
      expect(screen.getByText('🏢')).toBeInTheDocument();
    });

    it('shows event icon for event type', () => {
      const eventRec = createMockRecommendation({ entity_type: 'event' });
      render(<SwipeableRecommendationCard {...defaultProps} recommendation={eventRec} />);
      expect(screen.getByText('📅')).toBeInTheDocument();
    });

    it('shows user icon for user type', () => {
      const userRec = createMockRecommendation({ entity_type: 'user' });
      render(<SwipeableRecommendationCard {...defaultProps} recommendation={userRec} />);
      expect(screen.getByText('👤')).toBeInTheDocument();
    });

    it('shows article icon for article type', () => {
      const articleRec = createMockRecommendation({ entity_type: 'article' });
      render(<SwipeableRecommendationCard {...defaultProps} recommendation={articleRec} />);
      expect(screen.getByText('📰')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Action Buttons
  // ============================================================================
  describe('Action Buttons', () => {
    it('renders View link when url is available', () => {
      render(<SwipeableRecommendationCard {...defaultProps} />);
      expect(screen.getByText('View')).toBeInTheDocument();
    });

    it('renders Save button', () => {
      render(<SwipeableRecommendationCard {...defaultProps} />);
      expect(screen.getByLabelText('Save')).toBeInTheDocument();
    });

    it('renders Dismiss button', () => {
      render(<SwipeableRecommendationCard {...defaultProps} />);
      expect(screen.getByLabelText('Dismiss')).toBeInTheDocument();
    });

    it('calls onSave when Save clicked', () => {
      render(<SwipeableRecommendationCard {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('Save'));
      expect(mockOnSave).toHaveBeenCalledWith(1);
    });

    it('calls onDismiss when Dismiss clicked', () => {
      render(<SwipeableRecommendationCard {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('Dismiss'));
      expect(mockOnDismiss).toHaveBeenCalledWith(1);
    });
  });

  // ============================================================================
  // Saved State
  // ============================================================================
  describe('Saved State', () => {
    it('disables Save button when already saved', () => {
      const savedRec = createMockRecommendation({ is_saved: true });
      render(<SwipeableRecommendationCard {...defaultProps} recommendation={savedRec} />);

      const saveButton = screen.getByLabelText('Save');
      expect(saveButton).toBeDisabled();
    });

    it('shows filled bookmark icon when saved', () => {
      const savedRec = createMockRecommendation({ is_saved: true });
      const { container } = render(<SwipeableRecommendationCard {...defaultProps} recommendation={savedRec} />);

      const bookmarkIcon = container.querySelector('.fill-current.text-blue-600');
      expect(bookmarkIcon).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Processing State
  // ============================================================================
  describe('Processing State', () => {
    it('disables Save button when processing', () => {
      render(<SwipeableRecommendationCard {...defaultProps} isProcessing={true} />);
      expect(screen.getByLabelText('Save')).toBeDisabled();
    });

    it('disables Dismiss button when processing', () => {
      render(<SwipeableRecommendationCard {...defaultProps} isProcessing={true} />);
      expect(screen.getByLabelText('Dismiss')).toBeDisabled();
    });
  });

  // ============================================================================
  // Empty States
  // ============================================================================
  describe('Empty States', () => {
    it('shows Untitled when title is missing', () => {
      const noTitleRec = createMockRecommendation({
        entity_preview: {
          id: '456',
          type: 'listing',
          title: undefined
        }
      });
      render(<SwipeableRecommendationCard {...defaultProps} recommendation={noTitleRec} />);
      expect(screen.getByText('Untitled')).toBeInTheDocument();
    });

    it('renders without message when referral_message is empty', () => {
      const noMessageRec = createMockRecommendation({ referral_message: null });
      render(<SwipeableRecommendationCard {...defaultProps} recommendation={noMessageRec} />);
      expect(screen.queryByText(/""/)).not.toBeInTheDocument();
    });

    it('hides View link when url is not available', () => {
      const noUrlRec = createMockRecommendation({
        entity_preview: {
          id: '456',
          type: 'listing',
          title: 'Test'
        }
      });
      render(<SwipeableRecommendationCard {...defaultProps} recommendation={noUrlRec} />);
      expect(screen.queryByText('View')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Sender Display
  // ============================================================================
  describe('Sender Display', () => {
    it('shows username when display_name is missing', () => {
      const noDisplayNameRec = createMockRecommendation({
        sender: {
          user_id: 100,
          username: 'johndoe',
          display_name: null,
          avatar_url: null
        }
      });
      render(<SwipeableRecommendationCard {...defaultProps} recommendation={noDisplayNameRec} />);
      expect(screen.getByText(/From johndoe/)).toBeInTheDocument();
    });
  });
});
