/**
 * OfflineCacheButton - Component Tests
 *
 * @tier STANDARD
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests offline cache button, caching status, download progress.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OfflineCacheButton } from '../OfflineCacheButton';

describe('OfflineCacheButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn().mockReturnValue('[]'),
      setItem: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });

    // Mock fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('button rendering', () => {
    it('renders cache button when not already cached', () => {
      render(<OfflineCacheButton claimId={1} alreadyCached={false} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('Save Offline')).toBeInTheDocument();
    });

    it('renders cached button when already cached', () => {
      render(<OfflineCacheButton claimId={1} alreadyCached={true} />);

      expect(screen.getByText('Saved Offline')).toBeInTheDocument();
    });

    it('shows WifiOff icon when not cached', () => {
      const { container } = render(<OfflineCacheButton claimId={1} alreadyCached={false} />);

      const icon = container.querySelector('.lucide-wifi-off');
      expect(icon).toBeInTheDocument();
    });

    it('shows CheckCircle icon when cached', () => {
      const { container } = render(<OfflineCacheButton claimId={1} alreadyCached={true} />);

      // The cached button contains an SVG icon (CheckCircle becomes lucide-circle-check-big)
      const button = container.querySelector('.bg-green-100');
      expect(button).toBeInTheDocument();
      const icon = button?.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('cached button is disabled', () => {
      render(<OfflineCacheButton claimId={1} alreadyCached={true} />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('caching functionality', () => {
    it('calls API when button clicked', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cacheData: { id: 1 } }),
      });
      global.fetch = mockFetch;
      const user = userEvent.setup();

      render(<OfflineCacheButton claimId={1} alreadyCached={false} />);

      const button = screen.getByText('Save Offline');
      await user.click(button);

      expect(mockFetch).toHaveBeenCalledWith('/api/claims/1/offline-cache', {
        credentials: 'include',
      });
    });

    it('calls onCached callback on success', async () => {
      const mockOnCached = vi.fn();
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cacheData: { id: 1 } }),
      });
      const user = userEvent.setup();

      render(<OfflineCacheButton claimId={1} alreadyCached={false} onCached={mockOnCached} />);

      const button = screen.getByText('Save Offline');
      await user.click(button);

      await waitFor(() => {
        expect(mockOnCached).toHaveBeenCalled();
      });
    });

    it('shows loading state during caching', async () => {
      global.fetch = vi.fn().mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );
      const user = userEvent.setup();

      render(<OfflineCacheButton claimId={1} alreadyCached={false} />);

      const button = screen.getByText('Save Offline');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });
    });

    it('shows Loader icon during caching', async () => {
      global.fetch = vi.fn().mockImplementation(
        () => new Promise(() => {})
      );
      const user = userEvent.setup();

      const { container } = render(<OfflineCacheButton claimId={1} alreadyCached={false} />);

      const button = screen.getByText('Save Offline');
      await user.click(button);

      await waitFor(() => {
        // Loader2 renders as lucide-loader-circle
        const loader = container.querySelector('.lucide-loader-circle');
        expect(loader).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('shows error message when caching fails', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
      });
      const user = userEvent.setup();

      render(<OfflineCacheButton claimId={1} alreadyCached={false} />);

      const button = screen.getByText('Save Offline');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Failed to cache for offline/i)).toBeInTheDocument();
      });
    });

    it('shows network error message', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));
      const user = userEvent.setup();

      render(<OfflineCacheButton claimId={1} alreadyCached={false} />);

      const button = screen.getByText('Save Offline');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('custom styling', () => {
    it('applies custom className when not cached', () => {
      const { container } = render(
        <OfflineCacheButton claimId={1} alreadyCached={false} className="custom-class" />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('applies custom className when cached', () => {
      const { container } = render(
        <OfflineCacheButton claimId={1} alreadyCached={true} className="my-button" />
      );

      const button = container.querySelector('.my-button');
      expect(button).toBeInTheDocument();
    });
  });
});
