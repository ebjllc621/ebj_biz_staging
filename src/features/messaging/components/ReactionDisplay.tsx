/**
 * ReactionDisplay - Shows emoji reaction badges below a message
 *
 * @tier SIMPLE
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 *
 * FEATURES:
 * - Displays aggregated reactions with counts
 * - Highlights user's own reactions
 * - Click to toggle own reaction
 */

'use client';

import React from 'react';

export interface ReactionBadge {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

interface ReactionDisplayProps {
  reactions: ReactionBadge[];
  onToggleReaction: (emoji: string) => void;
  align?: 'left' | 'right';
}

export function ReactionDisplay({ reactions, onToggleReaction, align = 'left' }: ReactionDisplayProps) {
  if (!reactions || reactions.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1 mt-1 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={(e) => {
            e.stopPropagation();
            onToggleReaction(reaction.emoji);
          }}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
            reaction.reactedByMe
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
          }`}
        >
          <span>{reaction.emoji}</span>
          <span className="font-medium">{reaction.count}</span>
        </button>
      ))}
    </div>
  );
}
