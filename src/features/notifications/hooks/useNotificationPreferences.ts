/**
 * useNotificationPreferences - Hook for managing notification preferences
 *
 * @authority docs/notificationService/phases/PHASE_2_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserNotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES } from '@core/services/notification/types';
import { fetchWithCsrf } from '@core/utils/csrf';

interface UseNotificationPreferencesReturn {
  preferences: UserNotificationPreferences;
  isLoading: boolean;
  error: string | null;
  updatePreferences: (updates: Partial<UserNotificationPreferences>) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useNotificationPreferences(): UseNotificationPreferencesReturn {
  const [preferences, setPreferences] = useState<UserNotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/users/settings/notification-preferences', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notification preferences');
      }

      const data = await response.json();

      if (data.success && data.data?.preferences) {
        setPreferences(data.data.preferences);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePreferences = useCallback(async (
    updates: Partial<UserNotificationPreferences>
  ) => {
    try {
      setError(null);

      // Optimistic update
      setPreferences((prev) => ({
        ...prev,
        ...updates,
        categories: {
          ...prev.categories,
          ...(updates.categories || {})
        }
      }));

      const response = await fetchWithCsrf('/api/users/settings/notification-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ preferences: updates })
      });

      if (!response.ok) {
        // Revert on failure
        await fetchPreferences();
        throw new Error('Failed to update preferences');
      }

      const data = await response.json();

      if (data.success && data.data?.preferences) {
        setPreferences(data.data.preferences);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, [fetchPreferences]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    isLoading,
    error,
    updatePreferences,
    refetch: fetchPreferences
  };
}

export default useNotificationPreferences;
