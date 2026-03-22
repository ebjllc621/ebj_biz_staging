/**
 * Jobs Directory Page - Server Component
 *
 * @component Server Component
 * @route /jobs
 * @tier STANDARD
 * @phase Jobs Phase 1 - Core Job CRUD & Display
 * @governance Build Map v2.1 ENHANCED
 *
 * Server component that generates metadata and renders the client component.
 *
 * @see src/app/jobs/JobsPageClient.tsx - Client implementation
 * @see src/app/events/page.tsx - Pattern reference
 */

import { Metadata } from 'next';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import JobsPageClient from './JobsPageClient';

export const metadata: Metadata = {
  title: 'Jobs Directory | Bizconekt',
  description: 'Find jobs in your area. Browse local job opportunities and connect with businesses hiring now.',
  openGraph: {
    title: 'Jobs Directory | Bizconekt',
    description: 'Find jobs in your area. Browse local job opportunities and connect with businesses hiring now.',
    type: 'website'
  }
};

export default function JobsPage() {
  return (
    <ErrorBoundary componentName="JobsPageClient">
      <JobsPageClient />
    </ErrorBoundary>
  );
}
