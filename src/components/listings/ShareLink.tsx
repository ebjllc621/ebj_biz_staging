'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function ShareLink() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<string>('');

  const handleCopyLink = async () => {
    try {
      // Build absolute URL with current search state
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const fullUrl = `${origin}${pathname}?${searchParams.toString()}`;
      
      await navigator.clipboard.writeText(fullUrl);
      setStatus('Link copied');
      
      // Clear status after 2 seconds
      setTimeout(() => setStatus(''), 2000);
    } catch (error) {
      setStatus('Failed to copy');
      setTimeout(() => setStatus(''), 2000);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCopyLink}
        className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        type="button"
      >
        Copy link
      </button>
      {status && (
        <span 
          className="text-sm text-gray-600" 
          aria-live="polite"
        >
          {status}
        </span>
      )}
    </div>
  );
}