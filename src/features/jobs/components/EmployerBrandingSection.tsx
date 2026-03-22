/**
 * EmployerBrandingSection Component
 *
 * "Work With Us" employer branding section for listing detail pages
 *
 * GOVERNANCE COMPLIANCE:
 * - 'use client' directive for client component
 * - Import aliases: @core/, @features/, @components/
 * - Integrates with UMM for featured media
 *
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 * @tier STANDARD
 * @phase Jobs Phase 4 - Platform Growth & Future Features
 * @reference src/features/jobs/components/NowHiringSection.tsx - Section pattern
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import type { EmployerBranding } from '@features/jobs/types';

interface EmployerBrandingSectionProps {
  listingId: number;
}

export function EmployerBrandingSection({ listingId }: EmployerBrandingSectionProps) {
  const [branding, setBranding] = useState<EmployerBranding | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBranding() {
      try {
        const response = await fetch(`/api/listings/${listingId}/jobs/branding`);
        if (response.ok) {
          const result = await response.json();
          if (result.data?.branding?.status === 'published') {
            setBranding(result.data.branding);
          }
        }
      } catch (error) {
        console.error('Failed to fetch employer branding:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchBranding();
  }, [listingId]);

  if (loading) {
    return (
      <section className="py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </section>
    );
  }

  if (!branding || branding.status !== 'published') return null;

  const urgencyBadges: Record<string, { label: string; color: string }> = {
    immediate: { label: 'Hiring Now', color: 'bg-red-100 text-red-800' },
    ongoing: { label: 'Ongoing Recruitment', color: 'bg-blue-100 text-blue-800' },
    seasonal: { label: 'Seasonal Hiring', color: 'bg-yellow-100 text-yellow-800' },
    future: { label: 'Future Opportunities', color: 'bg-gray-100 text-gray-800' }
  };

  const urgencyBadge = urgencyBadges[branding.hiring_urgency];

  return (
    <section className="py-12 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-8">
          {branding.headline && (
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              {branding.headline}
            </h2>
          )}
          {branding.tagline && (
            <p className="text-xl text-gray-600 mb-4">{branding.tagline}</p>
          )}
          <div className="flex justify-center items-center space-x-4">
            {urgencyBadge && (
              <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${urgencyBadge.color}`}>
                {urgencyBadge.label}
              </span>
            )}
            {branding.team_size && (
              <span className="text-sm text-gray-600">
                Team Size: {branding.team_size}
              </span>
            )}
            {branding.growth_stage && (
              <span className="text-sm text-gray-600 capitalize">
                {branding.growth_stage.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>

        {/* Featured Media */}
        {branding.featured_media_url && (
          <div className="mb-8 rounded-lg overflow-hidden shadow-lg">
            {branding.featured_media_url.match(/\.(mp4|webm|ogg)$/i) ? (
              <video
                src={branding.featured_media_url}
                controls
                className="w-full max-h-96 object-cover"
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <img
                src={branding.featured_media_url}
                alt="Team"
                className="w-full max-h-96 object-cover"
              />
            )}
          </div>
        )}

        {/* Content Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Company Culture */}
          {branding.company_culture && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <svg
                  className="w-5 h-5 mr-2 text-primary"
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
                Our Culture
              </h3>
              <p className="text-gray-700 whitespace-pre-wrap">{branding.company_culture}</p>
            </div>
          )}

          {/* Benefits Highlight */}
          {branding.benefits_highlight && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <svg
                  className="w-5 h-5 mr-2 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Benefits & Perks
              </h3>
              <p className="text-gray-700 whitespace-pre-wrap">{branding.benefits_highlight}</p>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href={(branding.cta_url || `/jobs?listing=${listingId}`) as Route}
            className="inline-flex items-center px-8 py-3 bg-primary text-white rounded-lg text-lg font-semibold hover:bg-primary-dark transition-colors shadow-lg"
          >
            {branding.cta_text}
            <svg
              className="w-5 h-5 ml-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
