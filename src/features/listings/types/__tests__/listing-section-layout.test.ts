/**
 * listing-section-layout.ts Unit Tests
 *
 * @phase Phase 10 - Testing & Documentation
 * @tier STANDARD
 * @coverage 34 test cases
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LISTING_SECTION_LAYOUT,
  FEATURE_METADATA,
  SECTION_ICONS,
  SECTION_TITLES,
  SECTION_DESCRIPTIONS,
  FEATURE_ICONS,
  FEATURE_TITLES,
  mergeWithDefaultListingLayout,
  isFeatureAvailable,
  getTierLevel,
  getFeatureDndId,
  parseFeatureDndId,
  type ListingSectionLayout,
  type SectionId,
  type FeatureId,
  type ListingTier
} from '../listing-section-layout';

describe('listing-section-layout', () => {
  describe('DEFAULT_LISTING_SECTION_LAYOUT', () => {
    it('has 5 sections', () => {
      expect(DEFAULT_LISTING_SECTION_LAYOUT.sections).toHaveLength(5);
    });

    it('has correct section order', () => {
      const sectionIds = DEFAULT_LISTING_SECTION_LAYOUT.sections.map(s => s.id);
      expect(sectionIds).toEqual(['details', 'features', 'communication', 'advanced', 'sidebar']);
    });

    it('all sections are visible by default', () => {
      const allVisible = DEFAULT_LISTING_SECTION_LAYOUT.sections.every(s => s.visible === true);
      expect(allVisible).toBe(true);
    });

    it('has version 2', () => {
      expect(DEFAULT_LISTING_SECTION_LAYOUT.version).toBe(2);
    });

    it('has updatedAt timestamp', () => {
      expect(DEFAULT_LISTING_SECTION_LAYOUT.updatedAt).toBeDefined();
      expect(typeof DEFAULT_LISTING_SECTION_LAYOUT.updatedAt).toBe('string');
      // Validate it's a valid ISO date
      const date = new Date(DEFAULT_LISTING_SECTION_LAYOUT.updatedAt);
      expect(date.toISOString()).toBe(DEFAULT_LISTING_SECTION_LAYOUT.updatedAt);
    });

    it('all sections have sequential order starting from 0', () => {
      DEFAULT_LISTING_SECTION_LAYOUT.sections.forEach((section, index) => {
        expect(section.order).toBe(index);
      });
    });

    it('all sections have features array', () => {
      DEFAULT_LISTING_SECTION_LAYOUT.sections.forEach(section => {
        expect(Array.isArray(section.features)).toBe(true);
        expect(section.features.length).toBeGreaterThan(0);
      });
    });
  });

  describe('FEATURE_METADATA', () => {
    it('has metadata for all FeatureIds', () => {
      const expectedFeatures: FeatureId[] = [
        // Details (12)
        'quick-facts', 'categories', 'keywords', 'slogan',
        'video-embed', 'description', 'memberships', 'contact-info',
        'location', 'hours', 'social-links', 'testimonials',
        // Features (9)
        'gallery', 'projects', 'offers', 'events', 'products',
        'team', 'attachments', 'other-locations', 'affiliated',
        // Communication (5)
        'messages', 'reviews', 'followers', 'recommendations', 'notifications',
        // Advanced (3)
        'announcements', 'services', 'quotes',
        // Sidebar (6)
        'sidebar-memberships', 'sidebar-location', 'sidebar-contact',
        'sidebar-hours', 'sidebar-social', 'sidebar-testimonials'
      ];

      expectedFeatures.forEach(featureId => {
        expect(FEATURE_METADATA[featureId]).toBeDefined();
      });
    });

    it('all features have minTier defined', () => {
      Object.values(FEATURE_METADATA).forEach(metadata => {
        expect(metadata.minTier).toBeDefined();
        expect(['essentials', 'plus', 'preferred', 'premium']).toContain(metadata.minTier);
      });
    });

    it('all features have section defined', () => {
      Object.values(FEATURE_METADATA).forEach(metadata => {
        expect(metadata.section).toBeDefined();
        expect(['details', 'features', 'communication', 'advanced', 'sidebar']).toContain(metadata.section);
      });
    });

    it('essentials features accessible at lowest tier', () => {
      const essentialsFeatures = Object.entries(FEATURE_METADATA)
        .filter(([_, meta]) => meta.minTier === 'essentials')
        .map(([id]) => id);

      expect(essentialsFeatures.length).toBeGreaterThan(0);
      essentialsFeatures.forEach(featureId => {
        expect(FEATURE_METADATA[featureId as FeatureId].minTier).toBe('essentials');
      });
    });

    it('premium features require highest tier', () => {
      const premiumFeatures = Object.entries(FEATURE_METADATA)
        .filter(([_, meta]) => meta.minTier === 'premium')
        .map(([id]) => id);

      // v2 has no premium features - all features are essentials/plus/preferred
      expect(premiumFeatures.length).toBe(0);
    });

    it('all features have label and description', () => {
      Object.values(FEATURE_METADATA).forEach(metadata => {
        expect(metadata.label).toBeDefined();
        expect(typeof metadata.label).toBe('string');
        expect(metadata.description).toBeDefined();
        expect(typeof metadata.description).toBe('string');
      });
    });
  });

  describe('SECTION_* constants', () => {
    it('SECTION_ICONS has icon for each SectionId', () => {
      const sectionIds: SectionId[] = ['details', 'features', 'communication', 'advanced', 'sidebar'];
      sectionIds.forEach(sectionId => {
        expect(SECTION_ICONS[sectionId]).toBeDefined();
        // Icons are React components (objects with render function)
        expect(typeof SECTION_ICONS[sectionId]).toBe('object');
      });
    });

    it('SECTION_TITLES has title for each SectionId', () => {
      const sectionIds: SectionId[] = ['details', 'features', 'communication', 'advanced', 'sidebar'];
      sectionIds.forEach(sectionId => {
        expect(SECTION_TITLES[sectionId]).toBeDefined();
        expect(typeof SECTION_TITLES[sectionId]).toBe('string');
        expect(SECTION_TITLES[sectionId].length).toBeGreaterThan(0);
      });
    });

    it('SECTION_DESCRIPTIONS has description for each SectionId', () => {
      const sectionIds: SectionId[] = ['details', 'features', 'communication', 'advanced', 'sidebar'];
      sectionIds.forEach(sectionId => {
        expect(SECTION_DESCRIPTIONS[sectionId]).toBeDefined();
        expect(typeof SECTION_DESCRIPTIONS[sectionId]).toBe('string');
        expect(SECTION_DESCRIPTIONS[sectionId].length).toBeGreaterThan(0);
      });
    });
  });

  describe('FEATURE_* constants', () => {
    it('FEATURE_ICONS has icon for each FeatureId', () => {
      const featureIds = Object.keys(FEATURE_METADATA) as FeatureId[];
      featureIds.forEach(featureId => {
        expect(FEATURE_ICONS[featureId]).toBeDefined();
        // Icons are React components (objects with render function)
        expect(typeof FEATURE_ICONS[featureId]).toBe('object');
      });
    });

    it('FEATURE_TITLES has title for each FeatureId', () => {
      const featureIds = Object.keys(FEATURE_METADATA) as FeatureId[];
      featureIds.forEach(featureId => {
        expect(FEATURE_TITLES[featureId]).toBeDefined();
        expect(typeof FEATURE_TITLES[featureId]).toBe('string');
        expect(FEATURE_TITLES[featureId].length).toBeGreaterThan(0);
      });
    });
  });

  describe('mergeWithDefaultListingLayout', () => {
    it('returns default layout for null input', () => {
      const result = mergeWithDefaultListingLayout(null);
      expect(result.sections).toHaveLength(5);
      expect(result.version).toBe(2);
      expect(result.updatedAt).toBeDefined();
    });

    it('returns default layout for undefined input', () => {
      const result = mergeWithDefaultListingLayout(undefined);
      expect(result.sections).toHaveLength(5);
      expect(result.version).toBe(2);
      expect(result.updatedAt).toBeDefined();
    });

    it('preserves user section order', () => {
      const userLayout: ListingSectionLayout = {
        sections: [
          { id: 'sidebar', order: 0, visible: true, features: [] },
          { id: 'details', order: 1, visible: true, features: [] },
          { id: 'features', order: 2, visible: true, features: [] },
          { id: 'communication', order: 3, visible: true, features: [] },
          { id: 'advanced', order: 4, visible: true, features: [] }
        ],
        version: 1,
        updatedAt: '2025-01-01T00:00:00.000Z'
      };

      const result = mergeWithDefaultListingLayout(userLayout);
      expect(result.sections[0].id).toBe('sidebar');
      expect(result.sections[1].id).toBe('details');
    });

    it('adds missing sections at end', () => {
      const userLayout: ListingSectionLayout = {
        sections: [
          { id: 'details', order: 0, visible: true, features: [] },
          { id: 'features', order: 1, visible: true, features: [] }
          // Missing: communication, advanced, sidebar
        ],
        version: 1,
        updatedAt: '2025-01-01T00:00:00.000Z'
      };

      const result = mergeWithDefaultListingLayout(userLayout);
      expect(result.sections).toHaveLength(5);
      expect(result.sections[0].id).toBe('details');
      expect(result.sections[1].id).toBe('features');
      // New sections added at end
      expect(result.sections.slice(2).map(s => s.id)).toContain('communication');
    });

    it('adds missing features within sections', () => {
      const userLayout: ListingSectionLayout = {
        sections: [
          {
            id: 'details',
            order: 0,
            visible: true,
            features: [
              { id: 'quick-facts', order: 0, visible: true }
              // Missing: description, categories, keywords, etc.
            ]
          },
          { id: 'features', order: 1, visible: true, features: [] },
          { id: 'communication', order: 2, visible: true, features: [] },
          { id: 'advanced', order: 3, visible: true, features: [] },
          { id: 'sidebar', order: 4, visible: true, features: [] }
        ],
        version: 2,
        updatedAt: '2025-01-01T00:00:00.000Z'
      };

      const result = mergeWithDefaultListingLayout(userLayout);
      const detailsSection = result.sections.find(s => s.id === 'details');
      expect(detailsSection).toBeDefined();
      expect(detailsSection!.features.length).toBeGreaterThan(1);
      expect(detailsSection!.features.map(f => f.id)).toContain('description');
    });

    it('preserves user feature visibility', () => {
      const userLayout: ListingSectionLayout = {
        sections: [
          {
            id: 'details',
            order: 0,
            visible: true,
            features: [
              { id: 'quick-facts', order: 0, visible: false }, // User hid this
              { id: 'description', order: 1, visible: true },
              { id: 'categories', order: 2, visible: true },
              { id: 'keywords', order: 3, visible: false } // User hid this
            ]
          },
          { id: 'features', order: 1, visible: true, features: [] },
          { id: 'communication', order: 2, visible: true, features: [] },
          { id: 'advanced', order: 3, visible: true, features: [] },
          { id: 'sidebar', order: 4, visible: true, features: [] }
        ],
        version: 2,
        updatedAt: '2025-01-01T00:00:00.000Z'
      };

      const result = mergeWithDefaultListingLayout(userLayout);
      const detailsSection = result.sections.find(s => s.id === 'details');
      const quickFacts = detailsSection!.features.find(f => f.id === 'quick-facts');
      const keywords = detailsSection!.features.find(f => f.id === 'keywords');

      expect(quickFacts!.visible).toBe(false);
      expect(keywords!.visible).toBe(false);
    });

    it('updates updatedAt timestamp', () => {
      const oldTimestamp = '2025-01-01T00:00:00.000Z';
      const userLayout: ListingSectionLayout = {
        sections: DEFAULT_LISTING_SECTION_LAYOUT.sections,
        version: 2,
        updatedAt: oldTimestamp
      };

      const result = mergeWithDefaultListingLayout(userLayout);
      expect(result.updatedAt).not.toBe(oldTimestamp);
      expect(new Date(result.updatedAt).getTime()).toBeGreaterThan(new Date(oldTimestamp).getTime());
    });
  });

  describe('isFeatureAvailable', () => {
    it('returns true for essentials features at essentials tier', () => {
      expect(isFeatureAvailable('quick-facts', 'essentials')).toBe(true);
      expect(isFeatureAvailable('description', 'essentials')).toBe(true);
      expect(isFeatureAvailable('hours', 'essentials')).toBe(true);
    });

    it('returns false for plus features at essentials tier', () => {
      expect(isFeatureAvailable('keywords', 'essentials')).toBe(false);
      expect(isFeatureAvailable('video-embed', 'essentials')).toBe(false);
    });

    it('returns true for plus features at plus tier', () => {
      expect(isFeatureAvailable('keywords', 'plus')).toBe(true);
      expect(isFeatureAvailable('video-embed', 'plus')).toBe(true);
    });

    it('returns true for all features at premium tier', () => {
      const allFeatures = Object.keys(FEATURE_METADATA) as FeatureId[];
      allFeatures.forEach(featureId => {
        expect(isFeatureAvailable(featureId, 'premium')).toBe(true);
      });
    });

    it('returns false for unknown feature', () => {
      expect(isFeatureAvailable('nonexistent-feature' as FeatureId, 'premium')).toBe(false);
    });

    it('returns true for preferred features at preferred tier', () => {
      expect(isFeatureAvailable('testimonials', 'preferred')).toBe(true);
      expect(isFeatureAvailable('products', 'preferred')).toBe(true);
    });
  });

  describe('getTierLevel', () => {
    it('returns 0 for essentials', () => {
      expect(getTierLevel('essentials')).toBe(0);
    });

    it('returns 1 for plus', () => {
      expect(getTierLevel('plus')).toBe(1);
    });

    it('returns 2 for preferred', () => {
      expect(getTierLevel('preferred')).toBe(2);
    });

    it('returns 3 for premium', () => {
      expect(getTierLevel('premium')).toBe(3);
    });

    it('tier levels are in ascending order', () => {
      expect(getTierLevel('essentials')).toBeLessThan(getTierLevel('plus'));
      expect(getTierLevel('plus')).toBeLessThan(getTierLevel('preferred'));
      expect(getTierLevel('preferred')).toBeLessThan(getTierLevel('premium'));
    });
  });

  describe('getFeatureDndId', () => {
    it('creates compound ID with colon separator', () => {
      const result = getFeatureDndId('details', 'quick-facts');
      expect(result).toBe('details:quick-facts');
      expect(result).toContain(':');
    });

    it('handles all section/feature combinations', () => {
      const result1 = getFeatureDndId('details', 'hours');
      expect(result1).toBe('details:hours');

      const result2 = getFeatureDndId('sidebar', 'sidebar-location');
      expect(result2).toBe('sidebar:sidebar-location');

      const result3 = getFeatureDndId('advanced', 'services');
      expect(result3).toBe('advanced:services');
    });

    it('creates unique IDs for different features in same section', () => {
      const id1 = getFeatureDndId('details', 'quick-facts');
      const id2 = getFeatureDndId('details', 'description');
      expect(id1).not.toBe(id2);
    });
  });

  describe('parseFeatureDndId', () => {
    it('parses valid compound ID', () => {
      const result = parseFeatureDndId('details:quick-facts');
      expect(result).not.toBeNull();
      expect(result!.sectionId).toBe('details');
      expect(result!.featureId).toBe('quick-facts');
    });

    it('returns null for invalid ID (no colon)', () => {
      const result = parseFeatureDndId('invalid-id');
      expect(result).toBeNull();
    });

    it('returns null for invalid ID (too many colons)', () => {
      const result = parseFeatureDndId('details:quick:facts');
      expect(result).toBeNull();
    });

    it('returns sectionId and featureId types correctly', () => {
      const result = parseFeatureDndId('details:hours');
      expect(result).not.toBeNull();
      expect(result!.sectionId).toBe('details');
      expect(result!.featureId).toBe('hours');
    });

    it('roundtrips with getFeatureDndId', () => {
      const original = getFeatureDndId('details', 'contact-info');
      const parsed = parseFeatureDndId(original);
      expect(parsed).not.toBeNull();
      expect(parsed!.sectionId).toBe('details');
      expect(parsed!.featureId).toBe('contact-info');
    });
  });
});
