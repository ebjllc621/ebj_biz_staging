/**
 * OfflineIndicator - Component Tests
 *
 * @tier SIMPLE
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests offline mode indicator banner display.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { OfflineIndicator } from '../OfflineIndicator';

describe('OfflineIndicator', () => {
  const originalNavigatorOnLine = navigator.onLine;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    // Reset navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: originalNavigatorOnLine,
      writable: true,
      configurable: true,
    });
  });

  describe('online state', () => {
    it('does not render when online and showOnlineStatus is false', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });

      const { container } = render(<OfflineIndicator />);

      expect(container.firstChild).toBeNull();
    });

    it('renders online indicator when showOnlineStatus is true', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });

      render(<OfflineIndicator showOnlineStatus={true} />);

      expect(screen.getByText('Online')).toBeInTheDocument();
    });

    it('shows green styling when online', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });

      const { container } = render(<OfflineIndicator showOnlineStatus={true} />);

      const indicator = container.firstChild as HTMLElement;
      expect(indicator).toHaveClass('bg-green-50', 'text-green-600');
    });
  });

  describe('offline state', () => {
    it('renders indicator when offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });

      render(<OfflineIndicator />);

      expect(screen.getByText('Offline Mode')).toBeInTheDocument();
    });

    it('shows WifiOff icon when offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });

      const { container } = render(<OfflineIndicator />);

      // Lucide WifiOff icon has specific class
      const icon = container.querySelector('.lucide-wifi-off');
      expect(icon).toBeInTheDocument();
    });

    it('applies warning styling when offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });

      const { container } = render(<OfflineIndicator />);

      const indicator = container.firstChild as HTMLElement;
      expect(indicator).toHaveClass('bg-yellow-100', 'text-yellow-700');
    });
  });

  describe('custom styling', () => {
    it('applies custom className when offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });

      const { container } = render(<OfflineIndicator className="custom-class" />);

      const indicator = container.firstChild as HTMLElement;
      expect(indicator).toHaveClass('custom-class');
    });

    it('applies custom className when showing online status', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });

      const { container } = render(
        <OfflineIndicator showOnlineStatus={true} className="my-indicator" />
      );

      const indicator = container.firstChild as HTMLElement;
      expect(indicator).toHaveClass('my-indicator');
    });
  });
});
