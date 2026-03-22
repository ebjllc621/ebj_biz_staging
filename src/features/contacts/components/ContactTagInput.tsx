/**
 * ContactTagInput - Tag management with autocomplete
 *
 * GOVERNANCE COMPLIANCE:
 * - 'use client' directive: Required for client components
 * - Path aliases: @core/, @features/, @/
 * - SIMPLE tier: No ErrorBoundary required
 *
 * @authority docs/pages/layouts/home/user/user_dash/contacts/phases/PHASE_B_CRM_FEATURES_BRAIN_PLAN.md
 * @tier SIMPLE
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/features/profile/components/UserProfileEditModal.tsx - Lines 854-890 for tag input pattern
 */

'use client';

import { useState } from 'react';
import { X, Plus } from 'lucide-react';

interface ContactTagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
  placeholder?: string;
  maxTags?: number;
  disabled?: boolean;
}

export default function ContactTagInput({
  value,
  onChange,
  suggestions,
  placeholder = 'Add a tag',
  maxTags = 10,
  disabled = false
}: ContactTagInputProps) {
  const [tagInput, setTagInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Filter suggestions based on input
  const filteredSuggestions = suggestions
    .filter(s => s.toLowerCase().includes(tagInput.toLowerCase()))
    .filter(s => !value.includes(s))
    .slice(0, 5);

  const handleAddTag = (tag?: string) => {
    const newTag = (tag || tagInput).trim().toLowerCase();

    if (!newTag) return;
    if (value.includes(newTag)) return;
    if (value.length >= maxTags) return;

    onChange([...value, newTag]);
    setTagInput('');
    setShowSuggestions(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(value.filter(t => t !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="space-y-2">
      {/* Tag chips display */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag, index) => (
            <span
              key={index}
              className="bg-[#ed6437] text-white px-3 py-1 rounded-full text-sm flex items-center gap-1"
            >
              {tag}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="text-white hover:text-gray-200 ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Input field with autocomplete */}
      <div className="relative">
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => {
              setTagInput(e.target.value);
              setShowSuggestions(e.target.value.length > 0);
            }}
            onKeyPress={handleKeyPress}
            onFocus={() => setShowSuggestions(tagInput.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={value.length >= maxTags ? 'Maximum tags reached' : placeholder}
            disabled={disabled || value.length >= maxTags}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200 transition shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            type="button"
            onClick={() => handleAddTag()}
            disabled={!tagInput.trim() || disabled || value.length >= maxTags}
            className="px-4 py-2 bg-[#022641] text-white rounded-lg hover:bg-[#033a5c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Autocomplete dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleAddTag(suggestion)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Helper text */}
      <p className="text-xs text-gray-500">
        {value.length} / {maxTags} tags. Press Enter or comma to add.
      </p>
    </div>
  );
}
