/**
 * Memberships Page - Public membership plans and pricing
 *
 * @route /services/memberships
 * @tier STANDARD
 * @phase Phase 3 - Public Memberships Page
 * @pattern src/app/page.tsx SEO metadata pattern
 */

import { Metadata } from 'next';
import { MembershipsPageContent } from './MembershipsPageContent';

/**
 * Page metadata for SEO
 */
export const metadata: Metadata = {
  title: 'Membership Plans & Pricing | Bizconekt Business Directory',
  description: 'Choose the perfect Bizconekt membership for your business. From free Essential listings to Premium enterprise features. Compare plans and start growing today.',
  keywords: [
    'business membership',
    'listing pricing',
    'business directory plans',
    'local business marketing',
    'Bizconekt pricing',
    'small business membership',
    'business listing plans'
  ],
  openGraph: {
    title: 'Membership Plans & Pricing | Bizconekt',
    description: 'Find the perfect plan to grow your business with Bizconekt.',
    type: 'website',
    url: '/services/memberships'
  },
  alternates: {
    canonical: '/services/memberships'
  }
};

/**
 * Memberships page component
 * Server component that wraps the client-side content
 */
export default function MembershipsPage() {
  return <MembershipsPageContent />;
}
