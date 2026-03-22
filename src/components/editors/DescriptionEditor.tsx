/**
 * DescriptionEditor - Shared Rich Text Editor for Listing Descriptions
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier ADVANCED
 *
 * FEATURES:
 * - Real TipTap WYSIWYG editor (no API key required)
 * - Desktop: Full toolbar (headings, bold, italic, underline, strike, lists, blockquote, links, text align)
 * - Mobile: Compact toolbar (bold, italic, underline, lists, links)
 * - Raw HTML mode (tier-gated: preferred+ only)
 * - Character counter with tier-based limits
 * - Auto-detects mobile/desktop for responsive toolbar
 * - Used by both DescriptionManager (dashboard) and listing modals
 */

'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ListingTier } from '@features/listings/types/listing-form.types';

// ============================================================================
// TYPES
// ============================================================================

export type EditorMode = 'visual' | 'raw';

export interface DescriptionEditorProps {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  tier: ListingTier;
  placeholder?: string;
  className?: string;
}

// Tier level mapping for gating
const TIER_LEVELS: Record<ListingTier, number> = {
  essentials: 0,
  plus: 1,
  preferred: 2,
  premium: 3,
};

// ============================================================================
// TOOLBAR BUTTON COMPONENT
// ============================================================================

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, isActive, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        isActive
          ? 'bg-[#ed6437] text-white'
          : disabled
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-gray-300 mx-0.5" />;
}

// ============================================================================
// TOOLBAR COMPONENT
// ============================================================================

interface EditorToolbarProps {
  editor: ReturnType<typeof useEditor> | null;
  isMobile: boolean;
}

function EditorToolbar({ editor, isMobile }: EditorToolbarProps) {
  if (!editor) return null;

  return (
    <div className="flex items-center gap-0.5 p-2 border-b border-gray-200 bg-gray-50 flex-wrap">
      {/* Text formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold (Ctrl+B)"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M11 3H6v14h5.5c2.5 0 4.5-2 4.5-4.5 0-1.5-.7-2.8-1.8-3.7C15.3 8 16 6.8 16 5.5 16 3 14 3 11 3zm-1 6V5h1.5C12.9 5 14 6.1 14 7.5S12.9 10 11.5 10H10zm1.5 2c1.4 0 2.5 1.1 2.5 2.5S12.9 17 11.5 17H10v-5h1.5z" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic (Ctrl+I)"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 4v2h2.5l-3 8H7v2h6v-2h-2.5l3-8H16V4h-6z" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="Underline (Ctrl+U)"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M6 3v7c0 2.2 1.8 4 4 4s4-1.8 4-4V3h2v7c0 3.3-2.7 6-6 6s-6-2.7-6-6V3h2zm-2 14h12v2H4v-2z" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="Strikethrough"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 3c-2.8 0-5 1.5-5 3.5 0 1 .5 1.8 1.3 2.5H3v2h14v-2h-3.3c.8-.7 1.3-1.5 1.3-2.5C15 4.5 12.8 3 10 3zm0 2c1.7 0 3 .7 3 1.5S11.7 8 10 8 7 7.3 7 6.5 8.3 5 10 5zM5 13v2c0 2 2.2 3.5 5 3.5s5-1.5 5-3.5v-2h-2v2c0 .8-1.3 1.5-3 1.5s-3-.7-3-1.5v-2H5z" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        isActive={editor.isActive('highlight')}
        title="Highlight"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 15h12v2H4v-2zm2.5-8.5l1.4-1.4L14 11.2l-1.4 1.4L6.5 6.5zM12.6 3L15 5.4 13.6 6.8 11.2 4.4 12.6 3z" />
        </svg>
      </ToolbarButton>

      <ToolbarDivider />

      {/* Headings - desktop only */}
      {!isMobile && (
        <>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            <span className="text-xs font-bold">H2</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            title="Heading 3"
          >
            <span className="text-xs font-bold">H3</span>
          </ToolbarButton>
          <ToolbarDivider />
        </>
      )}

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Bullet List"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 4a2 2 0 100 4 2 2 0 000-4zm4 1h8v2H8V5zm0 4h8v2H8V9zm0 4h8v2H8v-2zM4 8a2 2 0 100 4 2 2 0 000-4zm0 4a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Numbered List"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M5.5 4H7v8H5.5V6.5h-1v-1l1.5-.5V4zM3 13h4v1.5H4.75V16H7v1.5H3V16h1.25v-1.5H3V13zm5-8h8v2H8V5zm0 4h8v2H8V9zm0 4h8v2H8v-2z" />
        </svg>
      </ToolbarButton>

      {/* Desktop extras */}
      {!isMobile && (
        <>
          <ToolbarDivider />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            title="Blockquote"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 5h2v4h3V5h2v6c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V5zm10 0h2v4h3V5h2v6c0 1.1-.9 2-2 2h-3c-1.1 0-2-.9-2-2V5z" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontal Rule"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 9h14v2H3V9z" />
            </svg>
          </ToolbarButton>
          <ToolbarDivider />
          {/* Text alignment */}
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' })}
            title="Align Left"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4h14v2H3V4zm0 4h10v2H3V8zm0 4h14v2H3v-2zm0 4h10v2H3v-2z" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            title="Align Center"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4h14v2H3V4zm2 4h10v2H5V8zm-2 4h14v2H3v-2zm2 4h10v2H5v-2z" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            title="Align Right"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4h14v2H3V4zm4 4h10v2H7V8zm-4 4h14v2H3v-2zm4 4h10v2H7v-2z" />
            </svg>
          </ToolbarButton>
        </>
      )}

      <ToolbarDivider />

      {/* Link */}
      <ToolbarButton
        onClick={() => {
          if (editor.isActive('link')) {
            editor.chain().focus().unsetLink().run();
          } else {
            const url = window.prompt('Enter URL:');
            if (url) {
              editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
            }
          }
        }}
        isActive={editor.isActive('link')}
        title="Insert Link"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M12.6 7.4c1.2 1.2 1.2 3 0 4.2l-2.8 2.8c-1.2 1.2-3 1.2-4.2 0s-1.2-3 0-4.2l1.4-1.4 1.4 1.4-1.4 1.4c-.4.4-.4 1 0 1.4s1 .4 1.4 0l2.8-2.8c.4-.4.4-1 0-1.4s-1-.4-1.4 0L8.4 10.2 7 8.8l1.4-1.4c1.2-1.2 3-1.2 4.2 0zm-5.2 5.2c-1.2-1.2-1.2-3 0-4.2l2.8-2.8c1.2-1.2 3-1.2 4.2 0s1.2 3 0 4.2l-1.4 1.4-1.4-1.4 1.4-1.4c.4-.4.4-1 0-1.4s-1-.4-1.4 0L8.8 10c-.4.4-.4 1 0 1.4s1 .4 1.4 0l1.4-1.4 1.4 1.4-1.4 1.4c-1.2 1.2-3 1.2-4.2 0z" />
        </svg>
      </ToolbarButton>

      {/* Undo/Redo - desktop only */}
      {!isMobile && (
        <>
          <ToolbarDivider />
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo (Ctrl+Z)"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7.7 4.3L3 9l4.7 4.7 1.4-1.4L6.8 10H14c2.2 0 4 1.8 4 4v2h-2v-2c0-1.1-.9-2-2-2H6.8l2.3-2.3-1.4-1.4z" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo (Ctrl+Y)"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M12.3 4.3L17 9l-4.7 4.7-1.4-1.4L13.2 10H6c-2.2 0-4 1.8-4 4v2h2v-2c0-1.1.9-2 2-2h7.2l-2.3 2.3 1.4 1.4z" />
            </svg>
          </ToolbarButton>
        </>
      )}

      {/* Label */}
      <div className="ml-auto text-xs text-gray-500">
        {isMobile ? 'Mobile Editor' : 'Rich Text Editor'}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DescriptionEditor({
  value,
  onChange,
  maxLength,
  tier,
  placeholder = 'Describe your business...',
  className = ''
}: DescriptionEditorProps) {
  const [mode, setMode] = useState<EditorMode>('visual');
  const [isMobile, setIsMobile] = useState(false);
  const [rawValue, setRawValue] = useState(value);

  // Raw HTML access: preferred+ only
  const canUseRawHTML = TIER_LEVELS[tier] >= TIER_LEVELS['preferred'];

  // Detect device type
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // TipTap editor instance
  // immediatelyRender: false prevents SSR hydration mismatch errors
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Highlight,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer nofollow',
          target: '_blank',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount.configure({
        limit: maxLength,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: value || '',
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      // TipTap returns <p></p> for empty content
      const cleanHtml = html === '<p></p>' ? '' : html;
      onChange(cleanHtml);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] md:min-h-[300px] p-4',
      },
    },
  });

  // Sync external value changes into editor (e.g., loading from DB)
  useEffect(() => {
    if (editor && value !== editor.getHTML() && value !== (editor.getHTML() === '<p></p>' ? '' : editor.getHTML())) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  // Keep rawValue in sync when switching modes
  useEffect(() => {
    if (mode === 'raw') {
      setRawValue(value);
    }
  }, [mode, value]);

  // Character count from editor
  const charCount = useMemo(() => {
    if (editor) {
      return editor.storage.characterCount.characters();
    }
    // Fallback: strip HTML tags
    return value.replace(/<[^>]*>/g, '').length;
  }, [editor, value, editor?.storage.characterCount]);

  const isNearLimit = charCount >= maxLength * 0.9;
  const isAtLimit = charCount >= maxLength;

  // Handle raw HTML change — always accept input, just warn if over limit
  const handleRawChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setRawValue(newValue);
    onChange(newValue);
  }, [onChange]);

  // Switch to visual mode: push raw HTML into TipTap
  const handleSwitchToVisual = useCallback(() => {
    if (editor) {
      editor.commands.setContent(rawValue || '');
    }
    setMode('visual');
  }, [editor, rawValue]);

  // Switch to raw mode
  const handleSwitchToRaw = useCallback(() => {
    setRawValue(value);
    setMode('raw');
  }, [value]);

  // Raw HTML char count
  const rawCharCount = rawValue.replace(/<[^>]*>/g, '').length;
  const rawNearLimit = rawCharCount >= maxLength * 0.9;
  const rawAtLimit = rawCharCount >= maxLength;

  return (
    <div className={className}>
      {/* Mode Switcher */}
      <div className="flex items-center gap-2 mb-3">
        <div className="text-sm font-medium text-[#022641]">Editor Mode:</div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={mode === 'raw' ? handleSwitchToVisual : undefined}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              mode === 'visual'
                ? 'bg-white text-[#022641] font-medium shadow-sm'
                : 'text-gray-600 hover:text-[#022641]'
            }`}
          >
            Visual Editor
          </button>
          {canUseRawHTML ? (
            <button
              type="button"
              onClick={mode === 'visual' ? handleSwitchToRaw : undefined}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                mode === 'raw'
                  ? 'bg-white text-[#022641] font-medium shadow-sm'
                  : 'text-gray-600 hover:text-[#022641]'
              }`}
            >
              Raw HTML
            </button>
          ) : (
            <span
              className="px-3 py-1 text-xs rounded text-gray-400 cursor-not-allowed"
              title="Raw HTML editing requires Preferred tier or higher"
            >
              Raw HTML 🔒
            </span>
          )}
        </div>

        {isMobile && (
          <div className="ml-auto text-xs text-gray-500">
            Mobile
          </div>
        )}
      </div>

      {/* Visual Editor */}
      {mode === 'visual' && (
        <div className="border border-gray-300 rounded-lg overflow-hidden">
          <EditorToolbar editor={editor} isMobile={isMobile} />
          <EditorContent editor={editor} />
          <div className="flex items-center justify-between p-2 border-t border-gray-200 bg-gray-50">
            <div className="text-xs text-gray-500">
              {isMobile ? 'Tap toolbar buttons to format' : 'Use toolbar or keyboard shortcuts (Ctrl+B, Ctrl+I, Ctrl+U)'}
            </div>
            <div
              className={`text-xs font-medium ${
                isAtLimit ? 'text-red-600' : isNearLimit ? 'text-orange-600' : 'text-gray-600'
              }`}
            >
              {charCount} / {maxLength}
            </div>
          </div>
        </div>
      )}

      {/* Raw HTML Editor */}
      {mode === 'raw' && (
        <div className="border border-gray-300 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gray-50">
            <div className="text-xs text-gray-500 font-mono">
              Raw HTML Editor
            </div>
            <div
              className={`text-xs font-medium ${
                rawAtLimit ? 'text-red-600' : rawNearLimit ? 'text-orange-600' : 'text-gray-600'
              }`}
            >
              {rawCharCount} / {maxLength}
            </div>
          </div>
          <textarea
            value={rawValue}
            onChange={handleRawChange}
            placeholder={placeholder}
            className="w-full p-4 min-h-[300px] resize-y focus:outline-none font-mono text-sm"
            aria-label="Raw HTML editor"
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
        {mode === 'visual' && (
          <p>Full-featured rich text editor. {isMobile ? 'Optimized for touch devices.' : 'Full formatting toolbar with keyboard shortcuts.'}</p>
        )}
        {mode === 'raw' && (
          <p>Direct HTML editing for advanced users. Preferred tier and above.</p>
        )}
      </div>
    </div>
  );
}

export default DescriptionEditor;
