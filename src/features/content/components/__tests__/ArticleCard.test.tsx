/**
 * ArticleCard - Component Tests
 *
 * @tier SIMPLE
 * @phase Phase 7 - Testing & Validation
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests rendering, links, metadata display, tags, and accessibility for ArticleCard component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArticleCard } from '../ArticleCard';
import type { ContentArticle } from '@core/services/ContentService';
import { ContentStatus } from '@core/services/ContentService';

const mockArticle: ContentArticle = {
  id: 1,
  listing_id: null,
  category_id: 1,
  title: 'How to Start a Small Business',
  slug: 'how-to-start-small-business',
  excerpt: 'A comprehensive guide to launching your own business.',
  content: 'Full article content here...',
  featured_image: 'https://example.com/article.jpg',
  tags: ['business', 'startup', 'entrepreneurship'],
  reading_time: 5,
  view_count: 1234,
  bookmark_count: 42,
  status: ContentStatus.PUBLISHED,
  is_featured: true,
  is_sponsored: false,
  published_at: new Date('2024-01-01'),
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

describe('ArticleCard', () => {
  describe('rendering', () => {
    it('should render article title', () => {
      render(<ArticleCard article={mockArticle} />);

      expect(screen.getByText('How to Start a Small Business')).toBeInTheDocument();
    });

    it('should render excerpt', () => {
      render(<ArticleCard article={mockArticle} />);

      expect(screen.getByText('A comprehensive guide to launching your own business.')).toBeInTheDocument();
    });

    it('should not render excerpt when not provided', () => {
      const articleNoExcerpt = { ...mockArticle, excerpt: null };
      render(<ArticleCard article={articleNoExcerpt} />);

      expect(screen.queryByText(/comprehensive guide/)).not.toBeInTheDocument();
    });

    it('should render reading time', () => {
      render(<ArticleCard article={mockArticle} />);

      expect(screen.getByText('5 min read')).toBeInTheDocument();
    });

    it('should render view count with K suffix', () => {
      render(<ArticleCard article={mockArticle} />);

      expect(screen.getByText('1.2k')).toBeInTheDocument();
    });

    it('should render bookmark count when > 0', () => {
      render(<ArticleCard article={mockArticle} />);

      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should not render bookmark count when 0', () => {
      const articleNoBookmarks = { ...mockArticle, bookmark_count: 0 };
      const { container } = render(<ArticleCard article={articleNoBookmarks} />);

      // Bookmark icon should not be present
      const bookmarkIcon = container.querySelector('svg[data-icon="bookmark"]');
      expect(bookmarkIcon).toBeNull();
    });

    it('should render featured badge when featured', () => {
      render(<ArticleCard article={mockArticle} />);

      expect(screen.getByText('Featured')).toBeInTheDocument();
    });

    it('should not render featured badge when not featured', () => {
      const articleNotFeatured = { ...mockArticle, is_featured: false };
      render(<ArticleCard article={articleNotFeatured} />);

      expect(screen.queryByText('Featured')).not.toBeInTheDocument();
    });

    it('should render sponsored badge when sponsored', () => {
      const sponsoredArticle = { ...mockArticle, is_sponsored: true };
      render(<ArticleCard article={sponsoredArticle} />);

      expect(screen.getByText('Sponsored')).toBeInTheDocument();
    });

    it('should not render sponsored badge when not sponsored', () => {
      render(<ArticleCard article={mockArticle} />);

      expect(screen.queryByText('Sponsored')).not.toBeInTheDocument();
    });

    it('should render featured image', () => {
      render(<ArticleCard article={mockArticle} />);

      const image = screen.getByAltText('How to Start a Small Business');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', expect.stringContaining('article.jpg'));
    });

    it('should handle missing featured image gracefully', () => {
      const articleNoImage = { ...mockArticle, featured_image: null };
      const { container } = render(<ArticleCard article={articleNoImage} />);

      // Should show gradient background with icon
      const gradientDiv = container.querySelector('.bg-gradient-to-br');
      expect(gradientDiv).toBeInTheDocument();
    });

    it('should render tags (max 3)', () => {
      render(<ArticleCard article={mockArticle} />);

      expect(screen.getByText('#business')).toBeInTheDocument();
      expect(screen.getByText('#startup')).toBeInTheDocument();
      expect(screen.getByText('#entrepreneurship')).toBeInTheDocument();
    });

    it('should limit tags to 3', () => {
      const manyTagsArticle = {
        ...mockArticle,
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5']
      };
      const { container } = render(<ArticleCard article={manyTagsArticle} />);

      const tagElements = container.querySelectorAll('.text-biz-orange.bg-biz-orange\\/10');
      expect(tagElements).toHaveLength(3);
    });

    it('should not render tags section when no tags', () => {
      const noTagsArticle = { ...mockArticle, tags: [] };
      render(<ArticleCard article={noTagsArticle} />);

      expect(screen.queryByText(/#/)).not.toBeInTheDocument();
    });
  });

  describe('links', () => {
    it('should link to article detail page', () => {
      const { container } = render(<ArticleCard article={mockArticle} />);

      const link = container.querySelector('a');
      expect(link).toHaveAttribute('href', '/articles/how-to-start-small-business');
    });

    it('should have correct href attribute', () => {
      const { container } = render(<ArticleCard article={mockArticle} />);

      const link = container.querySelector('a');
      expect(link?.getAttribute('href')).toBe('/articles/how-to-start-small-business');
    });
  });

  describe('reading time formatting', () => {
    it('should show "Less than 1 min" for 0 minutes', () => {
      const quickArticle = { ...mockArticle, reading_time: 0 };
      render(<ArticleCard article={quickArticle} />);

      expect(screen.getByText('Less than 1 min')).toBeInTheDocument();
    });

    it('should show "1 min read" for 1 minute', () => {
      const oneMinArticle = { ...mockArticle, reading_time: 1 };
      render(<ArticleCard article={oneMinArticle} />);

      expect(screen.getByText('1 min read')).toBeInTheDocument();
    });

    it('should show "X min read" for multiple minutes', () => {
      const tenMinArticle = { ...mockArticle, reading_time: 10 };
      render(<ArticleCard article={tenMinArticle} />);

      expect(screen.getByText('10 min read')).toBeInTheDocument();
    });
  });

  describe('view count formatting', () => {
    it('should display raw number for < 1000 views', () => {
      const lowViewArticle = { ...mockArticle, view_count: 999 };
      render(<ArticleCard article={lowViewArticle} />);

      expect(screen.getByText('999')).toBeInTheDocument();
    });

    it('should display "k" suffix for thousands', () => {
      const thousandViewArticle = { ...mockArticle, view_count: 5500 };
      render(<ArticleCard article={thousandViewArticle} />);

      expect(screen.getByText('5.5k')).toBeInTheDocument();
    });

    it('should display "M" suffix for millions', () => {
      const millionViewArticle = { ...mockArticle, view_count: 1500000 };
      render(<ArticleCard article={millionViewArticle} />);

      expect(screen.getByText('1.5M')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have alt text on featured image', () => {
      render(<ArticleCard article={mockArticle} />);

      const image = screen.getByAltText('How to Start a Small Business');
      expect(image).toBeInTheDocument();
    });

    it('should use semantic HTML structure', () => {
      const { container } = render(<ArticleCard article={mockArticle} />);

      // Should use article element
      const article = container.querySelector('article');
      expect(article).toBeInTheDocument();
    });

    it('should be keyboard navigable (link)', () => {
      const { container } = render(<ArticleCard article={mockArticle} />);

      const link = container.querySelector('a');
      expect(link).toBeInTheDocument();
      expect(link?.tagName).toBe('A');
    });
  });

  describe('styling', () => {
    it('should apply card styling', () => {
      const { container } = render(<ArticleCard article={mockArticle} />);

      const article = container.querySelector('article');
      expect(article).toHaveClass('bg-white');
      expect(article).toHaveClass('rounded-xl');
      expect(article).toHaveClass('shadow-sm');
    });

    it('should apply hover effects', () => {
      const { container } = render(<ArticleCard article={mockArticle} />);

      const article = container.querySelector('article');
      expect(article).toHaveClass('hover:shadow-md');
    });

    it('should be full height', () => {
      const { container } = render(<ArticleCard article={mockArticle} />);

      const article = container.querySelector('article');
      expect(article).toHaveClass('h-full');
    });

    it('should apply custom className', () => {
      const { container } = render(<ArticleCard article={mockArticle} className="custom-class" />);

      const link = container.querySelector('a');
      expect(link).toHaveClass('custom-class');
    });
  });
});
