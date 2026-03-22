/**
 * SearchBar - Homepage Search Component with Scope Selector
 *
 * @tier STANDARD
 * @generated DNA v11.0.1
 * @dna-version 11.0.1
 */
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronDown } from 'lucide-react';
import { SearchScope } from '../types';

interface SearchBarProps {
  /** Initial search query */
  initialQuery?: string;
  /** Initial search scope */
  initialScope?: SearchScope;
  /** Placeholder text */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
}

const SCOPE_OPTIONS: { value: SearchScope; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'listings', label: 'Listings' },
  { value: 'offers', label: 'Offers' },
  { value: 'events', label: 'Events' }
];

/**
 * SearchBar component with scope selector
 * Provides search functionality with ability to filter by listings, offers, or events
 */
export function SearchBar({
  initialQuery = '',
  initialScope = 'all',
  placeholder = 'What are you looking for?',
  className = ''
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [scope, setScope] = useState<SearchScope>(initialScope);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      const searchParams = new URLSearchParams();
      searchParams.set('q', query.trim());
      if (scope !== 'all') {
        searchParams.set('scope', scope);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.push(`/search?${searchParams.toString()}` as any);
    }
  }, [query, scope, router]);

  const handleScopeChange = useCallback((newScope: SearchScope) => {
    setScope(newScope);
    setIsDropdownOpen(false);
  }, []);

  const selectedScopeLabel = SCOPE_OPTIONS.find(opt => opt.value === scope)?.label ?? 'All';

  return (
    <form onSubmit={handleSearch} className={`w-full max-w-2xl mx-auto ${className}`}>
      <div className="relative flex items-center">
        {/* Search Icon */}
        <div className="absolute left-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-600" />
        </div>

        {/* Search Input */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-12 pr-36 py-4 text-gray-900 bg-white rounded-full border-0 shadow-lg focus:ring-2 focus:ring-biz-orange focus:outline-none text-base"
          aria-label="Search"
        />

        {/* Scope Selector and Submit Button */}
        <div className="absolute right-2 flex items-center gap-2">
          {/* Scope Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 focus:outline-none"
              aria-haspopup="listbox"
              aria-expanded={isDropdownOpen}
            >
              <span className="hidden sm:inline">In:</span>
              <span className="font-medium">{selectedScopeLabel}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div
                className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-10"
                role="listbox"
              >
                {SCOPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleScopeChange(option.value)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg ${
                      scope === option.value ? 'bg-biz-orange/10 text-biz-orange font-medium' : 'text-gray-700'
                    }`}
                    role="option"
                    aria-selected={scope === option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="bg-biz-orange text-white px-6 py-2 rounded-full hover:bg-biz-orange/90 transition-colors font-medium text-sm"
          >
            Search
          </button>
        </div>
      </div>
    </form>
  );
}

export default SearchBar;
