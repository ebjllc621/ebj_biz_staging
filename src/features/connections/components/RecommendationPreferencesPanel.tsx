/**
 * RecommendationPreferencesPanel - User Recommendation Preferences UI
 *
 * Full preferences management panel with:
 * - Preset profile selection
 * - Individual weight sliders by category
 * - Total weight display with validation
 * - Reset to defaults functionality
 *
 * @pattern ui/PreferencesPanel
 * @category connection-preferences
 * @reusable true
 * @mobile-compatible true
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/features/notifications/components/NotificationPreferencesSection.tsx
 * @phase Phase 8D
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCcw, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { PresetSelector } from '@/components/connections/PresetSelector';
import { WeightSlider } from '@/components/connections/WeightSlider';
import {
  RecommendationWeights,
  RecommendationPresetProfile,
  UserRecommendationPreferences,
  FACTORS_BY_CATEGORY,
  CATEGORY_METADATA,
  FactorCategory
} from '../types';
import { useRecommendationPreferences } from '../hooks/useRecommendationPreferences';

interface RecommendationPreferencesPanelProps {
  onSaved?: () => void;
  className?: string;
}

export const RecommendationPreferencesPanel: React.FC<RecommendationPreferencesPanelProps> = ({
  onSaved,
  className = ''
}) => {
  const {
    preferences,
    isLoading,
    error,
    updateWeights,
    applyPreset,
    resetToDefaults,
    isSaving
  } = useRecommendationPreferences();

  // Local state for optimistic UI updates
  const [localWeights, setLocalWeights] = useState<RecommendationWeights | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<FactorCategory>>(
    new Set(['network', 'professional', 'personal', 'context'])
  );

  // Initialize local weights from preferences
  useEffect(() => {
    if (preferences?.weights && !localWeights) {
      setLocalWeights(preferences.weights);
    }
  }, [preferences, localWeights]);

  // Calculate total weight
  const totalWeight = useMemo(() => {
    if (!localWeights) return 0;
    return Object.values(localWeights).reduce((sum, w) => sum + w, 0);
  }, [localWeights]);

  const isValidTotal = totalWeight === 100;

  // Handle individual weight change
  const handleWeightChange = useCallback((key: string, value: number) => {
    setLocalWeights(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [key]: value
      };
    });
  }, []);

  // Handle preset selection
  const handlePresetSelect = useCallback(async (presetId: RecommendationPresetProfile) => {
    await applyPreset(presetId);
    setLocalWeights(null); // Reset to trigger sync from preferences
    onSaved?.();
  }, [applyPreset, onSaved]);

  // Handle save custom weights
  const handleSave = useCallback(async () => {
    if (!localWeights || !isValidTotal) return;
    await updateWeights(localWeights);
    onSaved?.();
  }, [localWeights, isValidTotal, updateWeights, onSaved]);

  // Handle reset
  const handleReset = useCallback(async () => {
    await resetToDefaults();
    setLocalWeights(null);
    onSaved?.();
  }, [resetToDefaults, onSaved]);

  // Toggle category expansion
  const toggleCategory = useCallback((category: FactorCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  if (isLoading && !preferences) {
    return (
      <div className={`animate-pulse space-y-4 ${className}`}>
        <div className="h-12 bg-gray-200 rounded" />
        <div className="h-32 bg-gray-200 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span>Failed to load preferences: {error}</span>
        </div>
      </div>
    );
  }

  const currentWeights = localWeights || preferences?.weights;
  if (!currentWeights) return null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Preset Selection */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Quick Presets
        </h3>
        <PresetSelector
          value={preferences?.presetProfile || null}
          onChange={handlePresetSelect}
          disabled={isSaving}
          showDescriptions
        />
      </div>

      {/* Custom Weights */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Custom Weights
          </h3>
          <div className={`text-sm font-medium ${isValidTotal ? 'text-green-600' : 'text-red-600'}`}>
            Total: {totalWeight}/100
          </div>
        </div>

        {!isValidTotal && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            Weights must total exactly 100 to save changes.
          </div>
        )}

        {/* Weight Categories */}
        {(Object.keys(FACTORS_BY_CATEGORY) as FactorCategory[]).map(category => {
          const categoryMeta = CATEGORY_METADATA[category];
          const factors = FACTORS_BY_CATEGORY[category];
          const isExpanded = expandedCategories.has(category);

          return (
            <div key={category} className="border border-gray-200 rounded-lg mb-3">
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div>
                  <span className="font-medium text-gray-900">{categoryMeta.label}</span>
                  <p className="text-xs text-gray-500">{categoryMeta.description}</p>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4">
                  {factors.map(factor => (
                    <WeightSlider
                      key={factor.key}
                      factor={factor}
                      value={currentWeights[factor.key]}
                      onChange={handleWeightChange}
                      disabled={isSaving}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={!isValidTotal || isSaving}
          className={`
            flex-1 px-4 py-3 rounded-lg font-medium text-white transition-colors
            min-h-[44px]
            ${!isValidTotal || isSaving
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-[#ed6437] hover:bg-[#d45730]'
            }
          `}
        >
          {isSaving ? 'Saving...' : 'Save Custom Weights'}
        </button>

        <button
          type="button"
          onClick={handleReset}
          disabled={isSaving}
          className={`
            flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium
            border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors
            min-h-[44px]
            ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <RefreshCcw className="w-4 h-4" />
          Reset to Defaults
        </button>
      </div>
    </div>
  );
};

export default RecommendationPreferencesPanel;
