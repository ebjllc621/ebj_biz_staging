/**
 * TeamMemberCard - Team Member Display Card
 *
 * @description Individual team member card with edit/delete actions
 * @component Client Component
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Phase 8 - Features Section Pages
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_8_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - Orange theme for action buttons (#ed6437)
 * - Displays avatar, name, role, bio
 * - Shows visibility status
 */
'use client';

import React from 'react';
import { Edit2, Trash2, Mail, Phone, Eye, EyeOff, Facebook, Instagram, Twitter, Linkedin } from 'lucide-react';
import { getAvatarInitials } from '@core/utils/avatar';

// ============================================================================
// TYPES
// ============================================================================

interface TeamMember {
  id: number;
  name: string;
  role: string | null;
  bio: string | null;
  photo_url: string | null;
  email: string | null;
  phone: string | null;
  social_links: Record<string, string> | null;
  is_visible: boolean;
}

export interface TeamMemberCardProps {
  /** Team member data */
  member: TeamMember;
  /** Edit callback */
  onEdit: () => void;
  /** Delete callback */
  onDelete: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * TeamMemberCard - Team member display card
 *
 * @param member - Team member data
 * @param onEdit - Edit callback
 * @param onDelete - Delete callback
 * @returns Team member card
 */
export function TeamMemberCard({ member, onEdit, onDelete }: TeamMemberCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      {/* Header: Avatar + Name + Actions */}
      <div className="flex items-start gap-4 mb-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {member.photo_url ? (
            <img
              src={member.photo_url}
              alt={member.name}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#ed6437] text-white flex items-center justify-center text-xl font-bold">
              {getAvatarInitials(member.name)}
            </div>
          )}
        </div>

        {/* Name + Role */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {member.name}
            </h3>
            {member.is_visible ? (
              <Eye className="w-4 h-4 text-green-600" aria-label="Visible" />
            ) : (
              <EyeOff className="w-4 h-4 text-gray-400" aria-label="Hidden" />
            )}
          </div>
          {member.role && (
            <p className="text-sm text-gray-600">{member.role}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="p-2 text-gray-600 hover:text-[#ed6437] hover:bg-gray-100 rounded transition-colors"
            title="Edit member"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete member"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bio */}
      {member.bio && (
        <p className="text-sm text-gray-700 mb-4 line-clamp-3">
          {member.bio}
        </p>
      )}

      {/* Contact Info */}
      {(member.email || member.phone) && (
        <div className="space-y-2 mb-4">
          {member.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="w-4 h-4" />
              <a href={`mailto:${member.email}`} className="hover:text-[#ed6437] hover:underline">
                {member.email}
              </a>
            </div>
          )}
          {member.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-4 h-4" />
              <a href={`tel:${member.phone}`} className="hover:text-[#ed6437] hover:underline">
                {member.phone}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Social Links */}
      {member.social_links && Object.keys(member.social_links).length > 0 && (
        <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
          {member.social_links.facebook && (
            <a
              href={member.social_links.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-600 hover:text-[#1877f2] hover:bg-gray-100 rounded transition-colors"
              title="Facebook"
            >
              <Facebook className="w-4 h-4" />
            </a>
          )}
          {member.social_links.instagram && (
            <a
              href={member.social_links.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-600 hover:text-[#e4405f] hover:bg-gray-100 rounded transition-colors"
              title="Instagram"
            >
              <Instagram className="w-4 h-4" />
            </a>
          )}
          {member.social_links.twitter && (
            <a
              href={member.social_links.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-600 hover:text-[#1da1f2] hover:bg-gray-100 rounded transition-colors"
              title="Twitter"
            >
              <Twitter className="w-4 h-4" />
            </a>
          )}
          {member.social_links.linkedin && (
            <a
              href={member.social_links.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-600 hover:text-[#0a66c2] hover:bg-gray-100 rounded transition-colors"
              title="LinkedIn"
            >
              <Linkedin className="w-4 h-4" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default TeamMemberCard;
