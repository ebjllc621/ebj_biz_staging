/**
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 1C - Video Detail Page
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Multi-provider video embed player. Handles YouTube, Vimeo, direct upload,
 * and generic embed video types using the video_type enum from content_videos table.
 * Uses click-to-load pattern for iframe providers to minimize initial page weight.
 */
'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Play } from 'lucide-react';

interface VideoPlayerProps {
  videoUrl: string;
  videoType: 'youtube' | 'vimeo' | 'upload' | 'embed';
  thumbnail: string | null;
  title: string;
  className?: string;
}

/**
 * Extract YouTube video ID from URL
 */
function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] ?? null;
}

/**
 * Extract Vimeo video ID from URL
 */
function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match?.[1] ?? null;
}

/**
 * VideoPlayer — multi-provider video embed with click-to-load pattern
 */
export function VideoPlayer({
  videoUrl,
  videoType,
  thumbnail,
  title,
  className = ''
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Compute embed URL and effective thumbnail based on video type
  const { embedUrl, effectiveThumbnail } = useMemo((): { embedUrl: string; effectiveThumbnail: string | null } => {
    if (videoType === 'youtube') {
      const videoId = getYouTubeId(videoUrl);
      if (videoId) {
        return {
          embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`,
          effectiveThumbnail: thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
        };
      }
      // Fallback: use video URL as-is if ID extraction fails
      return { embedUrl: videoUrl, effectiveThumbnail: thumbnail };
    }

    if (videoType === 'vimeo') {
      const videoId = getVimeoId(videoUrl);
      if (videoId) {
        return {
          embedUrl: `https://player.vimeo.com/video/${videoId}`,
          effectiveThumbnail: thumbnail // Vimeo requires API for auto-thumbnail
        };
      }
      return { embedUrl: videoUrl, effectiveThumbnail: thumbnail };
    }

    if (videoType === 'upload') {
      // HTML5 video — use URL directly, no embed needed
      return { embedUrl: videoUrl, effectiveThumbnail: thumbnail };
    }

    // embed type — use video URL as-is as iframe src
    return { embedUrl: videoUrl, effectiveThumbnail: thumbnail };
  }, [videoUrl, videoType, thumbnail]);

  // Direct upload: render HTML5 video element (no click-to-load)
  if (videoType === 'upload') {
    return (
      <div className={`relative aspect-video bg-gray-900 rounded-lg overflow-hidden ${className}`}>
        <video
          src={videoUrl}
          controls
          preload="metadata"
          poster={thumbnail || undefined}
          className="w-full h-full"
        >
          <p className="text-gray-500">Your browser does not support video playback.</p>
        </video>
      </div>
    );
  }

  // iframe-based providers (youtube, vimeo, embed)
  // If no thumbnail available: show iframe immediately without click-to-load
  if (!effectiveThumbnail) {
    return (
      <div className={`relative aspect-video bg-gray-900 rounded-lg overflow-hidden ${className}`}>
        {embedUrl && (
          <iframe
            src={embedUrl}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            className="absolute inset-0 w-full h-full"
          />
        )}
      </div>
    );
  }

  return (
    <div className={`relative aspect-video bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      {/* Thumbnail state — click to load iframe */}
      {!isPlaying && (
        <button
          onClick={() => setIsPlaying(true)}
          className="absolute inset-0 w-full h-full group focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-inset"
          aria-label="Play video"
        >
          <Image
            src={effectiveThumbnail}
            alt={`${title} thumbnail`}
            fill
            className="object-cover"
            unoptimized
          />
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Play className="w-8 h-8 md:w-10 md:h-10 text-purple-600 ml-1" />
            </div>
          </div>
        </button>
      )}

      {/* Playing state — iframe */}
      {isPlaying && embedUrl && (
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          className="absolute inset-0 w-full h-full"
        />
      )}
    </div>
  );
}

export default VideoPlayer;
