/**
 * ContactDisplayPanel - Inline contact display with touch-to-connect actions
 *
 * @tier STANDARD
 * @phase Contacts Enhancement Phase 1
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @avatar-governance AVATAR_DISPLAY_GOVERNANCE.md
 *
 * Displays contact information in an inline expandable panel when a contact
 * card is clicked. Provides read-only view of contact data with action buttons.
 * Full editing available via "Edit Contact" link that opens ContactDetailModal.
 *
 * @reference src/features/contacts/components/ContactCard.tsx - Card integration
 * @reference src/features/listings/components/NewListingModal/components/SectionAccordion.tsx - Expand pattern
 */
'use client';

import { memo, useRef, useEffect } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import {
  X,
  Star,
  Calendar,
  Users,
  Tag,
  Edit3,
  Building2,
  Clock,
  Activity,
  UserPlus,
  Mail,
  Phone,
  Archive,
  Link2,
  FileText,
  Bell,
  Briefcase
} from 'lucide-react';
import type { Contact } from '../types';
import { getAvatarInitials } from '@/core/utils/avatar';
import ContactTypeIndicator from './ContactTypeIndicator';
import ContactActions from './ContactActions';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ContactDisplayPanelProps {
  /** Contact data to display */
  contact: Contact;
  /** Whether panel is expanded (visible) */
  isExpanded: boolean;
  /** Callback to close the panel */
  onClose: () => void;
  /** Callback to open edit modal */
  onEdit: () => void;
  /** Callback to send message */
  onMessage?: () => void;
  /** Callback to refer contact to Bizconekt */
  onReferContact?: () => void;
  /** Phase 8: Layout mode for side-by-side display */
  layout?: 'vertical' | 'horizontal';
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Priority badge styling
 */
const PRIORITY_STYLES = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-blue-100 text-blue-700'
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format date for display
 */
function formatDate(date: Date | string | null): string {
  if (!date) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(date));
}

/**
 * Format relative time (e.g., "2 days ago")
 */
function formatRelativeTime(date: Date | string | null): string {
  if (!date) return 'Never';
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

// ============================================================================
// COMPONENT
// ============================================================================

function ContactDisplayPanelComponent({
  contact,
  isExpanded,
  onClose,
  onEdit,
  onMessage,
  onReferContact,
  layout = 'vertical'
}: ContactDisplayPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const displayName = contact.display_name || contact.contact_name || contact.username;

  // Auto-scroll panel into view when expanded
  useEffect(() => {
    if (isExpanded && panelRef.current) {
      const timer = setTimeout(() => {
        panelRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  // Horizontal layout: No height animation, used in side-by-side mode
  if (layout === 'horizontal') {
    if (!isExpanded) return null;

    return (
      <div
        ref={panelRef}
        className="flex-1 min-w-0"
        aria-expanded={isExpanded}
        role="region"
        aria-label={`Contact details for ${displayName}`}
      >
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6 h-full">
          {/* Header with Avatar and Close Button */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <Link
                href={`/profile/${contact.username}` as Route}
                className="flex-shrink-0"
              >
                {contact.avatar_url ? (
                  <img
                    src={contact.avatar_url}
                    alt={displayName}
                    className="w-14 h-14 rounded-full object-cover ring-2 ring-gray-100 hover:ring-biz-orange transition-all"
                  />
                ) : (
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center ring-2 ring-gray-100 hover:ring-biz-orange transition-all"
                    style={{ backgroundColor: contact.avatar_bg_color || '#022641' }}
                  >
                    <span className="text-white font-semibold text-lg">
                      {getAvatarInitials(contact.display_name || contact.contact_name, contact.username)}
                    </span>
                  </div>
                )}
              </Link>

              {/* Name and Username */}
              <div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/profile/${contact.username}` as Route}
                    className="group"
                  >
                    <h3 className="text-lg font-semibold text-biz-navy group-hover:text-biz-orange transition-colors">
                      {displayName}
                    </h3>
                  </Link>
                  {contact.is_starred && (
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  )}
                </div>
                <p className="text-sm text-gray-500">@{contact.username}</p>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
              aria-label="Close panel"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Archived Indicator */}
          {contact.is_archived && (
            <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
              <Archive className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-amber-700 font-medium">Archived</span>
            </div>
          )}

          {/* Quick Actions Section */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Actions</h4>
            <ContactActions
              phone={contact.contact_phone}
              email={contact.contact_email}
              isConnected={contact.is_connected}
              onMessage={onMessage}
              variant="horizontal"
              size="md"
              showLabels={true}
            />
          </div>

          {/* Contact Details - More compact grid for horizontal layout */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Contact Information</h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {/* Email */}
              {contact.contact_email && (
                <a
                  href={`mailto:${contact.contact_email}`}
                  className="flex items-center gap-2 text-sm text-gray-700 hover:text-biz-orange transition-colors"
                >
                  <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{contact.contact_email}</span>
                </a>
              )}

              {/* Phone */}
              {contact.contact_phone && (
                <a
                  href={`tel:${contact.contact_phone}`}
                  className="flex items-center gap-2 text-sm text-gray-700 hover:text-biz-orange transition-colors"
                >
                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>{contact.contact_phone}</span>
                </a>
              )}

              {/* Company */}
              {contact.contact_company && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{contact.contact_company}</span>
                </div>
              )}

              {/* Connection Type */}
              {contact.connection_type && contact.is_connected && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="capitalize">{contact.connection_type}</span>
                </div>
              )}

              {/* Connection Date */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>Connected {formatDate(contact.connected_since)}</span>
              </div>

              {/* Mutual Connections */}
              {contact.mutual_connections > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>{contact.mutual_connections} mutual</span>
                </div>
              )}

              {/* Last Contacted */}
              {contact.last_contacted_at && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>Last: {formatRelativeTime(contact.last_contacted_at)}</span>
                </div>
              )}

              {/* Interaction Count */}
              {contact.interaction_count > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Briefcase className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>{contact.interaction_count} interactions</span>
                </div>
              )}

              {/* Source Details (for manual contacts) */}
              {!contact.is_connected && contact.source_details && (
                <div className="flex items-center gap-2 text-sm text-gray-600 col-span-full">
                  <Tag className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="italic truncate">{contact.source_details}</span>
                </div>
              )}
            </div>
          </div>

          {/* CRM Data Section - Compact */}
          {(contact.priority || contact.category || (contact.tags && contact.tags.length > 0)) && (
            <div className="mb-3">
              <div className="flex flex-wrap gap-1.5">
                {contact.priority && (
                  <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded font-medium ${PRIORITY_STYLES[contact.priority]}`}>
                    {contact.priority.charAt(0).toUpperCase() + contact.priority.slice(1)}
                  </span>
                )}
                {contact.category && (
                  <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    <Tag className="w-3 h-3" />
                    {contact.category.charAt(0).toUpperCase() + contact.category.slice(1)}
                  </span>
                )}
                {contact.tags && contact.tags.slice(0, 3).map((tag, idx) => (
                  <span key={idx} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                    {tag}
                  </span>
                ))}
                {contact.tags && contact.tags.length > 3 && (
                  <span className="text-xs text-gray-500">+{contact.tags.length - 3}</span>
                )}
              </div>
            </div>
          )}

          {/* Follow-up Reminder - Compact */}
          {(contact.follow_up_date || contact.follow_up_note) && (
            <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-1.5">
                <Bell className="w-3 h-3 text-green-600" />
                <span className="text-xs font-medium text-green-700">
                  {contact.follow_up_date ? formatDate(contact.follow_up_date) : 'Reminder'}
                </span>
              </div>
              {contact.follow_up_note && (
                <p className="text-xs text-green-600 mt-1 line-clamp-1">{contact.follow_up_note}</p>
              )}
            </div>
          )}

          {/* Notes Preview - Compact */}
          {contact.notes && (
            <div className="mb-3 p-2 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-1.5 mb-1">
                <FileText className="w-3 h-3 text-gray-500" />
                <span className="text-xs font-medium text-gray-600">Notes</span>
              </div>
              <p className="text-sm text-gray-700 line-clamp-2">{contact.notes}</p>
            </div>
          )}

          {/* Management Actions */}
          <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#ed6437] text-white rounded-lg hover:bg-[#d55730] transition-colors min-h-[44px]"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>

            {contact.is_connected && (
              <Link
                href={`/profile/${contact.username}` as Route}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors min-h-[44px]"
              >
                View Profile
              </Link>
            )}

            {!contact.is_connected && onReferContact && (
              <button
                onClick={onReferContact}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#022641] text-white rounded-lg hover:bg-[#033a5c] transition-colors min-h-[44px]"
              >
                <UserPlus className="w-4 h-4" />
                Refer
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Vertical layout (default): Original expand/collapse animation
  return (
    <div
      ref={panelRef}
      className={`
        transition-all duration-300 ease-in-out overflow-hidden
        ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}
      `}
      aria-hidden={!isExpanded}
      aria-expanded={isExpanded}
      role="region"
      aria-label={`Contact details for ${displayName}`}
    >
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6 mt-2 mb-4">
        {/* Header with Avatar and Close Button */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <Link
              href={`/profile/${contact.username}` as Route}
              className="flex-shrink-0"
            >
              {contact.avatar_url ? (
                <img
                  src={contact.avatar_url}
                  alt={displayName}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover ring-2 ring-gray-100 hover:ring-biz-orange transition-all"
                />
              ) : (
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center ring-2 ring-gray-100 hover:ring-biz-orange transition-all"
                  style={{ backgroundColor: contact.avatar_bg_color || '#022641' }}
                >
                  <span className="text-white font-semibold text-xl sm:text-2xl">
                    {getAvatarInitials(contact.display_name || contact.contact_name, contact.username)}
                  </span>
                </div>
              )}
            </Link>

            {/* Name and Username */}
            <div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/profile/${contact.username}` as Route}
                  className="group"
                >
                  <h3 className="text-lg sm:text-xl font-semibold text-biz-navy group-hover:text-biz-orange transition-colors">
                    {displayName}
                  </h3>
                </Link>
                {contact.is_starred && (
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                )}
              </div>
              <p className="text-sm text-gray-500">@{contact.username}</p>

              {/* Contact Type Indicator */}
              <div className="mt-1">
                <ContactTypeIndicator
                  isConnected={contact.is_connected}
                  source={contact.source}
                  size="sm"
                  showLabel={true}
                />
              </div>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="Close panel"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Quick Actions Section */}
        <div className="mb-4 pb-4 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Actions</h4>
          <ContactActions
            phone={contact.contact_phone}
            email={contact.contact_email}
            isConnected={contact.is_connected}
            onMessage={onMessage}
            variant="horizontal"
            size="md"
            showLabels={true}
          />
        </div>

        {/* Archived Indicator */}
        {contact.is_archived && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
            <Archive className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-700 font-medium">This contact is archived</span>
          </div>
        )}

        {/* Contact Details Section */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Contact Information</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Email - clickable */}
            {contact.contact_email && (
              <a
                href={`mailto:${contact.contact_email}`}
                className="flex items-center gap-2 text-sm text-gray-700 hover:text-biz-orange transition-colors col-span-full sm:col-span-1"
              >
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">{contact.contact_email}</span>
              </a>
            )}

            {/* Phone - clickable */}
            {contact.contact_phone && (
              <a
                href={`tel:${contact.contact_phone}`}
                className="flex items-center gap-2 text-sm text-gray-700 hover:text-biz-orange transition-colors"
              >
                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>{contact.contact_phone}</span>
              </a>
            )}

            {/* Company */}
            {contact.contact_company && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">{contact.contact_company}</span>
              </div>
            )}

            {/* Connection Type */}
            {contact.connection_type && contact.is_connected && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="capitalize">{contact.connection_type}</span>
              </div>
            )}

            {/* Connection Date */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>Connected {formatDate(contact.connected_since)}</span>
            </div>

            {/* Mutual Connections */}
            {contact.mutual_connections > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>{contact.mutual_connections} mutual connection{contact.mutual_connections > 1 ? 's' : ''}</span>
              </div>
            )}

            {/* Last Contacted */}
            {contact.last_contacted_at && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>Last contact: {formatRelativeTime(contact.last_contacted_at)}</span>
              </div>
            )}

            {/* Last Interaction */}
            {contact.last_interaction && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Activity className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>Last activity: {formatRelativeTime(contact.last_interaction)}</span>
              </div>
            )}

            {/* Interaction Count */}
            {contact.interaction_count > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Briefcase className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>{contact.interaction_count} interaction{contact.interaction_count > 1 ? 's' : ''}</span>
              </div>
            )}

            {/* Source Details (for manual contacts) */}
            {!contact.is_connected && contact.source_details && (
              <div className="flex items-center gap-2 text-sm text-gray-600 col-span-full">
                <Tag className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="italic">{contact.source_details}</span>
              </div>
            )}
          </div>
        </div>

        {/* CRM Data Section */}
        {(contact.priority || contact.category || (contact.tags && contact.tags.length > 0) || contact.follow_up_date) && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Organization & Tags</h4>
            <div className="flex flex-wrap gap-2">
              {/* Priority Badge */}
              {contact.priority && (
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded font-medium ${PRIORITY_STYLES[contact.priority]}`}>
                  Priority: {contact.priority.charAt(0).toUpperCase() + contact.priority.slice(1)}
                </span>
              )}

              {/* Category Badge */}
              {contact.category && (
                <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  <Tag className="w-3 h-3" />
                  {contact.category.charAt(0).toUpperCase() + contact.category.slice(1)}
                </span>
              )}

              {/* Tags */}
              {contact.tags && contact.tags.map((tag, idx) => (
                <span key={idx} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Follow-up Reminder Section */}
        {(contact.follow_up_date || contact.follow_up_note) && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Bell className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Follow-up Reminder</span>
            </div>
            {contact.follow_up_date && (
              <p className="text-sm text-green-700">
                <Calendar className="w-3 h-3 inline mr-1" />
                {formatDate(contact.follow_up_date)}
              </p>
            )}
            {contact.follow_up_note && (
              <p className="text-sm text-green-600 mt-1 italic">{contact.follow_up_note}</p>
            )}
          </div>
        )}

        {/* Notes Section */}
        {contact.notes && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <h4 className="text-sm font-medium text-gray-700">Notes</h4>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{contact.notes}</p>
            </div>
          </div>
        )}

        {/* Management Actions */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
          {/* Edit Contact Button */}
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-[#ed6437] text-white rounded-lg hover:bg-[#d55730] transition-colors min-h-[44px]"
          >
            <Edit3 className="w-4 h-4" />
            Edit Contact
          </button>

          {/* View Profile Link - only for Bizconekt users (connected contacts) */}
          {contact.is_connected && (
            <Link
              href={`/profile/${contact.username}` as Route}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors min-h-[44px]"
            >
              View Profile
            </Link>
          )}

          {/* Refer to Bizconekt Button - only for non-Bizconekt users (manual/imported contacts) */}
          {!contact.is_connected && onReferContact && (
            <button
              onClick={onReferContact}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-[#022641] text-white rounded-lg hover:bg-[#033a5c] transition-colors min-h-[44px]"
            >
              <UserPlus className="w-4 h-4" />
              Refer to Bizconekt
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export const ContactDisplayPanel = memo(ContactDisplayPanelComponent);
export default ContactDisplayPanel;
