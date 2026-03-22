/**
 * ContentCampaignSection - Featured content scrollers for Content page
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @phase Phase 4 - Content Page Components
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/content/phases/PHASE_4_COMPONENTS.md
 *
 * Displays three horizontal scrollers:
 * - Featured Articles
 * - Featured Videos
 * - Featured Podcasts
 *
 * @see src/features/listings/components/CampaignSection.tsx - Pattern reference
 */

'use client';

import { ContentSlider } from '@features/homepage/components/ContentSlider';
import { ArticleCard } from './ArticleCard';
import { VideoCard } from './VideoCard';
import { PodcastCard } from './PodcastCard';
import { GuideCard } from './GuideCard';
import { useContentCampaignData } from '../hooks/useContentCampaignData';
import { ErrorService } from '@core/services/ErrorService';

interface ContentCampaignSectionProps {
  /** Additional CSS classes */
  className?: string;
  /** Maximum items per section */
  maxItems?: number;
}

/**
 * Skeleton loading component for scroller
 */
function SectionSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-64 bg-gray-200 rounded" />
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="min-w-[288px] h-64 bg-gray-200 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/**
 * ContentCampaignSection component
 * Displays featured content in horizontal scrollers
 */
export function ContentCampaignSection({ className = '', maxItems = 10 }: ContentCampaignSectionProps) {
  const { articles, videos, podcasts, guides, isLoading, error } = useContentCampaignData(maxItems);

  // Silent error handling - return null on error
  if (error) {
    ErrorService.capture('ContentCampaignSection error:', error);
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`space-y-12 ${className}`}>
        <SectionSkeleton />
        <SectionSkeleton />
        <SectionSkeleton />
      </div>
    );
  }

  // Check if we have any content to display
  const hasArticles = articles.length > 0;
  const hasVideos = videos.length > 0;
  const hasPodcasts = podcasts.length > 0;
  const hasGuides = guides.length > 0;

  if (!hasArticles && !hasVideos && !hasPodcasts && !hasGuides) {
    return null;
  }

  return (
    <div className={`space-y-12 ${className}`}>
      {/* Featured Podcasts Scroller */}
      {hasPodcasts && (
        <ContentSlider
          title="Featured Podcasts"
          moreLink="/content/podcasts?featured=true"
        >
          {podcasts.map((podcast) => (
            <PodcastCard key={podcast.id} podcast={podcast} />
          ))}
        </ContentSlider>
      )}

      {/* Featured Articles Scroller */}
      {hasArticles && (
        <ContentSlider
          title="Featured Articles"
          moreLink="/content/articles?featured=true"
        >
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </ContentSlider>
      )}

      {/* Featured Videos Scroller */}
      {hasVideos && (
        <ContentSlider
          title="Featured Videos"
          moreLink="/content/videos?featured=true"
        >
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </ContentSlider>
      )}

      {/* Featured Guides Scroller */}
      {hasGuides && (
        <ContentSlider
          title="Featured Guides"
          moreLink="/content/guides?featured=true"
        >
          {guides.map((guide) => (
            <GuideCard key={guide.id} guide={guide} />
          ))}
        </ContentSlider>
      )}
    </div>
  );
}

export default ContentCampaignSection;
