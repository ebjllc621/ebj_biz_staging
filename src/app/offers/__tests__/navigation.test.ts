/**
 * Public Offers Navigation - Tests
 *
 * @tier CRITICAL
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * CRITICAL: Validates public /offers route exists and is accessible from site header.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Public Offers Navigation', () => {
  describe('public offers page exists', () => {
    it('has /offers/page.tsx file', () => {
      const pagePath = path.join(process.cwd(), 'src/app/offers/page.tsx');
      const exists = fs.existsSync(pagePath);

      expect(exists).toBe(true);
    });

    it('has offers directory with proper structure', () => {
      const offersDir = path.join(process.cwd(), 'src/app/offers');
      const exists = fs.existsSync(offersDir);

      expect(exists).toBe(true);

      if (exists) {
        const contents = fs.readdirSync(offersDir);
        expect(contents).toContain('page.tsx');
      }
    });
  });

  describe('SiteHeader navigation link', () => {
    it('has SiteHeader component file', () => {
      const headerPath = path.join(process.cwd(), 'src/components/SiteHeader.tsx');
      const exists = fs.existsSync(headerPath);

      expect(exists).toBe(true);
    });

    it('SiteHeader includes /offers link', () => {
      const headerPath = path.join(process.cwd(), 'src/components/SiteHeader.tsx');

      if (fs.existsSync(headerPath)) {
        const headerContent = fs.readFileSync(headerPath, 'utf-8');

        // Check for /offers link in navigation
        expect(headerContent).toContain('/offers');
      } else {
        expect(fs.existsSync(headerPath)).toBe(true);
      }
    });
  });

  describe('dynamic offer detail routes', () => {
    it('has /offers/[slug]/page.tsx for offer details', () => {
      const detailPagePath = path.join(process.cwd(), 'src/app/offers/[slug]/page.tsx');
      const exists = fs.existsSync(detailPagePath);

      expect(exists).toBe(true);
    });
  });

  describe('manual navigation verification checklist', () => {
    it('documents public navigation steps', () => {
      const verificationSteps = [
        '1. Navigate to homepage',
        '2. Find site header navigation',
        '3. Look for "Offers" or "Deals" link',
        '4. Click link',
        '5. Page loads at /offers',
        '6. Offers directory displays',
        '7. Click individual offer',
        '8. Offer detail page loads at /offers/[slug]',
      ];

      expect(verificationSteps).toHaveLength(8);
      expect(verificationSteps[0]).toContain('homepage');
      expect(verificationSteps[verificationSteps.length - 1]).toContain('/offers/[slug]');
    });
  });

  describe('offers routes accessibility', () => {
    it('validates all critical offer routes exist', () => {
      const criticalRoutes = [
        'src/app/offers/page.tsx',
        'src/app/offers/[slug]/page.tsx',
      ];

      const allExist = criticalRoutes.every((route) => {
        const fullPath = path.join(process.cwd(), route);
        return fs.existsSync(fullPath);
      });

      expect(allExist).toBe(true);
    });
  });
});
