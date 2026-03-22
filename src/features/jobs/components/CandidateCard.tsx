/**
 * CandidateCard Component
 *
 * Individual candidate card with match score and skills overlap display
 *
 * GOVERNANCE COMPLIANCE:
 * - 'use client' directive for client component
 * - Import aliases: @core/, @features/, @components/
 * - Privacy: Hides last name until contacted
 *
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 * @tier STANDARD
 * @phase Jobs Phase 4 - Platform Growth & Future Features
 */

'use client';

import { useState } from 'react';
import type { CandidateDiscovery } from '@features/jobs/types';
import { getAvatarInitials } from '@core/utils/avatar';

interface CandidateCardProps {
  candidate: CandidateDiscovery;
  onContact: (candidateId: number) => void;
}

export function CandidateCard({ candidate, onContact }: CandidateCardProps) {
  const [isContacting, setIsContacting] = useState(false);

  const handleContact = async () => {
    setIsContacting(true);
    try {
      await onContact(candidate.id);
    } catch (error) {
      console.error('Contact failed:', error);
    } finally {
      setIsContacting(false);
    }
  };

  const isContacted = candidate.status !== 'discovered';
  const displayName = candidate.job_seeker_name || 'Job Seeker';

  // Hide last name if not contacted (privacy)
  const privacyName = isContacted
    ? displayName
    : displayName.split(' ')[0] + ' ' + (displayName.split(' ')[1]?.[0] || '') + '.';

  const matchScore = candidate.match_score ? parseFloat(String(candidate.match_score)) : 0;
  const matchScoreColor = matchScore >= 80 ? 'text-green-600' : matchScore >= 60 ? 'text-blue-600' : 'text-gray-600';

  const initials = getAvatarInitials(displayName);

  const statusColors: Record<string, string> = {
    discovered: 'bg-gray-100 text-gray-800',
    interested: 'bg-blue-100 text-blue-800',
    contacted: 'bg-yellow-100 text-yellow-800',
    applied: 'bg-green-100 text-green-800',
    hired: 'bg-purple-100 text-purple-800',
    declined: 'bg-red-100 text-red-800'
  };

  const statusColor = statusColors[candidate.status] || 'bg-gray-100 text-gray-800';

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      {/* Header with Avatar and Match Score */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-lg font-semibold">
            {initials}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{privacyName}</h3>
            {candidate.job_seeker_headline && (
              <p className="text-sm text-gray-600">{candidate.job_seeker_headline}</p>
            )}
          </div>
        </div>
        {matchScore > 0 && (
          <div className="text-center">
            <div className={`text-2xl font-bold ${matchScoreColor}`}>
              {matchScore}%
            </div>
            <div className="text-xs text-gray-500">Match</div>
          </div>
        )}
      </div>

      {/* Status Badge */}
      <div className="mb-4">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
          {candidate.status.replace('_', ' ')}
        </span>
      </div>

      {/* Matched Skills */}
      {candidate.matched_skills && candidate.matched_skills.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Matched Skills</h4>
          <div className="flex flex-wrap gap-1">
            {candidate.matched_skills.slice(0, 4).map((skill, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800"
              >
                {skill}
              </span>
            ))}
            {candidate.matched_skills.length > 4 && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs text-gray-600">
                +{candidate.matched_skills.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Discovery Info */}
      <div className="mb-4 text-sm text-gray-600">
        <div>Discovered: {new Date(candidate.discovered_at).toLocaleDateString()}</div>
        {candidate.viewed_at && (
          <div>Viewed: {new Date(candidate.viewed_at).toLocaleDateString()}</div>
        )}
        {candidate.contacted_at && (
          <div>
            Contacted: {new Date(candidate.contacted_at).toLocaleDateString()}
            {candidate.contact_method && ` via ${candidate.contact_method}`}
          </div>
        )}
      </div>

      {/* Employer Notes Preview */}
      {candidate.employer_notes && (
        <div className="mb-4 p-3 bg-gray-50 rounded text-sm text-gray-700">
          <p className="line-clamp-2">{candidate.employer_notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center space-x-2 pt-4 border-t border-gray-200">
        <button
          onClick={() => {/* View profile logic */}}
          className="flex-1 text-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          View Profile
        </button>
        {!isContacted && (
          <button
            onClick={handleContact}
            disabled={isContacting}
            className="flex-1 text-center px-3 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isContacting ? 'Contacting...' : 'Contact'}
          </button>
        )}
      </div>
    </div>
  );
}
