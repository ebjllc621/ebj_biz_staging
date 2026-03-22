/**
 * ListingActionBar Test Suite
 *
 * Tests for action bar component covering:
 * - Button rendering and interactions
 * - Favorite toggle functionality
 * - Share functionality (Web Share API + clipboard fallback)
 * - Conditional button rendering
 * - Accessibility
 * - State management
 *
 * @component Client Component Test
 * @tier STANDARD
 * @phase Phase 10 - Testing & Documentation
 * @coverage Target: 85%+
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ListingActionBar } from '../ListingActionBar';
import type { Listing } from '@core/services/ListingService';

// Mock navigator.share and navigator.clipboard
const mockShare = vi.fn();
const mockClipboard = {
  writeText: vi.fn()
};

describe('ListingActionBar', () => {
  const mockListing: Partial<Listing> = {
    id: 1,
    name: 'Aperture Science',
    slug: 'aperture-science',
    description: 'We do what we must because we can.',
    website: 'https://aperturescience.com',
    address: '123 Test St',
    city: 'Cleveland',
    state: 'OH',
    zip_code: '44114',
    latitude: 41.4993,
    longitude: -81.6944,
    user_id: 1,
    category_id: 1,
    tier: 'premium',
    status: 'active',
    approved: 'approved',
    claimed: 1
  };

  beforeEach(() => {
    // Reset mocks
    mockShare.mockReset();
    mockClipboard.writeText.mockReset();

    // Mock window.open
    global.open = vi.fn();

    // Mock alert
    global.alert = vi.fn();

    // Mock navigator
    Object.defineProperty(global.navigator, 'share', {
      value: mockShare,
      writable: true,
      configurable: true
    });

    Object.defineProperty(global.navigator, 'clipboard', {
      value: mockClipboard,
      writable: true,
      configurable: true
    });
  });

  describe('Rendering - All Buttons', () => {
    it('should render all action buttons when all data is present', () => {
      render(<ListingActionBar listing={mockListing as Listing} />);

      expect(screen.getByLabelText(/add to favorites/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/share listing/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/contact business/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/visit website/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/get directions/i)).toBeInTheDocument();
    });

    it('should not render website button when website is missing', () => {
      const listingNoWebsite = { ...mockListing, website: undefined };
      render(<ListingActionBar listing={listingNoWebsite as Listing} />);

      expect(screen.queryByLabelText(/visit website/i)).not.toBeInTheDocument();
    });

    it('should not render directions button when location is missing', () => {
      const listingNoLocation = {
        ...mockListing,
        latitude: undefined,
        longitude: undefined,
        address: undefined
      };
      render(<ListingActionBar listing={listingNoLocation as Listing} />);

      expect(screen.queryByLabelText(/get directions/i)).not.toBeInTheDocument();
    });

    it('should render directions button with address only (no coordinates)', () => {
      const listingAddressOnly = {
        ...mockListing,
        latitude: undefined,
        longitude: undefined
      };
      render(<ListingActionBar listing={listingAddressOnly as Listing} />);

      expect(screen.getByLabelText(/get directions/i)).toBeInTheDocument();
    });
  });

  describe('Favorite Functionality', () => {
    it('should toggle favorite state when clicked', async () => {
      render(<ListingActionBar listing={mockListing as Listing} />);

      const favoriteBtn = screen.getByLabelText(/add to favorites/i);

      // Initial state - not favorited
      expect(favoriteBtn).toHaveTextContent(/favorite/i);

      // Click to favorite
      fireEvent.click(favoriteBtn);

      await waitFor(() => {
        expect(screen.getByLabelText(/remove from favorites/i)).toBeInTheDocument();
      });

      // Click again to unfavorite
      fireEvent.click(screen.getByLabelText(/remove from favorites/i));

      await waitFor(() => {
        expect(screen.getByLabelText(/add to favorites/i)).toBeInTheDocument();
      });
    });

    it('should change button style when favorited', async () => {
      render(<ListingActionBar listing={mockListing as Listing} />);

      const favoriteBtn = screen.getByLabelText(/add to favorites/i);

      // Not favorited - default style
      expect(favoriteBtn).toHaveClass('bg-white');

      // Click to favorite
      fireEvent.click(favoriteBtn);

      await waitFor(() => {
        const favoritedBtn = screen.getByLabelText(/remove from favorites/i);
        expect(favoritedBtn).toHaveClass('bg-red-50');
      });
    });
  });

  describe('Share Functionality', () => {
    it('should use Web Share API when available', async () => {
      mockShare.mockResolvedValueOnce(undefined);

      render(<ListingActionBar listing={mockListing as Listing} />);

      const shareBtn = screen.getByLabelText(/share listing/i);
      fireEvent.click(shareBtn);

      await waitFor(() => {
        expect(mockShare).toHaveBeenCalledWith({
          title: 'Aperture Science',
          text: 'We do what we must because we can.',
          url: expect.any(String)
        });
      });
    });

    it('should fallback to clipboard when Web Share API unavailable', async () => {
      // Remove navigator.share
      Object.defineProperty(global.navigator, 'share', {
        value: undefined,
        writable: true,
        configurable: true
      });

      mockClipboard.writeText.mockResolvedValueOnce(undefined);

      render(<ListingActionBar listing={mockListing as Listing} />);

      const shareBtn = screen.getByLabelText(/share listing/i);
      fireEvent.click(shareBtn);

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalled();
        expect(global.alert).toHaveBeenCalledWith('Link copied to clipboard!');
      });
    });

    it('should disable share button while sharing', async () => {
      // Make share take time
      mockShare.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<ListingActionBar listing={mockListing as Listing} />);

      const shareBtn = screen.getByLabelText(/share listing/i);

      fireEvent.click(shareBtn);

      // Button should be disabled immediately
      expect(shareBtn).toBeDisabled();

      // Wait for share to complete
      await waitFor(() => {
        expect(shareBtn).not.toBeDisabled();
      }, { timeout: 200 });
    });

    it('should handle share cancellation gracefully', async () => {
      // Mock user cancelling share
      mockShare.mockRejectedValueOnce(new Error('Share cancelled'));

      render(<ListingActionBar listing={mockListing as Listing} />);

      const shareBtn = screen.getByLabelText(/share listing/i);
      fireEvent.click(shareBtn);

      await waitFor(() => {
        // Button should be enabled again after error
        expect(shareBtn).not.toBeDisabled();
      });
    });
  });

  describe('Website Functionality', () => {
    it('should open website in new tab when clicked', () => {
      render(<ListingActionBar listing={mockListing as Listing} />);

      const websiteBtn = screen.getByLabelText(/visit website/i);
      fireEvent.click(websiteBtn);

      expect(global.open).toHaveBeenCalledWith(
        'https://aperturescience.com',
        '_blank',
        'noopener,noreferrer'
      );
    });

    it('should not crash when website button clicked with invalid URL', () => {
      const listingInvalidWebsite = { ...mockListing, website: 'not-a-valid-url' };
      render(<ListingActionBar listing={listingInvalidWebsite as Listing} />);

      const websiteBtn = screen.getByLabelText(/visit website/i);

      // Should not throw
      expect(() => fireEvent.click(websiteBtn)).not.toThrow();
    });
  });

  describe('Directions Functionality', () => {
    it('should use coordinates for Google Maps when available', () => {
      render(<ListingActionBar listing={mockListing as Listing} />);

      const directionsBtn = screen.getByLabelText(/get directions/i);
      fireEvent.click(directionsBtn);

      expect(global.open).toHaveBeenCalledWith(
        'https://www.google.com/maps/dir/?api=1&destination=41.4993,-81.6944',
        '_blank',
        'noopener,noreferrer'
      );
    });

    it('should use address for Google Maps when coordinates unavailable', () => {
      const listingNoCoords = {
        ...mockListing,
        latitude: undefined,
        longitude: undefined
      };
      render(<ListingActionBar listing={listingNoCoords as Listing} />);

      const directionsBtn = screen.getByLabelText(/get directions/i);
      fireEvent.click(directionsBtn);

      expect(global.open).toHaveBeenCalledWith(
        expect.stringContaining('123%20Test%20St'),
        '_blank',
        'noopener,noreferrer'
      );
    });
  });

  describe('Contact Functionality', () => {
    it('should show alert when contact button clicked (placeholder)', () => {
      render(<ListingActionBar listing={mockListing as Listing} />);

      const contactBtn = screen.getByLabelText(/contact business/i);
      fireEvent.click(contactBtn);

      expect(global.alert).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels on all buttons', () => {
      render(<ListingActionBar listing={mockListing as Listing} />);

      expect(screen.getByLabelText(/add to favorites/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/share listing/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/contact business/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/visit website/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/get directions/i)).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      render(<ListingActionBar listing={mockListing as Listing} />);

      const buttons = screen.getAllByRole('button');

      buttons.forEach(button => {
        // Buttons should not have tabindex=-1
        expect(button).not.toHaveAttribute('tabindex', '-1');
      });
    });

    it('should update ARIA label when favorite state changes', async () => {
      render(<ListingActionBar listing={mockListing as Listing} />);

      const favoriteBtn = screen.getByLabelText(/add to favorites/i);
      fireEvent.click(favoriteBtn);

      await waitFor(() => {
        expect(screen.getByLabelText(/remove from favorites/i)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should render button text on desktop (hidden sm:inline)', () => {
      render(<ListingActionBar listing={mockListing as Listing} />);

      // Text content should be present but hidden on mobile
      expect(screen.getByText('Favorite')).toHaveClass('hidden sm:inline');
      expect(screen.getByText('Share')).toHaveClass('hidden sm:inline');
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimal listing data', () => {
      const minimalListing: Partial<Listing> = {
        id: 1,
        name: 'Test Business',
        slug: 'test-business',
        user_id: 1,
        category_id: 1,
        tier: 'essential',
        status: 'active',
        approved: 'approved',
        claimed: 1
      };

      render(<ListingActionBar listing={minimalListing as Listing} />);

      // Should always render favorite, share, contact buttons
      expect(screen.getByLabelText(/add to favorites/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/share listing/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/contact business/i)).toBeInTheDocument();

      // Should not render website or directions
      expect(screen.queryByLabelText(/visit website/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/get directions/i)).not.toBeInTheDocument();
    });
  });
});
