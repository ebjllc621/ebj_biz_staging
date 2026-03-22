/**
 * SEOPreviewPanel - Google Search Result SEO Preview
 *
 * @description Displays a Google-style search result mockup with SEO validation
 * @component Client Component
 * @tier SIMPLE
 * @phase Content Phase 5B
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier1_Phases/PHASE_5B_CONTENT_ANALYTICS_SEO_PREVIEW.md
 *
 * Features:
 * - Google search result mockup
 * - Title, URL, and description validation indicators
 * - Character count display
 * - Collapsible section (expanded by default)
 */
'use client';

import React, { useState } from 'react';
import { Search, CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface SEOPreviewPanelProps {
  title: string;
  description: string;
  slug?: string;
  contentType: 'article' | 'podcast' | 'video' | 'affiliate_marketer' | 'internet_personality';
}

type ValidationStatus = 'good' | 'warning' | 'error';

interface ValidationResult {
  status: ValidationStatus;
  message: string;
  count: number;
  max: number;
}

// ============================================================================
// HELPERS
// ============================================================================

const CONTENT_TYPE_PATH: Record<SEOPreviewPanelProps['contentType'], string> = {
  article: 'articles',
  podcast: 'podcasts',
  video: 'videos',
  affiliate_marketer: 'affiliate-marketers',
  internet_personality: 'internet-personalities',
};

function validateTitle(title: string): ValidationResult {
  const count = title.length;
  if (!title) {
    return { status: 'error', message: 'Title is required', count, max: 60 };
  }
  if (count > 70) {
    return { status: 'error', message: 'Title too long (>70 chars)', count, max: 60 };
  }
  if (count > 60) {
    return { status: 'warning', message: 'Title slightly long (>60 chars)', count, max: 60 };
  }
  if (count < 50) {
    return { status: 'warning', message: 'Title could be longer (50-60 chars ideal)', count, max: 60 };
  }
  return { status: 'good', message: 'Title length is ideal', count, max: 60 };
}

function validateDescription(description: string): ValidationResult {
  const count = description.length;
  if (!description) {
    return { status: 'error', message: 'Description is required', count, max: 160 };
  }
  if (count > 200) {
    return { status: 'error', message: 'Description too long (>200 chars)', count, max: 160 };
  }
  if (count > 160) {
    return { status: 'warning', message: 'Description slightly long (>160 chars)', count, max: 160 };
  }
  if (count < 80) {
    return { status: 'error', message: 'Description too short (<80 chars)', count, max: 160 };
  }
  if (count < 120) {
    return { status: 'warning', message: 'Description could be longer (150-160 chars ideal)', count, max: 160 };
  }
  return { status: 'good', message: 'Description length is ideal', count, max: 160 };
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '...';
}

// ============================================================================
// Validation Icon
// ============================================================================

function ValidationIcon({ status }: { status: ValidationStatus }) {
  if (status === 'good') {
    return <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />;
  }
  if (status === 'warning') {
    return <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />;
  }
  return <XCircle className="w-4 h-4 text-red-500 shrink-0" />;
}

const STATUS_TEXT_COLORS: Record<ValidationStatus, string> = {
  good: 'text-green-700',
  warning: 'text-yellow-700',
  error: 'text-red-700',
};

// ============================================================================
// COMPONENT
// ============================================================================

export function SEOPreviewPanel({
  title,
  description,
  slug,
  contentType,
}: SEOPreviewPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const path = CONTENT_TYPE_PATH[contentType];
  const urlSlug = slug || 'your-content-slug';
  const displayUrl = `bizconekt.com/${path}/${urlSlug}`;

  // Formatted for Google display
  const displayTitle = title
    ? truncate(`${title} | Bizconekt`, 60)
    : 'Your Title | Bizconekt';

  const displayDescription = description
    ? truncate(description, 160)
    : 'Your meta description will appear here. Write a clear, compelling description to improve click-through rates.';

  const titleValidation = validateTitle(title);
  const descValidation = validateDescription(description);

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
      {/* Header — Collapsible Toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded(prev => !prev)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-800">SEO Preview</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Google Search Result Mockup */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Google Preview</p>
            {/* URL */}
            <p className="text-xs text-green-700 mb-0.5 truncate">{displayUrl}</p>
            {/* Title */}
            <p className="text-blue-700 text-lg font-medium leading-snug mb-1 hover:underline cursor-pointer truncate">
              {displayTitle}
            </p>
            {/* Description */}
            <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
              {displayDescription}
            </p>
          </div>

          {/* Validation Indicators */}
          <div className="space-y-2">
            {/* Title validation */}
            <div className="flex items-start gap-2">
              <ValidationIcon status={titleValidation.status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-xs font-medium ${STATUS_TEXT_COLORS[titleValidation.status]}`}>
                    Title: {titleValidation.message}
                  </p>
                  <span className="text-xs text-gray-400 shrink-0">
                    {titleValidation.count}/{titleValidation.max} characters
                  </span>
                </div>
              </div>
            </div>

            {/* Description validation */}
            <div className="flex items-start gap-2">
              <ValidationIcon status={descValidation.status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-xs font-medium ${STATUS_TEXT_COLORS[descValidation.status]}`}>
                    Description: {descValidation.message}
                  </p>
                  <span className="text-xs text-gray-400 shrink-0">
                    {descValidation.count}/{descValidation.max} characters
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SEOPreviewPanel;
