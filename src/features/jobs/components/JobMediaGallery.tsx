/**
 * JobMediaGallery - Display job images on job detail page
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 8A - Gallery Display Standardization
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import { useState, useEffect } from 'react';
import { Images } from 'lucide-react';
import type { JobMedia } from '@features/jobs/types';
import { GalleryDisplay } from '@features/media/gallery';
import type { GalleryItem } from '@features/media/gallery';

interface JobMediaGalleryProps {
  jobId: number;
  className?: string;
}

export function JobMediaGallery({ jobId, className = '' }: JobMediaGalleryProps) {
  const [media, setMedia] = useState<JobMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadMedia = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/jobs/${jobId}/media`, {
          credentials: 'include'
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const mediaItems = data.data?.media || [];
        setMedia(mediaItems);
      } catch {
        // Silently fail - media is optional
      } finally {
        setIsLoading(false);
      }
    };

    loadMedia();
  }, [jobId]);

  // Don't render if loading
  if (isLoading) {
    return null;
  }

  if (media.length === 0) {
    return null;
  }

  const galleryItems: GalleryItem[] = media.map((item, idx) => ({
    id: String(item.id),
    type: item.media_type as 'image' | 'video',
    url: item.file_url,
    alt: item.alt_text || `Job media ${idx + 1}`,
    caption: item.alt_text || undefined,
    embedUrl: item.embed_url || undefined,
    videoProvider: (item.platform as GalleryItem['videoProvider']) || undefined,
  }));

  return (
    <section className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
      <h2 className="text-xl font-bold text-biz-navy mb-4 flex items-center gap-2">
        <Images className="w-5 h-5" />
        Media
      </h2>

      <GalleryDisplay
        items={galleryItems}
        layout="carousel"
        enableLightbox={true}
        showFeaturedBadge={false}
        entityName="Job"
      />
    </section>
  );
}

export default JobMediaGallery;
