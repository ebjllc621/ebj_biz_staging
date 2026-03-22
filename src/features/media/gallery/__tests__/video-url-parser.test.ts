/**
 * video-url-parser - Unit Tests
 *
 * @phase Phase 8B - Gallery Layout Selector + Mixed Media Unification
 */
import { describe, it, expect } from 'vitest';
import { parseVideoUrl } from '../utils/video-url-parser';

describe('parseVideoUrl', () => {
  // =========================================================================
  // YouTube
  // =========================================================================
  describe('YouTube', () => {
    it('parses standard watch URL', () => {
      const result = parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(result.provider).toBe('youtube');
      expect(result.videoId).toBe('dQw4w9WgXcQ');
      expect(result.embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&autoplay=1');
      expect(result.thumbnailUrl).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
      expect(result.originalUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    it('parses short youtu.be URL', () => {
      const result = parseVideoUrl('https://youtu.be/dQw4w9WgXcQ');
      expect(result.provider).toBe('youtube');
      expect(result.videoId).toBe('dQw4w9WgXcQ');
      expect(result.embedUrl).toContain('embed/dQw4w9WgXcQ');
    });

    it('parses embed URL', () => {
      const result = parseVideoUrl('https://www.youtube.com/embed/dQw4w9WgXcQ');
      expect(result.provider).toBe('youtube');
      expect(result.videoId).toBe('dQw4w9WgXcQ');
    });

    it('parses /v/ URL', () => {
      const result = parseVideoUrl('https://www.youtube.com/v/dQw4w9WgXcQ');
      expect(result.provider).toBe('youtube');
      expect(result.videoId).toBe('dQw4w9WgXcQ');
    });
  });

  // =========================================================================
  // Vimeo
  // =========================================================================
  describe('Vimeo', () => {
    it('parses standard vimeo URL', () => {
      const result = parseVideoUrl('https://vimeo.com/123456789');
      expect(result.provider).toBe('vimeo');
      expect(result.videoId).toBe('123456789');
      expect(result.embedUrl).toBe('https://player.vimeo.com/video/123456789?autoplay=1');
      expect(result.thumbnailUrl).toBeNull();
    });

    it('parses vimeo /video/ URL', () => {
      const result = parseVideoUrl('https://vimeo.com/video/987654321');
      expect(result.provider).toBe('vimeo');
      expect(result.videoId).toBe('987654321');
    });
  });

  // =========================================================================
  // Dailymotion
  // =========================================================================
  describe('Dailymotion', () => {
    it('parses dailymotion URL', () => {
      const result = parseVideoUrl('https://www.dailymotion.com/video/x7tgad0');
      expect(result.provider).toBe('dailymotion');
      expect(result.videoId).toBe('x7tgad0');
      expect(result.embedUrl).toBe('https://www.dailymotion.com/embed/video/x7tgad0?autoplay=1');
      expect(result.thumbnailUrl).toBe('https://www.dailymotion.com/thumbnail/video/x7tgad0');
    });
  });

  // =========================================================================
  // Rumble
  // =========================================================================
  describe('Rumble', () => {
    it('parses rumble standard URL', () => {
      const result = parseVideoUrl('https://rumble.com/vABC123-some-title.html');
      expect(result.provider).toBe('rumble');
      expect(result.videoId).toBe('vABC123');
      expect(result.embedUrl).toBe('https://rumble.com/embed/vABC123/?autoplay=1');
      expect(result.thumbnailUrl).toBeNull();
    });

    it('parses rumble embed URL', () => {
      const result = parseVideoUrl('https://rumble.com/embed/vXYZ789');
      expect(result.provider).toBe('rumble');
      expect(result.videoId).toBe('vXYZ789');
    });
  });

  // =========================================================================
  // Direct video files
  // =========================================================================
  describe('Direct video files', () => {
    it('parses .mp4 file URL', () => {
      const result = parseVideoUrl('https://example.com/video.mp4');
      expect(result.provider).toBe('direct');
      expect(result.embedUrl).toBe('https://example.com/video.mp4');
      expect(result.videoId).toBeNull();
      expect(result.thumbnailUrl).toBeNull();
    });

    it('parses .webm file URL', () => {
      const result = parseVideoUrl('https://cdn.example.com/videos/clip.webm');
      expect(result.provider).toBe('direct');
      expect(result.embedUrl).toBe('https://cdn.example.com/videos/clip.webm');
    });

    it('parses .mov file URL', () => {
      const result = parseVideoUrl('https://cdn.example.com/movie.mov');
      expect(result.provider).toBe('direct');
      expect(result.embedUrl).toBe('https://cdn.example.com/movie.mov');
    });
  });

  // =========================================================================
  // Unknown / edge cases
  // =========================================================================
  describe('Unknown and edge cases', () => {
    it('returns unknown for an unrecognized URL', () => {
      const result = parseVideoUrl('https://somerandomprovider.com/watch/12345');
      expect(result.provider).toBe('unknown');
      expect(result.embedUrl).toBeNull();
      expect(result.videoId).toBeNull();
      expect(result.thumbnailUrl).toBeNull();
    });

    it('returns unknown for empty string', () => {
      const result = parseVideoUrl('');
      expect(result.provider).toBe('unknown');
      expect(result.embedUrl).toBeNull();
      expect(result.videoId).toBeNull();
      expect(result.thumbnailUrl).toBeNull();
      expect(result.originalUrl).toBe('');
    });

    it('preserves originalUrl', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const result = parseVideoUrl(url);
      expect(result.originalUrl).toBe(url);
    });
  });
});
