/**
 * useLCPImagePriority - Determines if an image should have priority loading
 *
 * LCP images should be eagerly loaded to improve Largest Contentful Paint.
 * First N images in grids should have priority.
 *
 * @tier SIMPLE
 * @governance Performance Standards - Image Priority Governance
 * @authority tests/pagePerformance/reports/PERFORMANCE_REMEDIATION_BRAIN_PLAN.md
 *
 * PERFORMANCE OPTIMIZATION:
 * - First 4 images in grid views receive priority loading
 * - First 3 images in list views receive priority loading
 * - Hero images always receive priority loading
 * - Improves LCP by eagerly loading above-the-fold images
 *
 * TARGET METRICS:
 * - LCP: <2.5s (from 2.7-3.0s)
 * - Performance Score: 85%+ (from 54-82%)
 */
'use client';

interface UseLCPImagePriorityOptions {
  /** Type of layout */
  layout: 'grid' | 'list' | 'hero';
  /** Index of the item in the list */
  index: number;
  /** Override: force priority regardless of index */
  forcePriority?: boolean;
}

interface UseLCPImagePriorityResult {
  /** Whether the image should have priority prop */
  priority: boolean;
  /** Whether the image should be eagerly loaded (no lazy) */
  loading: 'eager' | 'lazy';
}

const PRIORITY_LIMITS = {
  grid: 4,   // First 4 images in grid
  list: 3,   // First 3 images in list
  hero: 1,   // Always priority for hero
} as const;

export function useLCPImagePriority({
  layout,
  index,
  forcePriority = false,
}: UseLCPImagePriorityOptions): UseLCPImagePriorityResult {
  const limit = PRIORITY_LIMITS[layout];
  const shouldPrioritize = forcePriority || index < limit;

  return {
    priority: shouldPrioritize,
    loading: shouldPrioritize ? 'eager' : 'lazy',
  };
}
