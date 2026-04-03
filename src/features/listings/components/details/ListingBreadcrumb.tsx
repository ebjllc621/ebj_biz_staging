/**
 * ListingBreadcrumb - Breadcrumb navigation for listing detail pages
 *
 * @tier SIMPLE
 * @authority CLAUDE.md
 *
 * Provides structured breadcrumb navigation for listing details.
 * Outputs Schema.org BreadcrumbList JSON-LD for SEO/sitemapping.
 * Follows the same pattern as ContentBreadcrumb.
 *
 * @see src/features/content/components/shared/ContentBreadcrumb.tsx
 */

'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href: string;
}

export interface ListingBreadcrumbProps {
  /** Listing name (last breadcrumb segment) */
  title: string;
  /** Optional category name for middle segment */
  categoryName?: string | null;
  /** Optional category slug for middle segment link */
  categorySlug?: string | null;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Truncate title for display in breadcrumb
 */
function truncate(text: string, maxLen: number = 40): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen).trim() + '...';
}

export function ListingBreadcrumb({ title, categoryName, categorySlug, className = '' }: ListingBreadcrumbProps) {
  const items: BreadcrumbItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Listings', href: '/listings' },
  ];

  // Add category segment if available
  if (categoryName && categorySlug) {
    items.push({ label: categoryName, href: `/listings?category=${categorySlug}` });
  }

  // Schema.org BreadcrumbList structured data
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      ...items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.label,
        item: `https://bizconekt.com${item.href}`,
      })),
      {
        '@type': 'ListItem',
        position: items.length + 1,
        name: title,
      },
    ],
  };

  return (
    <>
      {/* JSON-LD for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <nav aria-label="Breadcrumb" className={`bg-white border-b border-gray-200 ${className}`}>
        <div className="container mx-auto px-4 py-3">
          <ol className="flex items-center flex-wrap gap-1 text-sm">
            {items.map((item, index) => (
              <li key={item.href} className="flex items-center">
                {index > 0 && (
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 mx-1 flex-shrink-0" />
                )}
                <Link
                  href={item.href as Route}
                  className="text-gray-500 hover:text-[#ed6437] transition-colors whitespace-nowrap flex items-center gap-1"
                >
                  {index === 0 && <Home className="w-3.5 h-3.5" />}
                  {item.label}
                </Link>
              </li>
            ))}
            {/* Current page (not a link) */}
            <li className="flex items-center">
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 mx-1 flex-shrink-0" />
              <span className="text-[#022641] font-medium truncate max-w-[200px] sm:max-w-[300px] md:max-w-[400px]">
                {truncate(title)}
              </span>
            </li>
          </ol>
        </div>
      </nav>
    </>
  );
}

export default ListingBreadcrumb;
