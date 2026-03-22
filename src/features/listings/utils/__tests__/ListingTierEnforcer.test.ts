/**
 * ListingTierEnforcer.ts Unit Tests
 *
 * @phase Phase 10 - Testing & Documentation
 * @tier STANDARD
 * @coverage 32 test cases
 */

import { describe, it, expect } from 'vitest';
import { ListingTierEnforcer } from '../ListingTierEnforcer';
import { type FeatureId, type ListingTier, FEATURE_METADATA } from '@features/listings/types/listing-section-layout';

describe('ListingTierEnforcer', () => {
  describe('isFeatureAvailable', () => {
    it('returns true for quick-facts at essentials tier', () => {
      const result = ListingTierEnforcer.isFeatureAvailable('quick-facts', 'essentials');
      expect(result).toBe(true);
    });

    it('returns false for keywords at essentials tier', () => {
      const result = ListingTierEnforcer.isFeatureAvailable('keywords', 'essentials');
      expect(result).toBe(false);
    });

    it('returns true for keywords at plus tier', () => {
      const result = ListingTierEnforcer.isFeatureAvailable('keywords', 'plus');
      expect(result).toBe(true);
    });

    it('returns true for all features at premium tier', () => {
      const allFeatures = Object.keys(FEATURE_METADATA) as FeatureId[];
      allFeatures.forEach(featureId => {
        expect(ListingTierEnforcer.isFeatureAvailable(featureId, 'premium')).toBe(true);
      });
    });

    it('returns false for unknown feature', () => {
      const result = ListingTierEnforcer.isFeatureAvailable('nonexistent-feature' as FeatureId, 'premium');
      expect(result).toBe(false);
    });

    it('returns true for essentials features at all tiers', () => {
      const essentialsFeatures: FeatureId[] = ['quick-facts', 'description', 'hours', 'contact-info'];
      const tiers: ListingTier[] = ['essentials', 'plus', 'preferred', 'premium'];

      essentialsFeatures.forEach(feature => {
        tiers.forEach(tier => {
          expect(ListingTierEnforcer.isFeatureAvailable(feature, tier)).toBe(true);
        });
      });
    });

    it('returns correct availability for preferred features', () => {
      // Preferred features should be available at preferred and premium
      expect(ListingTierEnforcer.isFeatureAvailable('testimonials', 'essentials')).toBe(false);
      expect(ListingTierEnforcer.isFeatureAvailable('testimonials', 'plus')).toBe(false);
      expect(ListingTierEnforcer.isFeatureAvailable('testimonials', 'preferred')).toBe(true);
      expect(ListingTierEnforcer.isFeatureAvailable('testimonials', 'premium')).toBe(true);
    });
  });

  describe('getLockedFeatures', () => {
    it('returns array of locked features for essentials tier', () => {
      const locked = ListingTierEnforcer.getLockedFeatures('essentials');
      expect(Array.isArray(locked)).toBe(true);
      expect(locked.length).toBeGreaterThan(0);
    });

    it('returns fewer locked features for plus tier', () => {
      const essentialsLocked = ListingTierEnforcer.getLockedFeatures('essentials');
      const plusLocked = ListingTierEnforcer.getLockedFeatures('plus');

      expect(plusLocked.length).toBeLessThan(essentialsLocked.length);
    });

    it('returns empty array for premium tier', () => {
      const locked = ListingTierEnforcer.getLockedFeatures('premium');
      expect(locked).toEqual([]);
      expect(locked.length).toBe(0);
    });

    it('includes plus-required features for essentials tier', () => {
      const locked = ListingTierEnforcer.getLockedFeatures('essentials');
      expect(locked).toContain('keywords');
      expect(locked).toContain('video-embed');
    });

    it('includes preferred-required features for plus tier', () => {
      const locked = ListingTierEnforcer.getLockedFeatures('plus');
      expect(locked).toContain('testimonials');
      expect(locked).toContain('products');
    });

    it('returns empty array for premium tier (no premium features in v2)', () => {
      const locked = ListingTierEnforcer.getLockedFeatures('premium');
      expect(locked).toEqual([]);
      expect(locked.length).toBe(0);
    });
  });

  describe('getAvailableFeatures', () => {
    it('returns basic features for essentials tier', () => {
      const available = ListingTierEnforcer.getAvailableFeatures('essentials');
      expect(available).toContain('quick-facts');
      expect(available).toContain('description');
      expect(available).toContain('hours');
      expect(available).toContain('contact-info');
    });

    it('returns more features for plus tier', () => {
      const essentialsAvailable = ListingTierEnforcer.getAvailableFeatures('essentials');
      const plusAvailable = ListingTierEnforcer.getAvailableFeatures('plus');

      expect(plusAvailable.length).toBeGreaterThan(essentialsAvailable.length);
    });

    it('returns all features for premium tier', () => {
      const available = ListingTierEnforcer.getAvailableFeatures('premium');
      const allFeatures = Object.keys(FEATURE_METADATA) as FeatureId[];

      expect(available.length).toBe(allFeatures.length);
      allFeatures.forEach(feature => {
        expect(available).toContain(feature);
      });
    });

    it('available + locked = all features', () => {
      const available = ListingTierEnforcer.getAvailableFeatures('plus');
      const locked = ListingTierEnforcer.getLockedFeatures('plus');
      const allFeatures = Object.keys(FEATURE_METADATA) as FeatureId[];

      expect(available.length + locked.length).toBe(allFeatures.length);

      // No overlap between available and locked
      available.forEach(feature => {
        expect(locked).not.toContain(feature);
      });
    });

    it('plus tier includes essentials and plus features', () => {
      const available = ListingTierEnforcer.getAvailableFeatures('plus');
      expect(available).toContain('keywords'); // Plus feature
      expect(available).toContain('quick-facts'); // Essentials feature
    });
  });

  describe('getRequiredTier', () => {
    it('returns essentials for quick-facts', () => {
      const tier = ListingTierEnforcer.getRequiredTier('quick-facts');
      expect(tier).toBe('essentials');
    });

    it('returns plus for keywords', () => {
      const tier = ListingTierEnforcer.getRequiredTier('keywords');
      expect(tier).toBe('plus');
    });

    it('returns preferred for testimonials', () => {
      const tier = ListingTierEnforcer.getRequiredTier('testimonials');
      expect(tier).toBe('preferred');
    });

    it('returns essentials for unknown feature', () => {
      const tier = ListingTierEnforcer.getRequiredTier('nonexistent-feature' as FeatureId);
      expect(tier).toBe('essentials');
    });

    it('returns correct tier for all features', () => {
      const allFeatures = Object.keys(FEATURE_METADATA) as FeatureId[];
      allFeatures.forEach(feature => {
        const tier = ListingTierEnforcer.getRequiredTier(feature);
        expect(['essentials', 'plus', 'preferred', 'premium']).toContain(tier);
      });
    });
  });

  describe('getUpgradeRecommendation', () => {
    it('returns plus recommendation for essentials tier', () => {
      const recommendation = ListingTierEnforcer.getUpgradeRecommendation('essentials');
      expect(recommendation).not.toBeNull();
      expect(recommendation!.tier).toBe('plus');
      expect(Array.isArray(recommendation!.unlockedFeatures)).toBe(true);
      expect(recommendation!.unlockedFeatures.length).toBeGreaterThan(0);
    });

    it('returns preferred recommendation for plus tier', () => {
      const recommendation = ListingTierEnforcer.getUpgradeRecommendation('plus');
      expect(recommendation).not.toBeNull();
      expect(recommendation!.tier).toBe('preferred');
      expect(recommendation!.unlockedFeatures.length).toBeGreaterThan(0);
    });

    it('returns premium recommendation for preferred tier (but no features unlock in v2)', () => {
      const recommendation = ListingTierEnforcer.getUpgradeRecommendation('preferred');
      expect(recommendation).not.toBeNull();
      expect(recommendation!.tier).toBe('premium');
      // v2 has no premium-tier features, so this would unlock 0 features
      expect(recommendation!.unlockedFeatures.length).toBe(0);
    });

    it('returns null for premium tier (already highest)', () => {
      const recommendation = ListingTierEnforcer.getUpgradeRecommendation('premium');
      expect(recommendation).toBeNull();
    });

    it('includes unlocked features in recommendation', () => {
      const recommendation = ListingTierEnforcer.getUpgradeRecommendation('essentials');
      expect(recommendation).not.toBeNull();

      // Plus unlocks keywords, video-embed, etc.
      const unlockedIds = recommendation!.unlockedFeatures;
      expect(unlockedIds).toContain('keywords');
      expect(unlockedIds).toContain('video-embed');
    });

    it('unlocked features are actually locked at current tier', () => {
      const recommendation = ListingTierEnforcer.getUpgradeRecommendation('plus');
      expect(recommendation).not.toBeNull();

      recommendation!.unlockedFeatures.forEach(feature => {
        expect(ListingTierEnforcer.isFeatureAvailable(feature, 'plus')).toBe(false);
      });
    });

    it('unlocked features are available at recommended tier', () => {
      const recommendation = ListingTierEnforcer.getUpgradeRecommendation('plus');
      expect(recommendation).not.toBeNull();

      recommendation!.unlockedFeatures.forEach(feature => {
        expect(ListingTierEnforcer.isFeatureAvailable(feature, recommendation!.tier)).toBe(true);
      });
    });
  });

  describe('getTierDisplayName', () => {
    it('returns "Essentials" for essentials', () => {
      const name = ListingTierEnforcer.getTierDisplayName('essentials');
      expect(name).toBe('Essentials');
    });

    it('returns "Plus" for plus', () => {
      const name = ListingTierEnforcer.getTierDisplayName('plus');
      expect(name).toBe('Plus');
    });

    it('returns "Preferred" for preferred', () => {
      const name = ListingTierEnforcer.getTierDisplayName('preferred');
      expect(name).toBe('Preferred');
    });

    it('returns "Premium" for premium', () => {
      const name = ListingTierEnforcer.getTierDisplayName('premium');
      expect(name).toBe('Premium');
    });

    it('returns capitalized names', () => {
      const tiers: ListingTier[] = ['essentials', 'plus', 'preferred', 'premium'];
      tiers.forEach(tier => {
        const name = ListingTierEnforcer.getTierDisplayName(tier);
        expect(name[0]).toBe(name[0].toUpperCase());
      });
    });
  });

  describe('getTierColorClasses', () => {
    it('returns gray classes for essentials', () => {
      const classes = ListingTierEnforcer.getTierColorClasses('essentials');
      expect(classes).toContain('gray');
      expect(typeof classes).toBe('string');
    });

    it('returns blue classes for plus', () => {
      const classes = ListingTierEnforcer.getTierColorClasses('plus');
      expect(classes).toContain('blue');
    });

    it('returns green classes for preferred', () => {
      const classes = ListingTierEnforcer.getTierColorClasses('preferred');
      expect(classes).toContain('green');
    });

    it('returns yellow classes for premium', () => {
      const classes = ListingTierEnforcer.getTierColorClasses('premium');
      expect(classes).toContain('yellow');
    });

    it('includes bg, text, and border classes', () => {
      const tiers: ListingTier[] = ['essentials', 'plus', 'preferred', 'premium'];
      tiers.forEach(tier => {
        const classes = ListingTierEnforcer.getTierColorClasses(tier);
        expect(classes).toContain('bg-');
        expect(classes).toContain('text-');
        expect(classes).toContain('border-');
      });
    });

    it('returns valid Tailwind CSS class string', () => {
      const classes = ListingTierEnforcer.getTierColorClasses('plus');
      expect(typeof classes).toBe('string');
      expect(classes.length).toBeGreaterThan(0);
      // Should have spaces between classes
      expect(classes.split(' ').length).toBeGreaterThan(1);
    });
  });

  describe('Static class methods', () => {
    it('all methods are static and callable', () => {
      // Verify static methods work on class
      expect(typeof ListingTierEnforcer.isFeatureAvailable).toBe('function');
      expect(typeof ListingTierEnforcer.getLockedFeatures).toBe('function');
      expect(typeof ListingTierEnforcer.getAvailableFeatures).toBe('function');
      expect(typeof ListingTierEnforcer.getRequiredTier).toBe('function');
      expect(typeof ListingTierEnforcer.getUpgradeRecommendation).toBe('function');
      expect(typeof ListingTierEnforcer.getTierDisplayName).toBe('function');
      expect(typeof ListingTierEnforcer.getTierColorClasses).toBe('function');
    });

    it('methods work without instantiation', () => {
      // Call static methods directly on class
      expect(ListingTierEnforcer.isFeatureAvailable('quick-facts', 'essentials')).toBe(true);
      expect(Array.isArray(ListingTierEnforcer.getLockedFeatures('essentials'))).toBe(true);
      expect(Array.isArray(ListingTierEnforcer.getAvailableFeatures('premium'))).toBe(true);
      expect(ListingTierEnforcer.getRequiredTier('keywords')).toBe('plus');
      expect(ListingTierEnforcer.getUpgradeRecommendation('essentials')).not.toBeNull();
      expect(ListingTierEnforcer.getTierDisplayName('plus')).toBe('Plus');
      expect(ListingTierEnforcer.getTierColorClasses('preferred')).toContain('green');
    });
  });
});
