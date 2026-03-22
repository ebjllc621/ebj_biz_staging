/**
 * JobMarketInsightsGrid Component
 *
 * Insights gallery with filters for content type, region, and category
 *
 * GOVERNANCE COMPLIANCE:
 * - 'use client' directive for client component
 * - Import aliases: @core/, @features/, @components/
 *
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 * @tier STANDARD
 * @phase Jobs Phase 4 - Platform Growth & Future Features
 * @reference src/features/content/components/ContentArticlesList.tsx - Content grid pattern
 */

'use client';

import { useState, useEffect } from 'react';
import { JobMarketInsightCard } from './JobMarketInsightCard';
import type { JobMarketContent, ContentType } from '@features/jobs/types';

interface JobMarketInsightsGridProps {
  initialContentType?: ContentType;
}

export function JobMarketInsightsGrid({ initialContentType }: JobMarketInsightsGridProps) {
  const [contents, setContents] = useState<JobMarketContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [contentType, setContentType] = useState<ContentType | ''>(initialContentType || '');
  const [region, setRegion] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'popular'>('newest');

  useEffect(() => {
    fetchInsights();
  }, [contentType, region, sortBy]);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (contentType) params.append('content_type', contentType);
      if (region) params.append('region', region);
      params.append('sort_by', sortBy);

      const response = await fetch(`/api/jobs/insights?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load insights');
      }

      const result = await response.json();
      setContents(result.data?.contents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const contentTypeOptions: { value: ContentType | ''; label: string }[] = [
    { value: '', label: 'All Content Types' },
    { value: 'trends', label: 'Market Trends' },
    { value: 'salary_guide', label: 'Salary Guides' },
    { value: 'skills_report', label: 'Skills Reports' },
    { value: 'industry_outlook', label: 'Industry Outlooks' },
    { value: 'hiring_tips', label: 'Hiring Tips' }
  ];

  const regionOptions = [
    { value: '', label: 'All Regions' },
    { value: 'Northeast', label: 'Northeast' },
    { value: 'Southeast', label: 'Southeast' },
    { value: 'Midwest', label: 'Midwest' },
    { value: 'Southwest', label: 'Southwest' },
    { value: 'West', label: 'West' },
    { value: 'National', label: 'National' }
  ];

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  // Separate featured content
  const featuredContent = contents.find(c => c.is_featured);
  const regularContents = contents.filter(c => !c.is_featured);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="contentType" className="block text-sm font-medium text-gray-700 mb-1">
              Content Type
            </label>
            <select
              id="contentType"
              value={contentType}
              onChange={(e) => setContentType(e.target.value as ContentType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            >
              {contentTypeOptions.map(({ value, label }) => (
                <option key={value || 'all'} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="region" className="block text-sm font-medium text-gray-700 mb-1">
              Region
            </label>
            <select
              id="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            >
              {regionOptions.map(({ value, label }) => (
                <option key={value || 'all'} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <select
              id="sortBy"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'popular')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            >
              <option value="newest">Newest First</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse bg-gray-200 rounded-lg h-96"></div>
          ))}
        </div>
      ) : contents.length === 0 ? (
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No insights found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your filters to see more content.
          </p>
        </div>
      ) : (
        <>
          {/* Featured Content */}
          {featuredContent && (
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Featured Report</h3>
              <JobMarketInsightCard content={featuredContent} featured />
            </div>
          )}

          {/* Regular Content Grid */}
          {regularContents.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {regularContents.length} Report{regularContents.length !== 1 ? 's' : ''}
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {regularContents.map((content) => (
                  <JobMarketInsightCard key={content.id} content={content} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
