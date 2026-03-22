/**
 * GuidanceTipsBox - Profile Edit Guidance Component
 *
 * @tier SIMPLE
 * @generated DNA v11.4.0
 * @dna-version 11.4.0
 * @authority docs/pages/layouts/userProfile/phases/PHASE_1_BRAIN_PLAN.md
 *
 * GOVERNANCE COMPLIANCE:
 * - Client component ('use client' directive)
 * - Path aliases (@features/, @components/)
 * - Lucide React icons only
 * - Bizconekt color palette
 */

'use client';

import { Lightbulb } from 'lucide-react';

export interface GuidanceTipsBoxProps {
  /** Whether to show the dismissible close button */
  dismissible?: boolean;
  /** Callback when dismissed */
  onDismiss?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export function GuidanceTipsBox({
  dismissible = false,
  onDismiss,
  className = ''
}: GuidanceTipsBoxProps) {
  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          <Lightbulb className="w-5 h-5 text-blue-600" />
        </div>

        {/* Content */}
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-blue-800 mb-2">
            Tips for completing your profile
          </h4>
          <ul className="space-y-1.5 text-sm text-blue-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>All profile information is optional - share only what you&apos;re comfortable with</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Use Privacy Settings (Settings tab) to control who can see each field</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Complete profiles help Bizconekt provide better recommendations and connections</span>
            </li>
          </ul>
        </div>

        {/* Optional Dismiss Button */}
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-blue-400 hover:text-blue-600 transition-colors"
            aria-label="Dismiss guidance tips"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
