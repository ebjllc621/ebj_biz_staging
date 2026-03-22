/**
 * ContentBreadcrumb - Breadcrumb navigation for content detail pages
 *
 * @tier SIMPLE
 * @generated DNA v11.4.0
 * @authority CLAUDE.md
 *
 * Provides structured breadcrumb navigation for articles, videos, podcasts,
 * and guides. Outputs Schema.org BreadcrumbList JSON-LD for SEO/sitemapping.
 */

'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href: string;
}

export interface ContentBreadcrumbProps {
  /** Content type for the middle segment */
  contentType: 'article' | 'video' | 'podcast' | 'guide';
  /** Title of the current item (last breadcrumb segment) */
  title: string;
  /** Additional CSS classes */
  className?: string;
}

const TYPE_CONFIG: Record<string, { label: string; href: string }> = {
  article: { label: 'Articles', href: '/content/articles' },
  video: { label: 'Videos', href: '/content/videos' },
  podcast: { label: 'Podcasts', href: '/content/podcasts' },
  guide: { label: 'Guides', href: '/content/guides' },
};

/**
 * Truncate title for display in breadcrumb
 */
function truncate(text: string, maxLen: number = 40): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen).trim() + '...';
}

export function ContentBreadcrumb({ contentType, title, className = '' }: ContentBreadcrumbProps) {
  const typeConfig = TYPE_CONFIG[contentType] ?? { label: 'Content', href: '/content' };

  const items: BreadcrumbItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Content', href: '/content' },
    { label: typeConfig.label, href: typeConfig.href },
  ];

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

export default ContentBreadcrumb;
