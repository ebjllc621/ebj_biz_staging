/**
 * Admin Gallery Showcase - Visual Gallery Display Options Demo
 *
 * GOVERNANCE COMPLIANCE:
 * - Component tier: STANDARD
 * - Client Component: 'use client'
 * - credentials: 'include' on all fetch
 * - Admin authentication required
 * - NO direct database access
 *
 * Features:
 * - Visual demonstrations of all gallery layout types
 * - Popularity and usage statistics
 * - Implementation recommendations
 * - Interactive previews
 *
 * @tier STANDARD
 * @phase EPCT Exploration - Gallery Formats
 * @generated EPCT Workflow
 * @dna-version 11.4.0
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useAuth } from '@core/hooks/useAuth';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import {
  Grid3X3,
  LayoutGrid,
  GalleryVertical,
  Film,
  Maximize2,
  Play,
  Layers,
  Image as ImageIcon,
  Video,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  Star,
  Clock,
  TrendingUp,
  Loader2,
  ShieldAlert,
} from 'lucide-react';

// ============================================================================
// DEMO DATA - Placeholder images with varying aspect ratios
// ============================================================================

const DEMO_IMAGES = [
  { id: 1, url: 'https://picsum.photos/seed/g1/800/600', width: 800, height: 600, title: 'Mountain Vista' },
  { id: 2, url: 'https://picsum.photos/seed/g2/600/800', width: 600, height: 800, title: 'City Tower' },
  { id: 3, url: 'https://picsum.photos/seed/g3/800/800', width: 800, height: 800, title: 'Square Art' },
  { id: 4, url: 'https://picsum.photos/seed/g4/1200/600', width: 1200, height: 600, title: 'Panoramic Beach' },
  { id: 5, url: 'https://picsum.photos/seed/g5/700/500', width: 700, height: 500, title: 'Forest Path' },
  { id: 6, url: 'https://picsum.photos/seed/g6/500/700', width: 500, height: 700, title: 'Portrait Shot' },
  { id: 7, url: 'https://picsum.photos/seed/g7/900/600', width: 900, height: 600, title: 'Lake Sunset' },
  { id: 8, url: 'https://picsum.photos/seed/g8/600/600', width: 600, height: 600, title: 'Product Photo' },
  { id: 9, url: 'https://picsum.photos/seed/g9/800/500', width: 800, height: 500, title: 'Urban Scene' },
  { id: 10, url: 'https://picsum.photos/seed/g10/500/800', width: 500, height: 800, title: 'Architecture' },
  { id: 11, url: 'https://picsum.photos/seed/g11/700/700', width: 700, height: 700, title: 'Food Photo' },
  { id: 12, url: 'https://picsum.photos/seed/g12/1000/600', width: 1000, height: 600, title: 'Wide Landscape' },
];

const DEMO_VIDEOS = [
  { id: 'v1', thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg', title: 'Product Demo', platform: 'youtube', duration: '3:42' },
  { id: 'v2', thumbnail: 'https://picsum.photos/seed/v2/640/360', title: 'Behind the Scenes', platform: 'vimeo', duration: '5:18' },
  { id: 'v3', thumbnail: 'https://picsum.photos/seed/v3/640/360', title: 'Customer Story', platform: 'youtube', duration: '2:54' },
  { id: 'v4', thumbnail: 'https://picsum.photos/seed/v4/640/360', title: 'Tutorial Guide', platform: 'direct', duration: '8:22' },
];

// ============================================================================
// GALLERY TYPE METADATA
// ============================================================================

interface GalleryTypeInfo {
  id: string;
  name: string;
  description: string;
  bestFor: string;
  popularity: 'Very High' | 'High' | 'Medium' | 'Low';
  yearIntroduced: number;
  icon: React.ElementType;
}

const GALLERY_TYPES: GalleryTypeInfo[] = [
  {
    id: 'grid',
    name: 'Standard Grid',
    description: 'Equal-sized thumbnails in a uniform grid pattern',
    bestFor: 'Products, profile photos, uniform content',
    popularity: 'Very High',
    yearIntroduced: 2010,
    icon: Grid3X3,
  },
  {
    id: 'masonry',
    name: 'Masonry (Pinterest)',
    description: 'Items with varying heights that fill space efficiently',
    bestFor: 'Mixed aspect ratios, portfolios, artistic content',
    popularity: 'High',
    yearIntroduced: 2012,
    icon: LayoutGrid,
  },
  {
    id: 'justified',
    name: 'Justified (Flickr)',
    description: 'Rows with equal height but varying widths, edge-to-edge',
    bestFor: 'Photography portfolios, professional galleries',
    popularity: 'High',
    yearIntroduced: 2013,
    icon: GalleryVertical,
  },
  {
    id: 'carousel',
    name: 'Carousel/Slider',
    description: 'One or more items visible with horizontal navigation',
    bestFor: 'Featured content, hero sections, limited space',
    popularity: 'Very High',
    yearIntroduced: 2008,
    icon: Film,
  },
  {
    id: 'lightbox',
    name: 'Lightbox Gallery',
    description: 'Fullscreen overlay viewer with navigation controls',
    bestFor: 'Detailed viewing, any gallery as secondary view',
    popularity: 'Very High',
    yearIntroduced: 2007,
    icon: Maximize2,
  },
  {
    id: 'thumbnail',
    name: 'Thumbnail Navigation',
    description: 'Main display with scrollable thumbnails for navigation',
    bestFor: 'Product images, real estate, detailed showcases',
    popularity: 'High',
    yearIntroduced: 2011,
    icon: Layers,
  },
  {
    id: 'collage',
    name: 'Collage/Mosaic',
    description: 'Artistic arrangement with varying sizes and positions',
    bestFor: 'Marketing pages, featured content, artistic displays',
    popularity: 'Medium',
    yearIntroduced: 2015,
    icon: Sparkles,
  },
  {
    id: 'video',
    name: 'Video Gallery',
    description: 'Grid of video thumbnails with play overlays',
    bestFor: 'Video content, tutorials, media-heavy pages',
    popularity: 'High',
    yearIntroduced: 2010,
    icon: Video,
  },
  {
    id: 'mixed',
    name: 'Mixed Media',
    description: 'Combined images and videos in unified display',
    bestFor: 'Rich content, social media style, comprehensive showcase',
    popularity: 'Medium',
    yearIntroduced: 2018,
    icon: ImageIcon,
  },
];

// ============================================================================
// GALLERY DEMO COMPONENTS
// ============================================================================

function GridGallery() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {DEMO_IMAGES.slice(0, 8).map((img) => (
        <div
          key={img.id}
          className="aspect-square bg-gray-200 rounded-lg overflow-hidden relative group cursor-pointer"
        >
          <img
            src={img.url}
            alt={img.title}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              View
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function MasonryGallery() {
  return (
    <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
      {DEMO_IMAGES.map((img) => (
        <div
          key={img.id}
          className="break-inside-avoid bg-gray-200 rounded-lg overflow-hidden group cursor-pointer mb-3"
          style={{ aspectRatio: `${img.width}/${img.height}` }}
        >
          <img
            src={img.url}
            alt={img.title}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        </div>
      ))}
    </div>
  );
}

function JustifiedGallery() {
  const imgs = DEMO_IMAGES;
  return (
    <div className="space-y-2">
      <div className="flex gap-2 h-48">
        <div className="flex-[2] bg-gray-200 rounded-lg overflow-hidden">
          <img src={imgs[0]?.url ?? ''} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="flex-[1.5] bg-gray-200 rounded-lg overflow-hidden">
          <img src={imgs[1]?.url ?? ''} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="flex-[1] bg-gray-200 rounded-lg overflow-hidden">
          <img src={imgs[2]?.url ?? ''} alt="" className="w-full h-full object-cover" />
        </div>
      </div>
      <div className="flex gap-2 h-40">
        <div className="flex-[1] bg-gray-200 rounded-lg overflow-hidden">
          <img src={imgs[3]?.url ?? ''} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="flex-[2] bg-gray-200 rounded-lg overflow-hidden">
          <img src={imgs[4]?.url ?? ''} alt="" className="w-full h-full object-cover" />
        </div>
      </div>
      <div className="flex gap-2 h-36">
        <div className="flex-[1] bg-gray-200 rounded-lg overflow-hidden">
          <img src={imgs[5]?.url ?? ''} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="flex-[1.2] bg-gray-200 rounded-lg overflow-hidden">
          <img src={imgs[6]?.url ?? ''} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="flex-[1] bg-gray-200 rounded-lg overflow-hidden">
          <img src={imgs[7]?.url ?? ''} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="flex-[1.3] bg-gray-200 rounded-lg overflow-hidden">
          <img src={imgs[8]?.url ?? ''} alt="" className="w-full h-full object-cover" />
        </div>
      </div>
    </div>
  );
}

function CarouselGallery() {
  const [current, setCurrent] = useState(0);
  const images = DEMO_IMAGES.slice(0, 5);
  const currentImage = images[current];

  return (
    <div className="relative">
      <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
        <img
          src={currentImage?.url ?? ''}
          alt={currentImage?.title ?? ''}
          className="w-full h-full object-cover"
        />
        <button
          onClick={() => setCurrent(current === 0 ? images.length - 1 : current - 1)}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={() => setCurrent(current === images.length - 1 ? 0 : current + 1)}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-colors"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
          <p className="text-white font-medium">{currentImage?.title ?? ''}</p>
        </div>
      </div>
      <div className="flex justify-center gap-2 mt-4">
        {images.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              idx === current ? 'bg-biz-orange' : 'bg-gray-300 hover:bg-gray-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function LightboxDemo() {
  const [isOpen, setIsOpen] = useState(false);
  const [current, setCurrent] = useState(0);
  const lightboxImages = DEMO_IMAGES.slice(0, 6);
  const currentImage = lightboxImages[current];

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {lightboxImages.map((img, idx) => (
          <button
            key={img.id}
            onClick={() => { setCurrent(idx); setIsOpen(true); }}
            className="aspect-square bg-gray-200 rounded-lg overflow-hidden relative group"
          >
            <img src={img.url} alt={img.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        ))}
      </div>

      {isOpen && currentImage && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 p-2 text-white hover:text-gray-300 z-10"
          >
            <X className="w-8 h-8" />
          </button>
          <button
            onClick={() => setCurrent(current === 0 ? 5 : current - 1)}
            className="absolute left-4 p-2 text-white hover:text-gray-300"
          >
            <ChevronLeft className="w-10 h-10" />
          </button>
          <img
            src={currentImage.url}
            alt={currentImage.title}
            className="max-w-full max-h-[80vh] object-contain"
          />
          <button
            onClick={() => setCurrent(current === 5 ? 0 : current + 1)}
            className="absolute right-4 p-2 text-white hover:text-gray-300"
          >
            <ChevronRight className="w-10 h-10" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white">
            {current + 1} of 6
          </div>
        </div>
      )}
    </>
  );
}

function ThumbnailNavGallery() {
  const [selected, setSelected] = useState(0);
  const images = DEMO_IMAGES.slice(0, 8);
  const selectedImage = images[selected];

  return (
    <div className="space-y-3">
      <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
        <img
          src={selectedImage?.url ?? ''}
          alt={selectedImage?.title ?? ''}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {images.map((img, idx) => (
          <button
            key={img.id}
            onClick={() => setSelected(idx)}
            className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
              idx === selected ? 'border-biz-orange' : 'border-transparent hover:border-gray-300'
            }`}
          >
            <img src={img.url} alt={img.title} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

function CollageGallery() {
  const imgs = DEMO_IMAGES;
  return (
    <div className="grid grid-cols-4 grid-rows-3 gap-2 h-[400px]">
      <div className="col-span-2 row-span-2 bg-gray-200 rounded-lg overflow-hidden relative">
        <img src={imgs[0]?.url ?? ''} alt="" className="w-full h-full object-cover" />
        <div className="absolute top-2 left-2 bg-biz-orange text-white px-2 py-1 rounded text-xs font-medium">
          Featured
        </div>
      </div>
      <div className="bg-gray-200 rounded-lg overflow-hidden">
        <img src={imgs[1]?.url ?? ''} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="bg-gray-200 rounded-lg overflow-hidden">
        <img src={imgs[2]?.url ?? ''} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="bg-gray-200 rounded-lg overflow-hidden">
        <img src={imgs[3]?.url ?? ''} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="bg-gray-200 rounded-lg overflow-hidden">
        <img src={imgs[4]?.url ?? ''} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="col-span-2 bg-gray-200 rounded-lg overflow-hidden">
        <img src={imgs[5]?.url ?? ''} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="bg-gray-200 rounded-lg overflow-hidden relative">
        <img src={imgs[6]?.url ?? ''} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <span className="text-white text-xl font-bold">+12</span>
        </div>
      </div>
      <div className="bg-gray-200 rounded-lg overflow-hidden">
        <img src={imgs[7]?.url ?? ''} alt="" className="w-full h-full object-cover" />
      </div>
    </div>
  );
}

function VideoGallery() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {DEMO_VIDEOS.map((video) => (
        <div
          key={video.id}
          className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative group cursor-pointer"
        >
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Play className="w-6 h-6 text-biz-orange ml-1" />
            </div>
          </div>
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
            {video.duration}
          </div>
          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded capitalize">
            {video.platform}
          </div>
        </div>
      ))}
    </div>
  );
}

function MixedMediaGallery() {
  const mixedItems = [
    ...DEMO_IMAGES.slice(0, 4).map(img => ({ ...img, type: 'image' as const })),
    ...DEMO_VIDEOS.slice(0, 2).map(vid => ({ ...vid, type: 'video' as const })),
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {mixedItems.map((item, idx) => (
        <div
          key={`mixed-${idx}`}
          className="aspect-square bg-gray-200 rounded-lg overflow-hidden relative group cursor-pointer"
        >
          <img
            src={item.type === 'image' ? (item as typeof DEMO_IMAGES[0]).url : (item as typeof DEMO_VIDEOS[0]).thumbnail}
            alt={item.title}
            className="w-full h-full object-cover"
          />
          {item.type === 'video' && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                <Play className="w-5 h-5 text-biz-orange ml-0.5" />
              </div>
            </div>
          )}
          <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
            {item.type === 'image' ? (
              <>
                <ImageIcon className="w-3 h-3" />
                Photo
              </>
            ) : (
              <>
                <Video className="w-3 h-3" />
                Video
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// INFO CARD COMPONENT
// ============================================================================

function GalleryInfoCard({ info }: { info: GalleryTypeInfo }) {
  const Icon = info.icon;
  const yearsInService = 2026 - info.yearIntroduced;

  const popularityColor = {
    'Very High': 'bg-green-100 text-green-800',
    'High': 'bg-blue-100 text-blue-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'Low': 'bg-gray-100 text-gray-800',
  }[info.popularity];

  return (
    <div className="bg-gray-50 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-biz-navy/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-biz-navy" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-biz-navy">{info.name}</h3>
          <p className="text-sm text-gray-600 mt-1">{info.description}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${popularityColor}`}>
              <TrendingUp className="w-3 h-3" />
              {info.popularity}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              <Clock className="w-3 h-3" />
              {yearsInService} years
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
            <Star className="w-3 h-3" />
            Best for: {info.bestFor}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE CONTENT
// ============================================================================

function GalleryShowcaseContent() {
  const { user, loading } = useAuth();
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const galleryComponents: Record<string, React.ReactNode> = {
    grid: <GridGallery />,
    masonry: <MasonryGallery />,
    justified: <JustifiedGallery />,
    carousel: <CarouselGallery />,
    lightbox: <LightboxDemo />,
    thumbnail: <ThumbnailNavGallery />,
    collage: <CollageGallery />,
    video: <VideoGallery />,
    mixed: <MixedMediaGallery />,
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-biz-orange" />
      </div>
    );
  }

  // Auth check
  if (!user || user.account_type !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">You must be an admin to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Quick Navigation */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Jump to Gallery Type
        </h2>
        <div className="flex flex-wrap gap-2">
          {GALLERY_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => {
                  setSelectedType(type.id);
                  document.getElementById(`gallery-${type.id}`)?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedType === type.id
                    ? 'bg-biz-orange text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {type.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Gallery Demos */}
      <div className="space-y-12">
        {GALLERY_TYPES.map((type) => (
          <section
            key={type.id}
            id={`gallery-${type.id}`}
            className="bg-white rounded-xl shadow-sm overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100">
              <GalleryInfoCard info={type} />
            </div>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-biz-orange" />
                Live Preview
              </h3>
              {galleryComponents[type.id]}
            </div>
          </section>
        ))}
      </div>

      {/* Summary Section */}
      <section className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-biz-navy mb-4">Summary & Recommendations</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="border border-green-200 rounded-lg p-4 bg-green-50">
            <h3 className="font-semibold text-green-800 mb-2">Currently Implemented</h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>Standard Grid Gallery</li>
              <li>Lightbox with Navigation</li>
              <li>Video Gallery (YouTube, Vimeo)</li>
            </ul>
          </div>
          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
            <h3 className="font-semibold text-blue-800 mb-2">Recommended Additions</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>Masonry Layout Option</li>
              <li>Carousel for Featured Images</li>
              <li>Thumbnail Navigation</li>
            </ul>
          </div>
          <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
            <h3 className="font-semibold text-purple-800 mb-2">Premium Features</h3>
            <ul className="text-sm text-purple-700 space-y-1">
              <li>Justified Gallery</li>
              <li>Collage/Mosaic Templates</li>
              <li>Mixed Media Gallery</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Documentation Link */}
      <div className="p-4 bg-biz-navy/5 rounded-lg border border-biz-navy/10">
        <p className="text-sm text-gray-600">
          <strong>Full Documentation:</strong>{' '}
          <code className="bg-white px-2 py-1 rounded text-xs">
            docs/media/galleryformat/GALLERY_OPTIONS_REPORT.md
          </code>
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// EXPORTED PAGE COMPONENT
// ============================================================================

export default function GalleryShowcasePage() {
  return (
    <ErrorBoundary componentName="GalleryShowcasePage">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-biz-navy">Gallery Display Options</h1>
          <p className="text-gray-600 mt-1">
            Visual demonstration of available gallery layout formats for user listings
          </p>
        </div>
        <GalleryShowcaseContent />
      </div>
    </ErrorBoundary>
  );
}
