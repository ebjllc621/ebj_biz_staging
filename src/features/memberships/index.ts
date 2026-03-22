/**
 * Memberships Feature Module Barrel File
 *
 * @tier SIMPLE
 * @phase Phase 3 - Public Memberships Page
 */

// Components
export { PricingToggle } from './components/PricingToggle';
export { TierCard } from './components/TierCard';
export { AddOnCard } from './components/AddOnCard';
export { FAQItem } from './components/FAQItem';

// Section Components
export * from './components/sections';

// Types
export type { TierData, AddonData, FAQItem as FAQItemType } from './types';

// Constants
export { TIER_DATA, ADDON_DATA, calculateAnnualSavings } from './constants/pricing-data';
export { FAQ_DATA } from './constants/faq-data';
