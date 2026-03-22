/**
 * VideoCard - Component Tests
 *
 * @tier SIMPLE
 * @phase Phase 7 - Testing & Validation
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests rendering, links, duration formatting, play overlay, and accessibility for VideoCard component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VideoCard } from '../VideoCard';
import type { ContentVideo } from '@core/services/ContentService';
import { ContentStatus, VideoType } from '@core/services/ContentService';

const mockVideo: ContentVideo = {
  id: 1,
  listing_id: null,
  category_id: 1,
  title: 'How to Build a React App',
  slug: 'how-to-build-react-app',
  description: 'A video tutorial on building modern React applications.',
  thumbnail: 'https://example.com/video-thumb.jpg',
  video_url: 'https://youtube.com/watch?v=test123',
  video_type: VideoType.YOUTUBE,
  duration: 630, // 10:30
  tags: ['react', 'tutorial'],
  view_count: 5000,
  bookmark_count: 120,
  status: ContentStatus.PUBLISHED,
  is_featured: true,
  is_sponsored: false,
  published_at: new Date('2024-01-01'),
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

describe('VideoCard', () => {
  describe('rendering', () => {
    it('should render video title', () => {
      render(<VideoCard video={mockVideo} />);

      expect(screen.getByText('How to Build a React App')).toBeInTheDocument();
    });

    it('should render description', () => {
      render(<VideoCard video={mockVideo} />);

      expect(screen.getByText('A video tutorial on building modern React applications.')).toBeInTheDocument();
    });

    it('should not render description when not provided', () => {
      const videoNoDesc = { ...mockVideo, description: null };
      render(<VideoCard video={videoNoDesc} />);

      expect(screen.queryByText(/video tutorial/)).not.toBeInTheDocument();
    });

    it('should render video type indicator', () => {
      render(<VideoCard video={mockVideo} />);

      expect(screen.getByText('YOUTUBE')).toBeInTheDocument();
    });

    it('should render duration badge', () => {
      render(<VideoCard video={mockVideo} />);

      expect(screen.getByText('10:30')).toBeInTheDocument();
    });

    it('should not render duration badge when duration is null', () => {
      const videoNoDuration = { ...mockVideo, duration: null };
      render(<VideoCard video={videoNoDuration} />);

      expect(screen.queryByText(/:/)).not.toBeInTheDocument();
    });

    it('should render view count', () => {
      render(<VideoCard video={mockVideo} />);

      expect(screen.getByText('5.0k views')).toBeInTheDocument();
    });

    it('should render featured badge when featured', () => {
      render(<VideoCard video={mockVideo} />);

      expect(screen.getByText('Featured')).toBeInTheDocument();
    });

    it('should not render featured badge when not featured', () => {
      const videoNotFeatured = { ...mockVideo, is_featured: false };
      render(<VideoCard video={videoNotFeatured} />);

      expect(screen.queryByText('Featured')).not.toBeInTheDocument();
    });

    it('should render sponsored badge when sponsored', () => {
      const sponsoredVideo = { ...mockVideo, is_sponsored: true };
      render(<VideoCard video={sponsoredVideo} />);

      expect(screen.getByText('Sponsored')).toBeInTheDocument();
    });

    it('should not render sponsored badge when not sponsored', () => {
      render(<VideoCard video={mockVideo} />);

      expect(screen.queryByText('Sponsored')).not.toBeInTheDocument();
    });

    it('should render thumbnail image', () => {
      render(<VideoCard video={mockVideo} />);

      const image = screen.getByAltText('How to Build a React App');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', expect.stringContaining('video-thumb.jpg'));
    });

    it('should handle missing thumbnail gracefully', () => {
      const videoNoThumb = { ...mockVideo, thumbnail: null };
      const { container } = render(<VideoCard video={videoNoThumb} />);

      // Should show gradient background with play icon
      const gradientDiv = container.querySelector('.bg-gradient-to-br');
      expect(gradientDiv).toBeInTheDocument();
    });

    it('should render play button overlay', () => {
      const { container } = render(<VideoCard video={mockVideo} />);

      // Play overlay should be visible
      const playOverlay = container.querySelector('.bg-black\\/20');
      expect(playOverlay).toBeInTheDocument();
    });
  });

  describe('links', () => {
    it('should link to video detail page', () => {
      const { container } = render(<VideoCard video={mockVideo} />);

      const link = container.querySelector('a');
      expect(link).toHaveAttribute('href', '/videos/how-to-build-react-app');
    });

    it('should have correct href attribute', () => {
      const { container } = render(<VideoCard video={mockVideo} />);

      const link = container.querySelector('a');
      expect(link?.getAttribute('href')).toBe('/videos/how-to-build-react-app');
    });
  });

  describe('duration formatting', () => {
    it('should format duration as MM:SS for < 1 hour', () => {
      const shortVideo = { ...mockVideo, duration: 90 }; // 1:30
      render(<VideoCard video={shortVideo} />);

      expect(screen.getByText('1:30')).toBeInTheDocument();
    });

    it('should format duration as HH:MM:SS for >= 1 hour', () => {
      const longVideo = { ...mockVideo, duration: 3665 }; // 1:01:05
      render(<VideoCard video={longVideo} />);

      expect(screen.getByText('1:01:05')).toBeInTheDocument();
    });

    it('should pad seconds with leading zero', () => {
      const video5min5sec = { ...mockVideo, duration: 305 }; // 5:05
      render(<VideoCard video={video5min5sec} />);

      expect(screen.getByText('5:05')).toBeInTheDocument();
    });

    it('should handle zero duration', () => {
      const zeroVideo = { ...mockVideo, duration: 0 };
      render(<VideoCard video={zeroVideo} />);

      expect(screen.getByText('0:00')).toBeInTheDocument();
    });

    it('should return empty string for null duration', () => {
      const nullDuration = { ...mockVideo, duration: null };
      render(<VideoCard video={nullDuration} />);

      // Duration badge should not be present
      expect(screen.queryByText(/:/)).not.toBeInTheDocument();
    });
  });

  describe('view count formatting', () => {
    it('should display raw number for < 1000 views', () => {
      const lowViewVideo = { ...mockVideo, view_count: 500 };
      render(<VideoCard video={lowViewVideo} />);

      expect(screen.getByText('500 views')).toBeInTheDocument();
    });

    it('should display "k" suffix for thousands', () => {
      const thousandViewVideo = { ...mockVideo, view_count: 12500 };
      render(<VideoCard video={thousandViewVideo} />);

      expect(screen.getByText('12.5k views')).toBeInTheDocument();
    });

    it('should display "M" suffix for millions', () => {
      const millionViewVideo = { ...mockVideo, view_count: 2500000 };
      render(<VideoCard video={millionViewVideo} />);

      expect(screen.getByText('2.5M views')).toBeInTheDocument();
    });
  });

  describe('video types', () => {
    it('should display YOUTUBE type', () => {
      const { container } = render(<VideoCard video={mockVideo} />);

      const typeIndicator = container.querySelector('.text-purple-600.uppercase');
      expect(typeIndicator).toBeInTheDocument();
      expect(typeIndicator?.textContent).toMatch(/youtube/i);
    });

    it('should display VIMEO type', () => {
      const vimeoVideo = { ...mockVideo, video_type: VideoType.VIMEO };
      const { container } = render(<VideoCard video={vimeoVideo} />);

      const typeIndicator = container.querySelector('.text-purple-600.uppercase');
      expect(typeIndicator?.textContent).toMatch(/vimeo/i);
    });

    it('should display UPLOAD type', () => {
      const uploadVideo = { ...mockVideo, video_type: VideoType.UPLOAD };
      const { container } = render(<VideoCard video={uploadVideo} />);

      const typeIndicator = container.querySelector('.text-purple-600.uppercase');
      expect(typeIndicator?.textContent).toMatch(/upload/i);
    });

    it('should display EMBED type', () => {
      const embedVideo = { ...mockVideo, video_type: VideoType.EMBED };
      const { container } = render(<VideoCard video={embedVideo} />);

      const typeIndicator = container.querySelector('.text-purple-600.uppercase');
      expect(typeIndicator?.textContent).toMatch(/embed/i);
    });
  });

  describe('accessibility', () => {
    it('should have alt text on thumbnail', () => {
      render(<VideoCard video={mockVideo} />);

      const image = screen.getByAltText('How to Build a React App');
      expect(image).toBeInTheDocument();
    });

    it('should use semantic HTML structure', () => {
      const { container } = render(<VideoCard video={mockVideo} />);

      // Should use article element
      const article = container.querySelector('article');
      expect(article).toBeInTheDocument();
    });

    it('should be keyboard navigable (link)', () => {
      const { container } = render(<VideoCard video={mockVideo} />);

      const link = container.querySelector('a');
      expect(link).toBeInTheDocument();
      expect(link?.tagName).toBe('A');
    });
  });

  describe('styling', () => {
    it('should apply card styling', () => {
      const { container } = render(<VideoCard video={mockVideo} />);

      const article = container.querySelector('article');
      expect(article).toHaveClass('bg-white');
      expect(article).toHaveClass('rounded-xl');
      expect(article).toHaveClass('shadow-sm');
    });

    it('should apply hover effects', () => {
      const { container } = render(<VideoCard video={mockVideo} />);

      const article = container.querySelector('article');
      expect(article).toHaveClass('hover:shadow-md');
    });

    it('should be full height', () => {
      const { container } = render(<VideoCard video={mockVideo} />);

      const article = container.querySelector('article');
      expect(article).toHaveClass('h-full');
    });

    it('should apply custom className', () => {
      const { container } = render(<VideoCard video={mockVideo} className="custom-class" />);

      const link = container.querySelector('a');
      expect(link).toHaveClass('custom-class');
    });

    it('should have play button with hover scale effect', () => {
      const { container } = render(<VideoCard video={mockVideo} />);

      const playButton = container.querySelector('.group-hover\\:scale-110');
      expect(playButton).toBeInTheDocument();
    });
  });
});
