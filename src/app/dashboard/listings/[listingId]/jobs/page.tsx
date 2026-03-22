/**
 * Jobs Dashboard Page
 *
 * @route /dashboard/listings/[listingId]/jobs
 * @tier STANDARD
 * @phase Jobs Phase 1 - Core Job CRUD & Display
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import { JobsManager } from '@features/dashboard/components/managers/JobsManager';

export default function JobsDashboardPage() {
  return <JobsManager />;
}
