/**
 * ContactReminderPicker - Follow-up reminder date and note picker
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

import { Calendar, X } from 'lucide-react';

interface ContactReminderPickerProps {
  date: Date | null;
  note: string | null;
  onDateChange: (date: Date | null) => void;
  onNoteChange: (note: string) => void;
  disabled?: boolean;
}

export default function ContactReminderPicker({
  date,
  note,
  onDateChange,
  onNoteChange,
  disabled = false
}: ContactReminderPickerProps) {
  // Format date for input (YYYY-MM-DD)
  const dateValue = date ? date.toISOString().split('T')[0] : '';

  // Quick date buttons
  const setQuickDate = (days: number) => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + days);
    onDateChange(newDate);
  };

  const clearReminder = () => {
    onDateChange(null);
    onNoteChange('');
  };

  return (
    <div className="space-y-3">
      {/* Date picker with quick buttons */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Follow-up Date</label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="date"
              value={dateValue}
              onChange={(e) => onDateChange(e.target.value ? new Date(e.target.value) : null)}
              disabled={disabled}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200 transition shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <Calendar className="absolute right-3 top-2.5 w-4 h-4 text-gray-600 pointer-events-none" />
          </div>
          {date && (
            <button
              type="button"
              onClick={clearReminder}
              disabled={disabled}
              className="px-3 py-2 text-gray-600 hover:text-red-600 transition-colors disabled:opacity-50"
              title="Clear reminder"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick date buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setQuickDate(1)}
            disabled={disabled}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Tomorrow
          </button>
          <button
            type="button"
            onClick={() => setQuickDate(7)}
            disabled={disabled}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next Week
          </button>
          <button
            type="button"
            onClick={() => setQuickDate(30)}
            disabled={disabled}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next Month
          </button>
        </div>
      </div>

      {/* Reminder note */}
      {date && (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Reminder Note</label>
          <textarea
            value={note || ''}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="What to follow up about..."
            disabled={disabled}
            rows={3}
            maxLength={500}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200 transition shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed resize-vertical"
          />
          <p className="text-xs text-gray-500">
            {(note?.length || 0)} / 500
          </p>
        </div>
      )}
    </div>
  );
}
