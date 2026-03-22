/**
 * User Profile Page - Dynamic username-based profile view
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @authority docs/pages/layouts/home/user/phases/PHASE_4_BRAIN_PLAN.md
 *
 * GOVERNANCE COMPLIANCE:
 * - Client component with optional authentication
 * - ErrorBoundary wrapper (STANDARD tier)
 * - Loading state during data fetch
 * - Visibility-aware profile display
 *
 * Features:
 * - Public profile viewing
 * - Owner-specific edit capabilities
 * - Profile visibility enforcement
 * - Profile view recording
 */

'use client';

import { useParams } from 'next/navigation';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { UserProfilePage } from '@/features/profile/components';

function ProfilePageContent() {
  const params = useParams();
  const username = params?.username as string;

  if (!username) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Profile Not Found
          </h1>
          <p className="text-gray-600">
            The requested profile could not be found.
          </p>
        </div>
      </div>
    );
  }

  return <UserProfilePage username={username} />;
}

/**
 * ProfilePage - Wrapped with ErrorBoundary (STANDARD tier requirement)
 */
export default function ProfilePage() {
  return (
    <ErrorBoundary componentName="ProfilePage">
      <ProfilePageContent />
    </ErrorBoundary>
  );
}
