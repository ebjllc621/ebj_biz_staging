/**
 * NewListingModal - Section Accordion Wrapper
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @pattern Reusable accordion section with BizModalSectionHeader
 * @tier ENTERPRISE
 * @phase Phase 1 - Foundation
 *
 * FEATURES:
 * - Smooth expand/collapse animations
 * - Auto-scroll to section start on expansion
 * - Completion/error/required indicators
 */

'use client';

import { type ReactNode, useRef, useEffect, useState } from 'react';
import { BizModalSectionHeader } from '@/components/BizModal';

// ============================================================================
// TYPES
// ============================================================================

export interface SectionAccordionProps {
  /** Section number (1-7) */
  sectionNumber: number;
  /** Section title */
  title: string;
  /** Whether section is required */
  required: boolean;
  /** Whether section is expanded */
  isExpanded: boolean;
  /** Whether section has errors */
  hasError: boolean;
  /** Whether section is complete */
  isComplete: boolean;
  /** Section content */
  children: ReactNode;
  /** Toggle section callback */
  onToggle: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SectionAccordion({
  sectionNumber,
  title,
  required,
  isExpanded,
  hasError,
  isComplete,
  children,
  onToggle,
}: SectionAccordionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [hasBeenMounted, setHasBeenMounted] = useState(false);

  // Track initial mount to avoid scrolling Section 1 on page load
  useEffect(() => {
    setHasBeenMounted(true);
  }, []);

  // Scroll to show previous section header + current expanded section (after initial mount)
  useEffect(() => {
    if (isExpanded && hasBeenMounted && sectionRef.current) {
      // Delay to allow collapse/expand animations to complete
      const timer = setTimeout(() => {
        const scrollableParent = sectionRef.current?.closest('.overflow-y-auto') as HTMLElement | null;

        if (scrollableParent && sectionRef.current) {
          // For section 1: scroll to top
          // For other sections: scroll to show previous section header at top
          if (sectionNumber === 1) {
            scrollableParent.scrollTo({
              top: 0,
              behavior: 'smooth',
            });
          } else {
            // Find the previous sibling section
            const previousSection = sectionRef.current.previousElementSibling as HTMLElement | null;

            if (previousSection) {
              // Scroll to show previous section's header at top of modal
              // This naturally shows the current section below it
              scrollableParent.scrollTo({
                top: previousSection.offsetTop,
                behavior: 'smooth',
              });
            } else {
              // Fallback: scroll to top if no previous section found
              scrollableParent.scrollTo({
                top: 0,
                behavior: 'smooth',
              });
            }
          }
        }
      }, 150); // Slightly longer delay for animation completion
      return () => clearTimeout(timer);
    }
  }, [isExpanded, hasBeenMounted, sectionNumber]);

  return (
    <div ref={sectionRef} className="border-b border-gray-200 last:border-0 scroll-mt-4">
      {/* Section Header with completion indicator */}
      <div className="relative">
        <BizModalSectionHeader
          step={sectionNumber}
          title={title}
          onClick={onToggle}
          isExpanded={isExpanded}
          hasError={hasError}
        />

        {/* Completion Checkmark */}
        {isComplete && !hasError && (
          <div
            className="absolute right-12 top-1/2 -translate-y-1/2"
            aria-label="Section complete"
          >
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}

        {/* Required indicator */}
        {required && !isComplete && (
          <div
            className="absolute right-12 top-1/2 -translate-y-1/2"
            aria-label="Required section"
          >
            <span className="text-red-500 font-bold text-lg">*</span>
          </div>
        )}
      </div>

      {/* Section Content with smooth transition */}
      <div
        className={`
          transition-all duration-300 ease-in-out overflow-hidden
          ${isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}
        `}
        aria-hidden={!isExpanded}
        aria-expanded={isExpanded}
      >
        <div className="pb-6 px-2">
          {children}
        </div>
      </div>
    </div>
  );
}
