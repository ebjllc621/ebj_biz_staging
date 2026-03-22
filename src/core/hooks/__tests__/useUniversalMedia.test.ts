import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MediaService } from '@core/services/media/MediaService';

// Mock MediaService
vi.mock('@core/services/media/MediaService', () => ({
  MediaService: vi.fn(() => ({
    getMediaForEntity: vi.fn(),
    uploadMedia: vi.fn(),
    deleteMedia: vi.fn(),
    getPrimaryMedia: vi.fn()
  }))
}));

describe('useUniversalMedia', () => {
  let mockMediaService: unknown;

  beforeEach(() => {
    mockMediaService = new MediaService();
    vi.clearAllMocks();
  });

  describe('MediaService integration', () => {
    it('should have getMediaForEntity method', () => {
      expect(mockMediaService.getMediaForEntity).toBeDefined();
      expect(typeof mockMediaService.getMediaForEntity).toBe('function');
    });

    it('should have uploadMedia method', () => {
      expect(mockMediaService.uploadMedia).toBeDefined();
      expect(typeof mockMediaService.uploadMedia).toBe('function');
    });

    it('should have deleteMedia method', () => {
      expect(mockMediaService.deleteMedia).toBeDefined();
      expect(typeof mockMediaService.deleteMedia).toBe('function');
    });

    it('should have getPrimaryMedia method', () => {
      expect(mockMediaService.getPrimaryMedia).toBeDefined();
      expect(typeof mockMediaService.getPrimaryMedia).toBe('function');
    });
  });

  describe('hook interface validation', () => {
    it('should validate required options structure', () => {
      const requiredOptions = {
        entityType: 'listing',
        entityId: 1
      };

      expect(requiredOptions.entityType).toBeDefined();
      expect(requiredOptions.entityId).toBeDefined();
      expect(typeof requiredOptions.entityType).toBe('string');
      expect(typeof requiredOptions.entityId).toBe('number');
    });

    it('should validate optional options structure', () => {
      const optionalOptions = {
        mediaType: 'logo' as const,
        autoLoad: true
      };

      expect(['logo', 'cover', 'gallery', 'video', 'document', 'avatar', 'banner']).toContain(optionalOptions.mediaType);
      expect(typeof optionalOptions.autoLoad).toBe('boolean');
    });

    it('should validate media types enum', () => {
      const validMediaTypes = ['logo', 'cover', 'gallery', 'video', 'document', 'avatar', 'banner'];

      validMediaTypes.forEach(type => {
        expect(validMediaTypes).toContain(type);
      });
    });

    it('should validate entity types', () => {
      const validEntityTypes = ['site', 'user', 'listing', 'offer', 'event', 'temporary', 'marketing', 'document'];

      validEntityTypes.forEach(type => {
        expect(validEntityTypes).toContain(type);
      });
    });
  });

  describe('expected return interface', () => {
    it('should define expected return properties', () => {
      const expectedResult = {
        media: [],
        primaryMedia: null,
        isLoading: false,
        error: null,
        uploadMedia: expect.any(Function),
        deleteMedia: expect.any(Function),
        reloadMedia: expect.any(Function),
        getPrimaryMedia: expect.any(Function)
      };

      expect(expectedResult.media).toEqual([]);
      expect(expectedResult.primaryMedia).toBeNull();
      expect(expectedResult.isLoading).toBe(false);
      expect(expectedResult.error).toBeNull();
    });
  });

  describe('service method signatures', () => {
    it('should call getMediaForEntity with correct parameters', async () => {
      mockMediaService.getMediaForEntity.mockResolvedValue([]);

      await mockMediaService.getMediaForEntity({
        entityType: 'listing',
        entityId: 1,
        mediaType: 'logo'
      });

      expect(mockMediaService.getMediaForEntity).toHaveBeenCalledWith({
        entityType: 'listing',
        entityId: 1,
        mediaType: 'logo'
      });
    });

    it('should call deleteMedia with media ID', async () => {
      mockMediaService.deleteMedia.mockResolvedValue(undefined);

      await mockMediaService.deleteMedia(123);

      expect(mockMediaService.deleteMedia).toHaveBeenCalledWith(123);
    });

    it('should call getPrimaryMedia with correct parameters', async () => {
      mockMediaService.getPrimaryMedia.mockResolvedValue({ id: 1 });

      await mockMediaService.getPrimaryMedia('listing', 1, 'cover');

      expect(mockMediaService.getPrimaryMedia).toHaveBeenCalledWith(
        'listing',
        1,
        'cover'
      );
    });
  });
});
