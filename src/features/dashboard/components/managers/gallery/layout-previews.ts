/**
 * Gallery Layout Previews - Configuration for layout selector UI
 *
 * @module @features/dashboard/components/managers/gallery
 * @tier SIMPLE
 * @phase Phase 8B - Gallery Layout Selector + Mixed Media Unification
 * @governance Build Map v2.1 ENHANCED
 */

import type { GalleryLayout } from '@features/media/gallery';

export interface LayoutPreview {
  key: GalleryLayout;
  label: string;
  description: string;
  /** CSS class string describing the miniature preview container layout */
  previewClassName: string;
  /** Array of block descriptors for the miniature layout shape */
  previewBlocks: PreviewBlock[];
}

export interface PreviewBlock {
  className: string;
}

export const LAYOUT_PREVIEWS: LayoutPreview[] = [
  {
    key: 'grid',
    label: 'Grid',
    description: 'Uniform tiles in a responsive grid',
    previewClassName: 'grid grid-cols-3 gap-0.5',
    previewBlocks: [
      { className: 'aspect-square bg-gray-300 rounded-sm' },
      { className: 'aspect-square bg-gray-400 rounded-sm' },
      { className: 'aspect-square bg-gray-300 rounded-sm' },
      { className: 'aspect-square bg-gray-400 rounded-sm' },
      { className: 'aspect-square bg-gray-300 rounded-sm' },
      { className: 'aspect-square bg-gray-400 rounded-sm' }
    ]
  },
  {
    key: 'masonry',
    label: 'Masonry',
    description: 'Variable-height Pinterest-style layout',
    previewClassName: 'flex gap-0.5',
    previewBlocks: [
      { className: 'flex-1 flex flex-col gap-0.5' },
      { className: 'flex-1 flex flex-col gap-0.5' },
      { className: 'flex-1 flex flex-col gap-0.5' }
    ]
  },
  {
    key: 'carousel',
    label: 'Carousel',
    description: 'Swipeable full-width slideshow',
    previewClassName: 'flex flex-col gap-0.5',
    previewBlocks: [
      { className: 'w-full aspect-video bg-gray-300 rounded-sm' },
      { className: 'flex gap-0.5 justify-center' }
    ]
  },
  {
    key: 'justified',
    label: 'Justified',
    description: 'Row-based layout filling full width',
    previewClassName: 'flex flex-col gap-0.5',
    previewBlocks: [
      { className: 'flex gap-0.5 h-4' },
      { className: 'flex gap-0.5 h-5' }
    ]
  }
];
