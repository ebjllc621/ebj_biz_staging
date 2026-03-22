/**
 * TipTapEditor - Lightweight Rich Text Editor for Mobile
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier STANDARD
 * @phase Phase 3 - Section 2 Basic Information
 *
 * FEATURES:
 * - Lightweight editor optimized for mobile
 * - Basic formatting (bold, italic, lists)
 * - Character counter
 * - Simplified toolbar
 */

'use client';

import { useState, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface TipTapEditorProps {
  value: string;
  onChange: (_value: string) => void;
  maxLength: number;
  placeholder?: string;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TipTapEditor({
  value,
  onChange,
  maxLength,
  placeholder = 'Enter description...',
  className = ''
}: TipTapEditorProps) {
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);

  // Handle text change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= maxLength) {
      onChange(newValue);
    }
  }, [onChange, maxLength]);

  // Apply formatting (simplified implementation)
  const applyFormat = useCallback((format: 'bold' | 'italic') => {
    const textarea = document.querySelector('textarea[data-tiptap]') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    if (!selectedText) return;

    let formattedText = selectedText;
    if (format === 'bold') {
      formattedText = `**${selectedText}**`;
      setIsBold(true);
    } else if (format === 'italic') {
      formattedText = `*${selectedText}*`;
      setIsItalic(true);
    }

    const newValue = value.substring(0, start) + formattedText + value.substring(end);
    if (newValue.length <= maxLength) {
      onChange(newValue);

      // Restore selection
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + formattedText.length,
          start + formattedText.length
        );
      }, 0);
    }
  }, [value, onChange, maxLength]);

  // Character count
  const charCount = value.length;
  const isNearLimit = charCount >= maxLength * 0.9;
  const isAtLimit = charCount >= maxLength;

  return (
    <div className={`border border-gray-300 rounded-lg ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-gray-200 bg-gray-50">
        <button
          type="button"
          onClick={() => applyFormat('bold')}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            isBold ? 'bg-gray-200' : ''
          }`}
          title="Bold (Markdown: **text**)"
          aria-label="Bold"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M11 3H6v14h5.5c2.5 0 4.5-2 4.5-4.5 0-1.5-.7-2.8-1.8-3.7C15.3 8 16 6.8 16 5.5 16 3 14 3 11 3zm-1 6V5h1.5C12.9 5 14 6.1 14 7.5S12.9 10 11.5 10H10zm1.5 2c1.4 0 2.5 1.1 2.5 2.5S12.9 17 11.5 17H10v-5h1.5z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => applyFormat('italic')}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            isItalic ? 'bg-gray-200' : ''
          }`}
          title="Italic (Markdown: *text*)"
          aria-label="Italic"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 4v2h2.5l-3 8H7v2h6v-2h-2.5l3-8H16V4h-6z" />
          </svg>
        </button>

        <div className="ml-auto text-xs text-gray-500">
          Markdown supported
        </div>
      </div>

      {/* Text Area */}
      <textarea
        data-tiptap
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full p-4 min-h-[200px] resize-y focus:outline-none"
        aria-label="Description editor"
        aria-describedby="char-counter"
      />

      {/* Character Counter */}
      <div className="flex items-center justify-between p-2 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-500">
          Use Markdown for formatting
        </div>
        <div
          id="char-counter"
          className={`text-xs font-medium ${
            isAtLimit ? 'text-red-600' : isNearLimit ? 'text-orange-600' : 'text-gray-600'
          }`}
        >
          {charCount} / {maxLength}
        </div>
      </div>
    </div>
  );
}
