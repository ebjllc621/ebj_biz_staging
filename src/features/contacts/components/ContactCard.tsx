/**
 * ContactCard - Contact display card for Contacts page
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Contacts Phase A
 * @generated ComponentBuilder v3.0
 * @governance Build Map v2.1 ENHANCED
 * @avatar-governance AVATAR_DISPLAY_GOVERNANCE.md
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/react18-nextjs14-governance.mdc
 *
 * Displays contact information with avatar, profile details,
 * connection metadata, and action menu.
 * Supports both grid and list view modes.
 *
 * @see docs/pages/layouts/home/user/user_dash/contacts/phases/PHASE_A_CORE_CONTACTS_DISPLAY_BRAIN_PLAN.md
 * @reference src/features/connections/components/ConnectionCard.tsx - Card pattern reference
 * @reference src/features/profile/components/ProfileHeroBanner.tsx:135-150 - Avatar display pattern
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { MoreVertical, MessageCircle, UserMinus, ExternalLink, Users, Star, Calendar, Mail, Phone, Edit3 } from 'lucide-react';
import type { Contact } from '../types';
import ContactTypeIndicator from './ContactTypeIndicator';
import { ContactMatchBadge } from './ContactMatchBadge';
import type { ContactMatchResult } from '../types/matching';
import { getAvatarInitials } from '@/core/utils/avatar';

interface ContactCardProps {
  /** Contact data with user profile information */
  contact: Contact;
  /** Display mode: grid or list */
  viewMode: 'grid' | 'list';
  /** Callback when card is clicked (Phase B: opens ContactDetailModal) */
  onClick?: () => void;
  /** Callback when remove contact is triggered */
  onRemove?: () => void;
  /** Callback when send message is triggered */
  onMessage?: () => void;
  /** Callback when star is toggled (Phase B) */
  onToggleStar?: () => void;
  /** Callback when edit contact is triggered (Phase 9: Edit from mini menu) */
  onEdit?: () => void;
  /** Whether to show action menu */
  showActions?: boolean;
  /** Phase E: Whether contact is selected for bulk actions */
  isSelected?: boolean;
  /** Phase E: Callback when selection checkbox is toggled */
  onToggleSelection?: () => void;
  /** Phase 5: Match result for this contact */
  matchResult?: ContactMatchResult | null;
  /** Phase 5: Callback when Connect is clicked for matched contact */
  onConnectMatched?: (_userId: number) => void;
  /** Phase 5: Whether connection request is being sent */
  isConnectingMatched?: boolean;
  /** Phase 8: Whether this card is expanded (showing panel) - renders as compact card */
  isExpanded?: boolean;
}

/**
 * Format date for "connected since" display
 */
function formatConnectedDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric'
  }).format(new Date(date));
}

/**
 * ContactCard component
 * Displays contact information in grid or list format
 */
export function ContactCard({
  contact,
  viewMode,
  onClick,
  onRemove,
  onMessage,
  onToggleStar,
  onEdit,
  showActions = true,
  isSelected = false,
  onToggleSelection,
  matchResult,
  onConnectMatched,
  isConnectingMatched,
  isExpanded = false
}: ContactCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const displayName = contact.display_name || contact.username;

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click from firing
    setIsMenuOpen(false);
    onRemove?.();
  };

  const handleMessageClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click from firing
    setIsMenuOpen(false);
    onMessage?.();
  };

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleStar?.();
  };

  const handleCardClick = () => {
    onClick?.();
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onEdit?.();
  };

  // Phase 8: Compact view when expanded (used with side-by-side panel layout)
  // Always renders as a compact grid-style card regardless of viewMode
  if (isExpanded) {
    return (
      <article
        className={`relative bg-white rounded-xl shadow-md border-2 border-biz-orange transition-all p-4 cursor-pointer w-full max-w-[280px] flex-shrink-0 ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
        onClick={handleCardClick}
      >
        <div className="flex flex-col items-center text-center">
          {/* Avatar - slightly smaller for compact view */}
          <Link
            href={`/profile/${contact.username}` as Route}
            className="flex-shrink-0 mb-3"
            onClick={(e) => e.stopPropagation()}
          >
            {contact.avatar_url && !imageError ? (
              <img
                src={contact.avatar_url}
                alt={displayName}
                className="w-16 h-16 rounded-full object-cover ring-2 ring-biz-orange transition-all"
                onError={() => setImageError(true)}
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center ring-2 ring-biz-orange transition-all"
                style={{ backgroundColor: contact.avatar_bg_color || '#022641' }}
              >
                <span className="text-white font-semibold text-lg">
                  {getAvatarInitials(contact.display_name, contact.username)}
                </span>
              </div>
            )}
          </Link>

          {/* Name - clicks to open panel, not profile link */}
          <h3
            className="font-semibold text-biz-navy hover:text-biz-orange transition-colors truncate max-w-full text-sm cursor-pointer mb-1"
            onClick={handleCardClick}
          >
            {displayName}
          </h3>
          <p className="text-xs text-gray-500 mb-2 truncate max-w-full">@{contact.username}</p>

          {/* Contact Type Indicator */}
          <div className="mb-2">
            <ContactTypeIndicator
              isConnected={contact.is_connected}
              source={contact.source}
              size="sm"
              showLabel={true}
            />
          </div>

          {/* Star indicator */}
          {contact.is_starred && (
            <div className="absolute top-2 left-2">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            </div>
          )}

          {/* Selected indicator */}
          <div className="absolute top-2 right-2">
            <span className="text-xs text-biz-orange font-medium">Selected</span>
          </div>
        </div>
      </article>
    );
  }

  // Grid view - compact card layout
  if (viewMode === 'grid') {
    return (
      <article
        className={`relative bg-white rounded-xl shadow-sm hover:shadow-md transition-all p-4 cursor-pointer ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
        onClick={handleCardClick}
      >
        {/* Phase E: Selection Checkbox */}
        {onToggleSelection && (
          <div className="absolute top-2 left-2 z-10">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelection?.()}
              onClick={(e) => e.stopPropagation()}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>
        )}

        <div className="flex flex-col items-center text-center">
          {/* Avatar */}
          <Link
            href={`/profile/${contact.username}` as Route}
            className="flex-shrink-0 mb-3"
          >
            {contact.avatar_url && !imageError ? (
              <img
                src={contact.avatar_url}
                alt={displayName}
                className="w-20 h-20 rounded-full object-cover ring-2 ring-gray-100 hover:ring-biz-orange transition-all"
                onError={() => setImageError(true)}
              />
            ) : (
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center ring-2 ring-gray-100 hover:ring-biz-orange transition-all"
                style={{ backgroundColor: contact.avatar_bg_color || '#022641' }}
              >
                <span className="text-white font-semibold text-xl">
                  {getAvatarInitials(contact.display_name, contact.username)}
                </span>
              </div>
            )}
          </Link>

          {/* Name - clicks to open panel, not profile link */}
          <h3
            className="font-semibold text-biz-navy hover:text-biz-orange transition-colors truncate max-w-full cursor-pointer mb-1"
            onClick={handleCardClick}
          >
            {displayName}
          </h3>
          <p className="text-sm text-gray-500 mb-2 truncate max-w-full">@{contact.username}</p>

          {/* Phase C: Contact Type Indicator */}
          <div className="mb-2">
            <ContactTypeIndicator
              isConnected={contact.is_connected}
              source={contact.source}
              size="sm"
              showLabel={true}
            />
          </div>

          {/* Connection Type Badge */}
          {contact.connection_type && contact.is_connected && (
            <span className="inline-block mb-2 text-xs font-medium uppercase text-biz-orange bg-orange-50 px-2 py-1 rounded">
              {contact.connection_type}
            </span>
          )}

          {/* Phase B: CRM Badges (category, tags, reminder) */}
          <div className="flex flex-wrap justify-center gap-1 mb-2">
            {contact.category && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                {contact.category}
              </span>
            )}
            {contact.tags && contact.tags.length > 0 && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                {contact.tags.length} tag{contact.tags.length > 1 ? 's' : ''}
              </span>
            )}
            {contact.follow_up_date && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Reminder
              </span>
            )}
          </div>

          {/* Phase 5: Contact Match Badge (for manual contacts) */}
          {!contact.is_connected && matchResult && (
            <div className="mt-2">
              <ContactMatchBadge
                matchResult={matchResult}
                onConnect={onConnectMatched}
                isConnecting={isConnectingMatched}
                size="sm"
                showDetails={false}
              />
            </div>
          )}

          {/* Metadata */}
          <div className="text-xs text-gray-600 space-y-1 w-full">
            <div className="truncate">
              Connected {formatConnectedDate(contact.connected_since)}
            </div>
            {contact.mutual_connections > 0 && (
              <div className="flex items-center justify-center gap-1">
                <Users className="w-3 h-3" />
                {contact.mutual_connections} mutual
              </div>
            )}
          </div>

          {/* Star Toggle (Phase B) */}
          {onToggleStar && (
            <button
              onClick={handleStarClick}
              className="absolute top-2 left-2 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              title={contact.is_starred ? 'Unstar' : 'Star contact'}
            >
              <Star
                className={`w-4 h-4 ${
                  contact.is_starred
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-400'
                }`}
              />
            </button>
          )}

          {/* Action Menu */}
          {showActions && (
            <div className="absolute top-2 right-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(!isMenuOpen);
                }}
                className="p-2 min-h-[44px] min-w-[44px] rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center"
                aria-label="Contact actions"
              >
                <MoreVertical className="w-4 h-4 text-gray-600" />
              </button>

              {isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-10 z-20 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                    <Link
                      href={`/profile/${contact.username}` as Route}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Profile
                    </Link>
                    {onEdit && (
                      <button
                        onClick={(e) => handleEditClick(e)}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit Contact
                      </button>
                    )}
                    <button
                      onClick={(e) => handleMessageClick(e)}
                      disabled={!onMessage}
                      className={`flex items-center gap-2 w-full px-4 py-2 text-sm transition-colors ${
                        onMessage
                          ? 'text-gray-700 hover:bg-gray-50'
                          : 'text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <MessageCircle className="w-4 h-4" />
                      Send Message
                    </button>
                    <div className="h-px bg-gray-200 my-1" />
                    {onRemove && (
                      <button
                        onClick={(e) => handleRemoveClick(e)}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <UserMinus className="w-4 h-4" />
                        Remove Contact
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </article>
    );
  }

  // List view - horizontal card layout (same as ConnectionCard)
  return (
    <article
      className="relative bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-4 cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <Link
          href={`/profile/${contact.username}` as Route}
          className="flex-shrink-0"
        >
          {contact.avatar_url && !imageError ? (
            <img
              src={contact.avatar_url}
              alt={displayName}
              className="w-16 h-16 rounded-full object-cover ring-2 ring-gray-100 hover:ring-biz-orange transition-all"
              onError={() => setImageError(true)}
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center ring-2 ring-gray-100 hover:ring-biz-orange transition-all"
              style={{ backgroundColor: contact.avatar_bg_color || '#022641' }}
            >
              <span className="text-white font-semibold text-lg">
                {getAvatarInitials(contact.display_name, contact.username)}
              </span>
            </div>
          )}
        </Link>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name and Username - clicks to open panel, not profile link */}
          <div
            className="cursor-pointer"
            onClick={handleCardClick}
          >
            <h3 className="font-semibold text-biz-navy hover:text-biz-orange transition-colors">
              {displayName}
            </h3>
            <p className="text-sm text-gray-500">@{contact.username}</p>
          </div>

          {/* Phase C: Contact Type Indicator */}
          <div className="mt-2">
            <ContactTypeIndicator
              isConnected={contact.is_connected}
              source={contact.source}
              size="sm"
              showLabel={true}
            />
          </div>

          {/* Connection Type Badge */}
          {contact.connection_type && contact.is_connected && (
            <span className="inline-block mt-2 text-xs font-medium uppercase text-biz-orange bg-orange-50 px-2 py-1 rounded">
              {contact.connection_type}
            </span>
          )}

          {/* Phase B: CRM Badges */}
          <div className="flex flex-wrap gap-2 mt-2">
            {contact.is_starred && (
              <span className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                <Star className="w-3 h-3 fill-yellow-500" />
                Starred
              </span>
            )}
            {contact.category && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                {contact.category}
              </span>
            )}
            {contact.tags && contact.tags.length > 0 && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                {contact.tags.slice(0, 2).join(', ')}
                {contact.tags.length > 2 && ` +${contact.tags.length - 2}`}
              </span>
            )}
            {contact.follow_up_date && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(contact.follow_up_date).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Phase 5: Contact Match Badge (for manual contacts) */}
          {!contact.is_connected && matchResult && (
            <div className="mt-2">
              <ContactMatchBadge
                matchResult={matchResult}
                onConnect={onConnectMatched}
                isConnecting={isConnectingMatched}
                size="sm"
                showDetails={true}
              />
            </div>
          )}

          {/* Contact Info: Email & Phone */}
          {(contact.contact_email || contact.contact_phone) && (
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600">
              {contact.contact_email && (
                <a
                  href={`mailto:${contact.contact_email}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 hover:text-biz-orange transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[200px]">{contact.contact_email}</span>
                </a>
              )}
              {contact.contact_phone && (
                <a
                  href={`tel:${contact.contact_phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 hover:text-biz-orange transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{contact.contact_phone}</span>
                </a>
              )}
            </div>
          )}

          {/* Contact Metadata */}
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
            {/* Connected Since */}
            <span>
              Connected since {formatConnectedDate(contact.connected_since)}
            </span>

            {/* Mutual Connections */}
            {contact.mutual_connections > 0 && (
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {contact.mutual_connections} mutual
              </span>
            )}
          </div>
        </div>

        {/* Action Menu */}
        {showActions && (
          <div className="relative flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(!isMenuOpen);
              }}
              className="p-2 min-h-[44px] min-w-[44px] rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center"
              aria-label="Contact actions"
            >
              <MoreVertical className="w-5 h-5 text-gray-600" />
            </button>

            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsMenuOpen(false)}
                />
                <div className="absolute right-0 top-10 z-20 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                  <Link
                    href={`/profile/${contact.username}` as Route}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Profile
                  </Link>
                  {onEdit && (
                    <button
                      onClick={(e) => handleEditClick(e)}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit Contact
                    </button>
                  )}
                  <button
                    onClick={(e) => handleMessageClick(e)}
                    disabled={!onMessage}
                    className={`flex items-center gap-2 w-full px-4 py-2 text-sm transition-colors ${
                      onMessage
                        ? 'text-gray-700 hover:bg-gray-50'
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Send Message
                  </button>
                  <div className="h-px bg-gray-200 my-1" />
                  {onRemove && (
                    <button
                      onClick={(e) => handleRemoveClick(e)}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <UserMinus className="w-4 h-4" />
                      Remove Contact
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export default ContactCard;