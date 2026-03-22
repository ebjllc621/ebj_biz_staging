/**
 * TagFilter - Tag filtering component with performance optimizations
 *
 * GOVERNANCE COMPLIANCE:
 * - Phase R4.1 - useCallback optimization for event handlers
 * - Prevents unnecessary function recreations on re-render
 *
 * @authority docs/codeReview/12-8-25/phases/R4_BRAIN_PLAN.md
 * @phase Phase R4.1 - React Component Optimization
 */

'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { FormEvent, useState, useCallback } from 'react';
import type { Route } from 'next';

interface TagFilterProps {
  className?: string;
}

export default function TagFilter({ className }: TagFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const currentTags = searchParams.get('tags') || '';
  const [statusMessage, setStatusMessage] = useState('');

  const normalizeTags = (tagsInput: string): string => {
    return tagsInput
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .filter((tag, index, arr) => arr.indexOf(tag) === index) // dedupe
      .join(',');
  };

  /**
   * Handle form submission (R4.1 - useCallback optimization)
   */
  const handleSubmit = useCallback((e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const tagsInput = formData.get('tags') as string || '';
    const canonicalCSV = normalizeTags(tagsInput);

    const params = new URLSearchParams(searchParams.toString());

    if (canonicalCSV) {
      params.set('tags', canonicalCSV);
      const tagCount = canonicalCSV.split(',').length;
      setStatusMessage(`Applied ${tagCount} tag${tagCount === 1 ? '' : 's'}`);
    } else {
      params.delete('tags');
      setStatusMessage('Tags cleared');
    }

    // Reset to page 1 when tags change
    params.set('page', '1');

    const url = `${pathname}?${params.toString()}`;
    router.push(url as Route);

    // Clear status message after a delay
    setTimeout(() => setStatusMessage(''), 2000);
  }, [router, pathname, searchParams]);

  /**
   * Handle clear button (R4.1 - useCallback optimization)
   */
  const handleClear = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('tags');
    params.set('page', '1');

    const url = `${pathname}?${params.toString()}`;
    router.push(url as Route);
    setStatusMessage('Tags cleared');
    setTimeout(() => setStatusMessage(''), 2000);
  }, [router, pathname, searchParams]);

  const tagCount = currentTags ? currentTags.split(',').filter(t => t.trim()).length : 0;

  return (
    <form 
      onSubmit={handleSubmit}
      role="search"
      className={`mb-4 bg-white p-4 rounded-lg border shadow-sm ${className || ''}`}
    >
      <div className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1">
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>
          <input
            id="tags"
            name="tags"
            type="text"
            defaultValue={currentTags}
            placeholder="tag1, tag2, tag3"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Apply
          </button>
          
          {currentTags && (
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      
      <div className="mt-2 flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {tagCount > 0 && `${tagCount} tag${tagCount === 1 ? '' : 's'} active`}
        </div>
        
        {statusMessage && (
          <div 
            className="text-xs text-blue-600"
            aria-live="polite"
            role="status"
          >
            {statusMessage}
          </div>
        )}
      </div>
    </form>
  );
}