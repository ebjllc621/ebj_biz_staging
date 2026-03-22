/**
 * InternetPersonalityDetailClient - Client Component for Internet Personality Detail Page
 *
 * @component Client Component
 * @tier ADVANCED
 * @phase Tier 3 Creator Profiles - Phase 3A
 * @governance Build Map v2.1 ENHANCED
 *
 * Client component for internet personality detail page.
 * Receives initial data from server component for optimal LCP.
 * Phase 3A: Core layout with placeholder content/sidebar sections (Phase 3B fills these).
 */
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { InternetPersonalityDetailHero } from '@features/content/components/internet-personalities/InternetPersonalityDetailHero';
import { InternetPersonalityDetailContent } from '@features/content/components/internet-personalities/InternetPersonalityDetailContent';
import { InternetPersonalityDetailSidebar } from '@features/content/components/internet-personalities/InternetPersonalityDetailSidebar';
import { ProfileContactModal } from '@features/content/components/ProfileContactModal';
import { ProfileReviewModal } from '@features/content/components/ProfileReviewModal';
import { ContentShareModal } from '@features/content/components/shared/ContentShareModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import type { InternetPersonalityProfile } from '@core/types/internet-personality';

interface InternetPersonalityDetailClientProps {
  slug: string;
  initialPersonality: InternetPersonalityProfile | null;
  connectedPlatforms?: string[]; // Phase 9B — verified platform names for badges
}

/**
 * InternetPersonalityDetailClientInternal - inner component
 */
function InternetPersonalityDetailClientInternal({
  slug,
  initialPersonality,
  connectedPlatforms,
}: InternetPersonalityDetailClientProps) {
  const router = useRouter();
  const [personality] = useState<InternetPersonalityProfile | null>(initialPersonality);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [reviewRefreshKey, setReviewRefreshKey] = useState(0);

  const handleCollaborateClick = useCallback(() => {
    setIsContactOpen(true);
  }, []);

  const handleShareClick = useCallback(() => {
    setIsShareOpen(true);
  }, []);

  const handleRecommendSuccess = useCallback(() => {
    // Could show a toast notification
  }, []);

  // Not-found state
  if (!personality) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Profile Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            The content creator profile you are looking for does not exist or may have been removed.
          </p>
          <a
            href="/internet-personalities"
            className="inline-block px-6 py-3 bg-biz-orange text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
          >
            Browse Content Creators
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Button */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-biz-navy transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        </div>
      </div>

      {/* Page Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero — full width */}
        <InternetPersonalityDetailHero
          personality={personality}
          connectedPlatforms={connectedPlatforms}
          onCollaborateClick={handleCollaborateClick}
          onShareClick={handleShareClick}
          onRecommendSuccess={handleRecommendSuccess}
        />

        {/* Responsive Grid: Main Content + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Main Content — col-span-2 */}
          <div className="lg:col-span-2">
            <InternetPersonalityDetailContent
              personality={personality}
              onWriteReview={() => setIsReviewOpen(true)}
              refreshKey={reviewRefreshKey}
            />
          </div>

          {/* Sidebar — col-span-1 */}
          <div>
            <InternetPersonalityDetailSidebar
              personality={personality}
              onCollaborateClick={handleCollaborateClick}
            />
          </div>
        </div>
      </div>

      {/* Collaboration/Contact Modal (Phase 5) */}
      <ProfileContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
        profileType="internet_personality"
        profileSlug={slug}
        profileName={personality.display_name}
      />

      {/* Share Modal */}
      <ContentShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        contentType="article"
        contentTitle={personality.display_name}
        contentSlug={personality.slug || slug}
        contentImage={personality.profile_image ?? null}
        contentExcerpt={personality.headline ?? null}
        listingName={null}
      />

      {/* Review Modal (Phase 6) */}
      <ProfileReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        profileType="internet_personality"
        profileId={personality.id}
        profileName={personality.display_name}
        onReviewSubmitted={() => setReviewRefreshKey(k => k + 1)}
      />
    </div>
  );
}

/**
 * InternetPersonalityDetailClient with ErrorBoundary wrapper
 * @tier ADVANCED - Requires ErrorBoundary per Build Map v2.1
 */
export function InternetPersonalityDetailClient(props: InternetPersonalityDetailClientProps) {
  // props passed through to internal component (includes connectedPlatforms)
  return (
    <ErrorBoundary
      componentName="InternetPersonalityDetailClient"
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-red-800 mb-4">
              Something went wrong
            </h2>
            <p className="text-red-700 mb-6">
              We encountered an error loading this profile. Please try again.
            </p>
            <a
              href="/internet-personalities"
              className="inline-block px-6 py-3 bg-biz-navy text-white rounded-md hover:bg-biz-navy/90 transition-colors"
            >
              Browse Content Creators
            </a>
          </div>
        </div>
      }
    >
      <InternetPersonalityDetailClientInternal {...props} />
    </ErrorBoundary>
  );
}
