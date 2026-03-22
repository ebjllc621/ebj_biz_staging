/**
 * calculateListingCompleteness Utility Unit Tests
 *
 * @phase Claim Listing Phase 8
 * @tier STANDARD
 * @coverage 25 test cases
 */

import { describe, it, expect } from 'vitest';
import { calculateListingCompleteness, getListingFieldDefinitions } from '../calculateListingCompleteness';
import type { Listing } from '@core/services/ListingService';

describe('calculateListingCompleteness', () => {
  const createListing = (overrides?: Partial<Listing>): Listing => ({
    id: 1,
    name: '',
    slug: 'test',
    description: '',
    address: '',
    city: 'Test',
    state: 'TS',
    zip: '12345',
    phone: '',
    email: '',
    category_id: null as any, // Empty listing - no category
    user_id: 1,
    claimed: false,
    status: 'active' as const,
    business_hours: [],
    logo_url: null,
    cover_image_url: null,
    gallery_images: null,
    social_media: null,
    features: null,
    amenities: null,
    website: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  });

  describe('Percentage Calculation', () => {
    it('returns 0% for empty listing', () => {
      const listing = createListing();
      const result = calculateListingCompleteness(listing);
      expect(result.percentage).toBe(0);
    });

    it('returns 100% for fully complete listing', () => {
      const listing = createListing({
        name: 'Test Business',
        description: 'A comprehensive description with at least 50 characters to meet the requirement',
        address: '123 Test St',
        phone: '555-1234',
        email: 'test@example.com',
        category_id: 1,
        business_hours: [{ day: 'Monday', open: '9:00', close: '17:00' }],
        logo_url: 'logo.jpg',
        cover_image_url: 'cover.jpg',
        gallery_images: ['img1.jpg'],
        social_media: { facebook: 'https://facebook.com/test' },
        features: ['wifi'],
        amenities: ['parking'],
        website: 'https://example.com',
      });
      const result = calculateListingCompleteness(listing);
      expect(result.percentage).toBe(100);
    });

    it('returns correct percentage for partial completion', () => {
      const listing = createListing({
        name: 'Test Business',
        description: 'Description with at least fifty characters in it for testing purposes',
        address: '123 Test St',
        phone: '555-1234',
        email: 'test@example.com',
        category_id: 1,
        business_hours: [{ day: 'Monday', open: '9:00', close: '17:00' }],
        // Missing all optional fields
      });
      const result = calculateListingCompleteness(listing);
      // All required fields = 70%
      expect(result.percentage).toBe(70);
    });

    it('weights required fields at 70%', () => {
      const listing = createListing({
        name: 'Test',
        description: 'A description with more than fifty characters to pass validation',
        address: '123 Test',
        phone: '555-1234',
        email: 'test@example.com',
        category_id: 1,
        business_hours: [{ day: 'Monday', open: '9:00', close: '17:00' }],
      });
      const result = calculateListingCompleteness(listing);
      expect(result.percentage).toBe(70);
    });

    it('weights optional fields at 30%', () => {
      const listing = createListing({
        logo_url: 'logo.jpg',
        cover_image_url: 'cover.jpg',
        gallery_images: ['img1.jpg'],
        social_media: { facebook: 'https://facebook.com/test' },
        features: ['wifi'],
        amenities: ['parking'],
        website: 'https://example.com',
      });
      const result = calculateListingCompleteness(listing);
      expect(result.percentage).toBe(30);
    });
  });

  describe('Required Fields', () => {
    it('checks name (10%)', () => {
      const listing = createListing({ name: 'Test Business' });
      const result = calculateListingCompleteness(listing);
      expect(result.percentage).toBe(10);
    });

    it('checks description (15%, min 50 chars)', () => {
      const shortDesc = createListing({ description: 'Short' });
      const shortResult = calculateListingCompleteness(shortDesc);
      expect(shortResult.missingRequired.some(f => f.key === 'description')).toBe(true);

      const longDesc = createListing({ description: 'A comprehensive description with at least 50 characters in it' });
      const longResult = calculateListingCompleteness(longDesc);
      expect(longResult.missingRequired.some(f => f.key === 'description')).toBe(false);
    });

    it('checks address (10%)', () => {
      const listing = createListing({ address: '123 Test St' });
      const result = calculateListingCompleteness(listing);
      expect(result.percentage).toBe(10);
    });

    it('checks phone (10%)', () => {
      const listing = createListing({ phone: '555-1234' });
      const result = calculateListingCompleteness(listing);
      expect(result.percentage).toBe(10);
    });

    it('checks email (5%)', () => {
      const listing = createListing({ email: 'test@example.com' });
      const result = calculateListingCompleteness(listing);
      expect(result.percentage).toBe(5);
    });

    it('checks category_id (10%)', () => {
      const listing = createListing({ category_id: 1 });
      const result = calculateListingCompleteness(listing);
      expect(result.percentage).toBe(10);
    });

    it('checks business_hours (10%, min 1 entry)', () => {
      const emptyHours = createListing({ business_hours: [] });
      const emptyResult = calculateListingCompleteness(emptyHours);
      expect(emptyResult.missingRequired.some(f => f.key === 'business_hours')).toBe(true);

      const withHours = createListing({ business_hours: [{ day: 'Monday', open: '9:00', close: '17:00' }] });
      const withResult = calculateListingCompleteness(withHours);
      expect(withResult.missingRequired.some(f => f.key === 'business_hours')).toBe(false);
    });
  });

  describe('Optional Fields', () => {
    it('checks logo_url (8%)', () => {
      const listing = createListing({ logo_url: 'logo.jpg' });
      const result = calculateListingCompleteness(listing);
      expect(result.percentage).toBe(8);
    });

    it('checks cover_image_url (5%)', () => {
      const listing = createListing({ cover_image_url: 'cover.jpg' });
      const result = calculateListingCompleteness(listing);
      expect(result.percentage).toBe(5);
    });

    it('checks gallery_images (5%, min 1)', () => {
      const emptyGallery = createListing({ gallery_images: [] });
      const emptyResult = calculateListingCompleteness(emptyGallery);
      expect(emptyResult.missingOptional.some(f => f.key === 'gallery_images')).toBe(true);

      const withGallery = createListing({ gallery_images: ['img1.jpg'] });
      const withResult = calculateListingCompleteness(withGallery);
      expect(withResult.missingOptional.some(f => f.key === 'gallery_images')).toBe(false);
    });

    it('checks social_media (4%, min 1 value)', () => {
      const emptySocial = createListing({ social_media: {} });
      const emptyResult = calculateListingCompleteness(emptySocial);
      expect(emptyResult.missingOptional.some(f => f.key === 'social_media')).toBe(true);

      const withSocial = createListing({ social_media: { facebook: 'https://facebook.com/test' } });
      const withResult = calculateListingCompleteness(withSocial);
      expect(withResult.missingOptional.some(f => f.key === 'social_media')).toBe(false);
    });

    it('checks features (3%, min 1)', () => {
      const emptyFeatures = createListing({ features: [] });
      const emptyResult = calculateListingCompleteness(emptyFeatures);
      expect(emptyResult.missingOptional.some(f => f.key === 'features')).toBe(true);

      const withFeatures = createListing({ features: ['wifi'] });
      const withResult = calculateListingCompleteness(withFeatures);
      expect(withResult.missingOptional.some(f => f.key === 'features')).toBe(false);
    });

    it('checks amenities (3%, min 1)', () => {
      const emptyAmenities = createListing({ amenities: [] });
      const emptyResult = calculateListingCompleteness(emptyAmenities);
      expect(emptyResult.missingOptional.some(f => f.key === 'amenities')).toBe(true);

      const withAmenities = createListing({ amenities: ['parking'] });
      const withResult = calculateListingCompleteness(withAmenities);
      expect(withResult.missingOptional.some(f => f.key === 'amenities')).toBe(false);
    });

    it('checks website (2%)', () => {
      const listing = createListing({ website: 'https://example.com' });
      const result = calculateListingCompleteness(listing);
      expect(result.percentage).toBe(2);
    });
  });

  describe('Field Count Tracking', () => {
    it('returns correct completedRequired count', () => {
      const listing = createListing({
        name: 'Test',
        description: 'A description with more than fifty characters for validation',
        address: '123 Test',
      });
      const result = calculateListingCompleteness(listing);
      expect(result.completedRequired).toBe(3);
    });

    it('returns correct completedOptional count', () => {
      const listing = createListing({
        logo_url: 'logo.jpg',
        website: 'https://example.com',
      });
      const result = calculateListingCompleteness(listing);
      expect(result.completedOptional).toBe(2);
    });

    it('returns correct totalRequired count', () => {
      const listing = createListing();
      const result = calculateListingCompleteness(listing);
      expect(result.totalRequired).toBe(7);
    });

    it('returns correct totalOptional count', () => {
      const listing = createListing();
      const result = calculateListingCompleteness(listing);
      expect(result.totalOptional).toBe(7);
    });
  });

  describe('Missing Fields', () => {
    it('lists missing required fields', () => {
      const listing = createListing({
        name: 'Test',
        email: 'test@example.com',
      });
      const result = calculateListingCompleteness(listing);

      expect(result.missingRequired.length).toBeGreaterThan(0);
      expect(result.missingRequired.some(f => f.key === 'description')).toBe(true);
      expect(result.missingRequired.some(f => f.key === 'address')).toBe(true);
    });

    it('lists missing optional fields', () => {
      const listing = createListing({
        logo_url: 'logo.jpg',
      });
      const result = calculateListingCompleteness(listing);

      expect(result.missingOptional.length).toBeGreaterThan(0);
      expect(result.missingOptional.some(f => f.key === 'website')).toBe(true);
    });

    it('includes field labels in missing list', () => {
      const listing = createListing();
      const result = calculateListingCompleteness(listing);

      const nameField = result.missingRequired.find(f => f.key === 'name');
      expect(nameField?.label).toBe('Business Name');
    });
  });
});
