'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent } from 'react';

interface SearchControlsProps {
  className?: string;
}

export default function SearchControls({ className }: SearchControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const currentQuery = searchParams.get('q') || '';
  const currentSort = searchParams.get('sort') || '';

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const q = formData.get('q') as string;
    const sort = formData.get('sort') as string;
    
    const params = new URLSearchParams(searchParams.toString());
    
    // Update search and sort params
    if (q.trim()) {
      params.set('q', q.trim());
    } else {
      params.delete('q');
    }
    
    if (sort && (sort === 'recent' || sort === 'name')) {
      params.set('sort', sort);
    } else {
      params.delete('sort');
    }
    
    // Reset to page 1 when searching
    params.set('page', '1');
    
    router.push(`/listings?${params.toString()}`);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sort = e.target.value;
    
    const params = new URLSearchParams(searchParams.toString());
    
    if (sort && (sort === 'recent' || sort === 'name')) {
      params.set('sort', sort);
    } else {
      params.delete('sort');
    }
    
    // Reset to page 1 when changing sort
    params.set('page', '1');
    
    router.push(`/listings?${params.toString()}`);
  };

  return (
    <form 
      onSubmit={handleSubmit}
      role="search"
      className={`mb-6 bg-white p-4 rounded-lg border shadow-sm ${className || ''}`}
    >
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="search-query" className="block text-sm font-medium text-gray-700 mb-2">
            Search Listings
          </label>
          <input
            id="search-query"
            name="q"
            type="text"
            defaultValue={currentQuery}
            placeholder="Search by title or description..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="sm:w-48">
          <label htmlFor="sort-select" className="block text-sm font-medium text-gray-700 mb-2">
            Sort By
          </label>
          <select
            id="sort-select"
            name="sort"
            value={currentSort}
            onChange={handleSortChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Default</option>
            <option value="recent">Most Recent</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>
        
        <div className="flex items-end">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Search
          </button>
        </div>
      </div>
    </form>
  );
}