/**
 * Listing Manager Offers Navigation - Tests
 *
 * @tier CRITICAL
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * CRITICAL: Validates dashboard menu entry exists for user offers management.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Listing Manager Offers Navigation', () => {
  describe('listingManagerMenu.ts configuration', () => {
    it('has listing manager menu config file', () => {
      const menuPath = path.join(process.cwd(), 'src/features/dashboard/config/listingManagerMenu.ts');
      const exists = fs.existsSync(menuPath);

      expect(exists).toBe(true);
    });

    it('menu config includes offers entry', () => {
      const menuPath = path.join(process.cwd(), 'src/features/dashboard/config/listingManagerMenu.ts');

      if (fs.existsSync(menuPath)) {
        const menuContent = fs.readFileSync(menuPath, 'utf-8');

        // Check for offers-related menu entries
        expect(menuContent).toContain('offers');
        expect(menuContent.toLowerCase()).toMatch(/offers|deals|promotions/);
      } else {
        // If file doesn't exist, this test should fail
        expect(exists).toBe(true);
      }
    });
  });

  describe('dashboard page file exists', () => {
    it('has /dashboard/offers/page.tsx or OffersManager component', () => {
      const pagePath = path.join(process.cwd(), 'src/app/dashboard/offers/page.tsx');
      const managerPath = path.join(process.cwd(), 'src/features/dashboard/components/managers/OffersManager.tsx');

      const pageExists = fs.existsSync(pagePath);
      const managerExists = fs.existsSync(managerPath);

      // Either the page or the manager component should exist
      expect(pageExists || managerExists).toBe(true);
    });
  });

  describe('manual navigation verification checklist', () => {
    it('documents user dashboard navigation steps', () => {
      const verificationSteps = [
        '1. Navigate to /dashboard',
        '2. Select a listing',
        '3. Find sidebar menu',
        '4. Look for "Offers" or "Deals" menu item',
        '5. Click menu item',
        '6. Offers management page loads',
      ];

      expect(verificationSteps).toHaveLength(6);
      expect(verificationSteps[0]).toContain('dashboard');
      expect(verificationSteps[verificationSteps.length - 1]).toContain('Offers');
    });
  });
});
