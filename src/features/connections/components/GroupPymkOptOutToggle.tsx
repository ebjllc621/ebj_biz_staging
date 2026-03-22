/**
 * GroupPymkOptOutToggle Component
 * Toggle for opting out of PYMK recommendations for a group
 *
 * GOVERNANCE COMPLIANCE:
 * - SIMPLE tier component (<100 lines)
 * - No ErrorBoundary required for SIMPLE tier
 * - Props interface with clear types
 *
 * @tier SIMPLE
 * @phase Connection Groups Feature - Phase 1
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/3-5-26/phases/PHASE_1_BRAIN_PLAN.md
 */

'use client';

import React from 'react';

export interface GroupPymkOptOutToggleProps {
  groupName: string;
  optedOut: boolean;
  onChange: (optedOut: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function GroupPymkOptOutToggle({
  groupName,
  optedOut,
  onChange,
  disabled = false,
  className = ''
}: GroupPymkOptOutToggleProps) {
  return (
    <div className={`flex items-start gap-3 p-4 bg-gray-50 rounded-lg ${className}`}>
      <div className="flex items-center h-5">
        <input
          type="checkbox"
          id="pymk-opt-out"
          checked={optedOut}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
        />
      </div>
      <div className="flex-1">
        <label
          htmlFor="pymk-opt-out"
          className="text-sm font-medium text-gray-900 cursor-pointer"
        >
          Opt out of recommendations for "{groupName}"
        </label>
        <p className="text-xs text-gray-600 mt-1">
          You won't receive "People You May Know" suggestions from members of this group
        </p>
      </div>
    </div>
  );
}
