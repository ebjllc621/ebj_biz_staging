/**
 * AddContactModal - Manual Contact Creation
 *
 * @tier STANDARD
 * @authority Phase C Brain Plan
 *
 * Features:
 * - Name field (required)
 * - Email, phone, company fields (optional)
 * - Source selection (required)
 * - Source details (optional)
 * - Initial CRM fields (notes, tags, category, priority)
 * - Follow-up reminder option
 * - Validation and error handling
 * - BizModal with multi-section layout
 *
 * GOVERNANCE COMPLIANCE:
 * - 'use client' directive for client component
 * - BizModal: MANDATORY for all modals
 * - fetchCsrfToken: MANDATORY for POST
 * - credentials: 'include' for authenticated requests
 * - Import paths: Uses @core/, @features/, @/ aliases
 *
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @brain-plan docs/pages/layouts/home/user/user_dash/contacts/phases/PHASE_C_MANUAL_CONTACTS_BRAIN_PLAN.md
 */

'use client';

import { useState, useCallback } from 'react';
import { UserPlus, Mail, Phone, Building2 } from 'lucide-react';
import { fetchCsrfToken } from '@core/utils/csrf';
import BizModal, { BizModalSectionHeader } from '@/components/BizModal/BizModal';
import type { ContactSource, ContactCategory, ContactPriority } from '../types';
import ContactTagInput from './ContactTagInput';
import ContactCategorySelect from './ContactCategorySelect';
import ContactReminderPicker from './ContactReminderPicker';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContactCreated: () => void;
  availableTags?: string[];
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  source: ContactSource;
  source_details: string;
  notes: string;
  tags: string[];
  category: ContactCategory | null;
  priority: ContactPriority | null;
  follow_up_date: Date | null;
  follow_up_note: string;
}

const SOURCE_OPTIONS: { value: ContactSource; label: string; description: string }[] = [
  { value: 'listing_inquiry', label: 'Listing Inquiry', description: 'Someone who inquired about your listing' },
  { value: 'event', label: 'Event/Networking', description: 'Met at conference, meetup, or event' },
  { value: 'referral', label: 'Referral', description: 'Referred by another contact' },
  { value: 'manual', label: 'Other', description: 'Manual entry from other source' }
];

export function AddContactModal({
  isOpen,
  onClose,
  onContactCreated,
  availableTags = []
}: AddContactModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    company: '',
    source: 'manual',
    source_details: '',
    notes: '',
    tags: [],
    category: null,
    priority: null,
    follow_up_date: null,
    follow_up_note: ''
  });

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      source: 'manual',
      source_details: '',
      notes: '',
      tags: [],
      category: null,
      priority: null,
      follow_up_date: null,
      follow_up_note: ''
    });
    setErrors({});
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Contact name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const csrfToken = await fetchCsrfToken();

      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || ''
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          company: formData.company.trim() || undefined,
          source: formData.source,
          source_details: formData.source_details.trim() || undefined,
          notes: formData.notes.trim() || undefined,
          tags: formData.tags.length > 0 ? formData.tags : undefined,
          category: formData.category || undefined,
          priority: formData.priority || undefined,
          follow_up_date: formData.follow_up_date?.toISOString().split('T')[0] || undefined,
          follow_up_note: formData.follow_up_note.trim() || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to create contact');
      }

      onContactCreated();
      handleClose();
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to create contact'
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onContactCreated]);

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Contact"
      subtitle="Create a new manual contact"
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Error Display */}
        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {errors.submit}
          </div>
        )}

        {/* Section 1: Basic Information */}
        <div>
          <BizModalSectionHeader step={1} title="Basic Information" />
          <div className="space-y-4">
            {/* Name (required) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Contact name"
                  disabled={isSubmitting}
                  className={`w-full pl-10 pr-3 py-2 rounded-lg border ${
                    errors.name ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-[#ed6437]'
                  } focus:outline-none focus:ring-2 ${
                    errors.name ? 'focus:ring-red-200' : 'focus:ring-orange-200'
                  } transition shadow-sm disabled:bg-gray-100`}
                />
              </div>
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@example.com"
                    disabled={isSubmitting}
                    className={`w-full pl-10 pr-3 py-2 rounded-lg border ${
                      errors.email ? 'border-red-300' : 'border-gray-300'
                    } focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200 transition shadow-sm disabled:bg-gray-100`}
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+1 (555) 000-0000"
                    disabled={isSubmitting}
                    className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200 transition shadow-sm disabled:bg-gray-100"
                  />
                </div>
              </div>
            </div>

            {/* Company */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="Company or organization"
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200 transition shadow-sm disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Source */}
        <div>
          <BizModalSectionHeader step={2} title="How did you meet?" />
          <div className="space-y-3">
            {SOURCE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <input
                  type="radio"
                  name="source"
                  value={option.value}
                  checked={formData.source === option.value}
                  onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value as ContactSource }))}
                  disabled={isSubmitting}
                  className="mt-1 w-4 h-4 text-orange-600 focus:ring-orange-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{option.label}</div>
                  <div className="text-xs text-gray-500">{option.description}</div>
                </div>
              </label>
            ))}

            {/* Source Details */}
            {formData.source !== 'manual' && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.source === 'event' && 'Event name'}
                  {formData.source === 'referral' && 'Who referred them?'}
                  {formData.source === 'listing_inquiry' && 'Which listing?'}
                </label>
                <input
                  type="text"
                  value={formData.source_details}
                  onChange={(e) => setFormData(prev => ({ ...prev, source_details: e.target.value }))}
                  placeholder="Additional details..."
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200 transition shadow-sm disabled:bg-gray-100"
                />
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Organization (Optional) */}
        <div>
          <BizModalSectionHeader step={3} title="Organization (Optional)" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ContactCategorySelect
              value={formData.category}
              onChange={(category) => setFormData(prev => ({ ...prev, category }))}
              disabled={isSubmitting}
            />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Priority</label>
              <select
                value={formData.priority || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as ContactPriority || null }))}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200 transition shadow-sm disabled:bg-gray-100"
              >
                <option value="">No priority</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <ContactTagInput
              value={formData.tags}
              onChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
              suggestions={availableTags}
              disabled={isSubmitting}
              placeholder="Add tags to organize this contact..."
            />
          </div>
        </div>

        {/* Section 4: Follow-up Reminder (Optional) */}
        <div>
          <BizModalSectionHeader step={4} title="Set Reminder (Optional)" />
          <ContactReminderPicker
            date={formData.follow_up_date}
            note={formData.follow_up_note}
            onDateChange={(date) => setFormData(prev => ({ ...prev, follow_up_date: date }))}
            onNoteChange={(note) => setFormData(prev => ({ ...prev, follow_up_note: note }))}
            disabled={isSubmitting}
          />
        </div>

        {/* Section 5: Notes (Optional) */}
        <div>
          <BizModalSectionHeader step={5} title="Notes (Optional)" />
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Add any initial notes about this contact..."
            rows={3}
            disabled={isSubmitting}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200 transition shadow-sm resize-none disabled:bg-gray-100"
          />
        </div>
      </div>

      {/* Modal Footer */}
      <div className="mt-6 flex justify-end gap-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={handleClose}
          disabled={isSubmitting}
          className="px-6 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !formData.name.trim()}
          className="px-6 py-2.5 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55730] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating...' : 'Create Contact'}
        </button>
      </div>
    </BizModal>
  );
}

export default AddContactModal;
