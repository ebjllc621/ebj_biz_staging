/**
 * /join - Referral Landing Page
 *
 * Handles platform invite links (e.g., /join?ref=BIZ-XXXXXXXX)
 * - Extracts referral code from URL
 * - Records view in referral tracking
 * - Opens registration modal with pre-filled referral code
 *
 * @authority docs/components/contacts/README.md
 * @tier SIMPLE
 * @phase Referral System Connection
 */

import { Suspense } from 'react';
import { Metadata } from 'next';
import JoinPageClient from './JoinPageClient';

export const metadata: Metadata = {
  title: 'Join Bizconekt | Connect with Professionals',
  description: 'Join Bizconekt and connect with professionals in your industry. Sign up today and start growing your network.',
  openGraph: {
    title: 'Join Bizconekt',
    description: 'Connect with professionals in your industry',
    type: 'website'
  }
};

interface JoinPageProps {
  searchParams: Promise<{ ref?: string }>;
}

export default async function JoinPage({ searchParams }: JoinPageProps) {
  // Extract referral code from URL params
  const params = await searchParams;
  const referralCode = params.ref || null;

  return (
    <Suspense fallback={<JoinPageLoading />}>
      <JoinPageClient referralCode={referralCode} />
    </Suspense>
  );
}

function JoinPageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-bizconekt-primary/5 to-bizconekt-secondary/5">
      <div className="animate-pulse text-bizconekt-primary text-xl">
        Loading...
      </div>
    </div>
  );
}
