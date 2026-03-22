/**
 * Job Market Insight Detail Page
 *
 * Server component that fetches a published content article by slug and renders it.
 * Includes related content sidebar and full-article display.
 *
 * @authority docs/pages/layouts/integrationPointRef/jobs/phases/PHASE_6_PLAN.md
 * @phase Jobs Phase 6A - Market Insights Completion
 * @tier STANDARD
 */

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import { getJobMarketContentService } from '@core/services/JobMarketContentService';
import { JobMarketInsightCard } from '@features/jobs/components/JobMarketInsightCard';
import type { ContentType } from '@features/jobs/types';

interface PageProps {
  params: Promise<{ slug: string }>;
}

const contentTypeLabels: Record<string, string> = {
  trends: 'Market Trends',
  salary_guide: 'Salary Guide',
  skills_report: 'Skills Report',
  industry_outlook: 'Industry Outlook',
  hiring_tips: 'Hiring Tips',
};

const contentTypeColors: Record<ContentType, string> = {
  trends: 'bg-blue-100 text-blue-800',
  salary_guide: 'bg-green-100 text-green-800',
  skills_report: 'bg-purple-100 text-purple-800',
  industry_outlook: 'bg-orange-100 text-orange-800',
  hiring_tips: 'bg-yellow-100 text-yellow-800',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = getJobMarketContentService();
  const content = await service.getContentBySlug(slug);

  if (!content) {
    return { title: 'Insight Not Found' };
  }

  return {
    title: `${content.title} | Job Market Insights`,
    description: content.summary || `Read ${content.title} on the Bizconekt Job Market Insights hub.`,
    openGraph: {
      title: content.title,
      description: content.summary || undefined,
      images: content.cover_image_url ? [{ url: content.cover_image_url }] : [],
      type: 'article',
    },
  };
}

export default async function InsightDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const service = getJobMarketContentService();

  const content = await service.getContentBySlug(slug);

  if (!content) {
    notFound();
  }

  const relatedContents = await service.getRelatedContent(content.id, 3);

  const contentTypeLabel = contentTypeLabels[content.content_type] || content.content_type;
  const contentTypeBadge = contentTypeColors[content.content_type as ContentType] || 'bg-gray-100 text-gray-800';

  const formatDate = (date: Date | string) =>
    new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-gray-500">
        <Link href={'/jobs/insights' as Route} className="hover:text-primary">
          Job Market Insights
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{content.title}</span>
      </nav>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content */}
        <article className="flex-1 min-w-0">
          {/* Cover Image */}
          {content.cover_image_url && (
            <div className="mb-6 rounded-lg overflow-hidden">
              <img
                src={content.cover_image_url}
                alt={content.title}
                className="w-full h-64 object-cover"
              />
            </div>
          )}

          {/* Header */}
          <header className="mb-6">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${contentTypeBadge}`}
              >
                {contentTypeLabel}
              </span>
              {content.is_featured && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                  Featured
                </span>
              )}
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-3">{content.title}</h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              {content.published_date && (
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span>{formatDate(content.published_date)}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <span>{content.view_count.toLocaleString()} views</span>
              </div>
            </div>

            {/* Regions */}
            {content.regions && content.regions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {content.regions.map((region, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
                  >
                    {region}
                  </span>
                ))}
              </div>
            )}
          </header>

          {/* Summary */}
          {content.summary && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-blue-900 font-medium text-base">{content.summary}</p>
            </div>
          )}

          {/* Main Content Body */}
          <div className="prose prose-gray max-w-none">
            {content.content.split('\n').map((paragraph, idx) =>
              paragraph.trim() ? (
                <p key={idx} className="mb-4 text-gray-700 leading-relaxed">
                  {paragraph}
                </p>
              ) : (
                <br key={idx} />
              )
            )}
          </div>

          {/* Back Link */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <Link
              href={'/jobs/insights' as Route}
              className="inline-flex items-center text-primary font-semibold hover:underline"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Insights
            </Link>
          </div>
        </article>

        {/* Related Content Sidebar */}
        {relatedContents.length > 0 && (
          <aside className="w-full lg:w-80 shrink-0">
            <div className="sticky top-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Related Insights</h2>
              <div className="space-y-4">
                {relatedContents.map(related => (
                  <JobMarketInsightCard key={related.id} content={related} />
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
