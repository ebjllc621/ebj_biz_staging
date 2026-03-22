/**
 * GalleryCarousel - Carousel layout renderer
 *
 * Uses embla-carousel-react for touch/swipe support.
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 8A - Gallery Display Standardization
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import { useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Play, Film } from 'lucide-react';
import type { LayoutRendererProps, GalleryItem } from '../types/gallery-types';

interface CarouselProps extends LayoutRendererProps {
  autoplay?: boolean;
  autoplayInterval?: number;
}

export function GalleryCarousel({
  items,
  onItemClick,
  showFeaturedBadge,
  entityName,
  autoplay = false,
  autoplayInterval = 4000
}: CarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  // Autoplay support
  useEffect(() => {
    if (!autoplay || !emblaApi) return;
    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, autoplayInterval);
    return () => clearInterval(interval);
  }, [autoplay, autoplayInterval, emblaApi]);

  return (
    <div className="relative overflow-hidden rounded-lg">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {items.map((item: GalleryItem, index: number) => (
            <div
              key={item.id}
              className="relative flex-none w-full aspect-video min-w-0"
            >
              <button
                onClick={() => onItemClick(index)}
                className="relative w-full h-full group focus:outline-none focus:ring-2 focus:ring-biz-orange focus:ring-inset"
                aria-label={`View ${item.alt || `${entityName ?? 'item'} ${index + 1}`}`}
              >
                {item.url ? (
                  <Image
                    src={item.url}
                    alt={item.alt}
                    fill
                    className="object-cover"
                    sizes="100vw"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                    <Film className="w-12 h-12 text-gray-600" />
                  </div>
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-medium bg-black/40 px-3 py-1 rounded-full">
                    View
                  </span>
                </div>

                {/* Video play overlay */}
                {item.type === 'video' && (
                  <>
                    {/* Play button overlay */}
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
                      <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                        <Play className="w-6 h-6 text-biz-orange ml-1" />
                      </div>
                    </div>
                    {/* Provider badge */}
                    {item.videoProvider && item.videoProvider !== 'unknown' && (
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 rounded text-xs text-white capitalize pointer-events-none">
                        {item.videoProvider}
                      </div>
                    )}
                  </>
                )}

                {/* Primary Badge */}
                {showFeaturedBadge && index === 0 && (
                  <div className="absolute top-2 left-2 bg-biz-orange text-white px-2 py-1 rounded text-xs font-medium">
                    Primary
                  </div>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Previous Button */}
      {items.length > 1 && (
        <button
          onClick={scrollPrev}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Next Button */}
      {items.length > 1 && (
        <button
          onClick={scrollNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Next slide"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Dot Navigation */}
      {items.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => emblaApi?.scrollTo(index)}
              className="w-2 h-2 rounded-full bg-white/60 hover:bg-white transition-colors focus:outline-none"
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default GalleryCarousel;
