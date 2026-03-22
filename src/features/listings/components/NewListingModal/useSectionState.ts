/**
 * NewListingModal - Section Accordion State Management
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @pattern Section expand/collapse tracking
 * @tier ENTERPRISE
 * @phase Phase 1 - Foundation
 */

'use client';

import { useState, useCallback } from 'react';

// ============================================================================
// HOOK
// ============================================================================

export function useSectionState() {
  // Only one section open at a time, starts with section 1
  const [expandedSection, setExpandedSection] = useState<number>(1);
  const [sectionsWithErrors, setSectionsWithErrors] = useState<Set<number>>(new Set());
  const [completedSections, setCompletedSections] = useState<Set<number>>(new Set());

  const toggleSection = useCallback((sectionNumber: number) => {
    setExpandedSection(prev => prev === sectionNumber ? 0 : sectionNumber);
  }, []);

  const markSectionError = useCallback((sectionNumber: number, hasError: boolean) => {
    setSectionsWithErrors(prev => {
      const newSet = new Set(prev);
      if (hasError) {
        newSet.add(sectionNumber);
      } else {
        newSet.delete(sectionNumber);
      }
      return newSet;
    });
  }, []);

  const markSectionComplete = useCallback((sectionNumber: number, isComplete: boolean) => {
    setCompletedSections(prev => {
      const newSet = new Set(prev);
      if (isComplete) {
        newSet.add(sectionNumber);
      } else {
        newSet.delete(sectionNumber);
      }
      return newSet;
    });
  }, []);

  return {
    expandedSection,
    sectionsWithErrors,
    completedSections,
    toggleSection,
    markSectionError,
    markSectionComplete,
    isSectionExpanded: (n: number) => expandedSection === n,
    hasSectionError: (n: number) => sectionsWithErrors.has(n),
    isSectionComplete: (n: number) => completedSections.has(n)
  };
}
