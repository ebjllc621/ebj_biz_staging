import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MediaService } from '../MediaService';

// Mock dependencies
vi.mock('@core/services/DatabaseService', () => ({
  getDatabaseService: vi.fn(() => ({
    query: vi.fn()
  }))
}));

vi.mock('cloudinary', () => ({
  v2: {
    config: vi.fn(),
    uploader: {
      upload_stream: vi.fn(),
      destroy: vi.fn()
    }
  }
}));

vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    metadata: vi.fn().mockResolvedValue({ width: 1920, height: 1080 })
  }))
}));

vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined)
}));

describe('MediaService', () => {
  let mediaService: MediaService;

  beforeEach(() => {
    mediaService = new MediaService();
  });

  describe('determineStorageType', () => {
    it('should route site assets to local', () => {
      const result = (mediaService as unknown).determineStorageType('site');
      expect(result).toBe('local');
    });

    it('should route marketing to cloudinary', () => {
      const result = (mediaService as unknown).determineStorageType('marketing');
      expect(result).toBe('cloudinary');
    });

    it('should route premium users to cloudinary', () => {
      const result = (mediaService as unknown).determineStorageType('user', 'premium');
      expect(result).toBe('cloudinary');
    });

    it('should route preferred users to cloudinary', () => {
      const result = (mediaService as unknown).determineStorageType('user', 'preferred');
      expect(result).toBe('cloudinary');
    });

    it('should route general users to local', () => {
      const result = (mediaService as unknown).determineStorageType('user', 'general');
      expect(result).toBe('local');
    });

    it('should route essentials users to local', () => {
      const result = (mediaService as unknown).determineStorageType('user', 'essentials');
      expect(result).toBe('local');
    });

    it('should route temporary files to local', () => {
      const result = (mediaService as unknown).determineStorageType('temporary');
      expect(result).toBe('local');
    });

    it('should route documents to local for security', () => {
      const result = (mediaService as unknown).determineStorageType('document');
      expect(result).toBe('local');
    });

    it('should route preferred listings to cloudinary', () => {
      const result = (mediaService as unknown).determineStorageType('listing', undefined, 'preferred');
      expect(result).toBe('cloudinary');
    });

    it('should route premium listings to cloudinary', () => {
      const result = (mediaService as unknown).determineStorageType('listing', undefined, 'premium');
      expect(result).toBe('cloudinary');
    });

    it('should route essentials listings to local', () => {
      const result = (mediaService as unknown).determineStorageType('listing', undefined, 'essentials');
      expect(result).toBe('local');
    });

    it('should default to local for unknown entity types', () => {
      const result = (mediaService as unknown).determineStorageType('unknown');
      expect(result).toBe('local');
    });
  });

  describe('shouldOverwrite', () => {
    it('should overwrite logo', () => {
      expect((mediaService as unknown).shouldOverwrite('logo')).toBe(true);
    });

    it('should overwrite cover', () => {
      expect((mediaService as unknown).shouldOverwrite('cover')).toBe(true);
    });

    it('should overwrite avatar', () => {
      expect((mediaService as unknown).shouldOverwrite('avatar')).toBe(true);
    });

    it('should not overwrite gallery', () => {
      expect((mediaService as unknown).shouldOverwrite('gallery')).toBe(false);
    });

    it('should not overwrite video', () => {
      expect((mediaService as unknown).shouldOverwrite('video')).toBe(false);
    });

    it('should not overwrite document', () => {
      expect((mediaService as unknown).shouldOverwrite('document')).toBe(false);
    });

    it('should not overwrite banner', () => {
      expect((mediaService as unknown).shouldOverwrite('banner')).toBe(false);
    });
  });

  describe('storage routing logic', () => {
    it('should correctly identify all local storage cases', () => {
      const localCases = [
        ['site', undefined, undefined],
        ['temporary', undefined, undefined],
        ['document', undefined, undefined],
        ['user', 'visitor', undefined],
        ['user', 'general', undefined],
        ['user', 'essentials', undefined],
        ['listing', undefined, 'essentials'],
        ['listing', undefined, 'plus']
      ];

      localCases.forEach(([entityType, userTier, listingTier]) => {
        const result = (mediaService as unknown).determineStorageType(
          entityType,
          userTier,
          listingTier
        );
        expect(result).toBe('local');
      });
    });

    it('should correctly identify all cloudinary storage cases', () => {
      const cloudinaryCases = [
        ['marketing', undefined, undefined],
        ['user', 'premium', undefined],
        ['user', 'preferred', undefined],
        ['listing', undefined, 'preferred'],
        ['listing', undefined, 'premium'],
        ['offer', undefined, 'preferred'],
        ['event', undefined, 'premium']
      ];

      cloudinaryCases.forEach(([entityType, userTier, listingTier]) => {
        const result = (mediaService as unknown).determineStorageType(
          entityType,
          userTier,
          listingTier
        );
        expect(result).toBe('cloudinary');
      });
    });
  });

  describe('overwrite vs append logic', () => {
    it('should identify all overwrite media types', () => {
      const overwriteTypes = ['logo', 'cover', 'avatar'];
      overwriteTypes.forEach(type => {
        expect((mediaService as unknown).shouldOverwrite(type)).toBe(true);
      });
    });

    it('should identify all append media types', () => {
      const appendTypes = ['gallery', 'video', 'document', 'banner'];
      appendTypes.forEach(type => {
        expect((mediaService as unknown).shouldOverwrite(type)).toBe(false);
      });
    });
  });
});
