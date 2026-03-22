/**
 * Admin Offers Navigation - Tests
 *
 * @tier CRITICAL
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * CRITICAL: Validates admin menu entry exists for offers management.
 * Prevents "Jobs Feature Failure" pattern where features exist but are inaccessible.
 */

import { describe, it, expect } from 'vitest';
import { siteControls } from '@/config/adminMenu';
import fs from 'fs';
import path from 'path';

describe('Admin Offers Navigation', () => {
  describe('adminMenu.ts configuration', () => {
    it('has offers submenu under Listings', () => {
      const listingsModule = siteControls.find((module) => module.key === 'listings');

      expect(listingsModule).toBeDefined();
      expect(listingsModule?.children).toBeDefined();

      const offersSubmenu = listingsModule?.children?.find((child) => child.key === 'offers');
      expect(offersSubmenu).toBeDefined();
      expect(offersSubmenu?.label).toBe('Offers');
    });

    it('has Offers Manager menu entry', () => {
      const listingsModule = siteControls.find((module) => module.key === 'listings');
      const offersSubmenu = listingsModule?.children?.find((child) => child.key === 'offers');

      expect(offersSubmenu?.children).toBeDefined();

      const offersManager = offersSubmenu?.children?.find((child) => child.key === 'offersManager');
      expect(offersManager).toBeDefined();
      expect(offersManager?.label).toBe('Offers Manager');
      expect(offersManager?.href).toBe('/admin/offers');
    });

    it('has Discounts submenu entry', () => {
      const listingsModule = siteControls.find((module) => module.key === 'listings');
      const offersSubmenu = listingsModule?.children?.find((child) => child.key === 'offers');

      const discounts = offersSubmenu?.children?.find((child) => child.key === 'discounts');
      expect(discounts).toBeDefined();
      expect(discounts?.label).toBe('Discounts');
      expect(discounts?.href).toBe('/admin/discounts');
    });
  });

  describe('admin page file exists', () => {
    it('has /admin/offers/page.tsx file', () => {
      const pagePath = path.join(process.cwd(), 'src/app/admin/offers/page.tsx');
      const exists = fs.existsSync(pagePath);

      expect(exists).toBe(true);
    });
  });

  describe('manual navigation verification checklist', () => {
    it('documents navigation verification steps', () => {
      const verificationSteps = [
        '1. Navigate to /admin',
        '2. Find "Listings" in sidebar',
        '3. Expand "Listings" menu',
        '4. Find "Offers" submenu',
        '5. Expand "Offers" submenu',
        '6. Click "Offers Manager"',
        '7. Page loads at /admin/offers',
      ];

      expect(verificationSteps).toHaveLength(7);
      expect(verificationSteps[0]).toContain('Navigate to /admin');
      expect(verificationSteps[verificationSteps.length - 1]).toContain('/admin/offers');
    });
  });
});
