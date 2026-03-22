/**
 * Skeleton - Loading placeholder component
 *
 * @tier SIMPLE
 * @generated DNA v11.4.0 - Phase 7
 * @dna-version 11.4.0
 * @phase 7
 *
 * GOVERNANCE:
 * - Tailwind CSS only (no inline styles)
 * - Configurable variants (text, rect, circle, tree)
 * - Pulse animation for visual feedback
 * - Prevents Cumulative Layout Shift (CLS)
 *
 * Features:
 * - Multiple variants (text, rect, circle, tree)
 * - Configurable rows count
 * - Pulse animation
 * - Tree-specific skeleton for hierarchical data
 *
 * @example
 * ```tsx
 * <Skeleton rows={3} variant="text" />
 * <Skeleton variant="circle" className="w-12 h-12" />
 * <CategoryTreeSkeleton rows={10} />
 * ```
 */

'use client';

import React from 'react';

export interface SkeletonProps {
  /** Number of skeleton rows to render */
  rows?: number;
  /** Additional CSS classes */
  className?: string;
  /** Skeleton variant type */
  variant?: 'text' | 'rect' | 'circle' | 'tree';
}

/**
 * Skeleton - Generic loading placeholder
 *
 * Renders animated skeleton loaders to prevent layout shift during loading states.
 *
 * @param rows - Number of skeleton rows (default: 1)
 * @param className - Additional Tailwind classes
 * @param variant - Skeleton type: 'text' | 'rect' | 'circle' | 'tree'
 */
export function Skeleton({ rows = 1, className = '', variant = 'rect' }: SkeletonProps) {
  const variantClasses = {
    text: 'h-4 rounded',
    rect: 'h-12 rounded-md',
    circle: 'rounded-full',
    tree: 'h-16 rounded-md'
  };

  return (
    <div className={`animate-pulse ${className}`} role="status" aria-busy="true" aria-label="Loading...">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`bg-gray-200 ${variantClasses[variant]} ${i > 0 ? 'mt-2' : ''}`}
        />
      ))}
    </div>
  );
}

export interface CategoryTreeSkeletonProps {
  /** Number of tree rows to render */
  rows?: number;
  /** Maximum depth level for indentation */
  maxDepth?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * CategoryTreeSkeleton - Loading skeleton for category tree
 *
 * Renders a skeleton that mimics the category tree structure with varying indentation
 * to prevent layout shift when actual tree loads.
 *
 * @param rows - Number of skeleton tree nodes (default: 10)
 * @param maxDepth - Maximum indentation depth (default: 3)
 * @param className - Additional Tailwind classes
 *
 * @example
 * ```tsx
 * {isLoading ? (
 *   <CategoryTreeSkeleton rows={15} maxDepth={4} />
 * ) : (
 *   <CategoryTree categories={data} />
 * )}
 * ```
 */
export function CategoryTreeSkeleton({ rows = 10, maxDepth = 3, className = '' }: CategoryTreeSkeletonProps) {
  return (
    <div className={`space-y-1 ${className}`} role="status" aria-busy="true" aria-label="Loading categories...">
      {Array.from({ length: rows }).map((_, i) => {
        // Generate pseudo-random depth (0 to maxDepth) for visual hierarchy
        const depth = Math.floor(Math.random() * (maxDepth + 1));
        const indentPx = depth * 20; // 20px per level (matches CategoryTreeNode)

        return (
          <div
            key={i}
            className="border-l border-gray-200 animate-pulse"
            style={{ marginLeft: `${indentPx}px` }}
          >
            <div className="flex items-center gap-2 py-2 px-3">
              {/* Checkbox skeleton */}
              <div className="w-4 h-4 bg-gray-200 rounded" />

              {/* Expand/collapse button skeleton */}
              <div className="w-24 h-8 bg-gray-200 rounded" />

              {/* Category info skeleton */}
              <div className="flex-1 space-y-1">
                {/* Category name */}
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                {/* Path */}
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                {/* Keywords */}
                <div className="flex gap-1">
                  <div className="h-6 w-16 bg-gray-200 rounded-full" />
                  <div className="h-6 w-20 bg-gray-200 rounded-full" />
                  <div className="h-6 w-14 bg-gray-200 rounded-full" />
                </div>
              </div>

              {/* Action buttons skeleton */}
              <div className="flex gap-1">
                <div className="w-20 h-8 bg-gray-200 rounded" />
                <div className="w-16 h-8 bg-gray-200 rounded" />
                <div className="w-16 h-8 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * SkeletonText - Convenience component for text placeholders
 *
 * @example
 * ```tsx
 * <SkeletonText rows={3} />
 * ```
 */
export function SkeletonText({ rows = 1, className = '' }: Omit<SkeletonProps, 'variant'>) {
  return <Skeleton rows={rows} variant="text" className={className} />;
}

/**
 * SkeletonCircle - Convenience component for circular placeholders (avatars, icons)
 *
 * @example
 * ```tsx
 * <SkeletonCircle className="w-10 h-10" />
 * ```
 */
export function SkeletonCircle({ className = '' }: Omit<SkeletonProps, 'variant' | 'rows'>) {
  return <Skeleton variant="circle" className={className} />;
}

/**
 * SkeletonRect - Convenience component for rectangular placeholders
 *
 * @example
 * ```tsx
 * <SkeletonRect rows={5} />
 * ```
 */
export function SkeletonRect({ rows = 1, className = '' }: Omit<SkeletonProps, 'variant'>) {
  return <Skeleton rows={rows} variant="rect" className={className} />;
}
