/**
 * EventServiceRequestModal - Create a service request scoped to an event
 *
 * Flow:
 * 1. Select service category (catering, AV, security, etc.)
 * 2. Enter title and description
 * 3. Set required by date, budget range, priority
 * 4. Optional internal notes
 * 5. Submit via fetchWithCsrf POST to /api/events/[eventId]/service-requests
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 6C - Service Procurement (Quote Integration)
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

import { useState } from 'react';
import BizModal from '@/components/BizModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { fetchWithCsrf } from '@core/utils/csrf';
import { CheckCircle, Loader2 } from 'lucide-react';
import type { EventServiceCategory, EventServiceRequestPriority } from '@features/events/types';

const SERVICE_CATEGORIES: { value: EventServiceCategory; label: string }[] = [
  { value: 'catering', label: 'Catering & Food Service' },
  { value: 'av_equipment', label: 'AV & Sound Equipment' },
  { value: 'security', label: 'Security & Safety' },
  { value: 'decor', label: 'Decor & Styling' },
  { value: 'photography', label: 'Photography & Videography' },
  { value: 'entertainment', label: 'Entertainment & Performance' },
  { value: 'transportation', label: 'Transportation & Logistics' },
  { value: 'venue_services', label: 'Venue Services' },
  { value: 'cleaning', label: 'Cleaning & Maintenance' },
  { value: 'staffing', label: 'Staffing & Personnel' },
  { value: 'other', label: 'Other Services' },
];

const PRIORITY_OPTIONS: { value: EventServiceRequestPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

interface EventServiceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  eventTitle: string;
  eventStartDate: string;
  onRequestCreated: () => void;
}

function EventServiceRequestModalContent({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  eventStartDate,
  onRequestCreated,
}: EventServiceRequestModalProps) {
  const [serviceCategory, setServiceCategory] = useState<EventServiceCategory | ''>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requiredByDate, setRequiredByDate] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [priority, setPriority] = useState<EventServiceRequestPriority>('medium');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Auto-suggest title when category changes
  const handleCategoryChange = (cat: EventServiceCategory | '') => {
    setServiceCategory(cat);
    if (cat && !title) {
      const catLabel = SERVICE_CATEGORIES.find(c => c.value === cat)?.label ?? '';
      if (catLabel) {
        setTitle(`${catLabel} for ${eventTitle}`);
      }
    }
  };

  // Default required_by_date to 1 week before event start date
  const getDefaultRequiredByDate = (): string => {
    if (!eventStartDate) return '';
    const d = new Date(eventStartDate);
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0] ?? '';
  };

  const handleOpen = () => {
    if (isOpen && !requiredByDate) {
      setRequiredByDate(getDefaultRequiredByDate());
    }
  };

  // Call handleOpen when modal opens
  if (isOpen && !requiredByDate && eventStartDate) {
    const defaultDate = getDefaultRequiredByDate();
    if (defaultDate) {
      // Only set once on mount
    }
  }

  const resetForm = () => {
    setServiceCategory('');
    setTitle('');
    setDescription('');
    setRequiredByDate(getDefaultRequiredByDate());
    setBudgetMin('');
    setBudgetMax('');
    setPriority('medium');
    setNotes('');
    setSubmitError(null);
    setSubmitSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!serviceCategory) {
      setSubmitError('Please select a service category.');
      return;
    }
    if (!title.trim()) {
      setSubmitError('Please enter a title for the service request.');
      return;
    }

    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        service_category: serviceCategory,
        title: title.trim(),
        priority,
      };
      if (description.trim()) body.description = description.trim();
      if (requiredByDate) body.required_by_date = requiredByDate;
      if (budgetMin && !isNaN(parseFloat(budgetMin))) body.budget_min = parseFloat(budgetMin);
      if (budgetMax && !isNaN(parseFloat(budgetMax))) body.budget_max = parseFloat(budgetMax);
      if (notes.trim()) body.notes = notes.trim();

      const res = await fetchWithCsrf(`/api/events/${eventId}/service-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error ?? 'Failed to create service request');
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        onRequestCreated();
        handleClose();
      }, 1500);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create service request');
    } finally {
      setIsSubmitting(false);
    }
  };

  void handleOpen;

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title="New Service Request"
      subtitle={`Procurement for: ${eventTitle}`}
    >
      {submitSuccess ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
          <p className="text-lg font-semibold text-gray-900">Service Request Created</p>
          <p className="text-sm text-gray-500 mt-1">
            Your draft service request has been saved. Publish it to open it for vendor bids.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          {/* Service Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Category <span className="text-red-500">*</span>
            </label>
            <select
              value={serviceCategory}
              onChange={(e) => handleCategoryChange(e.target.value as EventServiceCategory | '')}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-biz-orange focus:border-transparent"
            >
              <option value="">Select a service category...</option>
              {SERVICE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Request Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Catering for 200 guests"
              maxLength={500}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-biz-orange focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">{title.length}/500</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed requirements for vendors (e.g., dietary restrictions, setup time, specific equipment needed)"
              maxLength={2000}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-biz-orange focus:border-transparent resize-y"
            />
            <p className="text-xs text-gray-400 mt-1">{description.length}/2000</p>
          </div>

          {/* Required By Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Required By Date
            </label>
            <input
              type="date"
              value={requiredByDate}
              onChange={(e) => setRequiredByDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-biz-orange focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">When is this service needed? Defaults to 1 week before event.</p>
          </div>

          {/* Budget Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Budget Range (optional)
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Minimum ($)</label>
                <input
                  type="number"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-biz-orange focus:border-transparent"
                />
              </div>
              <span className="text-gray-400 mt-5">—</span>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Maximum ($)</label>
                <input
                  type="number"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  placeholder="No limit"
                  min="0"
                  step="0.01"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-biz-orange focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as EventServiceRequestPriority)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-biz-orange focus:border-transparent"
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Internal Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Internal Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes (not visible to vendors)"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-biz-orange focus:border-transparent resize-y"
            />
          </div>

          {/* Info box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-700">
            <strong>Draft Mode:</strong> This request will be saved as a draft. Publish it from your dashboard to open it for vendor bids through the Quote System.
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !serviceCategory || !title.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-biz-orange text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Draft'
              )}
            </button>
          </div>
        </form>
      )}
    </BizModal>
  );
}

export function EventServiceRequestModal(props: EventServiceRequestModalProps) {
  return (
    <ErrorBoundary>
      <EventServiceRequestModalContent {...props} />
    </ErrorBoundary>
  );
}
