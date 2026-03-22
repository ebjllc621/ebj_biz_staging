/**
 * Profile Completion Checklist Component
 *
 * Displays missing profile fields with completion weights.
 * Gamification element to encourage profile completion.
 *
 * @authority docs/pages/layouts/home/user/phases/troubleshooting/PHASE_4_REMEDIATION_BRAIN_PLAN.md
 * @tier SIMPLE
 * @generated DNA v11.4.0
 */

'use client';

import React from 'react';
import { UserCircle } from 'lucide-react';
import { ProfileCompletionResult } from '../utils/calculateProfileCompletion';

// ============================================================================
// TYPES
// ============================================================================

export interface ProfileCompletionChecklistProps {
  /** Profile completion result */
  completion: ProfileCompletionResult;
  /** Handler to open edit modal */
  onEditClick?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ProfileCompletionChecklist({
  completion,
  onEditClick
}: ProfileCompletionChecklistProps): React.ReactElement | null {
  // Don't show if profile is complete
  if (completion.percentage >= 100) {
    return null;
  }

  // Combine missing fields (required first, then optional)
  const allMissingFields = [
    ...completion.missingRequired,
    ...completion.missingOptional.slice(0, 3) // Show max 3 optional
  ];

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-white rounded-lg shadow-sm">
          <UserCircle className="w-8 h-8 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-[#022641] mb-1">
            Complete Your Profile
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Complete your profile to connect with more members and increase your visibility!
          </p>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Progress</span>
              <span className="font-semibold text-[#022641]">{completion.percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-full h-2 transition-all duration-500"
                style={{ width: `${completion.percentage}%` }}
              />
            </div>
          </div>

          {/* Missing items checklist */}
          {allMissingFields.length > 0 && (
            <div className="space-y-2 mb-4">
              {allMissingFields.map(field => {
                const isRequired = field.required;
                const weightPercentage = Math.round(field.weight * 100);

                return (
                  <div key={field.key} className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-4 border border-gray-300 rounded flex-shrink-0" />
                    <span className={isRequired ? 'text-gray-700 font-medium' : 'text-gray-500'}>
                      {field.label}
                    </span>
                    <span
                      className={`text-xs font-medium ml-auto ${
                        isRequired ? 'text-orange-600' : 'text-gray-400'
                      }`}
                    >
                      +{weightPercentage}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* CTA Button */}
          {onEditClick && (
            <button
              type="button"
              onClick={onEditClick}
              className="w-full px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a2f] transition-colors font-medium text-sm"
            >
              Complete Your Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
