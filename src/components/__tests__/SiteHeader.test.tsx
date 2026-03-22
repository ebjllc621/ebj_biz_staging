/**
 * SiteHeader - Component Tests
 *
 * @tier STANDARD
 * @phase Phase 7 - Testing & Validation
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests Content dropdown functionality, desktop hover reveal, mobile expand/collapse,
 * accessibility (aria attributes), and active state highlighting.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SiteHeader from '../SiteHeader';

// Mock next/navigation
const mockPathname = '/';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => {
    return <img src={src} alt={alt} {...props} />;
  },
}));

// Mock AuthButtons
vi.mock('@/features/auth/components/AuthButtons', () => ({
  default: () => <div data-testid="auth-buttons">AuthButtons</div>,
}));

describe('SiteHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render site logo', () => {
      render(<SiteHeader />);

      const logo = screen.getByAltText('Bizconekt');
      expect(logo).toBeInTheDocument();
    });

    it('should render all navigation links', () => {
      render(<SiteHeader />);

      expect(screen.getByText('Listings')).toBeInTheDocument();
      expect(screen.getByText('Events')).toBeInTheDocument();
      expect(screen.getByText('Offers')).toBeInTheDocument();
      expect(screen.getAllByText('Content').length).toBeGreaterThan(0);
    });

    it('should render AuthButtons component', () => {
      render(<SiteHeader />);

      expect(screen.getAllByTestId('auth-buttons')).toBeTruthy();
    });

    it('should render mobile menu button', () => {
      render(<SiteHeader />);

      const menuButton = screen.getByLabelText('Open menu');
      expect(menuButton).toBeInTheDocument();
    });

    it('should render skip link for accessibility', () => {
      const { container } = render(<SiteHeader />);

      const skipLink = container.querySelector('.skip-link');
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main');
    });
  });

  describe('Content dropdown - Desktop', () => {
    it('should render Content parent link', () => {
      render(<SiteHeader />);

      const contentLinks = screen.getAllByText('Content');
      expect(contentLinks.length).toBeGreaterThan(0);
    });

    it('should render Content dropdown children', () => {
      render(<SiteHeader />);

      expect(screen.getByText('Articles')).toBeInTheDocument();
      expect(screen.getByText('Videos')).toBeInTheDocument();
      expect(screen.getByText('Podcasts')).toBeInTheDocument();
    });

    it('should have aria-haspopup attribute on Content link', () => {
      const { container } = render(<SiteHeader />);

      // Find the Content link in desktop nav
      const desktopNav = container.querySelector('.desktop-nav');
      const contentLink = desktopNav?.querySelector('a[href="/content"]');

      expect(contentLink).toHaveAttribute('aria-haspopup', 'true');
    });

    it('should render dropdown with proper CSS class', () => {
      const { container } = render(<SiteHeader />);

      const dropdown = container.querySelector('.nav-dropdown');
      expect(dropdown).toBeInTheDocument();
    });

    it('should include chevron icon on Content link', () => {
      const { container } = render(<SiteHeader />);

      const chevron = container.querySelector('.nav-chevron');
      expect(chevron).toBeInTheDocument();
    });
  });

  describe('Content dropdown - Mobile', () => {
    it('should render Content parent button in mobile menu', () => {
      render(<SiteHeader />);

      // Open mobile menu
      const menuButton = screen.getByLabelText('Open menu');
      fireEvent.click(menuButton);

      // Check for Content in mobile nav
      const mobileContentButtons = screen.getAllByText('Content');
      expect(mobileContentButtons.length).toBeGreaterThan(0);
    });

    it('should expand/collapse mobile dropdown when clicked', () => {
      const { container } = render(<SiteHeader />);

      // Open mobile menu
      const menuButton = screen.getByLabelText('Open menu');
      fireEvent.click(menuButton);

      // Find Content button in mobile menu
      const mobileNav = container.querySelector('.mobile-nav');
      const contentButton = mobileNav?.querySelector('.mobile-nav-parent');

      expect(contentButton).toHaveAttribute('aria-expanded', 'false');

      // Click to expand
      fireEvent.click(contentButton!);
      expect(contentButton).toHaveAttribute('aria-expanded', 'true');

      // Click to collapse
      fireEvent.click(contentButton!);
      expect(contentButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('should show dropdown children when expanded', () => {
      const { container } = render(<SiteHeader />);

      // Open mobile menu
      const menuButton = screen.getByLabelText('Open menu');
      fireEvent.click(menuButton);

      // Find and click Content button
      const mobileNav = container.querySelector('.mobile-nav');
      const contentButton = mobileNav?.querySelector('.mobile-nav-parent');
      fireEvent.click(contentButton!);

      // Children should be visible
      const childrenList = container.querySelector('.mobile-nav-children');
      expect(childrenList).toBeInTheDocument();
    });

    it('should include "All Content" link in mobile dropdown', () => {
      const { container } = render(<SiteHeader />);

      // Open mobile menu
      const menuButton = screen.getByLabelText('Open menu');
      fireEvent.click(menuButton);

      // Expand Content dropdown
      const mobileNav = container.querySelector('.mobile-nav');
      const contentButton = mobileNav?.querySelector('.mobile-nav-parent');
      fireEvent.click(contentButton!);

      // Check for "All Content" link
      expect(screen.getByText('All Content')).toBeInTheDocument();
    });

    it('should rotate chevron icon when expanded', () => {
      const { container } = render(<SiteHeader />);

      // Open mobile menu
      const menuButton = screen.getByLabelText('Open menu');
      fireEvent.click(menuButton);

      // Find chevron
      const mobileNav = container.querySelector('.mobile-nav');
      const chevron = mobileNav?.querySelector('.mobile-nav-chevron');

      expect(chevron).not.toHaveClass('rotate-180');

      // Expand dropdown
      const contentButton = mobileNav?.querySelector('.mobile-nav-parent');
      fireEvent.click(contentButton!);

      expect(chevron).toHaveClass('rotate-180');
    });

    it('should close mobile menu when child link clicked', () => {
      render(<SiteHeader />);

      // Open mobile menu
      const openButton = screen.getByLabelText('Open menu');
      fireEvent.click(openButton);

      // Expand Content dropdown
      const contentParent = screen.getAllByText('Content').find(
        el => el.tagName === 'BUTTON'
      );
      fireEvent.click(contentParent!);

      // Click Articles link
      const articlesLink = screen.getByText('Articles');
      fireEvent.click(articlesLink);

      // Menu should close
      const closeButton = screen.queryByLabelText('Close menu');
      expect(closeButton).not.toBeInTheDocument();
    });
  });

  describe('Active state highlighting', () => {
    it('should not highlight inactive links', () => {
      const { container } = render(<SiteHeader />);

      const desktopNav = container.querySelector('.desktop-nav');
      const contentLink = desktopNav?.querySelector('a[href="/content"]');

      // When pathname is '/', content link should not be active
      expect(contentLink).not.toHaveClass('active');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for dropdown', () => {
      const { container } = render(<SiteHeader />);

      const desktopNav = container.querySelector('.desktop-nav');
      const contentLink = desktopNav?.querySelector('a[href="/content"]');

      expect(contentLink).toHaveAttribute('aria-haspopup', 'true');
    });

    it('should have aria-expanded on mobile dropdown button', () => {
      const { container } = render(<SiteHeader />);

      // Open mobile menu
      const menuButton = screen.getByLabelText('Open menu');
      fireEvent.click(menuButton);

      const mobileNav = container.querySelector('.mobile-nav');
      const contentButton = mobileNav?.querySelector('.mobile-nav-parent');

      expect(contentButton).toHaveAttribute('aria-expanded');
    });

    it('should not have aria-current on inactive links', () => {
      const { container } = render(<SiteHeader />);

      const listingsLink = screen.getByText('Listings').closest('a');
      // When pathname is '/', listings link should not be active
      expect(listingsLink).not.toHaveAttribute('aria-current', 'page');
    });

    it('should have aria-label on mobile menu button', () => {
      render(<SiteHeader />);

      const menuButton = screen.getByLabelText('Open menu');
      expect(menuButton).toHaveAttribute('aria-label');
    });

    it('should update aria-label when mobile menu opens', () => {
      render(<SiteHeader />);

      const openButton = screen.getByLabelText('Open menu');
      fireEvent.click(openButton);

      const closeButton = screen.getByLabelText('Close menu');
      expect(closeButton).toBeInTheDocument();
    });

    it('should have role="banner" on header', () => {
      const { container } = render(<SiteHeader />);

      const header = container.querySelector('header');
      expect(header).toHaveAttribute('role', 'banner');
    });

    it('should have role="navigation" on nav container', () => {
      const { container } = render(<SiteHeader />);

      const nav = container.querySelector('[role="navigation"]');
      expect(nav).toBeInTheDocument();
      expect(nav).toHaveAttribute('aria-label', 'Primary');
    });
  });

  describe('Mobile menu functionality', () => {
    it('should toggle mobile menu open/closed', () => {
      render(<SiteHeader />);

      const menuButton = screen.getByLabelText('Open menu');

      // Initially closed
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');

      // Click to open
      fireEvent.click(menuButton);
      expect(screen.getByLabelText('Close menu')).toHaveAttribute('aria-expanded', 'true');

      // Click to close
      const closeButton = screen.getByLabelText('Close menu');
      fireEvent.click(closeButton);
      expect(screen.getByLabelText('Open menu')).toHaveAttribute('aria-expanded', 'false');
    });

    it('should render mobile menu when open', () => {
      const { container } = render(<SiteHeader />);

      // Open mobile menu
      const menuButton = screen.getByLabelText('Open menu');
      fireEvent.click(menuButton);

      const mobileMenu = container.querySelector('.mobile-menu');
      expect(mobileMenu).toBeInTheDocument();
    });

    it('should not render mobile menu when closed', () => {
      const { container } = render(<SiteHeader />);

      const mobileMenu = container.querySelector('.mobile-menu');
      expect(mobileMenu).not.toBeInTheDocument();
    });
  });

  describe('Link structure', () => {
    it('should link Content parent to /content', () => {
      const { container } = render(<SiteHeader />);

      const desktopNav = container.querySelector('.desktop-nav');
      const contentLink = desktopNav?.querySelector('a[href="/content"]');

      expect(contentLink).toHaveAttribute('href', '/content');
    });

    it('should link Articles to /content/articles', () => {
      render(<SiteHeader />);

      const articlesLink = screen.getByText('Articles').closest('a');
      expect(articlesLink).toHaveAttribute('href', '/content/articles');
    });

    it('should link Videos to /content/videos', () => {
      render(<SiteHeader />);

      const videosLink = screen.getByText('Videos').closest('a');
      expect(videosLink).toHaveAttribute('href', '/content/videos');
    });

    it('should link Podcasts to /content/podcasts', () => {
      render(<SiteHeader />);

      const podcastsLink = screen.getByText('Podcasts').closest('a');
      expect(podcastsLink).toHaveAttribute('href', '/content/podcasts');
    });
  });
});
