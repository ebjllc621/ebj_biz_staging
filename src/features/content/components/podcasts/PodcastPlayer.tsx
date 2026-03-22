/**
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 1B - Podcast Detail Page
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

interface PodcastPlayerProps {
  audioUrl: string;
  title: string;
  className?: string;
}

export function PodcastPlayer({ audioUrl, title, className = '' }: PodcastPlayerProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 ${className}`}>
      <p className="text-xs font-medium uppercase text-teal-600 tracking-wide">Now Playing</p>
      <p className="text-sm font-medium text-biz-navy mt-1 truncate">{title}</p>
      <audio
        controls
        preload="metadata"
        className="w-full mt-3"
        aria-label={`Audio player for ${title}`}
      >
        <source src={audioUrl} type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>
    </div>
  );
}

export default PodcastPlayer;
