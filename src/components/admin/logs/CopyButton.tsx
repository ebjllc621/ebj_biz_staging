/**
 * CopyButton - Click to copy text to clipboard
 *
 * @tier SIMPLE
 * @authority CLAUDE.md - Component Standards
 */

'use client';

import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  text: string;
  className?: string;
  iconSize?: number;
  showTooltip?: boolean;
}

export function CopyButton({
  text,
  className = '',
  iconSize = 14,
  showTooltip = true
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={`p-1 rounded hover:bg-gray-100 transition-colors ${className}`}
      title={showTooltip ? (copied ? 'Copied!' : 'Click to copy') : undefined}
      aria-label={copied ? 'Copied to clipboard' : 'Copy to clipboard'}
    >
      {copied ? (
        <Check className="text-green-600" size={iconSize} />
      ) : (
        <Copy className="text-gray-500 hover:text-gray-700" size={iconSize} />
      )}
    </button>
  );
}
