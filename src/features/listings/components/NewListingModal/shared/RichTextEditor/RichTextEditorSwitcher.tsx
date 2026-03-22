/**
 * RichTextEditorSwitcher - Multi-Mode Rich Text Editor
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier ADVANCED
 * @phase Phase 3 - Section 2 Basic Information
 *
 * FEATURES:
 * - Auto-detect device (mobile → TipTap, desktop → TinyMCE)
 * - 3 mode buttons: TipTap, TinyMCE, Raw HTML
 * - Character counter with tier-based limits
 * - Mode persistence
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { TipTapEditor } from './TipTapEditor';
import { TinyMCEEditor } from './TinyMCEEditor';

// ============================================================================
// TYPES
// ============================================================================

export type EditorMode = 'tiptap' | 'tinymce' | 'raw';

export interface RichTextEditorSwitcherProps {
  value: string;
  onChange: (_value: string) => void;
  maxLength: number;
  placeholder?: string;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function RichTextEditorSwitcher({
  value,
  onChange,
  maxLength,
  placeholder = 'Enter description...',
  className = ''
}: RichTextEditorSwitcherProps) {
  const [mode, setMode] = useState<EditorMode>('tiptap');
  const [isMobile, setIsMobile] = useState(false);

  // Detect device type on mount
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Auto-select mode based on device
      setMode(mobile ? 'tiptap' : 'tinymce');
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Handle mode change
  const handleModeChange = useCallback((newMode: EditorMode) => {
    setMode(newMode);
  }, []);

  // Handle raw HTML change
  const handleRawChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    // For raw mode, count characters excluding HTML tags
    const textLength = newValue.replace(/<[^>]*>/g, '').length;
    if (textLength <= maxLength) {
      onChange(newValue);
    }
  }, [onChange, maxLength]);

  // Calculate character count
  const charCount = value.replace(/<[^>]*>/g, '').length;
  const isNearLimit = charCount >= maxLength * 0.9;
  const isAtLimit = charCount >= maxLength;

  return (
    <div className={className}>
      {/* Mode Switcher Buttons */}
      <div className="flex items-center gap-2 mb-3">
        <div className="text-sm font-medium text-[#022641]">Editor Mode:</div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => handleModeChange('tiptap')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              mode === 'tiptap'
                ? 'bg-white text-[#022641] font-medium shadow-sm'
                : 'text-gray-600 hover:text-[#022641]'
            }`}
            aria-label="TipTap editor mode"
          >
            TipTap
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('tinymce')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              mode === 'tinymce'
                ? 'bg-white text-[#022641] font-medium shadow-sm'
                : 'text-gray-600 hover:text-[#022641]'
            }`}
            aria-label="TinyMCE editor mode"
          >
            TinyMCE
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('raw')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              mode === 'raw'
                ? 'bg-white text-[#022641] font-medium shadow-sm'
                : 'text-gray-600 hover:text-[#022641]'
            }`}
            aria-label="Raw HTML mode"
          >
            Raw HTML
          </button>
        </div>

        {isMobile && (
          <div className="ml-auto text-xs text-gray-500">
            Mobile detected
          </div>
        )}
      </div>

      {/* Editor Display */}
      {mode === 'tiptap' && (
        <TipTapEditor
          value={value}
          onChange={onChange}
          maxLength={maxLength}
          placeholder={placeholder}
        />
      )}

      {mode === 'tinymce' && (
        <TinyMCEEditor
          value={value}
          onChange={onChange}
          maxLength={maxLength}
          placeholder={placeholder}
        />
      )}

      {mode === 'raw' && (
        <div className="border border-gray-300 rounded-lg">
          <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gray-50">
            <div className="text-xs text-gray-500 font-mono">
              Raw HTML Editor
            </div>
            <div
              className={`text-xs font-medium ${
                isAtLimit ? 'text-red-600' : isNearLimit ? 'text-orange-600' : 'text-gray-600'
              }`}
            >
              {charCount} / {maxLength}
            </div>
          </div>
          <textarea
            value={value}
            onChange={handleRawChange}
            placeholder={placeholder}
            className="w-full p-4 min-h-[300px] resize-y focus:outline-none font-mono text-sm"
            aria-label="Raw HTML editor"
            aria-describedby="raw-char-counter"
          />
          <div className="p-2 border-t border-gray-200 bg-gray-50">
            <div className="text-xs text-gray-500">
              Edit HTML directly. Character count excludes HTML tags.
            </div>
          </div>
        </div>
      )}

      {/* Mode Description */}
      <div className="mt-2 text-xs text-gray-500">
        {mode === 'tiptap' && (
          <p>TipTap: Lightweight Markdown-based editor, ideal for mobile devices.</p>
        )}
        {mode === 'tinymce' && (
          <p>TinyMCE: Full-featured WYSIWYG editor with advanced formatting options.</p>
        )}
        {mode === 'raw' && (
          <p>Raw HTML: Direct HTML editing for advanced users.</p>
        )}
      </div>
    </div>
  );
}
