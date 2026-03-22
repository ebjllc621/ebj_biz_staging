/**
 * useRecommendationPreferences - Hook for managing recommendation preferences
 *
 * Provides state management and API operations for user recommendation preferences
 * including preset selection and custom weight updates.
 *
 * @pattern hook/useRecommendationPreferences
 * @category connection-preferences
 * @reusable true
 * @mobile-compatible true
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/features/connections/hooks/useRecommendations.ts
 * @phase Phase 8D
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  UserRecommendationPreferences,
  RecommendationWeights,
  RecommendationPresetProfile
} from '../types';
import { ErrorService } from '@core/services/ErrorService';

interface UseRecommendationPreferencesResult {
  preferences: UserRecommendationPreferences | null;
  isLoading: boolean;
  error: string | null;
  isSaving: boolean;
  refresh: () => Promise<void>;
  updateWeights: (weights: RecommendationWeights) => Promise<void>;
  applyPreset: (presetId: RecommendationPresetProfile) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  updateThreshold: (threshold: number) => Promise<void>;
}

/**
 * Hook for managing connection recommendation preferences
 *
 * @param autoLoad - Whether to automatically load on mount (default: true)
 * @returns Preferences state and control functions
 *
 * @phase Phase 8D
 */
export function useRecommendationPreferences(
  autoLoad: boolean = true
): UseRecommendationPreferencesResult {
  const [preferences, setPreferences] = useState<UserRecommendationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  /**
   * Load preferences from API
   */
  const loadPreferences = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users/connections/recommendations/preferences', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to load preferences: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        setPreferences(data.data);
      } else {
        throw new Error(data.message || 'Failed to load preferences');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      ErrorService.capture('[useRecommendationPreferences] Load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update custom weights
   */
  const updateWeights = useCallback(async (weights: RecommendationWeights) => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/users/connections/recommendations/preferences', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weights })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update preferences');
      }

      const data = await response.json();

      if (data.success && data.data) {
        setPreferences(data.data);
      } else {
        throw new Error(data.message || 'Failed to update preferences');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      ErrorService.capture('[useRecommendationPreferences] Update error:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Apply a preset profile
   */
  const applyPreset = useCallback(async (presetId: RecommendationPresetProfile) => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/users/connections/recommendations/preferences', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetProfile: presetId })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to apply preset');
      }

      const data = await response.json();

      if (data.success && data.data) {
        setPreferences(data.data);
      } else {
        throw new Error(data.message || 'Failed to apply preset');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      ErrorService.capture('[useRecommendationPreferences] Preset error:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Reset preferences to defaults
   */
  const resetToDefaults = useCallback(async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/users/connections/recommendations/preferences', {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to reset preferences');
      }

      const data = await response.json();

      if (data.success && data.data) {
        setPreferences(data.data);
      } else {
        throw new Error(data.message || 'Failed to reset preferences');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      ErrorService.capture('[useRecommendationPreferences] Reset error:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Update minimum score threshold
   */
  const updateThreshold = useCallback(async (threshold: number) => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/users/connections/recommendations/preferences', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minScoreThreshold: threshold })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update threshold');
      }

      const data = await response.json();

      if (data.success && data.data) {
        setPreferences(data.data);
      } else {
        throw new Error(data.message || 'Failed to update threshold');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      ErrorService.capture('[useRecommendationPreferences] Threshold error:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadPreferences();
    }
  }, [autoLoad, loadPreferences]);

  return {
    preferences,
    isLoading,
    error,
    isSaving,
    refresh: loadPreferences,
    updateWeights,
    applyPreset,
    resetToDefaults,
    updateThreshold
  };
}
