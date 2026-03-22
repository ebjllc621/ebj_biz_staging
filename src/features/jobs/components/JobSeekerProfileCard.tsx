/**
 * JobSeekerProfileCard Component
 *
 * Display card for job seeker profiles with avatar, headline, skills, and experience
 *
 * GOVERNANCE COMPLIANCE:
 * - 'use client' directive for client component
 * - Import aliases: @core/, @features/, @components/
 * - BizModal for modal interactions (if needed)
 *
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 * @tier STANDARD
 * @phase Jobs Phase 4 - Platform Growth & Future Features
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { JobSeekerProfile } from '@features/jobs/types';
import { getAvatarInitials } from '@core/utils/avatar';

interface JobSeekerProfileCardProps {
  profile: JobSeekerProfile;
  user?: {
    display_name: string;
    avatar_url?: string | null;
  };
  showContactButton?: boolean;
  onContact?: (profileId: number) => void;
}

export function JobSeekerProfileCard({
  profile,
  user,
  showContactButton = false,
  onContact
}: JobSeekerProfileCardProps) {
  const [isContacting, setIsContacting] = useState(false);

  const handleContact = async () => {
    if (!onContact) return;
    setIsContacting(true);
    try {
      await onContact(profile.id);
    } catch (error) {
      console.error('Contact failed:', error);
    } finally {
      setIsContacting(false);
    }
  };

  const experienceLevelLabels: Record<string, string> = {
    entry: 'Entry Level',
    junior: 'Junior',
    mid: 'Mid-Level',
    senior: 'Senior',
    lead: 'Lead',
    executive: 'Executive'
  };

  const initials = user ? getAvatarInitials(user.display_name) : 'JS';
  const avatarUrl = user?.avatar_url;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      {/* Avatar and Name */}
      <div className="flex items-start space-x-4 mb-4">
        <div className="flex-shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={user?.display_name || 'Job Seeker'}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-xl font-semibold">
              {initials}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {user?.display_name || 'Job Seeker'}
          </h3>
          {profile.headline && (
            <p className="text-sm text-gray-600 mt-1">{profile.headline}</p>
          )}
        </div>
      </div>

      {/* Experience Level */}
      <div className="mb-4">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
          {experienceLevelLabels[profile.experience_level]}
        </span>
        {profile.years_experience && (
          <span className="ml-2 text-sm text-gray-600">
            {profile.years_experience} years experience
          </span>
        )}
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="text-sm text-gray-700 mb-4 line-clamp-3">{profile.bio}</p>
      )}

      {/* Skills */}
      {profile.skills && profile.skills.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Skills</h4>
          <div className="flex flex-wrap gap-2">
            {profile.skills.slice(0, 5).map((skill, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800"
              >
                {skill}
              </span>
            ))}
            {profile.skills.length > 5 && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium text-gray-600">
                +{profile.skills.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Availability */}
      {profile.is_actively_looking && (
        <div className="mb-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            Actively Looking
          </span>
          {profile.availability_date && (
            <span className="ml-2 text-sm text-gray-600">
              Available {new Date(profile.availability_date).toLocaleDateString()}
            </span>
          )}
        </div>
      )}

      {/* Resume */}
      {profile.resume_file_url && (
        <div className="mb-4">
          <a
            href={profile.resume_file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            View Resume
          </a>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
        <Link
          href={`/dashboard/jobs/profile/${profile.user_id}` as Route}
          className="flex-1 text-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          View Full Profile
        </Link>
        {showContactButton && onContact && (
          <button
            onClick={handleContact}
            disabled={isContacting}
            className="flex-1 text-center px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isContacting ? 'Contacting...' : 'Contact'}
          </button>
        )}
      </div>
    </div>
  );
}
