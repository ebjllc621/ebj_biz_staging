/**
 * ContactNotesEditor - Rich text notes input for contacts
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

interface ContactNotesEditorProps {
  value: string | null;
  onChange: (notes: string) => void;
  maxLength?: number;
  placeholder?: string;
  disabled?: boolean;
}

export default function ContactNotesEditor({
  value,
  onChange,
  maxLength = 5000,
  placeholder = 'Add private notes about this contact...',
  disabled = false
}: ContactNotesEditorProps) {
  const currentLength = value?.length || 0;

  return (
    <div className="space-y-2">
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        rows={6}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200 transition shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed resize-vertical"
      />
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>Private notes visible only to you</span>
        <span>
          {currentLength} / {maxLength}
        </span>
      </div>
    </div>
  );
}
