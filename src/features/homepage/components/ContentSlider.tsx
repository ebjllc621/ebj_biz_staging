/**
 * ContentSlider - Generic Horizontal Scroll Container
 *
 * @tier STANDARD
 * @generated DNA v11.0.1
 * @dna-version 11.0.1
 */
'use client';

import { useRef, useState, useCallback, useEffect, ReactNode, ElementType } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { Route } from 'next';

interface ContentSliderProps {
  /** Section title */
  title: string;
  /** Optional icon component displayed before the title */
  icon?: ElementType;
  /** "More" link URL */
  moreLink?: string;
  /** Custom text for the "More" link (defaults to "More") */
  moreLinkText?: string;
  /** Children elements to display in slider */
  children: ReactNode;
  /** Show navigation arrows */
  showArrows?: boolean;
  /** Additional CSS classes for container */
  className?: string;
  /** Gap between items (Tailwind class) */
  gap?: string;
}

/**
 * ContentSlider component
 * Provides horizontal scrolling container with navigation arrows
 */
export function ContentSlider({
  title,
  icon: Icon,
  moreLink,
  moreLinkText,
  children,
  showArrows = true,
  className = '',
  gap = 'gap-4'
}: ContentSliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;

    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 10
    );
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    checkScroll();
    container.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);

    return () => {
      container.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll]);

  const scroll = useCallback((direction: 'left' | 'right') => {
    const container = scrollRef.current;
    if (!container) return;

    const scrollAmount = container.clientWidth * 0.8;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  }, []);

  return (
    <section className={`relative ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-[#ed6437]" />}
          {title && <h2 className="text-lg font-semibold text-biz-navy">{title}</h2>}
        </div>
        {moreLink && (
          <Link
            href={moreLink as Route}
            className="text-biz-orange text-sm font-medium hover:underline"
          >
            {moreLinkText ?? 'More'}
          </Link>
        )}
      </div>

      {/* Slider Container - Uses named group/slider to avoid conflicts with card group-hover */}
      <div className="relative group/slider">
        {/* Left Arrow */}
        {showArrows && canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-opacity hover:bg-gray-50"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-6 w-6 text-gray-600" />
          </button>
        )}

        {/* Scrollable Content */}
        <div
          ref={scrollRef}
          className={`flex overflow-x-auto ${gap} scrollbar-hide scroll-smooth snap-x snap-mandatory`}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {children}
        </div>

        {/* Right Arrow */}
        {showArrows && canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-opacity hover:bg-gray-50"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-6 w-6 text-gray-600" />
          </button>
        )}
      </div>
    </section>
  );
}

export default ContentSlider;
