/**
 * useJobSeekerProfile Hook
 *
 * Hook for managing job seeker profile data and updates
 *
 * GOVERNANCE COMPLIANCE:
 * - Hook pattern with useState, useEffect, useCallback
 * - fetchWithCsrf for mutations
 * - Import aliases: @core/, @features/
 *
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 * @phase Jobs Phase 4 - Platform Growth & Future Features
 * @reference src/features/dashboard/hooks/useListingUpdate.ts - Update hook pattern
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { JobSeekerProfile, UpdateJobSeekerProfileInput } from '@features/jobs/types';

interface UseJobSeekerProfileResult {
  profile: JobSeekerProfile | null;
  loading: boolean;
  error: string | null;
  updateProfile: (data: UpdateJobSeekerProfileInput) => Promise<JobSeekerProfile | null>;
  deleteProfile: () => Promise<boolean>;
  refreshProfile: () => Promise<void>;
}

/**
 * Hook for managing job seeker profile
 * @param userId - User ID (null if not authenticated)
 */
export function useJobSeekerProfile(userId: number | null): UseJobSeekerProfileResult {
  const [profile, setProfile] = useState<JobSeekerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/jobs/profile');

      if (response.status === 404) {
        // Profile doesn't exist yet - not an error
        setProfile(null);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load profile');
      }

      const result = await response.json();
      setProfile(result.data?.profile || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Failed to fetch job seeker profile:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(
    async (data: UpdateJobSeekerProfileInput): Promise<JobSeekerProfile | null> => {
      if (!userId) {
        throw new Error('User must be authenticated to update profile');
      }

      try {
        const method = profile ? 'PUT' : 'POST';
        const response = await fetchWithCsrf('/api/jobs/profile', {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to save profile');
        }

        const result = await response.json();
        const updatedProfile = result.data?.profile || null;
        setProfile(updatedProfile);
        return updatedProfile;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        throw err;
      }
    },
    [userId, profile]
  );

  const deleteProfile = useCallback(async (): Promise<boolean> => {
    if (!userId || !profile) {
      throw new Error('Profile must exist to delete');
    }

    try {
      const response = await fetchWithCsrf('/api/jobs/profile', {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete profile');
      }

      setProfile(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  }, [userId, profile]);

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    updateProfile,
    deleteProfile,
    refreshProfile
  };
}
