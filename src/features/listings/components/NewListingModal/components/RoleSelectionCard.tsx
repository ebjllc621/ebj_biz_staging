'use client';

/**
 * RoleSelectionCard Component
 * Radio-style selection card for user role selection
 * Authority: PHASE_6_BRAIN_PLAN.md
 * Tier: STANDARD
 */

import React from 'react';

interface RoleSelectionCardProps {
  value: 'owner' | 'manager' | 'user';
  label: string;
  description: string;
  isSelected: boolean;
  onSelect: (value: 'owner' | 'manager' | 'user') => void;
}

export function RoleSelectionCard({
  value,
  label,
  description,
  isSelected,
  onSelect,
}: RoleSelectionCardProps) {
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(value);
    }
  };

  return (
    <div
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onClick={() => onSelect(value)}
      onKeyDown={handleKeyPress}
      className={`
        p-4 border-2 rounded-lg cursor-pointer transition-all
        ${
          isSelected
            ? 'border-orange-500 bg-orange-50'
            : 'border-gray-300 bg-white hover:border-gray-400'
        }
      `}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 pt-1">
          <div
            className={`
              w-5 h-5 rounded-full border-2 flex items-center justify-center
              ${
                isSelected
                  ? 'border-orange-500 bg-orange-500'
                  : 'border-gray-400 bg-white'
              }
            `}
          >
            {isSelected && (
              <div className="w-2 h-2 bg-white rounded-full" />
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-navy-900">{label}</div>
          <div className="text-sm text-gray-600 mt-1">{description}</div>
        </div>
      </div>
    </div>
  );
}
