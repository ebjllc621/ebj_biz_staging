/**
 * DirectoryBreadcrumb - Clickable path breadcrumb navigation for media browser
 *
 * Renders a horizontal breadcrumb trail showing the current directory path.
 * Each segment (except the current one) is clickable to navigate up.
 *
 * @tier STANDARD
 * @phase Phase 4A - Admin Media Manager Core
 */

'use client';

import React, { memo } from 'react';
import { Home, ChevronRight, Folder } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface BreadcrumbItem {
  label: string;
  path: string;
}

export interface DirectoryBreadcrumbProps {
  breadcrumbs: BreadcrumbItem[];
  onNavigate: (_path: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * DirectoryBreadcrumb - Displays the current directory path as clickable segments.
 *
 * "Media Root > listings > 123 > gallery"
 * - All segments except the last are clickable links
 * - Home icon for the root segment
 * - ChevronRight separators between segments
 */
export const DirectoryBreadcrumb = memo(function DirectoryBreadcrumb({
  breadcrumbs,
  onNavigate,
}: DirectoryBreadcrumbProps) {
  if (!breadcrumbs.length) return null;

  return (
    <nav
      aria-label="Directory navigation"
      className="flex items-center gap-1 flex-wrap text-sm min-w-0"
    >
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        const isRoot = index === 0;

        return (
          <React.Fragment key={crumb.path}>
            {index > 0 && (
              <ChevronRight
                className="w-3.5 h-3.5 text-gray-400 flex-shrink-0"
                aria-hidden="true"
              />
            )}

            {isLast ? (
              // Current directory - not clickable, truncated
              <span
                className="flex items-center gap-1 text-gray-800 font-medium truncate max-w-[160px]"
                aria-current="page"
                title={crumb.label}
              >
                {isRoot ? (
                  <Home className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                ) : (
                  <Folder className="w-3.5 h-3.5 flex-shrink-0 text-blue-500" aria-hidden="true" />
                )}
                <span className="truncate">{crumb.label}</span>
              </span>
            ) : (
              // Ancestor directory - clickable
              <button
                type="button"
                onClick={() => onNavigate(crumb.path)}
                className="flex items-center gap-1 text-gray-500 hover:text-orange-600 transition-colors truncate max-w-[120px]"
                title={crumb.label}
              >
                {isRoot ? (
                  <Home className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                ) : (
                  <Folder className="w-3.5 h-3.5 flex-shrink-0 text-blue-400" aria-hidden="true" />
                )}
                <span className="truncate">{crumb.label}</span>
              </button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
});

export default DirectoryBreadcrumb;
