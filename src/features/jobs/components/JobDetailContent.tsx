/**
 * JobDetailContent - Main content section for job detail page
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Jobs Phase 1 - Core Job CRUD & Display
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import { CheckCircle, Star, Users } from 'lucide-react';
import type { Job } from '@features/jobs/types';

interface JobDetailContentProps {
  job: Job;
  className?: string;
}

export function JobDetailContent({ job, className = '' }: JobDetailContentProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Description */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-biz-navy mb-4">Job Description</h2>
        <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
          {job.description}
        </div>
      </section>

      {/* Required Qualifications */}
      {job.required_qualifications && job.required_qualifications.length > 0 && (
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-biz-navy mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Required Qualifications
          </h2>
          <ul className="space-y-2">
            {job.required_qualifications.map((qual, index) => (
              <li key={index} className="flex items-start gap-2 text-gray-700">
                <span className="text-biz-orange mt-1">•</span>
                <span>{qual}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Preferred Qualifications */}
      {job.preferred_qualifications && job.preferred_qualifications.length > 0 && (
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-biz-navy mb-4 flex items-center gap-2">
            <Star className="w-5 h-5" />
            Preferred Qualifications
          </h2>
          <ul className="space-y-2">
            {job.preferred_qualifications.map((qual, index) => (
              <li key={index} className="flex items-start gap-2 text-gray-700">
                <span className="text-blue-500 mt-1">•</span>
                <span>{qual}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Benefits */}
      {job.benefits && job.benefits.length > 0 && (
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-biz-navy mb-4 flex items-center gap-2">
            <Star className="w-5 h-5" />
            Benefits
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {job.benefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-2 text-gray-700">
                <CheckCircle className="w-4 h-4 text-green-500 mt-1" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Additional Details */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-biz-navy mb-4">Additional Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {job.department && (
            <div>
              <p className="text-sm text-gray-500">Department</p>
              <p className="text-gray-900 font-medium">{job.department}</p>
            </div>
          )}
          {job.reports_to && (
            <div>
              <p className="text-sm text-gray-500">Reports To</p>
              <p className="text-gray-900 font-medium">{job.reports_to}</p>
            </div>
          )}
          {job.number_of_openings > 1 && (
            <div>
              <p className="text-sm text-gray-500">Number of Openings</p>
              <p className="text-gray-900 font-medium flex items-center gap-1">
                <Users className="w-4 h-4" />
                {job.number_of_openings} positions
              </p>
            </div>
          )}
          {job.application_deadline && (
            <div>
              <p className="text-sm text-gray-500">Application Deadline</p>
              <p className="text-gray-900 font-medium">
                {new Intl.DateTimeFormat('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                }).format(new Date(job.application_deadline))}
              </p>
            </div>
          )}
        </div>

        {job.schedule_info && (
          <div className="mt-4">
            <p className="text-sm text-gray-500">Schedule Information</p>
            <p className="text-gray-900 mt-1 whitespace-pre-wrap">{job.schedule_info}</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default JobDetailContent;
