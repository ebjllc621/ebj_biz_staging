/**
 * JobSeekerProfileEditor Component
 *
 * Profile editor form for job seekers with skills, resume upload, and preferences
 *
 * GOVERNANCE COMPLIANCE:
 * - 'use client' directive for client component
 * - Import aliases: @core/, @features/, @components/
 * - BizModal NOT used (inline form, not modal)
 * - UMM integration for resume upload
 *
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 * @tier STANDARD
 * @phase Jobs Phase 4 - Platform Growth & Future Features
 */

'use client';

import { useState, useEffect } from 'react';
import { JobSeekerProfile, ExperienceLevel, EmploymentType } from '@features/jobs/types';
import { fetchWithCsrf } from '@core/utils/csrf';

interface JobSeekerProfileEditorProps {
  userId: number;
  initialProfile?: JobSeekerProfile | null;
  onSave?: (profile: JobSeekerProfile) => void;
}

export function JobSeekerProfileEditor({
  userId,
  initialProfile,
  onSave
}: JobSeekerProfileEditorProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [headline, setHeadline] = useState(initialProfile?.headline || '');
  const [bio, setBio] = useState(initialProfile?.bio || '');
  const [skills, setSkills] = useState<string[]>(initialProfile?.skills || []);
  const [skillInput, setSkillInput] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(
    initialProfile?.experience_level || 'entry'
  );
  const [yearsExperience, setYearsExperience] = useState<number | ''>(
    initialProfile?.years_experience || ''
  );
  const [resumeFileUrl, setResumeFileUrl] = useState(
    initialProfile?.resume_file_url || ''
  );
  const [availabilityDate, setAvailabilityDate] = useState(
    initialProfile?.availability_date
      ? new Date(initialProfile.availability_date).toISOString().split('T')[0]
      : ''
  );
  const [isActivelyLooking, setIsActivelyLooking] = useState(
    initialProfile?.is_actively_looking || false
  );
  const [isDiscoverable, setIsDiscoverable] = useState(
    initialProfile?.is_discoverable || false
  );
  const [employmentTypes, setEmploymentTypes] = useState<EmploymentType[]>(
    initialProfile?.employment_preferences?.types || []
  );
  const [remotePreference, setRemotePreference] = useState(
    initialProfile?.employment_preferences?.remote || false
  );

  const experienceLevels: { value: ExperienceLevel; label: string }[] = [
    { value: 'entry', label: 'Entry Level' },
    { value: 'junior', label: 'Junior' },
    { value: 'mid', label: 'Mid-Level' },
    { value: 'senior', label: 'Senior' },
    { value: 'lead', label: 'Lead' },
    { value: 'executive', label: 'Executive' }
  ];

  const employmentTypeOptions: { value: EmploymentType; label: string }[] = [
    { value: EmploymentType.FULL_TIME, label: 'Full-Time' },
    { value: EmploymentType.PART_TIME, label: 'Part-Time' },
    { value: EmploymentType.CONTRACT, label: 'Contract' },
    { value: EmploymentType.SEASONAL, label: 'Seasonal' },
    { value: EmploymentType.TEMPORARY, label: 'Temporary' },
    { value: EmploymentType.INTERNSHIP, label: 'Internship' }
  ];

  const addSkill = () => {
    const trimmedSkill = skillInput.trim();
    if (trimmedSkill && !skills.includes(trimmedSkill)) {
      setSkills([...skills, trimmedSkill]);
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const toggleEmploymentType = (type: EmploymentType) => {
    if (employmentTypes.includes(type)) {
      setEmploymentTypes(employmentTypes.filter(t => t !== type));
    } else {
      setEmploymentTypes([...employmentTypes, type]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        headline: headline || null,
        bio: bio || null,
        skills: skills.length > 0 ? skills : null,
        experience_level: experienceLevel,
        years_experience: yearsExperience || null,
        resume_file_url: resumeFileUrl || null,
        employment_preferences: {
          types: employmentTypes,
          locations: [], // TODO: Add location input
          remote: remotePreference,
          min_salary: null // TODO: Add salary input
        },
        availability_date: availabilityDate || null,
        is_actively_looking: isActivelyLooking,
        is_discoverable: isDiscoverable,
        preferred_job_categories: null // TODO: Add category selection
      };

      const method = initialProfile ? 'PUT' : 'POST';
      const response = await fetchWithCsrf('/api/jobs/profile', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save profile');
      }

      const result = await response.json();
      setSuccess('Profile saved successfully!');
      if (onSave && result.data?.profile) {
        onSave(result.data.profile);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Headline */}
      <div>
        <label htmlFor="headline" className="block text-sm font-medium text-gray-700 mb-1">
          Professional Headline
        </label>
        <input
          type="text"
          id="headline"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="e.g., Software Engineer | React Specialist"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
          maxLength={255}
        />
      </div>

      {/* Bio */}
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
          Professional Summary
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Brief summary of your experience and career goals"
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
        />
      </div>

      {/* Skills */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
        <div className="flex space-x-2 mb-2">
          <input
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSkill();
              }
            }}
            placeholder="Add a skill (press Enter)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
          />
          <button
            type="button"
            onClick={addSkill}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill, index) => (
            <span
              key={index}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
            >
              {skill}
              <button
                type="button"
                onClick={() => removeSkill(skill)}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Experience Level and Years */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="experienceLevel" className="block text-sm font-medium text-gray-700 mb-1">
            Experience Level
          </label>
          <select
            id="experienceLevel"
            value={experienceLevel}
            onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
          >
            {experienceLevels.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="yearsExperience" className="block text-sm font-medium text-gray-700 mb-1">
            Years of Experience
          </label>
          <input
            type="number"
            id="yearsExperience"
            value={yearsExperience}
            onChange={(e) => setYearsExperience(e.target.value ? parseInt(e.target.value) : '')}
            min="0"
            max="50"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
          />
        </div>
      </div>

      {/* Resume Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Resume</label>
        {resumeFileUrl ? (
          <div className="flex items-center space-x-3">
            <a
              href={resumeFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              View Current Resume
            </a>
            <button
              type="button"
              onClick={() => setResumeFileUrl('')}
              className="text-red-600 hover:underline text-sm"
            >
              Remove
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No resume uploaded. Add resume URL below:</p>
        )}
        <input
          type="url"
          value={resumeFileUrl}
          onChange={(e) => setResumeFileUrl(e.target.value)}
          placeholder="Resume file URL"
          className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
        />
      </div>

      {/* Employment Type Preferences */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Preferred Employment Types
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {employmentTypeOptions.map(({ value, label }) => (
            <label key={value} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={employmentTypes.includes(value)}
                onChange={() => toggleEmploymentType(value)}
                className="rounded text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Remote Preference */}
      <div>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={remotePreference}
            onChange={(e) => setRemotePreference(e.target.checked)}
            className="rounded text-primary focus:ring-primary"
          />
          <span className="text-sm font-medium text-gray-700">Open to remote work</span>
        </label>
      </div>

      {/* Availability Date */}
      <div>
        <label htmlFor="availabilityDate" className="block text-sm font-medium text-gray-700 mb-1">
          Available to Start
        </label>
        <input
          type="date"
          id="availabilityDate"
          value={availabilityDate}
          onChange={(e) => setAvailabilityDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
        />
      </div>

      {/* Visibility Toggles */}
      <div className="space-y-3 p-4 bg-gray-50 rounded-md">
        <h3 className="text-sm font-semibold text-gray-700">Profile Visibility</h3>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isActivelyLooking}
            onChange={(e) => setIsActivelyLooking(e.target.checked)}
            className="rounded text-primary focus:ring-primary"
          />
          <span className="text-sm text-gray-700">
            I am actively looking for opportunities
          </span>
        </label>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isDiscoverable}
            onChange={(e) => setIsDiscoverable(e.target.checked)}
            className="rounded text-primary focus:ring-primary"
          />
          <span className="text-sm text-gray-700">
            Allow employers to discover my profile (Premium feature)
          </span>
        </label>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end space-x-3">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-primary text-white rounded-md font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </form>
  );
}
