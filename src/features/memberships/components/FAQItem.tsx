/**
 * FAQItem - Accordion item for FAQ section
 *
 * @tier SIMPLE
 * @phase Phase 3 - Public Memberships Page
 */
'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { FAQItem as FAQItemType } from '../types';

interface FAQItemProps {
  item: FAQItemType;
  isOpen?: boolean;
  onToggle?: () => void;
}

export function FAQItem({ item, isOpen = false, onToggle }: FAQItemProps) {
  const [internalOpen, setInternalOpen] = useState(isOpen);
  const open = onToggle ? isOpen : internalOpen;
  const handleToggle = onToggle || (() => setInternalOpen(!internalOpen));

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between py-4 text-left hover:text-[#ed6437] transition-colors"
      >
        <span className="font-semibold text-[#022641] pr-4">{item.question}</span>
        <ChevronDown
          className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? 'max-h-96 pb-4' : 'max-h-0'
        }`}
      >
        <p className="text-gray-600 leading-relaxed">{item.answer}</p>
      </div>
    </div>
  );
}
