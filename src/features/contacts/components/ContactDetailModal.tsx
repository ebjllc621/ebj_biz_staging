/**
 * ContactDetailModal - Contact Detail and CRM Editor
 *
 * @tier ADVANCED
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/pages/layouts/home/user/user_dash/contacts/phases/PHASE_B_CRM_FEATURES_BRAIN_PLAN.md
 *
 * GOVERNANCE COMPLIANCE:
 * - Client component ('use client' directive)
 * - BizModal wrapper (MANDATORY for all modals)
 * - ErrorBoundary wrapper (ADVANCED tier requirement)
 * - Path aliases (@features/, @components/, @core/)
 * - Lucide React icons only
 * - fetchWithCsrf for mutations
 *
 * @reference src/features/profile/components/UserProfileEditModal.tsx - Multi-section modal pattern
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star, MessageSquare, Archive, UserX, Calendar, Mail, Phone, Building2, MapPin, Globe, Linkedin, Instagram, Facebook } from 'lucide-react';
import { fetchCsrfToken } from '@core/utils/csrf';
import BizModal, { BizModalSectionHeader } from '@/components/BizModal/BizModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import type { Contact, UpdateContactInput, ContactCategory, ContactPriority, ContactSocialLinks } from '../types';
import ContactNotesEditor from './ContactNotesEditor';
import ContactTagInput from './ContactTagInput';
import ContactReminderPicker from './ContactReminderPicker';
import ContactCategorySelect from './ContactCategorySelect';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ContactDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact;
  onContactUpdate: (updatedContact: Contact) => void;
  onRemove: () => void;
  onMessage: () => void;
  availableTags?: string[];
}

interface ContactInfoFormData {
  contact_email: string;
  contact_phone: string;
  contact_company: string;
  contact_address: string;
  social_facebook: string;
  social_instagram: string;
  social_linkedin: string;
  social_twitter: string;
  social_bizconekt: string;
  social_website: string;
}

interface CRMFormData {
  notes: string | null;
  tags: string[];
  category: ContactCategory | null;
  priority: ContactPriority | null;
  follow_up_date: Date | null;
  follow_up_note: string | null;
  last_contacted_at: Date | null;
  is_starred: boolean;
}

// ============================================================================
// CONTACTDETAILMODAL CONTENT
// ============================================================================

function ContactDetailModalContent({
  isOpen,
  onClose,
  contact,
  onContactUpdate,
  onRemove,
  onMessage,
  availableTags = []
}: ContactDetailModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isManualContact = !contact.is_connected;

  // Contact info form state (for manual contacts)
  const [contactInfo, setContactInfo] = useState<ContactInfoFormData>({
    contact_email: contact.contact_email || '',
    contact_phone: contact.contact_phone || '',
    contact_company: contact.contact_company || '',
    contact_address: contact.contact_address || '',
    social_facebook: contact.contact_social_links?.facebook || '',
    social_instagram: contact.contact_social_links?.instagram || '',
    social_linkedin: contact.contact_social_links?.linkedin || '',
    social_twitter: contact.contact_social_links?.twitter || '',
    social_bizconekt: contact.contact_social_links?.bizconekt || '',
    social_website: contact.contact_social_links?.website || ''
  });

  // CRM form state
  const [crmData, setCrmData] = useState<CRMFormData>({
    notes: contact.notes,
    tags: contact.tags || [],
    category: contact.category,
    priority: contact.priority,
    follow_up_date: contact.follow_up_date,
    follow_up_note: contact.follow_up_note,
    last_contacted_at: contact.last_contacted_at,
    is_starred: contact.is_starred
  });

  // Reset form when contact changes
  useEffect(() => {
    setContactInfo({
      contact_email: contact.contact_email || '',
      contact_phone: contact.contact_phone || '',
      contact_company: contact.contact_company || '',
      contact_address: contact.contact_address || '',
      social_facebook: contact.contact_social_links?.facebook || '',
      social_instagram: contact.contact_social_links?.instagram || '',
      social_linkedin: contact.contact_social_links?.linkedin || '',
      social_twitter: contact.contact_social_links?.twitter || '',
      social_bizconekt: contact.contact_social_links?.bizconekt || '',
      social_website: contact.contact_social_links?.website || ''
    });
    setCrmData({
      notes: contact.notes,
      tags: contact.tags || [],
      category: contact.category,
      priority: contact.priority,
      follow_up_date: contact.follow_up_date,
      follow_up_note: contact.follow_up_note,
      last_contacted_at: contact.last_contacted_at,
      is_starred: contact.is_starred
    });
    setErrors({});
    setSuccessMessage(null);
  }, [contact]);

  // Toggle star status
  const handleToggleStar = useCallback(async () => {
    try {
      const csrfToken = await fetchCsrfToken();

      const response = await fetch(`/api/contacts/${contact.user_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || ''
        },
        credentials: 'include',
        body: JSON.stringify({ is_starred: !crmData.is_starred })
      });

      if (!response.ok) {
        throw new Error('Failed to toggle star');
      }

      const result = await response.json();
      const updated = result.data?.contact || result.contact;

      setCrmData(prev => ({ ...prev, is_starred: !prev.is_starred }));
      onContactUpdate(updated);
    } catch (error) {
      setErrors({ star: 'Failed to update star status' });
    }
  }, [contact.user_id, crmData.is_starred, onContactUpdate]);

  // Save CRM data
  const handleSave = useCallback(async () => {
    setIsSubmitting(true);
    setErrors({});
    setSuccessMessage(null);

    try {
      const csrfToken = await fetchCsrfToken();

      // Build social links object (only include non-empty values)
      const socialLinks: ContactSocialLinks = {};
      if (contactInfo.social_facebook.trim()) socialLinks.facebook = contactInfo.social_facebook.trim();
      if (contactInfo.social_instagram.trim()) socialLinks.instagram = contactInfo.social_instagram.trim();
      if (contactInfo.social_linkedin.trim()) socialLinks.linkedin = contactInfo.social_linkedin.trim();
      if (contactInfo.social_twitter.trim()) socialLinks.twitter = contactInfo.social_twitter.trim();
      if (contactInfo.social_bizconekt.trim()) socialLinks.bizconekt = contactInfo.social_bizconekt.trim();
      if (contactInfo.social_website.trim()) socialLinks.website = contactInfo.social_website.trim();
      const hasSocialLinks = Object.keys(socialLinks).length > 0;

      const input: UpdateContactInput = {
        notes: crmData.notes,
        tags: crmData.tags.length > 0 ? crmData.tags : null,
        category: crmData.category,
        priority: crmData.priority,
        follow_up_date: crmData.follow_up_date ? crmData.follow_up_date.toISOString().split('T')[0] : null,
        follow_up_note: crmData.follow_up_note,
        last_contacted_at: crmData.last_contacted_at ? crmData.last_contacted_at.toISOString() : null,
        is_starred: crmData.is_starred,
        // Include contact info fields for manual contacts
        ...(isManualContact ? {
          contact_email: contactInfo.contact_email.trim() || null,
          contact_phone: contactInfo.contact_phone.trim() || null,
          contact_company: contactInfo.contact_company.trim() || null,
          contact_address: contactInfo.contact_address.trim() || null,
          contact_social_links: hasSocialLinks ? socialLinks : null
        } : {})
      };

      const response = await fetch(`/api/contacts/${contact.user_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || ''
        },
        credentials: 'include',
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update contact');
      }

      const result = await response.json();
      const updated = result.data?.contact || result.contact;

      setSuccessMessage('Contact updated successfully!');
      onContactUpdate(updated);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1500);
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to save changes'
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [contact.user_id, crmData, contactInfo, isManualContact, onContactUpdate, onClose]);

  // Format dates
  const connectedSince = new Date(contact.connected_since).toLocaleDateString();
  const lastInteraction = contact.last_interaction
    ? new Date(contact.last_interaction).toLocaleDateString()
    : 'Never';

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={`${contact.display_name || contact.username}`}
      subtitle={`@${contact.username} • ${contact.connection_type || 'Connection'}`}
    >
      <div className="space-y-6">
        {/* Contact Header */}
        <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {contact.avatar_url ? (
              <img
                src={contact.avatar_url}
                alt={contact.display_name || contact.username}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#ed6437] flex items-center justify-center text-white text-2xl font-semibold">
                {(contact.display_name || contact.username).charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Contact Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {contact.display_name || contact.username}
              </h3>
              <button
                type="button"
                onClick={handleToggleStar}
                className="p-1 rounded hover:bg-gray-200 transition-colors"
                title={crmData.is_starred ? 'Unstar' : 'Star contact'}
              >
                <Star
                  className={`w-5 h-5 ${
                    crmData.is_starred
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-400'
                  }`}
                />
              </button>
            </div>
            <p className="text-sm text-gray-600">@{contact.username}</p>

            {/* Contact Email & Phone */}
            {(contact.contact_email || contact.contact_phone) && (
              <div className="mt-2 space-y-1">
                {contact.contact_email && (
                  <a
                    href={`mailto:${contact.contact_email}`}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-biz-orange transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    <span>{contact.contact_email}</span>
                  </a>
                )}
                {contact.contact_phone && (
                  <a
                    href={`tel:${contact.contact_phone}`}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-biz-orange transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    <span>{contact.contact_phone}</span>
                  </a>
                )}
              </div>
            )}

            <div className="mt-2 text-xs text-gray-500 space-y-1">
              <p>Connected since: {connectedSince}</p>
              <p>Last interaction: {lastInteraction}</p>
              {contact.mutual_connections > 0 && (
                <p>{contact.mutual_connections} mutual connections</p>
              )}
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
            {successMessage}
          </div>
        )}
        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {errors.submit}
          </div>
        )}

        {/* Section 1: Contact Information (manual contacts only) */}
        {isManualContact && (
          <div>
            <BizModalSectionHeader step={1} title="Contact Information" />
            <div className="space-y-4">
              {/* Email & Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    <Mail className="w-4 h-4 text-gray-400" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={contactInfo.contact_email}
                    onChange={(e) => setContactInfo(prev => ({ ...prev, contact_email: e.target.value }))}
                    disabled={isSubmitting}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200 transition shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    <Phone className="w-4 h-4 text-gray-400" />
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={contactInfo.contact_phone}
                    onChange={(e) => setContactInfo(prev => ({ ...prev, contact_phone: e.target.value }))}
                    disabled={isSubmitting}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200 transition shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              {/* Company & Address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    Company
                  </label>
                  <input
                    type="text"
                    value={contactInfo.contact_company}
                    onChange={(e) => setContactInfo(prev => ({ ...prev, contact_company: e.target.value }))}
                    disabled={isSubmitting}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200 transition shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Company name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    Address
                  </label>
                  <input
                    type="text"
                    value={contactInfo.contact_address}
                    onChange={(e) => setContactInfo(prev => ({ ...prev, contact_address: e.target.value }))}
                    disabled={isSubmitting}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200 transition shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="123 Main St, City, State"
                  />
                </div>
              </div>

              {/* Social Links */}
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <Globe className="w-4 h-4 text-gray-400" />
                  Social Links
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 w-20">Bizconekt</span>
                    <input
                      type="text"
                      value={contactInfo.social_bizconekt}
                      onChange={(e) => setContactInfo(prev => ({ ...prev, social_bizconekt: e.target.value }))}
                      disabled={isSubmitting}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200 transition shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="Username or profile URL"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Linkedin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <input
                      type="text"
                      value={contactInfo.social_linkedin}
                      onChange={(e) => setContactInfo(prev => ({ ...prev, social_linkedin: e.target.value }))}
                      disabled={isSubmitting}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200 transition shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="LinkedIn URL"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Facebook className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <input
                      type="text"
                      value={contactInfo.social_facebook}
                      onChange={(e) => setContactInfo(prev => ({ ...prev, social_facebook: e.target.value }))}
                      disabled={isSubmitting}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200 transition shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="Facebook URL"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Instagram className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <input
                      type="text"
                      value={contactInfo.social_instagram}
                      onChange={(e) => setContactInfo(prev => ({ ...prev, social_instagram: e.target.value }))}
                      disabled={isSubmitting}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200 transition shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="Instagram handle"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 w-20">X/Twitter</span>
                    <input
                      type="text"
                      value={contactInfo.social_twitter}
                      onChange={(e) => setContactInfo(prev => ({ ...prev, social_twitter: e.target.value }))}
                      disabled={isSubmitting}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200 transition shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="@handle or URL"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <input
                      type="text"
                      value={contactInfo.social_website}
                      onChange={(e) => setContactInfo(prev => ({ ...prev, social_website: e.target.value }))}
                      disabled={isSubmitting}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200 transition shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="https://website.com"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Notes */}
        <div>
          <BizModalSectionHeader step={isManualContact ? 2 : 1} title="Notes" />
          <ContactNotesEditor
            value={crmData.notes}
            onChange={(notes) => setCrmData(prev => ({ ...prev, notes }))}
            disabled={isSubmitting}
          />
        </div>

        {/* Section 3: Organization */}
        <div>
          <BizModalSectionHeader step={isManualContact ? 3 : 2} title="Organization" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ContactCategorySelect
              value={crmData.category}
              onChange={(category) => setCrmData(prev => ({ ...prev, category }))}
              disabled={isSubmitting}
            />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Priority</label>
              <select
                value={crmData.priority || ''}
                onChange={(e) => setCrmData(prev => ({
                  ...prev,
                  priority: e.target.value as ContactPriority || null
                }))}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200 transition shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">No priority</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Tags */}
        <div>
          <BizModalSectionHeader step={isManualContact ? 4 : 3} title="Tags" />
          <ContactTagInput
            value={crmData.tags}
            onChange={(tags) => setCrmData(prev => ({ ...prev, tags }))}
            suggestions={availableTags}
            disabled={isSubmitting}
          />
        </div>

        {/* Section 5: Follow-up Reminder */}
        <div>
          <BizModalSectionHeader step={isManualContact ? 5 : 4} title="Follow-up Reminder" />
          <ContactReminderPicker
            date={crmData.follow_up_date}
            note={crmData.follow_up_note}
            onDateChange={(date) => setCrmData(prev => ({ ...prev, follow_up_date: date }))}
            onNoteChange={(note) => setCrmData(prev => ({ ...prev, follow_up_note: note }))}
            disabled={isSubmitting}
          />
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2 justify-between">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onMessage}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-[#022641] text-white rounded-lg hover:bg-[#033a5c] transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Message
              </button>
              <button
                type="button"
                onClick={() => {
                  setCrmData(prev => ({ ...prev, category: 'archived' as ContactCategory }));
                  handleSave();
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                title="Move to archived category"
              >
                <Archive className="w-4 h-4" />
                Archive
              </button>
            </div>
            <button
              type="button"
              onClick={onRemove}
              className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <UserX className="w-4 h-4" />
              Remove Contact
            </button>
          </div>
        </div>
      </div>

      {/* Modal Footer */}
      <div className="mt-6 flex justify-end gap-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="px-6 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSubmitting}
          className="px-6 py-2.5 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55730] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </BizModal>
  );
}

// ============================================================================
// ERRORBOUNDARY WRAPPER (MANDATORY FOR ADVANCED TIER)
// ============================================================================

export default function ContactDetailModal(props: ContactDetailModalProps) {
  return (
    <ErrorBoundary>
      <ContactDetailModalContent {...props} />
    </ErrorBoundary>
  );
}
