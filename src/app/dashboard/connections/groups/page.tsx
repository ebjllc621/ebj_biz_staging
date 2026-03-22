/**
 * Connection Groups Dashboard Page
 * Dashboard page for managing user connection groups
 *
 * GOVERNANCE COMPLIANCE:
 * - Server Component (default in App Router)
 * - Protected route (requires authentication)
 * - Uses ConnectionGroupsPanel client component
 *
 * @tier STANDARD
 * @phase Connection Groups Feature - Phase 1
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/3-5-26/phases/PHASE_1_BRAIN_PLAN.md
 */

import { Metadata } from 'next';
import { ConnectionGroupsPanel } from '@features/connections/components/ConnectionGroupsPanel';

export const metadata: Metadata = {
  title: 'Connection Groups | Bizconekt',
  description: 'Organize your connections into groups and discover new connections through shared networks'
};

export default function ConnectionGroupsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Connection Groups</h1>
        <p className="text-gray-600 mt-2">
          Organize your connections into groups and discover opportunities through shared networks
        </p>
      </div>

      <ConnectionGroupsPanel />
    </div>
  );
}
