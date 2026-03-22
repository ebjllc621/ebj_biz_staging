/**
 * TeamMemberFormModal - Create/Edit Team Member Form
 *
 * @description Form modal for creating or editing team members
 * @component Client Component
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Phase 8 - Features Section Pages
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_8_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use BizModal (MANDATORY)
 * - Orange theme for submit button (#ed6437)
 * - Form validation before submit
 */
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import BizModal from '@/components/BizModal/BizModal';
import { Upload, Loader2 } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface TeamMemberFormData {
  name: string;
  role: string;
  bio: string;
  photo_url: string;
  email: string;
  phone: string;
  social_links: {
    facebook: string;
    instagram: string;
    twitter: string;
    linkedin: string;
  };
  is_visible: boolean;
}

export interface TeamMemberFormModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close modal callback */
  onClose: () => void;
  /** Submit callback */
  // eslint-disable-next-line no-unused-vars
  onSubmit: (data: TeamMemberFormData) => Promise<void>;
  /** Whether form is submitting */
  isSubmitting: boolean;
  /** Initial data for edit mode */
  initialData?: Partial<TeamMemberFormData>;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * TeamMemberFormModal - Team member create/edit form
 *
 * @param isOpen - Whether modal is open
 * @param onClose - Close modal callback
 * @param onSubmit - Submit callback
 * @param isSubmitting - Whether form is submitting
 * @param initialData - Initial data for edit mode
 * @returns Team member form modal
 */
export function TeamMemberFormModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  initialData
}: TeamMemberFormModalProps) {
  const [formData, setFormData] = useState<TeamMemberFormData>({
    name: '',
    role: '',
    bio: '',
    photo_url: '',
    email: '',
    phone: '',
    social_links: {
      facebook: '',
      instagram: '',
      twitter: '',
      linkedin: ''
    },
    is_visible: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        role: initialData.role || '',
        bio: initialData.bio || '',
        photo_url: initialData.photo_url || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        social_links: {
          facebook: initialData.social_links?.facebook || '',
          instagram: initialData.social_links?.instagram || '',
          twitter: initialData.social_links?.twitter || '',
          linkedin: initialData.social_links?.linkedin || ''
        },
        is_visible: initialData.is_visible !== undefined ? initialData.is_visible : true
      });
    }
  }, [initialData]);

  // Validate form
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle submit
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      await onSubmit(formData);
      onClose();
    } catch {
      // Error handled by parent
    }
  }, [formData, validate, onSubmit, onClose]);

  // Handle field change
  const handleChange = useCallback((field: keyof TeamMemberFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  }, []);

  // Handle social link change
  const handleSocialChange = useCallback((platform: keyof TeamMemberFormData['social_links'], value: string) => {
    setFormData(prev => ({
      ...prev,
      social_links: {
        ...prev.social_links,
        [platform]: value
      }
    }));
  }, []);

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Team Member' : 'Add Team Member'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="John Doe"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          {/* Role */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role / Position
            </label>
            <input
              type="text"
              id="role"
              value={formData.role}
              onChange={(e) => handleChange('role', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              placeholder="CEO, Manager, Developer, etc."
            />
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
              Bio
            </label>
            <textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent resize-none"
              placeholder="Brief bio or description..."
            />
          </div>

          {/* Photo URL */}
          <div>
            <label htmlFor="photo_url" className="block text-sm font-medium text-gray-700 mb-1">
              Photo URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="url"
                id="photo_url"
                value={formData.photo_url}
                onChange={(e) => handleChange('photo_url', e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                placeholder="https://example.com/photo.jpg"
              />
              <button
                type="button"
                className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                title="Upload photo"
              >
                <Upload className="w-5 h-5" />
              </button>
            </div>
            {formData.photo_url && (
              <div className="mt-2">
                <img
                  src={formData.photo_url}
                  alt="Preview"
                  className="w-20 h-20 rounded-full object-cover border border-gray-200"
                />
              </div>
            )}
          </div>
        </div>

        {/* Contact Info Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="john@example.com"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        </div>

        {/* Social Links Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Social Media</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Facebook */}
            <div>
              <label htmlFor="facebook" className="block text-sm font-medium text-gray-700 mb-1">
                Facebook
              </label>
              <input
                type="url"
                id="facebook"
                value={formData.social_links.facebook}
                onChange={(e) => handleSocialChange('facebook', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                placeholder="https://facebook.com/username"
              />
            </div>

            {/* Instagram */}
            <div>
              <label htmlFor="instagram" className="block text-sm font-medium text-gray-700 mb-1">
                Instagram
              </label>
              <input
                type="url"
                id="instagram"
                value={formData.social_links.instagram}
                onChange={(e) => handleSocialChange('instagram', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                placeholder="https://instagram.com/username"
              />
            </div>

            {/* Twitter */}
            <div>
              <label htmlFor="twitter" className="block text-sm font-medium text-gray-700 mb-1">
                Twitter
              </label>
              <input
                type="url"
                id="twitter"
                value={formData.social_links.twitter}
                onChange={(e) => handleSocialChange('twitter', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                placeholder="https://twitter.com/username"
              />
            </div>

            {/* LinkedIn */}
            <div>
              <label htmlFor="linkedin" className="block text-sm font-medium text-gray-700 mb-1">
                LinkedIn
              </label>
              <input
                type="url"
                id="linkedin"
                value={formData.social_links.linkedin}
                onChange={(e) => handleSocialChange('linkedin', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                placeholder="https://linkedin.com/in/username"
              />
            </div>
          </div>
        </div>

        {/* Visibility Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Visibility</h3>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_visible}
              onChange={(e) => handleChange('is_visible', e.target.checked)}
              className="w-4 h-4 text-[#ed6437] border-gray-300 rounded focus:ring-[#ed6437]"
            />
            <span className="text-sm text-gray-700">
              Show this team member on public listing page
            </span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors disabled:opacity-50 font-medium"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? 'Saving...' : (initialData ? 'Update Member' : 'Add Member')}
          </button>
        </div>
      </form>
    </BizModal>
  );
}

export default TeamMemberFormModal;
