/**
 * Home Page - Root Route Component
 *
 * Renders the homepage with conditional content based on authentication state.
 * Uses HomePage feature component for unified public/authenticated views.
 *
 * @governance Build Map v2.1 ENHANCED - Feature module pattern
 * @tier STANDARD
 * @generated DNA v11.0.1
 */

import { Metadata } from 'next';
import { HomePage } from '@features/homepage';

/**
 * Page metadata for SEO
 */
export const metadata: Metadata = {
  title: 'Bizconekt - Connect, Discover, Grow Your Business Network',
  description: 'Discover local businesses, connect with professionals, and grow your network. Join Bizconekt to access exclusive offers, events, and business opportunities.',
  keywords: 'business directory, networking, local businesses, professional network, events, offers',
  openGraph: {
    title: 'Bizconekt - Connect, Discover, Grow Your Business Network',
    description: 'Your gateway to the local business community. Find services, connect with professionals, and discover opportunities.',
    type: 'website'
  }
};

/**
 * Home page component
 * Renders the appropriate view based on authentication state
 */
export default function Page() {
  return <HomePage />;
}
