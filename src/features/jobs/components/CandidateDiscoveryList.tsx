/**
 * CandidateDiscoveryList Component
 *
 * Candidate browser grid for Premium employers with match scores and filters
 *
 * GOVERNANCE COMPLIANCE:
 * - 'use client' directive for client component
 * - Import aliases: @core/, @features/, @components/
 * - Premium tier feature (tier enforcement on API)
 *
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 * @tier ADVANCED
 * @phase Jobs Phase 4 - Platform Growth & Future Features
 * @reference src/features/contacts/services/SharingService.ts - User matching pattern
 */

'use client';

import { useState, useEffect } from 'react';
import { CandidateCard } from './CandidateCard';
import type { CandidateDiscovery, ExperienceLevel } from '@features/jobs/types';

interface CandidateDiscoveryListProps {
  listingId: number;
}

export function CandidateDiscoveryList({ listingId }: CandidateDiscoveryListProps) {
  const [candidates, setCandidates] = useState<CandidateDiscovery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | ''>('');
  const [skillFilter, setSkillFilter] = useState('');
  const [minMatchScore, setMinMatchScore] = useState<number>(0);

  useEffect(() => {
    fetchCandidates();
  }, [listingId, experienceLevel, skillFilter, minMatchScore]);

  const fetchCandidates = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (experienceLevel) params.append('experience_level', experienceLevel);
      if (skillFilter) params.append('skill', skillFilter);
      if (minMatchScore > 0) params.append('min_match_score', minMatchScore.toString());

      const response = await fetch(
        `/api/listings/${listingId}/jobs/candidates?${params.toString()}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load candidates');
      }

      const result = await response.json();
      setCandidates(result.data?.candidates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleContact = async (candidateId: number) => {
    // Contact candidate logic would go here
    console.log('Contacting candidate:', candidateId);
  };

  const experienceLevels: { value: ExperienceLevel; label: string }[] = [
    { value: 'entry', label: 'Entry Level' },
    { value: 'junior', label: 'Junior' },
    { value: 'mid', label: 'Mid-Level' },
    { value: 'senior', label: 'Senior' },
    { value: 'lead', label: 'Lead' },
    { value: 'executive', label: 'Executive' }
  ];

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Candidates</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <option value="">All Levels</option>
              {experienceLevels.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="skillFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Skill
            </label>
            <input
              type="text"
              id="skillFilter"
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              placeholder="e.g., JavaScript"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="minMatchScore" className="block text-sm font-medium text-gray-700 mb-1">
              Min Match Score
            </label>
            <input
              type="number"
              id="minMatchScore"
              value={minMatchScore}
              onChange={(e) => setMinMatchScore(parseInt(e.target.value) || 0)}
              min="0"
              max="100"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse bg-gray-200 rounded-lg h-64"></div>
          ))}
        </div>
      ) : candidates.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No candidates found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your filters or check back later for new candidates.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {candidates.length} Candidate{candidates.length !== 1 ? 's' : ''} Found
            </h3>
            <p className="text-sm text-gray-600">Sorted by match score</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {candidates.map((candidate) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                onContact={handleContact}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
