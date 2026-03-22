/**
 * ContentCreatorImpactCard - Content creator recommendation analytics
 *
 * Displays content recommendation metrics by type (articles, newsletters, podcasts, videos).
 * Shows total recommendations, views, and helpful rates for each content type.
 *
 * @tier STANDARD
 * @phase Phase 8 - Content Types
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 *
 * @example
 * <ContentCreatorImpactCard />
 */

'use client';

import { useState, useEffect } from 'react';
import { FileText, Mic, Video, Mail, TrendingUp, ThumbsUp, Eye, Loader2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import type { ContentCreatorStats } from '@features/contacts/types/sharing';

interface ContentCreatorImpactCardProps {
  className?: string;
}

const contentTypeIcons = {
  articles: FileText,
  newsletters: Mail,
  podcasts: Mic,
  videos: Video
};

const contentTypeLabels = {
  articles: 'Articles',
  newsletters: 'Newsletters',
  podcasts: 'Podcasts',
  videos: 'Videos'
};

function ContentCreatorImpactCardContent({
  className = ''
}: ContentCreatorImpactCardProps) {
  const [stats, setStats] = useState<ContentCreatorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        const response = await fetch('/api/sharing/creator/content-stats', {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch content stats');
        }

        const data = await response.json();
        setStats(data.data.stats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
        <p className="text-center text-gray-500 py-8">
          {error || 'No content stats available'}
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          Content Recommendation Impact
        </h3>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 p-6 border-b border-gray-100">
        <div className="text-center">
          <p className="text-3xl font-bold text-gray-900">{stats.total_recommendations}</p>
          <p className="text-sm text-gray-500">Recommendations</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-gray-900">{stats.recommendation_views}</p>
          <p className="text-sm text-gray-500">Views</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-green-600">{stats.helpful_rate}%</p>
          <p className="text-sm text-gray-500">Helpful Rate</p>
        </div>
      </div>

      {/* By Type Breakdown */}
      <div className="px-6 py-4">
        <h4 className="text-sm font-medium text-gray-700 mb-4">By Content Type</h4>
        <div className="space-y-3">
          {(Object.keys(stats.by_type) as Array<keyof typeof stats.by_type>).map(type => {
            const typeStats = stats.by_type[type];
            const Icon = contentTypeIcons[type];

            if (typeStats.recommendations === 0) return null;

            return (
              <div key={type} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Icon className="w-4 h-4 text-gray-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {contentTypeLabels[type]}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {typeStats.views}
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="w-4 h-4" />
                    {typeStats.helpful_rate}%
                  </span>
                  <span className="font-medium text-gray-900">
                    {typeStats.recommendations} recs
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {stats.total_recommendations === 0 && (
        <div className="px-6 py-8 text-center">
          <p className="text-gray-500">
            No content recommendations yet. Share your content to start tracking impact!
          </p>
        </div>
      )}
    </div>
  );
}

export function ContentCreatorImpactCard(props: ContentCreatorImpactCardProps) {
  return (
    <ErrorBoundary componentName="ContentCreatorImpactCard">
      <ContentCreatorImpactCardContent {...props} />
    </ErrorBoundary>
  );
}

export default ContentCreatorImpactCard;
