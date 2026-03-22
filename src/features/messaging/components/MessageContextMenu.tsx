/**
 * MessageContextMenu - Right-click context menu for message reactions and actions
 *
 * @tier SIMPLE
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 *
 * FEATURES:
 * - Standard emoji reaction picker (6 reactions)
 * - Optional "Reply" action for group messages
 * - Positioned relative to click location
 * - Closes on click outside or Escape
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { MessageSquareReply } from 'lucide-react';
import { STANDARD_REACTIONS } from '../types';

export interface MessageContextMenuProps {
  x: number;
  y: number;
  onReact: (emoji: string) => void;
  onReply?: () => void;
  onClose: () => void;
  existingReactions?: string[];
}

export function MessageContextMenu({
  x,
  y,
  onReact,
  onReply,
  onClose,
  existingReactions = []
}: MessageContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (rect.right > vw) {
        menuRef.current.style.left = `${x - rect.width}px`;
      }
      if (rect.bottom > vh) {
        menuRef.current.style.top = `${y - rect.height}px`;
      }
    }
  }, [x, y]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white rounded-xl shadow-lg border border-gray-200 py-2 animate-in fade-in zoom-in-95 duration-100"
      style={{ left: x, top: y }}
    >
      {/* Emoji reaction row */}
      <div className="flex items-center gap-1 px-2 pb-2 border-b border-gray-100">
        {STANDARD_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => {
              onReact(emoji);
              onClose();
            }}
            className={`w-9 h-9 flex items-center justify-center text-xl rounded-lg transition-colors hover:bg-gray-100 ${
              existingReactions.includes(emoji) ? 'bg-blue-50 ring-1 ring-blue-200' : ''
            }`}
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Reply action (group mode only) */}
      {onReply && (
        <button
          onClick={() => {
            onReply();
            onClose();
          }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <MessageSquareReply className="w-4 h-4 text-gray-500" />
          Reply to message
        </button>
      )}
    </div>
  );
}
