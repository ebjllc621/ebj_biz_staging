/**
 * Profile Redirect Page - Redirects to current user's profile
 *
 * @tier SIMPLE
 * @generated DNA v11.4.0
 * @authority docs/pages/layouts/home/user/phases/PHASE_4_BRAIN_PLAN.md
 *
 * GOVERNANCE COMPLIANCE:
 * - Client component with authentication check
 * - Redirects authenticated users to their profile
 * - Redirects unauthenticated users to homepage
 *
 * Features:
 * - Auto-redirect based on auth state
 * - Loading spinner during auth check
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/core/context/AuthContext';

export default function ProfileRedirectPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user?.username) {
        // Redirect to user's profile
        router.replace(`/profile/${user.username}`);
      } else {
        // Redirect to homepage if not authenticated
        router.replace('/');
      }
    }
  }, [user, loading, router]);

  // Show loading spinner while checking auth
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading your profile...</p>
      </div>
    </div>
  );
}
