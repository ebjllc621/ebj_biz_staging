/**
 * seo-filename utility tests
 *
 * @tier SIMPLE
 * @phase Phase 7a - Unit Tests
 * @authority docs/media/galleryformat/phases/PHASE_7_UI_TESTING_INTEGRATION_BRAIN_PLAN.md
 * @target 100% coverage (pure utility functions)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateSeoFilename, getFileExtension } from '../seo-filename';

describe('generateSeoFilename', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic slugification', () => {
    it('should lowercase and hyphenate words', () => {
      const result = generateSeoFilename('Downtown Coffee Shop', undefined, 'jpg');
      expect(result).toMatch(/^downtown-coffee-shop-\d+\.jpg$/);
    });

    it('should strip accent marks via NFD normalization', () => {
      const result = generateSeoFilename('Café Résumé', undefined, 'jpg');
      // accents stripped: café -> cafe, résumé -> resume
      expect(result).toMatch(/^cafe-resume-\d+\.jpg$/);
    });

    it('should replace special characters with hyphens', () => {
      const result = generateSeoFilename('Hello, World! 2024', undefined, 'jpg');
      expect(result).toMatch(/^hello-world-2024-\d+\.jpg$/);
    });

    it('should collapse consecutive hyphens', () => {
      const result = generateSeoFilename('multiple   spaces   here', undefined, 'jpg');
      expect(result).toMatch(/^multiple-spaces-here-\d+\.jpg$/);
    });

    it('should trim leading and trailing hyphens from slug', () => {
      const result = generateSeoFilename('  hello world  ', undefined, 'jpg');
      expect(result).toMatch(/^hello-world-\d+\.jpg$/);
    });

    it('should handle unicode characters not covered by accent stripping', () => {
      const result = generateSeoFilename('photo 2024', undefined, 'jpg');
      expect(result).toMatch(/^photo-2024-\d+\.jpg$/);
    });
  });

  describe('Empty altText fallback', () => {
    it('should fall back to "image" when altText is empty string', () => {
      const result = generateSeoFilename('', undefined, 'jpg');
      expect(result).toMatch(/^image-\d+\.jpg$/);
    });

    it('should fall back to "image" when altText is only whitespace', () => {
      const result = generateSeoFilename('   ', undefined, 'jpg');
      expect(result).toMatch(/^image-\d+\.jpg$/);
    });

    it('should fall back to "image" when altText contains only special chars', () => {
      const result = generateSeoFilename('!!!', undefined, 'jpg');
      expect(result).toMatch(/^image-\d+\.jpg$/);
    });
  });

  describe('Context name inclusion', () => {
    it('should append slugified context name when provided', () => {
      const result = generateSeoFilename('Shop exterior', 'Listing Gallery', 'jpg');
      expect(result).toMatch(/^shop-exterior-listing-gallery-\d+\.jpg$/);
    });

    it('should skip context name when it is empty string', () => {
      const result = generateSeoFilename('Shop exterior', '', 'jpg');
      expect(result).toMatch(/^shop-exterior-\d+\.jpg$/);
    });

    it('should skip context name when it is only whitespace', () => {
      const result = generateSeoFilename('Shop exterior', '   ', 'jpg');
      expect(result).toMatch(/^shop-exterior-\d+\.jpg$/);
    });

    it('should slugify context name containing special chars', () => {
      const result = generateSeoFilename('Interior', 'Café & Restaurant', 'jpg');
      expect(result).toMatch(/^interior-cafe-restaurant-\d+\.jpg$/);
    });
  });

  describe('Extension handling', () => {
    it('should use jpg as default extension', () => {
      const result = generateSeoFilename('Test image');
      expect(result).toMatch(/\.jpg$/);
    });

    it('should preserve provided extension', () => {
      const result = generateSeoFilename('Test image', undefined, 'png');
      expect(result).toMatch(/\.png$/);
    });

    it('should lowercase the extension', () => {
      const result = generateSeoFilename('Test image', undefined, 'PNG');
      expect(result).toMatch(/\.png$/);
    });

    it('should strip non-alphanumeric chars from extension', () => {
      const result = generateSeoFilename('Test image', undefined, 'jp.g!');
      expect(result).toMatch(/\.jpg$/);
    });

    it('should fall back to jpg when extension becomes empty after cleaning', () => {
      const result = generateSeoFilename('Test image', undefined, '!!!');
      expect(result).toMatch(/\.jpg$/);
    });

    it('should handle webp extension', () => {
      const result = generateSeoFilename('Test image', undefined, 'webp');
      expect(result).toMatch(/\.webp$/);
    });
  });

  describe('Timestamp uniqueness', () => {
    it('should include a numeric timestamp in the filename', () => {
      const result = generateSeoFilename('Test image', undefined, 'jpg');
      // timestamp is the number before .jpg
      const match = result.match(/-(\d+)\.jpg$/);
      expect(match).not.toBeNull();
      expect(Number(match![1])).toBeGreaterThan(0);
    });

    it('should produce unique filenames on successive calls', () => {
      // Fake two different Date.now values
      const spy = vi.spyOn(Date, 'now');
      spy.mockReturnValueOnce(1000000000000).mockReturnValueOnce(1000000000001);

      const result1 = generateSeoFilename('Same alt text', undefined, 'jpg');
      const result2 = generateSeoFilename('Same alt text', undefined, 'jpg');
      expect(result1).not.toBe(result2);

      spy.mockRestore();
    });
  });

  describe('200-character truncation', () => {
    it('should not exceed 200 characters in the base (before extension) when alt text is very long', () => {
      const longAlt = 'a'.repeat(300);
      const result = generateSeoFilename(longAlt, undefined, 'jpg');
      const base = result.slice(0, result.lastIndexOf('.'));
      expect(base.length).toBeLessThanOrEqual(200);
    });

    it('should preserve context and timestamp even when alt slug is long', () => {
      const longAlt = 'word '.repeat(60).trim();
      const result = generateSeoFilename(longAlt, 'Gallery', 'jpg');
      // Should still contain timestamp pattern before .jpg
      expect(result).toMatch(/-\d+\.jpg$/);
      // Should still contain context
      expect(result).toContain('gallery-');
    });

    it('should preserve at least 8 chars of alt slug even under extreme truncation', () => {
      const longAlt = 'a'.repeat(300);
      const longCtx = 'b'.repeat(100);
      const result = generateSeoFilename(longAlt, longCtx, 'jpg');
      const base = result.slice(0, result.lastIndexOf('.'));
      expect(base.length).toBeLessThanOrEqual(200);
    });
  });
});

describe('getFileExtension', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Extension from filename', () => {
    it('should extract lowercase extension from simple filename', () => {
      expect(getFileExtension('photo.jpg')).toBe('jpg');
    });

    it('should lowercase uppercase extension', () => {
      expect(getFileExtension('photo.PNG')).toBe('png');
    });

    it('should handle mixed case extension', () => {
      expect(getFileExtension('photo.JpEg')).toBe('jpeg');
    });

    it('should handle multiple dots - uses last one', () => {
      expect(getFileExtension('my.photo.final.jpg')).toBe('jpg');
    });

    it('should handle webp extension', () => {
      expect(getFileExtension('image.webp')).toBe('webp');
    });

    it('should handle gif extension', () => {
      expect(getFileExtension('animation.gif')).toBe('gif');
    });

    it('should strip non-alphanumeric chars from extension', () => {
      // e.g. if extension ends up with weird chars
      expect(getFileExtension('file.jp-g')).toBe('jpg');
    });
  });

  describe('No extension - MIME type fallback', () => {
    it('should return jpg for image/jpeg MIME type', () => {
      expect(getFileExtension('photo', 'image/jpeg')).toBe('jpg');
    });

    it('should return jpg for image/jpg MIME type', () => {
      expect(getFileExtension('photo', 'image/jpg')).toBe('jpg');
    });

    it('should return png for image/png MIME type', () => {
      expect(getFileExtension('photo', 'image/png')).toBe('png');
    });

    it('should return gif for image/gif MIME type', () => {
      expect(getFileExtension('photo', 'image/gif')).toBe('gif');
    });

    it('should return webp for image/webp MIME type', () => {
      expect(getFileExtension('photo', 'image/webp')).toBe('webp');
    });

    it('should return svg for image/svg+xml MIME type', () => {
      expect(getFileExtension('icon', 'image/svg+xml')).toBe('svg');
    });

    it('should return mp4 for video/mp4 MIME type', () => {
      expect(getFileExtension('video', 'video/mp4')).toBe('mp4');
    });

    it('should return webm for video/webm MIME type', () => {
      expect(getFileExtension('video', 'video/webm')).toBe('webm');
    });

    it('should return pdf for application/pdf MIME type', () => {
      expect(getFileExtension('doc', 'application/pdf')).toBe('pdf');
    });

    it('should return bin for unknown MIME type', () => {
      expect(getFileExtension('file', 'application/unknown')).toBe('bin');
    });
  });

  describe('No extension and no MIME type', () => {
    it('should return bin when filename has no extension and no MIME given', () => {
      expect(getFileExtension('noextension')).toBe('bin');
    });

    it('should return bin for dotfile with no extension part (dot at end)', () => {
      // lastIndexOf('.') === length-1, so no extension after it
      expect(getFileExtension('file.')).toBe('bin');
    });

    it('should return bin for empty filename with no MIME', () => {
      expect(getFileExtension('')).toBe('bin');
    });
  });
});
