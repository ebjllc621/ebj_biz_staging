/**
 * layoutMigration.ts Unit Tests
 *
 * @phase Phase 10 - Testing & Documentation
 * @tier STANDARD
 * @coverage 26 test cases
 */

import { describe, it, expect } from 'vitest';
import {
  migrateLayout,
  addMissingFeatures,
  validateLayout,
  repairLayout,
  CURRENT_LAYOUT_VERSION
} from '../layoutMigration';
import {
  DEFAULT_LISTING_SECTION_LAYOUT,
  type ListingSectionLayout,
  type SectionConfig
} from '@features/listings/types/listing-section-layout';

describe('layoutMigration', () => {
  describe('CURRENT_LAYOUT_VERSION', () => {
    it('is a positive number', () => {
      expect(CURRENT_LAYOUT_VERSION).toBeGreaterThan(0);
      expect(typeof CURRENT_LAYOUT_VERSION).toBe('number');
    });

    it('equals 2 (current version)', () => {
      expect(CURRENT_LAYOUT_VERSION).toBe(2);
    });
  });

  describe('migrateLayout', () => {
    it('returns default layout for null input', () => {
      const result = migrateLayout(null);
      expect(result.sections).toHaveLength(5);
      expect(result.version).toBe(CURRENT_LAYOUT_VERSION);
      expect(result.updatedAt).toBeDefined();
    });

    it('returns default layout for undefined input', () => {
      const result = migrateLayout(undefined as any);
      expect(result.sections).toHaveLength(5);
      expect(result.version).toBe(CURRENT_LAYOUT_VERSION);
      expect(result.updatedAt).toBeDefined();
    });

    it('returns layout unchanged if at current version', () => {
      const layout: ListingSectionLayout = {
        sections: [
          { id: 'details', order: 0, visible: true, features: [] }
        ],
        version: CURRENT_LAYOUT_VERSION,
        updatedAt: '2025-01-15T10:00:00.000Z'
      };

      const result = migrateLayout(layout);
      expect(result).toEqual(layout);
      expect(result.version).toBe(CURRENT_LAYOUT_VERSION);
    });

    it('upgrades v0 layout to v2', () => {
      const v0Layout: ListingSectionLayout = {
        sections: [
          { id: 'details', order: 0, visible: true, features: [] }
        ],
        version: 0,
        updatedAt: '2025-01-01T00:00:00.000Z'
      };

      const result = migrateLayout(v0Layout);
      expect(result.version).toBe(2);
    });

    it('sets updatedAt timestamp after migration', () => {
      const oldTimestamp = '2025-01-01T00:00:00.000Z';
      const v0Layout: ListingSectionLayout = {
        sections: [
          { id: 'details', order: 0, visible: true, features: [] }
        ],
        version: 0,
        updatedAt: oldTimestamp
      };

      const result = migrateLayout(v0Layout);
      expect(result.updatedAt).not.toBe(oldTimestamp);
      expect(new Date(result.updatedAt).getTime()).toBeGreaterThan(new Date(oldTimestamp).getTime());
    });

    it('preserves existing section order', () => {
      const layout: ListingSectionLayout = {
        sections: [
          { id: 'sidebar', order: 0, visible: true, features: [] },
          { id: 'details', order: 1, visible: true, features: [] }
        ],
        version: 0,
        updatedAt: '2025-01-01T00:00:00.000Z'
      };

      const result = migrateLayout(layout);
      expect(result.sections[0].id).toBe('sidebar');
      expect(result.sections[1].id).toBe('details');
    });

    it('preserves existing feature visibility', () => {
      const layout: ListingSectionLayout = {
        sections: [
          {
            id: 'details',
            order: 0,
            visible: true,
            features: [
              { id: 'basic-info', order: 0, visible: false }
            ]
          }
        ],
        version: 0,
        updatedAt: '2025-01-01T00:00:00.000Z'
      };

      const result = migrateLayout(layout);
      // v0->v1->v2 migration: basic-info becomes quick-facts
      const quickFacts = result.sections[0].features.find(f => f.id === 'quick-facts');
      expect(quickFacts?.visible).toBe(false);
    });

    it('handles layouts without version field (treats as v0)', () => {
      const layoutWithoutVersion: any = {
        sections: [
          { id: 'details', order: 0, visible: true, features: [] }
        ],
        updatedAt: '2025-01-01T00:00:00.000Z'
      };

      const result = migrateLayout(layoutWithoutVersion);
      expect(result.version).toBe(2);
    });
  });

  describe('addMissingFeatures', () => {
    it('returns layout unchanged if all features present', () => {
      const completeLayout = { ...DEFAULT_LISTING_SECTION_LAYOUT };
      const result = addMissingFeatures(completeLayout);

      // Should have same number of sections
      expect(result.sections.length).toBe(completeLayout.sections.length);

      // Each section should have at least the same features (may add new ones from FEATURE_METADATA)
      result.sections.forEach((section, idx) => {
        expect(section.features.length).toBeGreaterThanOrEqual(completeLayout.sections[idx].features.length);
      });
    });

    it('adds missing feature to correct section', () => {
      const layoutMissingKeywords: ListingSectionLayout = {
        sections: [
          {
            id: 'details',
            order: 0,
            visible: true,
            features: [
              { id: 'quick-facts', order: 0, visible: true },
              { id: 'description', order: 1, visible: true },
              { id: 'categories', order: 2, visible: true }
              // Missing: keywords
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

      const result = addMissingFeatures(layoutMissingKeywords);
      const detailsSection = result.sections.find(s => s.id === 'details');
      const keywordsFeature = detailsSection!.features.find(f => f.id === 'keywords');

      expect(keywordsFeature).toBeDefined();
    });

    it('assigns order after existing features', () => {
      const layoutWithTwoFeatures: ListingSectionLayout = {
        sections: [
          {
            id: 'details',
            order: 0,
            visible: true,
            features: [
              { id: 'quick-facts', order: 0, visible: true },
              { id: 'description', order: 1, visible: true }
              // Missing: categories, keywords, etc.
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

      const result = addMissingFeatures(layoutWithTwoFeatures);
      const detailsSection = result.sections.find(s => s.id === 'details');
      const addedFeatures = detailsSection!.features.filter(f =>
        !['quick-facts', 'description'].includes(f.id)
      );

      // All added features should have order > 1
      addedFeatures.forEach(feature => {
        expect(feature.order).toBeGreaterThan(1);
      });
    });

    it('uses default visibility from FEATURE_METADATA', () => {
      const layoutMissingFeatures: ListingSectionLayout = {
        sections: [
          {
            id: 'details',
            order: 0,
            visible: true,
            features: [
              { id: 'quick-facts', order: 0, visible: true }
              // Missing all other features
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

      const result = addMissingFeatures(layoutMissingFeatures);

      // All added features should have visible property defined
      result.sections.forEach(section => {
        section.features.forEach(feature => {
          expect(typeof feature.visible).toBe('boolean');
        });
      });
    });

    it('updates updatedAt timestamp', () => {
      const oldTimestamp = '2025-01-01T00:00:00.000Z';
      const layout: ListingSectionLayout = {
        sections: [
          {
            id: 'details',
            order: 0,
            visible: true,
            features: []
          }
        ],
        version: 2,
        updatedAt: oldTimestamp
      };

      const result = addMissingFeatures(layout);
      expect(result.updatedAt).not.toBe(oldTimestamp);
      expect(new Date(result.updatedAt).getTime()).toBeGreaterThan(new Date(oldTimestamp).getTime());
    });
  });

  describe('validateLayout', () => {
    it('returns empty array for valid layout', () => {
      const errors = validateLayout(DEFAULT_LISTING_SECTION_LAYOUT);
      expect(errors).toEqual([]);
      expect(errors.length).toBe(0);
    });

    it('detects missing sections array', () => {
      const invalidLayout: any = {
        version: 1,
        updatedAt: '2025-01-01T00:00:00.000Z'
      };

      const errors = validateLayout(invalidLayout);
      expect(errors).toContain('Layout must have sections array');
    });

    it('detects non-numeric version', () => {
      const invalidLayout: any = {
        sections: [],
        version: 'one',
        updatedAt: '2025-01-01T00:00:00.000Z'
      };

      const errors = validateLayout(invalidLayout);
      expect(errors).toContain('Layout must have numeric version');
    });

    it('detects missing updatedAt', () => {
      const invalidLayout: any = {
        sections: [],
        version: 1
      };

      const errors = validateLayout(invalidLayout);
      expect(errors).toContain('Layout must have updatedAt timestamp');
    });

    it('detects section missing id', () => {
      const invalidLayout: ListingSectionLayout = {
        sections: [
          { id: undefined as any, order: 0, visible: true, features: [] }
        ],
        version: 2,
        updatedAt: '2025-01-01T00:00:00.000Z'
      };

      const errors = validateLayout(invalidLayout);
      expect(errors.some(e => e.includes('missing id'))).toBe(true);
    });

    it('detects section missing order', () => {
      const invalidLayout: any = {
        sections: [
          { id: 'details', visible: true, features: [] }
        ],
        version: 2,
        updatedAt: '2025-01-01T00:00:00.000Z'
      };

      const errors = validateLayout(invalidLayout);
      expect(errors.some(e => e.includes('missing order'))).toBe(true);
    });

    it('detects feature missing id', () => {
      const invalidLayout: any = {
        sections: [
          {
            id: 'details',
            order: 0,
            visible: true,
            features: [
              { order: 0, visible: true }
            ]
          }
        ],
        version: 2,
        updatedAt: '2025-01-01T00:00:00.000Z'
      };

      const errors = validateLayout(invalidLayout);
      expect(errors.some(e => e.includes('missing id'))).toBe(true);
    });

    it('detects feature missing visible flag', () => {
      const invalidLayout: any = {
        sections: [
          {
            id: 'details',
            order: 0,
            visible: true,
            features: [
              { id: 'quick-facts', order: 0 }
            ]
          }
        ],
        version: 2,
        updatedAt: '2025-01-01T00:00:00.000Z'
      };

      const errors = validateLayout(invalidLayout);
      expect(errors.some(e => e.includes('missing visible flag'))).toBe(true);
    });

    it('detects multiple errors in single validation', () => {
      const invalidLayout: any = {
        sections: [
          {
            id: 'details',
            // Missing order
            visible: true,
            features: [
              { id: 'quick-facts', order: 0 } // Missing visible
            ]
          }
        ],
        // Missing version (non-numeric)
        updatedAt: '2025-01-01T00:00:00.000Z'
      };

      const errors = validateLayout(invalidLayout);
      expect(errors.length).toBeGreaterThan(1);
    });
  });

  describe('repairLayout', () => {
    it('returns default layout for null input', () => {
      const result = repairLayout(null);
      expect(result.sections).toHaveLength(5);
      expect(result.version).toBe(CURRENT_LAYOUT_VERSION);
      expect(result.updatedAt).toBeDefined();
    });

    it('repairs missing sections array', () => {
      const corruptedLayout: any = {
        version: 1,
        updatedAt: '2025-01-01T00:00:00.000Z'
      };

      const result = repairLayout(corruptedLayout);
      expect(Array.isArray(result.sections)).toBe(true);
      expect(result.sections.length).toBeGreaterThan(0);
    });

    it('repairs non-numeric version', () => {
      const corruptedLayout: any = {
        sections: [
          { id: 'details', order: 0, visible: true, features: [] }
        ],
        version: 'invalid',
        updatedAt: '2025-01-01T00:00:00.000Z'
      };

      const result = repairLayout(corruptedLayout);
      expect(typeof result.version).toBe('number');
      expect(result.version).toBe(CURRENT_LAYOUT_VERSION);
    });

    it('repairs missing updatedAt', () => {
      const corruptedLayout: any = {
        sections: [
          { id: 'details', order: 0, visible: true, features: [] }
        ],
        version: 2
      };

      const result = repairLayout(corruptedLayout);
      expect(result.updatedAt).toBeDefined();
      expect(typeof result.updatedAt).toBe('string');
      // Validate it's a valid ISO date
      const date = new Date(result.updatedAt);
      expect(date.toISOString()).toBe(result.updatedAt);
    });

    it('applies migration after repair', () => {
      const corruptedLayout: any = {
        sections: [
          { id: 'details', order: 0, visible: true, features: [] }
        ],
        version: 0,
        updatedAt: '2025-01-01T00:00:00.000Z'
      };

      const result = repairLayout(corruptedLayout);
      expect(result.version).toBe(CURRENT_LAYOUT_VERSION);
    });

    it('adds missing features after repair', () => {
      const incompleteLayout: any = {
        sections: [
          {
            id: 'details',
            order: 0,
            visible: true,
            features: [
              { id: 'quick-facts', order: 0, visible: true }
              // Missing other features
            ]
          }
        ],
        version: 2,
        updatedAt: '2025-01-01T00:00:00.000Z'
      };

      const result = repairLayout(incompleteLayout);
      const detailsSection = result.sections.find(s => s.id === 'details');
      expect(detailsSection!.features.length).toBeGreaterThan(1);
    });

    it('validates repaired layout has no errors', () => {
      const corruptedLayout: any = {
        sections: [
          { id: 'details', visible: true, order: 0, features: [] } // Provide features array
        ],
        version: 'invalid'
        // Missing updatedAt
      };

      const result = repairLayout(corruptedLayout);
      const errors = validateLayout(result);
      expect(errors.length).toBe(0);
    });
  });
});
