/**
 * @component Client Component
 * @tier STANDARD
 * @phase Phase G3 - Guide Detail Page
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { CheckCircle, Circle } from 'lucide-react';
import type { Guide } from '@core/types/guide';

interface GuideDetailContentProps {
  guide: Guide;
  activeSection?: number | null;
  onSectionVisible?: (sectionNumber: number) => void;
  completedSectionIds?: Set<number>;
  onToggleSectionComplete?: (sectionId: number) => void;
  className?: string;
}

/**
 * Sanitize HTML content — strip dangerous tags and event handlers
 */
function sanitizeHtml(html: string): string {
  return html
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove iframe tags and their content
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // Remove on* event handler attributes
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')
    // Remove javascript: protocol in href/src
    .replace(/(?:href|src)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '')
    // Remove style attributes containing expression()
    .replace(/style\s*=\s*(?:"[^"]*expression\([^"]*"|'[^']*expression\([^']*')/gi, '');
}

/**
 * GuideDetailContent — renders overview, prerequisites, and multi-section content
 * with IntersectionObserver for TOC scrollspy integration.
 */
export function GuideDetailContent({
  guide,
  onSectionVisible,
  completedSectionIds,
  onToggleSectionComplete,
  className = ''
}: GuideDetailContentProps) {
  // IntersectionObserver for TOC scrollspy — fires onSectionVisible when section enters viewport
  useEffect(() => {
    if (!guide.sections?.length || !onSectionVisible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const sectionNum = parseInt(entry.target.id.replace('section-', ''));
            if (!isNaN(sectionNum)) onSectionVisible(sectionNum);
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );

    guide.sections.forEach((section) => {
      const el = document.getElementById(`section-${section.section_number}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [guide.sections, onSectionVisible]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Card (if exists) */}
      {guide.overview && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:p-8">
          <h2 className="text-xl font-bold text-biz-navy mb-4">Overview</h2>
          <div
            className="prose prose-lg max-w-none prose-headings:text-biz-navy prose-a:text-biz-orange prose-a:no-underline hover:prose-a:underline"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(guide.overview) }}
          />
        </div>
      )}

      {/* Prerequisites Card (if exists) */}
      {guide.prerequisites && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-6 lg:p-8">
          <h2 className="text-lg font-bold text-amber-800 mb-3">Prerequisites</h2>
          <div
            className="prose prose-amber max-w-none prose-headings:text-amber-900 prose-a:text-amber-700"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(guide.prerequisites) }}
          />
        </div>
      )}

      {/* Sections */}
      {guide.sections?.map((section) => (
        <div
          key={section.id}
          id={`section-${section.section_number}`}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:p-8 scroll-mt-20"
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-biz-orange text-white flex items-center justify-center text-sm font-bold">
              {section.section_number}
            </span>
            <h2 className="text-xl font-bold text-biz-navy flex-1 min-w-0">{section.title}</h2>
            {section.estimated_time && (
              <span className="text-sm text-gray-400 flex-shrink-0 ml-auto">
                {section.estimated_time} min
              </span>
            )}
            {/* Section Completion Button — only for authenticated users */}
            {onToggleSectionComplete && (
              <button
                onClick={() => onToggleSectionComplete(section.id)}
                className={`flex-shrink-0 ml-2 transition-colors ${
                  completedSectionIds?.has(section.id)
                    ? 'text-green-500 hover:text-green-600'
                    : 'text-gray-300 hover:text-green-400'
                }`}
                aria-label={completedSectionIds?.has(section.id) ? 'Mark section incomplete' : 'Mark section complete'}
                title={completedSectionIds?.has(section.id) ? 'Completed — click to undo' : 'Mark as complete'}
              >
                {completedSectionIds?.has(section.id) ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <Circle className="w-6 h-6" />
                )}
              </button>
            )}
          </div>

          {section.content ? (
            <div
              className="prose prose-lg max-w-none prose-headings:text-biz-navy prose-a:text-biz-orange prose-a:no-underline hover:prose-a:underline"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(section.content) }}
            />
          ) : (
            <p className="text-gray-500 italic">No content for this section.</p>
          )}
        </div>
      ))}

      {/* Fallback when no overview and no sections */}
      {!guide.overview && (!guide.sections || guide.sections.length === 0) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:p-8">
          {guide.excerpt && (
            <p className="text-lg text-gray-600 font-medium leading-relaxed mb-6 pb-6 border-b border-gray-100">
              {guide.excerpt}
            </p>
          )}
          <p className="text-gray-500 italic">No content available.</p>
        </div>
      )}

      {/* Full Tag List */}
      {guide.tags.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Tags</p>
          <div className="flex flex-wrap gap-2">
            {guide.tags.map((tag, index) => (
              <Link
                key={index}
                href={`/content?tag=${encodeURIComponent(tag)}` as Route}
                className="text-sm text-biz-orange bg-biz-orange/10 px-3 py-1 rounded hover:bg-biz-orange/20 transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default GuideDetailContent;
