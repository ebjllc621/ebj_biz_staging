/**
 * MobileTabNavigation - Sticky Section Navigation (Mobile Only)
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 8 - Mobile Optimization
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Sticky positioning below hero (< 1024px)
 * - Horizontal scroll tabs
 * - Smooth scroll to sections
 * - Auto-highlight active section (IntersectionObserver)
 * - Touch-friendly swipe navigation
 * - Hidden on desktop (>= 1024px)
 *
 * Sections:
 * - Overview, Location, Gallery, Reviews, Offers, Events, Related
 *
 * @see docs/pages/layouts/listings/details/phases/PHASE_8_BRAIN_PLAN.md
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Home, MapPinned, Image as ImageIcon, Star, Tag, Calendar, TrendingUp } from 'lucide-react';

interface TabSection {
  id: string;
  label: string;
  icon: React.ElementType;
}

const SECTIONS: TabSection[] = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'location', label: 'Location', icon: MapPinned },
  { id: 'gallery', label: 'Gallery', icon: ImageIcon },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'offers', label: 'Offers', icon: Tag },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'related', label: 'Similar', icon: TrendingUp },
];

export function MobileTabNavigation() {
  const [activeSection, setActiveSection] = useState('overview');
  const [isSticky, setIsSticky] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  /**
   * Scroll to section
   */
  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      // Offset by sticky nav height + some padding
      const offset = 120;
      const top = element.getBoundingClientRect().top + window.scrollY - offset;

      window.scrollTo({
        top,
        behavior: 'smooth'
      });

      setActiveSection(sectionId);

      // Haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    }
  }, []);

  /**
   * Detect active section with IntersectionObserver
   */
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -70% 0px', // Trigger when section is ~20% from top
      threshold: 0
    };

    const observerCallback: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.id;
          if (SECTIONS.some(s => s.id === sectionId)) {
            setActiveSection(sectionId);
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe all section elements
    SECTIONS.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  /**
   * Detect if tabs should be sticky
   */
  useEffect(() => {
    const handleScroll = () => {
      // Make sticky after hero section (approx 300px)
      setIsSticky(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /**
   * Auto-scroll active tab into view
   */
  useEffect(() => {
    if (tabsRef.current) {
      const activeTab = tabsRef.current.querySelector(`[data-section="${activeSection}"]`);
      if (activeTab) {
        activeTab.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [activeSection]);

  return (
    <nav
      className={`
        lg:hidden
        ${isSticky ? 'sticky top-0 z-30 shadow-md' : 'relative'}
        bg-white border-b border-gray-200 transition-shadow
      `}
      aria-label="Section navigation"
    >
      <div
        ref={tabsRef}
        className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {SECTIONS.map(({ id, label, icon: Icon }) => {
          const isActive = activeSection === id;

          return (
            <button
              key={id}
              data-section={id}
              onClick={() => scrollToSection(id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap
                transition-all active:scale-95 min-w-[44px]
                ${isActive
                  ? 'bg-biz-orange text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
              aria-label={`Jump to ${label} section`}
              aria-current={isActive ? 'true' : 'false'}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default MobileTabNavigation;
