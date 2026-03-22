'use client';

/**
 * Job Seeker Profile Dashboard Page
 *
 * User dashboard page for managing job seeker profile
 *
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 * @phase Jobs Phase 4 - Platform Growth & Future Features
 */

import { useAuth } from '@core/hooks/useAuth';
import { JobSeekerProfileEditor } from '@features/jobs/components/JobSeekerProfileEditor';
import { JobSeekerProfileCard } from '@features/jobs/components/JobSeekerProfileCard';
import { useJobSeekerProfile } from '@features/jobs/hooks/useJobSeekerProfile';

export default function JobSeekerProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ? parseInt(user.id, 10) : null;
  const { profile, loading: profileLoading, refreshProfile } = useJobSeekerProfile(userId);

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

  if (!user || !userId) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-600">Please log in to manage your job seeker profile</h2>
        </div>
      </div>
    );
  }

  // Create display user object for the profile card
  const displayUser = {
    display_name: user.name || user.email || 'User',
    avatar_url: user.avatarUrl || null
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Job Seeker Profile</h1>
        <p className="text-gray-600 mt-2">
          Manage your professional profile to get discovered by employers
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Preview */}
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold mb-4">Profile Preview</h2>
          {profileLoading ? (
            <div className="animate-pulse">
              <div className="h-48 bg-gray-200 rounded"></div>
            </div>
          ) : profile ? (
            <JobSeekerProfileCard
              profile={profile}
              user={displayUser}
              showContactButton={false}
            />
          ) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <p className="text-gray-500">Complete your profile to see a preview</p>
            </div>
          )}
        </div>

        {/* Profile Editor */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Edit Profile</h2>
          <JobSeekerProfileEditor
            userId={userId}
            initialProfile={profile || undefined}
            onSave={() => {
              refreshProfile();
            }}
          />
        </div>
      </div>
    </div>
  );
}
