'use client';

import React, { useState, useEffect, useCallback } from 'react';
import BizModal from '@/components/BizModal/BizModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import {
  RecommendationWeights,
  UserRecommendationPreferences,
  DEFAULT_RECOMMENDATION_WEIGHTS,
  RecommendationFactorInfo
} from '../types';
import {
  Users,
  Briefcase,
  MapPin,
  Activity,
  Star,
  UserCheck,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Info
} from 'lucide-react';

interface RecommendationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void; // Called after successful save to trigger refresh
}

/**
 * Factor information for UI display
 * @phase Phase 8C - All 13 factors included
 */
const FACTOR_INFO: RecommendationFactorInfo[] = [
  // Network & Activity factors
  {
    key: 'mutualConnections',
    label: 'Mutual Connections',
    description: 'How many connections you share with this person.',
    icon: 'users'
  },
  {
    key: 'engagement',
    label: 'Activity Level',
    description: 'How active the person is on the platform.',
    icon: 'activity'
  },
  {
    key: 'reputation',
    label: 'Reputation',
    description: 'Trust score based on connection acceptance rates.',
    icon: 'star'
  },
  {
    key: 'profileCompleteness',
    label: 'Profile Quality',
    description: 'How complete their profile is.',
    icon: 'usercheck'
  },
  // Professional Alignment factors
  {
    key: 'industryMatch',
    label: 'Industry Match',
    description: 'Same or similar professional industry.',
    icon: 'briefcase'
  },
  {
    key: 'skillsOverlap',
    label: 'Skills Overlap',
    description: 'Shared professional skills and expertise.',
    icon: 'briefcase'
  },
  {
    key: 'goalsAlignment',
    label: 'Goals Alignment',
    description: 'Similar career or business goals.',
    icon: 'briefcase'
  },
  // Personal Connection factors
  {
    key: 'interestOverlap',
    label: 'Shared Interests',
    description: 'Common interest categories.',
    icon: 'star'
  },
  {
    key: 'hobbiesAlignment',
    label: 'Similar Hobbies',
    description: 'Shared hobbies and activities.',
    icon: 'activity'
  },
  {
    key: 'educationMatch',
    label: 'Education Match',
    description: 'Same school or field of study.',
    icon: 'usercheck'
  },
  {
    key: 'hometownMatch',
    label: 'Hometown Match',
    description: 'From the same hometown or region.',
    icon: 'mappin'
  },
  {
    key: 'groupOverlap',
    label: 'Shared Groups',
    description: 'Common group memberships.',
    icon: 'users'
  },
  // Context factor
  {
    key: 'location',
    label: 'Location',
    description: 'Current geographic proximity.',
    icon: 'mappin'
  }
];

/**
 * Get icon component for a factor
 */
function getFactorIcon(iconKey: string): React.ReactNode {
  const iconProps = { className: 'w-5 h-5' };
  switch (iconKey) {
    case 'users': return <Users {...iconProps} />;
    case 'briefcase': return <Briefcase {...iconProps} />;
    case 'mappin': return <MapPin {...iconProps} />;
    case 'activity': return <Activity {...iconProps} />;
    case 'star': return <Star {...iconProps} />;
    case 'usercheck': return <UserCheck {...iconProps} />;
    default: return <Users {...iconProps} />;
  }
}

/**
 * RecommendationSettingsModal
 *
 * Modal for users to understand and customize the PYMK recommendation algorithm.
 * Features:
 * - "How It Works" expandable explanation section
 * - Weight sliders for each scoring factor
 * - Minimum score threshold slider
 * - Save and Reset to Defaults functionality
 *
 * GOVERNANCE: Uses BizModal (100% compliance)
 *
 * @phase ConnectP2 Enhancement
 */
function RecommendationSettingsModalComponent({
  isOpen,
  onClose,
  onSave
}: RecommendationSettingsModalProps) {
  // State
  const [weights, setWeights] = useState<RecommendationWeights>({ ...DEFAULT_RECOMMENDATION_WEIGHTS });
  const [minScoreThreshold, setMinScoreThreshold] = useState<number>(15);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showHowItWorks, setShowHowItWorks] = useState<boolean>(true);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [originalPrefs, setOriginalPrefs] = useState<UserRecommendationPreferences | null>(null);

  /**
   * Load current preferences when modal opens
   */
  useEffect(() => {
    if (isOpen) {
      loadPreferences();
    }
  }, [isOpen]);

  /**
   * Load user's current preferences
   */
  const loadPreferences = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users/connections/recommendations/preferences', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load preferences');
      }

      const data = await response.json();

      if (data.success && data.data) {
        const prefs: UserRecommendationPreferences = data.data;
        setWeights(prefs.weights);
        setMinScoreThreshold(prefs.minScoreThreshold);
        setOriginalPrefs(prefs);
        setHasChanges(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preferences');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Check if current state differs from original
   * @phase Phase 8C - All 13 factors checked
   */
  const checkForChanges = useCallback((newWeights: RecommendationWeights, newThreshold: number) => {
    if (!originalPrefs) {
      setHasChanges(false);
      return;
    }

    // Check all 13 factors for changes
    const weightKeys: (keyof RecommendationWeights)[] = [
      'mutualConnections', 'industryMatch', 'location', 'engagement',
      'reputation', 'profileCompleteness', 'skillsOverlap', 'goalsAlignment',
      'interestOverlap', 'hobbiesAlignment', 'educationMatch', 'hometownMatch', 'groupOverlap'
    ];

    const weightsChanged = weightKeys.some(key =>
      newWeights[key] !== originalPrefs.weights[key]
    );

    const thresholdChanged = newThreshold !== originalPrefs.minScoreThreshold;

    setHasChanges(weightsChanged || thresholdChanged);
  }, [originalPrefs]);

  /**
   * Calculate total weight - all 13 factors
   * @phase Phase 8C
   */
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);

  /**
   * Handle weight change - NO auto-redistribution
   * User manually balances weights, Save only enabled when total = 100
   */
  const handleWeightChange = (key: keyof RecommendationWeights, newValue: number) => {
    const newWeights = { ...weights, [key]: newValue };
    setWeights(newWeights);
    checkForChanges(newWeights, minScoreThreshold);
  };

  /**
   * Handle threshold change
   */
  const handleThresholdChange = (value: number) => {
    setMinScoreThreshold(value);
    checkForChanges(weights, value);
  };

  /**
   * Reset to defaults
   */
  const handleResetToDefaults = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/users/connections/recommendations/preferences', {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to reset preferences');
      }

      const data = await response.json();

      if (data.success && data.data) {
        const prefs: UserRecommendationPreferences = data.data;
        setWeights(prefs.weights);
        setMinScoreThreshold(prefs.minScoreThreshold);
        setOriginalPrefs(prefs);
        setHasChanges(false);
        onSave(); // Trigger refresh
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset preferences');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Save preferences
   */
  const handleSave = async () => {
    if (totalWeight !== 100) {
      setError('Weights must sum to 100');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/users/connections/recommendations/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          weights,
          minScoreThreshold
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to save preferences');
      }

      const data = await response.json();

      if (data.success && data.data) {
        setOriginalPrefs(data.data);
        setHasChanges(false);
        onSave(); // Trigger refresh
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle close
   */
  const handleClose = () => {
    if (!isSaving) {
      // Reset to original on close without save
      if (originalPrefs) {
        setWeights(originalPrefs.weights);
        setMinScoreThreshold(originalPrefs.minScoreThreshold);
      }
      setHasChanges(false);
      setError(null);
      onClose();
    }
  };

  const footer = (
    <div className="flex items-center justify-between">
      <button
        onClick={handleResetToDefaults}
        disabled={isSaving}
        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RotateCcw className="w-4 h-4" />
        Reset to Defaults
      </button>
      <div className="flex gap-3">
        <button
          onClick={handleClose}
          disabled={isSaving}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving || !hasChanges || totalWeight !== 100}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Recommendation Settings"
      subtitle="Customize how we find people for you"
      maxWidth="lg"
      footer={footer}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* How It Works Section */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowHowItWorks(!showHowItWorks)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-gray-900">How Recommendations Work</span>
              </div>
              {showHowItWorks ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {showHowItWorks && (
              <div className="px-4 py-4 bg-white border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-4">
                  Our recommendation system uses multiple factors to find the most relevant connections for you.
                  Each factor contributes to a match score (0-100). Higher scores indicate better matches.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {FACTOR_INFO.map((factor) => (
                    <div key={factor.key} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="text-orange-600 mt-0.5">
                        {getFactorIcon(factor.icon)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{factor.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{factor.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Weight Sliders */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Priority Weights</h3>
              <span className={`text-sm font-medium ${totalWeight === 100 ? 'text-green-600' : 'text-red-600'}`}>
                Total: {totalWeight}/100
              </span>
            </div>

            <p className="text-sm text-gray-500">
              Adjust how much each factor influences your recommendations. Weights must add up to 100.
            </p>

            <div className="space-y-4">
              {FACTOR_INFO.map((factor) => (
                <div key={factor.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-orange-600">{getFactorIcon(factor.icon)}</span>
                      <span className="text-sm font-medium text-gray-700">{factor.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                      {weights[factor.key]}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={weights[factor.key]}
                    onChange={(e) => handleWeightChange(factor.key, parseInt(e.target.value, 10))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Minimum Score Threshold */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Minimum Match Score</h3>
              <span className="text-sm font-semibold text-gray-900">{minScoreThreshold}%</span>
            </div>

            <p className="text-sm text-gray-500">
              Only show recommendations that score at least this high. Higher values mean fewer but more relevant suggestions.
            </p>

            <input
              type="range"
              min="0"
              max="80"
              step="5"
              value={minScoreThreshold}
              onChange={(e) => handleThresholdChange(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
            />

            <div className="flex justify-between text-xs text-gray-600">
              <span>Show All (0%)</span>
              <span>Very Selective (80%)</span>
            </div>
          </div>
        </div>
      )}
    </BizModal>
  );
}

/**
 * Wrapped with ErrorBoundary (STANDARD tier requirement)
 */
export function RecommendationSettingsModal(props: RecommendationSettingsModalProps) {
  return (
    <ErrorBoundary>
      <RecommendationSettingsModalComponent {...props} />
    </ErrorBoundary>
  );
}
