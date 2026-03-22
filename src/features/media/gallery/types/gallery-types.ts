/**
 * Gallery Display Types
 *
 * @module @features/media/gallery/types
 * @phase Phase 8A - Gallery Display Standardization
 * @governance Build Map v2.1 ENHANCED
 */

export type GalleryLayout = 'grid' | 'masonry' | 'carousel' | 'justified';
export type VideoGalleryLayout = 'grid' | 'masonry' | 'carousel' | 'inline' | 'showcase';
export type GalleryItemType = 'image' | 'video';
export type VideoProvider = 'youtube' | 'vimeo' | 'tiktok' | 'dailymotion' | 'rumble' | 'direct' | 'unknown';

export interface GalleryItem {
  id: string;
  type: GalleryItemType;
  url: string;
  alt: string;
  caption?: string;
  embedUrl?: string;
  videoProvider?: VideoProvider;
  originalVideoUrl?: string;
  /** Image width in pixels — used by justified layout for aspect ratio calculation */
  width?: number;
  /** Image height in pixels — used by justified layout for aspect ratio calculation */
  height?: number;
}

export interface GalleryDisplayProps {
  items: GalleryItem[];
  layout?: GalleryLayout;
  enableLightbox?: boolean;
  showFeaturedBadge?: boolean;
  entityName?: string;
  className?: string;
  autoplay?: boolean;
  autoplayInterval?: number;
}

export interface LayoutRendererProps {
  items: GalleryItem[];
  onItemClick: (_index: number) => void;
  showFeaturedBadge?: boolean;
  entityName?: string;
}

export interface UnifiedMediaLightboxProps {
  items: GalleryItem[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (_index: number) => void;
  entityName: string;
}

export interface PhotoSwipeLightboxProps {
  items: GalleryItem[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (_index: number) => void;
  entityName: string;
}

export type MediaFilterType = 'all' | 'photos' | 'videos';

export interface MediaTypeFilterProps {
  activeFilter: MediaFilterType;
  onFilterChange: (_filter: MediaFilterType) => void;
  photosCount: number;
  videosCount: number;
}
