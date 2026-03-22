/**
 * PodcastCard - Component Tests
 *
 * @tier SIMPLE
 * @phase Phase 7 - Testing & Validation
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests rendering, links, episode formatting, duration display, and accessibility for PodcastCard component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PodcastCard } from '../PodcastCard';
import type { ContentPodcast } from '@core/services/ContentService';
import { ContentStatus } from '@core/services/ContentService';

const mockPodcast: ContentPodcast = {
  id: 1,
  listing_id: null,
  category_id: 1,
  title: 'Building a Successful Startup',
  slug: 'building-successful-startup',
  description: 'Expert advice on launching and scaling startups.',
  thumbnail: 'https://example.com/podcast-art.jpg',
  audio_url: 'https://example.com/podcast-ep1.mp3',
  episode_number: 5,
  season_number: 2,
  duration: 2400, // 40:00
  tags: ['startup', 'business'],
  view_count: 3000,
  bookmark_count: 75,
  status: ContentStatus.PUBLISHED,
  is_featured: true,
  is_sponsored: false,
  published_at: new Date('2024-01-01'),
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

describe('PodcastCard', () => {
  describe('rendering', () => {
    it('should render podcast title', () => {
      render(<PodcastCard podcast={mockPodcast} />);

      expect(screen.getByText('Building a Successful Startup')).toBeInTheDocument();
    });

    it('should render description', () => {
      render(<PodcastCard podcast={mockPodcast} />);

      expect(screen.getByText('Expert advice on launching and scaling startups.')).toBeInTheDocument();
    });

    it('should not render description when not provided', () => {
      const podcastNoDesc = { ...mockPodcast, description: null };
      render(<PodcastCard podcast={podcastNoDesc} />);

      expect(screen.queryByText(/Expert advice/)).not.toBeInTheDocument();
    });

    it('should render "PODCAST" type indicator', () => {
      render(<PodcastCard podcast={mockPodcast} />);

      expect(screen.getByText('PODCAST')).toBeInTheDocument();
    });

    it('should render episode badge with season and episode', () => {
      render(<PodcastCard podcast={mockPodcast} />);

      expect(screen.getByText('S2E5')).toBeInTheDocument();
    });

    it('should render episode badge without season', () => {
      const podcastNoSeason = { ...mockPodcast, season_number: null };
      render(<PodcastCard podcast={podcastNoSeason} />);

      expect(screen.getByText('Ep 5')).toBeInTheDocument();
    });

    it('should not render episode badge when no episode number', () => {
      const podcastNoEpisode = { ...mockPodcast, episode_number: null, season_number: null };
      render(<PodcastCard podcast={podcastNoEpisode} />);

      // Check that neither S{season}E{episode} nor "Ep {episode}" pattern exists
      expect(screen.queryByText(/S\d+E\d+/)).not.toBeInTheDocument();
      expect(screen.queryByText(/^Ep \d+$/)).not.toBeInTheDocument();
    });

    it('should render duration badge', () => {
      render(<PodcastCard podcast={mockPodcast} />);

      expect(screen.getByText('40:00')).toBeInTheDocument();
    });

    it('should not render duration badge when duration is null', () => {
      const podcastNoDuration = { ...mockPodcast, duration: null };
      render(<PodcastCard podcast={podcastNoDuration} />);

      expect(screen.queryByText(/:/)).not.toBeInTheDocument();
    });

    it('should render listen count', () => {
      render(<PodcastCard podcast={mockPodcast} />);

      expect(screen.getByText('3.0k listens')).toBeInTheDocument();
    });

    it('should render featured badge when featured', () => {
      render(<PodcastCard podcast={mockPodcast} />);

      expect(screen.getByText('Featured')).toBeInTheDocument();
    });

    it('should not render featured badge when not featured', () => {
      const podcastNotFeatured = { ...mockPodcast, is_featured: false };
      render(<PodcastCard podcast={podcastNotFeatured} />);

      expect(screen.queryByText('Featured')).not.toBeInTheDocument();
    });

    it('should render sponsored badge when sponsored and no episode badge', () => {
      const sponsoredPodcast = { ...mockPodcast, is_sponsored: true, episode_number: null };
      render(<PodcastCard podcast={sponsoredPodcast} />);

      expect(screen.getByText('Sponsored')).toBeInTheDocument();
    });

    it('should not render sponsored badge when episode badge exists', () => {
      const sponsoredWithEpisode = { ...mockPodcast, is_sponsored: true };
      render(<PodcastCard podcast={sponsoredWithEpisode} />);

      // Sponsored badge should not be rendered when episode badge is present (position conflict)
      expect(screen.queryByText('Sponsored')).not.toBeInTheDocument();
    });

    it('should render artwork image', () => {
      render(<PodcastCard podcast={mockPodcast} />);

      const image = screen.getByAltText('Building a Successful Startup');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', expect.stringContaining('podcast-art.jpg'));
    });

    it('should handle missing artwork gracefully', () => {
      const podcastNoArt = { ...mockPodcast, thumbnail: null };
      const { container } = render(<PodcastCard podcast={podcastNoArt} />);

      // Should show gradient background with headphones icon
      const gradientDiv = container.querySelector('.bg-gradient-to-br');
      expect(gradientDiv).toBeInTheDocument();
    });
  });

  describe('links', () => {
    it('should link to podcast detail page', () => {
      const { container } = render(<PodcastCard podcast={mockPodcast} />);

      const link = container.querySelector('a');
      expect(link).toHaveAttribute('href', '/podcasts/building-successful-startup');
    });

    it('should have correct href attribute', () => {
      const { container } = render(<PodcastCard podcast={mockPodcast} />);

      const link = container.querySelector('a');
      expect(link?.getAttribute('href')).toBe('/podcasts/building-successful-startup');
    });
  });

  describe('duration formatting', () => {
    it('should format duration as MM:SS for < 1 hour', () => {
      const shortPodcast = { ...mockPodcast, duration: 450 }; // 7:30
      render(<PodcastCard podcast={shortPodcast} />);

      expect(screen.getByText('7:30')).toBeInTheDocument();
    });

    it('should format duration as HH:MM:SS for >= 1 hour', () => {
      const longPodcast = { ...mockPodcast, duration: 5400 }; // 1:30:00
      render(<PodcastCard podcast={longPodcast} />);

      expect(screen.getByText('1:30:00')).toBeInTheDocument();
    });

    it('should pad minutes and seconds with leading zeros in HH:MM:SS format', () => {
      const podcast1h5m3s = { ...mockPodcast, duration: 3903 }; // 1:05:03
      render(<PodcastCard podcast={podcast1h5m3s} />);

      expect(screen.getByText('1:05:03')).toBeInTheDocument();
    });

    it('should handle zero duration', () => {
      const zeroPodcast = { ...mockPodcast, duration: 0 };
      const { container } = render(<PodcastCard podcast={zeroPodcast} />);

      // Duration badge with 0:00 should be rendered
      const durationBadge = container.querySelector('.absolute.bottom-3.right-3');
      expect(durationBadge).toBeInTheDocument();
    });

    it('should return empty string for null duration', () => {
      const nullDuration = { ...mockPodcast, duration: null };
      render(<PodcastCard podcast={nullDuration} />);

      // Duration badge should not be present
      expect(screen.queryByText(/:/)).not.toBeInTheDocument();
    });
  });

  describe('episode formatting', () => {
    it('should format with season and episode as S{season}E{episode}', () => {
      render(<PodcastCard podcast={mockPodcast} />);

      expect(screen.getByText('S2E5')).toBeInTheDocument();
    });

    it('should format without season as "Ep {episode}"', () => {
      const podcastNoSeason = { ...mockPodcast, season_number: null };
      render(<PodcastCard podcast={podcastNoSeason} />);

      expect(screen.getByText('Ep 5')).toBeInTheDocument();
    });

    it('should return null when no episode number', () => {
      const podcastNoEpisode = { ...mockPodcast, episode_number: null };
      render(<PodcastCard podcast={podcastNoEpisode} />);

      // Check that neither S{season}E{episode} nor "Ep {episode}" pattern exists
      expect(screen.queryByText(/S\d+E\d+/)).not.toBeInTheDocument();
      expect(screen.queryByText(/^Ep \d+$/)).not.toBeInTheDocument();
    });
  });

  describe('listen count formatting', () => {
    it('should display raw number for < 1000 listens', () => {
      const lowListenPodcast = { ...mockPodcast, view_count: 750 };
      render(<PodcastCard podcast={lowListenPodcast} />);

      expect(screen.getByText('750 listens')).toBeInTheDocument();
    });

    it('should display "k" suffix for thousands', () => {
      const thousandListenPodcast = { ...mockPodcast, view_count: 8500 };
      render(<PodcastCard podcast={thousandListenPodcast} />);

      expect(screen.getByText('8.5k listens')).toBeInTheDocument();
    });

    it('should display "M" suffix for millions', () => {
      const millionListenPodcast = { ...mockPodcast, view_count: 1200000 };
      render(<PodcastCard podcast={millionListenPodcast} />);

      expect(screen.getByText('1.2M listens')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have alt text on artwork', () => {
      render(<PodcastCard podcast={mockPodcast} />);

      const image = screen.getByAltText('Building a Successful Startup');
      expect(image).toBeInTheDocument();
    });

    it('should use semantic HTML structure', () => {
      const { container } = render(<PodcastCard podcast={mockPodcast} />);

      // Should use article element
      const article = container.querySelector('article');
      expect(article).toBeInTheDocument();
    });

    it('should be keyboard navigable (link)', () => {
      const { container } = render(<PodcastCard podcast={mockPodcast} />);

      const link = container.querySelector('a');
      expect(link).toBeInTheDocument();
      expect(link?.tagName).toBe('A');
    });
  });

  describe('styling', () => {
    it('should apply card styling', () => {
      const { container } = render(<PodcastCard podcast={mockPodcast} />);

      const article = container.querySelector('article');
      expect(article).toHaveClass('bg-white');
      expect(article).toHaveClass('rounded-xl');
      expect(article).toHaveClass('shadow-sm');
    });

    it('should apply hover effects', () => {
      const { container } = render(<PodcastCard podcast={mockPodcast} />);

      const article = container.querySelector('article');
      expect(article).toHaveClass('hover:shadow-md');
    });

    it('should be full height', () => {
      const { container } = render(<PodcastCard podcast={mockPodcast} />);

      const article = container.querySelector('article');
      expect(article).toHaveClass('h-full');
    });

    it('should apply custom className', () => {
      const { container } = render(<PodcastCard podcast={mockPodcast} className="custom-class" />);

      const link = container.querySelector('a');
      expect(link).toHaveClass('custom-class');
    });

    it('should use teal color scheme for podcast branding', () => {
      const { container } = render(<PodcastCard podcast={mockPodcast} />);

      // Episode badge should have teal background
      const episodeBadge = screen.getByText('S2E5');
      expect(episodeBadge).toHaveClass('bg-teal-600');

      // Type indicator should have teal text
      const typeIndicator = screen.getByText('PODCAST');
      expect(typeIndicator).toHaveClass('text-teal-600');
    });
  });
});
