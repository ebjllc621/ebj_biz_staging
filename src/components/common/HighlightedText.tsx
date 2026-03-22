/**
 * HighlightedText Component
 *
 * Renders text with highlighted matching portions for search result emphasis.
 *
 * @tier SIMPLE
 * @phase Phase 6 - Enhanced Search Functionality
 * @generated DNA v11.4.0
 *
 * GOVERNANCE:
 * - React.memo for performance
 * - Regex special character escaping
 * - Case-insensitive matching
 * - Tailwind CSS only (no inline styles)
 *
 * @example
 * <HighlightedText
 *   text="Coffee Shop"
 *   query="coffee"
 *   highlightClassName="bg-yellow-200"
 * />
 * // Renders: <mark class="bg-yellow-200">Coffee</mark> Shop
 */

'use client';

import { memo } from 'react';
import { escapeRegex } from '@core/utils/search';

interface HighlightedTextProps {
  /** Text to render with highlighting */
  text: string;

  /** Search query to highlight (case-insensitive) */
  query: string;

  /** Tailwind CSS class for highlighted text (default: bg-yellow-200) */
  highlightClassName?: string;
}

/**
 * HighlightedText - Text component with search query highlighting
 *
 * Splits text by query matches and wraps matches in <mark> tag for emphasis.
 * Returns original text if query is empty.
 */
export const HighlightedText = memo(function HighlightedText({
  text,
  query,
  highlightClassName = 'bg-yellow-200'
}: HighlightedTextProps) {
  // No highlighting for empty query
  if (!query.trim()) {
    return <span>{text}</span>;
  }

  try {
    // Create case-insensitive regex with escaped special characters
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    const parts = text.split(regex);

    return (
      <span>
        {parts.map((part, i) => {
          // Test if part matches query (case-insensitive)
          const isMatch = regex.test(part);
          // Reset regex lastIndex for next iteration
          regex.lastIndex = 0;

          return isMatch ? (
            <mark key={i} className={highlightClassName}>
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          );
        })}
      </span>
    );
  } catch (error) {
    // Fallback to original text on regex error
    console.warn('HighlightedText regex error:', error);
    return <span>{text}</span>;
  }
});
