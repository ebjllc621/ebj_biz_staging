/**
 * ExpandableLogRow - Expandable content display for log details
 *
 * Shows truncated text with expand/collapse and copy functionality
 *
 * @tier SIMPLE
 * @authority CLAUDE.md - Component Standards
 */

'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { CopyButton } from './CopyButton';

interface ExpandableLogRowProps {
  title?: string;
  content: string | Record<string, unknown> | null;
  maxLength?: number;
  className?: string;
  showCopy?: boolean;
  isJson?: boolean;
}

export function ExpandableLogRow({
  title,
  content,
  maxLength = 100,
  className = '',
  showCopy = true,
  isJson = false
}: ExpandableLogRowProps) {
  const [expanded, setExpanded] = useState(false);

  if (content === null || content === undefined) {
    return <span className="text-gray-400 italic">-</span>;
  }

  // Convert to string if object
  const displayContent = typeof content === 'object'
    ? JSON.stringify(content, null, 2)
    : String(content);

  const isLong = displayContent.length > maxLength;
  const truncated = isLong && !expanded
    ? displayContent.substring(0, maxLength) + '...'
    : displayContent;

  return (
    <div className={`relative ${className}`}>
      {title && (
        <div className="text-xs font-medium text-gray-500 mb-1">{title}</div>
      )}

      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          {isJson || typeof content === 'object' ? (
            <pre
              className={`text-sm font-mono bg-gray-50 p-2 rounded overflow-x-auto whitespace-pre-wrap break-words ${
                expanded ? '' : 'max-h-20 overflow-hidden'
              }`}
            >
              {truncated}
            </pre>
          ) : (
            <p
              className={`text-sm text-gray-700 ${
                expanded ? 'whitespace-pre-wrap' : 'truncate'
              }`}
              title={!expanded ? displayContent : undefined}
            >
              {truncated}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {showCopy && displayContent.length > 0 && (
            <CopyButton text={displayContent} />
          )}

          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
              title={expanded ? 'Collapse' : 'Expand'}
              aria-label={expanded ? 'Collapse content' : 'Expand content'}
            >
              {expanded ? (
                <ChevronUp className="text-gray-500" size={14} />
              ) : (
                <ChevronDown className="text-gray-500" size={14} />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * ExpandableJsonData - Specialized component for before/after JSON data
 */
interface ExpandableJsonDataProps {
  label: string;
  data: Record<string, unknown> | null;
}

export function ExpandableJsonData({ label, data }: ExpandableJsonDataProps) {
  const [expanded, setExpanded] = useState(false);

  if (!data) {
    return null;
  }

  const jsonString = JSON.stringify(data, null, 2);

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs font-medium text-[#1e3a5f] hover:underline"
      >
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {label}
      </button>

      {expanded && (
        <div className="mt-1 relative">
          <pre className="text-xs font-mono bg-gray-50 p-2 rounded overflow-x-auto max-h-48 overflow-y-auto">
            {jsonString}
          </pre>
          <div className="absolute top-1 right-1">
            <CopyButton text={jsonString} iconSize={12} />
          </div>
        </div>
      )}
    </div>
  );
}
