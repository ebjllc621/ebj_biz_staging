/**
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase N3 - Newsletter Detail Page
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import Link from 'next/link';
import type { Route } from 'next';
import type { Newsletter } from '@core/types/newsletter';

interface NewsletterDetailContentProps {
  newsletter: Newsletter;
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
 * NewsletterDetailContent — renders excerpt lead paragraph and sanitized HTML newsletter content
 */
export function NewsletterDetailContent({ newsletter, className = '' }: NewsletterDetailContentProps) {
  const sanitizedContent = newsletter.web_content ? sanitizeHtml(newsletter.web_content) : null;

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:p-8 ${className}`}>
      {/* Excerpt as styled lead paragraph */}
      {newsletter.excerpt && (
        <p className="text-lg text-gray-600 font-medium leading-relaxed mb-6 pb-6 border-b border-gray-100">
          {newsletter.excerpt}
        </p>
      )}

      {sanitizedContent ? (
        <div
          className="prose prose-lg max-w-none prose-headings:text-biz-navy prose-a:text-biz-orange prose-a:no-underline hover:prose-a:underline"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />
      ) : (
        <p className="text-gray-500 italic">No content available.</p>
      )}

      {/* Full Tag List */}
      {newsletter.tags.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Tags</p>
          <div className="flex flex-wrap gap-2">
            {newsletter.tags.map((tag, index) => (
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

export default NewsletterDetailContent;
