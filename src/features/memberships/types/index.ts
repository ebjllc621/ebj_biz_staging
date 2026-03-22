/**
 * Memberships Feature - Type Definitions
 *
 * @tier SIMPLE
 * @phase Phase 3 - Public Memberships Page
 */

export interface TierData {
  tier: 'essentials' | 'plus' | 'preferred' | 'premium';
  name: string;
  tagline: string;
  monthlyPrice: number | null;  // null = free
  annualPrice: number | null;
  features: string[];
  limits: {
    categories: number | string;  // number or 'unlimited'
    images: number;
    videos: number;
    offers: number;
    events: number;
    team: number | string;  // number or 'unlimited'
  };
  highlighted?: boolean;
  badge?: string;
  cta: {
    text: string;
    variant: 'primary' | 'secondary' | 'outline';
  };
}

export interface AddonData {
  suite: 'creator' | 'realtor' | 'restaurant' | 'seo_scribe';
  displayName: string;
  tagText: string;
  tagColor: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  features: string[];
}

export interface FAQItem {
  question: string;
  answer: string;
}
