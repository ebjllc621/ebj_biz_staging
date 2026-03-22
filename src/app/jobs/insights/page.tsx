'use client';

/**
 * Job Market Insights Hub Public Page
 *
 * Public page for browsing job market content, trends, and salary guides.
 * Interactive filter buttons set content type state passed to the grid.
 *
 * @authority docs/pages/layouts/integrationPointRef/jobs/phases/PHASE_6_PLAN.md
 * @phase Jobs Phase 6A - Market Insights Completion
 */

import { useState } from 'react';
import { JobMarketInsightsGrid } from '@features/jobs/components/JobMarketInsightsGrid';
import type { ContentType } from '@features/jobs/types';

interface FilterOption {
  value: ContentType | '';
  label: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { value: '', label: 'All Insights' },
  { value: 'trends', label: 'Trends' },
  { value: 'salary_guide', label: 'Salary Guides' },
  { value: 'skills_report', label: 'Skills Reports' },
  { value: 'industry_outlook', label: 'Industry Outlook' },
  { value: 'hiring_tips', label: 'Hiring Tips' },
];

export default function JobMarketInsightsPage() {
  const [activeFilter, setActiveFilter] = useState<ContentType | ''>('');

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Job Market Insights</h1>
        <p className="text-gray-600 mt-2">
          Stay informed with the latest trends, salary guides, and industry reports
        </p>
      </div>

      {/* Content Type Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTER_OPTIONS.map(({ value, label }) => (
          <button
            key={value || 'all'}
            type="button"
            onClick={() => setActiveFilter(value)}
            className={
              activeFilter === value
                ? 'px-3 py-1 bg-primary text-white text-sm rounded-full'
                : 'px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 cursor-pointer'
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* Insights Grid */}
      <JobMarketInsightsGrid initialContentType={activeFilter || undefined} />

      {/* Subscribe Section */}
      <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Stay Updated</h2>
          <p className="mb-6 text-blue-100">
            Get the latest job market insights delivered to your inbox. Stay ahead of trends and make informed career decisions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <input
              type="email"
              placeholder="Enter your email"
              className="px-4 py-2 rounded-lg text-gray-900 w-full sm:w-64"
            />
            <button className="px-6 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
              Subscribe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
