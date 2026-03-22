/**
 * Pricing Data - Static tier and add-on configurations
 *
 * @authority docs/packages/PACKAGES_ADDONS_GOVERNANCE.md
 * @tier SIMPLE
 * @phase Phase 3 - Public Memberships Page
 */

import { TierData, AddonData } from '../types';

/**
 * Tier pricing and feature data
 * Annual pricing: ~17% discount (2 months free)
 */
export const TIER_DATA: TierData[] = [
  {
    tier: 'essentials',
    name: 'Essential',
    tagline: 'Perfect for getting started',
    monthlyPrice: null, // Free
    annualPrice: null,
    features: [
      '6 category listings',
      '6 images',
      '1 video',
      '4 offers per month',
      '4 events per month',
      'Basic analytics',
      'Community support'
    ],
    limits: {
      categories: 6,
      images: 6,
      videos: 1,
      offers: 4,
      events: 4,
      team: 3
    },
    cta: { text: 'Start Free', variant: 'outline' }
  },
  {
    tier: 'plus',
    name: 'Plus',
    tagline: 'For growing businesses',
    monthlyPrice: 49,
    annualPrice: 490,
    features: [
      '12 category listings',
      '12 images',
      '10 videos',
      '10 offers per month',
      '10 events per month',
      'HTML descriptions',
      '3 file attachments',
      '5 job postings/month',
      'Priority support'
    ],
    limits: {
      categories: 12,
      images: 12,
      videos: 10,
      offers: 10,
      events: 10,
      team: 10
    },
    highlighted: true,
    badge: 'Most Popular',
    cta: { text: 'Start Plus', variant: 'primary' }
  },
  {
    tier: 'preferred',
    name: 'Preferred',
    tagline: 'For established businesses',
    monthlyPrice: 149,
    annualPrice: 1490,
    features: [
      '20 category listings',
      '100 images',
      '50 videos',
      '50 offers per month',
      '50 events per month',
      'Featured placement',
      '10 file attachments',
      '25 job postings/month',
      '50 projects showcase',
      'Dedicated support'
    ],
    limits: {
      categories: 20,
      images: 100,
      videos: 50,
      offers: 50,
      events: 50,
      team: 50
    },
    badge: 'Best Value',
    cta: { text: 'Start Preferred', variant: 'primary' }
  },
  {
    tier: 'premium',
    name: 'Premium',
    tagline: 'For market leaders',
    monthlyPrice: 349,
    annualPrice: 3499,
    features: [
      'Unlimited categories',
      '100 images',
      '50 videos',
      'Unlimited offers & events',
      'Premium placement',
      'Unlimited job postings',
      'Unlimited projects',
      'Unlimited team members',
      '2 FREE add-on suites',
      '$250 campaign credit',
      'White-glove onboarding'
    ],
    limits: {
      categories: 'unlimited',
      images: 100,
      videos: 50,
      offers: 50,
      events: 50,
      team: 'unlimited'
    },
    cta: { text: 'Contact Sales', variant: 'secondary' }
  }
];

/**
 * Add-on suite data
 * Pricing: $19-34/month, annual with ~17% discount
 */
export const ADDON_DATA: AddonData[] = [
  {
    suite: 'creator',
    displayName: 'Creator Suite',
    tagText: 'Popular',
    tagColor: 'bg-[#ed6437] text-white',
    monthlyPrice: 19,
    annualPrice: 190,
    description: 'Content creation and publishing tools for businesses',
    features: [
      'Article & blog management',
      'Video & podcast hosting',
      'Content calendar',
      'Sponsorship marketplace'
    ]
  },
  {
    suite: 'realtor',
    displayName: 'Realtor Suite',
    tagText: 'Real Estate',
    tagColor: 'bg-blue-600 text-white',
    monthlyPrice: 29,
    annualPrice: 290,
    description: 'Comprehensive real estate marketing and listing tools',
    features: [
      'MLS integration',
      'Property showcase',
      'Virtual tour hosting',
      'Lead capture forms'
    ]
  },
  {
    suite: 'restaurant',
    displayName: 'Restaurant Suite',
    tagText: 'Food Service',
    tagColor: 'bg-green-600 text-white',
    monthlyPrice: 24,
    annualPrice: 240,
    description: 'Restaurant management and reservation tools',
    features: [
      'Menu management',
      'Online reservations',
      'Table booking system',
      'Special event promotion'
    ]
  },
  {
    suite: 'seo_scribe',
    displayName: 'SEO Scribe',
    tagText: 'AI-Powered',
    tagColor: 'bg-purple-600 text-white',
    monthlyPrice: 34,
    annualPrice: 340,
    description: 'AI-powered SEO optimization and content generation',
    features: [
      'AI content generation',
      'SEO optimization',
      'Keyword research',
      'Performance tracking'
    ]
  }
];

/**
 * Calculate annual savings percentage
 */
export function calculateAnnualSavings(monthlyPrice: number, annualPrice: number): number {
  const monthlyTotal = monthlyPrice * 12;
  const savings = monthlyTotal - annualPrice;
  return Math.round((savings / monthlyTotal) * 100);
}
