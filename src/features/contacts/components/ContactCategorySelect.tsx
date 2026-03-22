/**
 * ContactCategorySelect - Category dropdown for contact organization
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
 */

'use client';

import type { ContactCategory } from '../types';

interface ContactCategorySelectProps {
  value: ContactCategory | null;
  onChange: (category: ContactCategory | null) => void;
  disabled?: boolean;
}

const CATEGORIES: Array<{ value: ContactCategory; label: string; description: string }> = [
  { value: 'client', label: 'Client', description: 'Current or potential customer' },
  { value: 'partner', label: 'Partner', description: 'Business partner or collaborator' },
  { value: 'lead', label: 'Lead', description: 'Sales lead or prospect' },
  { value: 'friend', label: 'Friend', description: 'Personal connection' },
  { value: 'other', label: 'Other', description: 'Uncategorized' }
];

export default function ContactCategorySelect({
  value,
  onChange,
  disabled = false
}: ContactCategorySelectProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">Category</label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value as ContactCategory || null)}
        disabled={disabled}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200 transition shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <option value="">No category</option>
        {CATEGORIES.map(cat => (
          <option key={cat.value} value={cat.value}>
            {cat.label} - {cat.description}
          </option>
        ))}
      </select>
    </div>
  );
}
