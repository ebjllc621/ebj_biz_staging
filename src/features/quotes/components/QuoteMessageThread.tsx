/**
 * QuoteMessageThread Component
 *
 * SIMPLE tier component - Message thread display within a quote
 *
 * @tier SIMPLE
 * @phase Phase 3A - Quote System Foundation
 * @generated DNA v11.4.0
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, User } from 'lucide-react';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { QuoteMessage } from '../types';

interface QuoteMessageThreadProps {
  quoteId: number;
  messages: QuoteMessage[];
  currentUserId: number;
  responseId?: number;
  onMessageSent?: (_sentMessage: QuoteMessage) => void;
}

export function QuoteMessageThread({
  quoteId,
  messages,
  currentUserId,
  responseId,
  onMessageSent
}: QuoteMessageThreadProps) {
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSending) return;

    setError(null);
    setIsSending(true);

    try {
      const response = await fetchWithCsrf(`/api/quotes/${quoteId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), responseId })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to send message');
      }

      onMessageSent?.(result.data.message);
      setContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto space-y-3 p-4 min-h-0">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No messages yet. Start the conversation.</p>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.senderUserId === currentUserId;
            return (
              <div key={msg.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-3.5 h-3.5 text-gray-500" />
                </div>
                <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                  <span className="text-xs text-gray-400 mb-1">
                    {msg.senderName ?? 'User'}
                  </span>
                  <div
                    className={`px-3 py-2 rounded-xl text-sm ${
                      isOwn
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-gray-100 text-gray-800 rounded-tl-none'
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className="text-xs text-gray-400 mt-1">
                    {new Date(msg.createdAt).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2 p-4 border-t border-gray-200">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type a message..."
          disabled={isSending}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={isSending || !content.trim()}
          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
