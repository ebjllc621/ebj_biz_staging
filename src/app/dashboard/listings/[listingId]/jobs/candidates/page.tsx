'use client';

/**
 * Candidate Discovery Dashboard Page
 *
 * Business dashboard page for discovering and contacting candidates (Premium only)
 *
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 * @phase Jobs Phase 4 - Platform Growth & Future Features
 */

import { useParams } from 'next/navigation';
import { useAuth } from '@core/hooks/useAuth';
import { CandidateDiscoveryList } from '@features/jobs/components/CandidateDiscoveryList';

export default function CandidateDiscoveryPage() {
  const params = useParams();
  const listingId = parseInt(params.listingId as string, 10);
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-600">Please log in to discover candidates</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Candidate Discovery</h1>
        <p className="text-gray-600 mt-2">
          Browse job seekers who have opted-in to be discovered by employers
        </p>
      </div>

      {/* Premium Feature Notice */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 mb-8">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6.207.293a1 1 0 00-1.414 0l-6 6a1 1 0 101.414 1.414l6-6a1 1 0 000-1.414zM12.5 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-purple-700">
              <strong>Premium Feature</strong> - Candidate discovery is available for Premium tier businesses
            </p>
          </div>
        </div>
      </div>

      {/* Candidate Discovery List */}
      <CandidateDiscoveryList listingId={listingId} />
    </div>
  );
}
