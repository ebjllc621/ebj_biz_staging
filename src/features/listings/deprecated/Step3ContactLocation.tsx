// @ts-nocheck - Disabled type checking for legacy component
/**
 * Step 3: Contact & Location
 *
 * Collects address, phone, email, website, and social media links
 *
 * @authority PHASE_5.4_BRAIN_PLAN.md
 * @deprecated This component will be removed in Phase 8 - replaced by Section4Contact
 */

'use client';

import React from 'react';

// Local types for legacy 4-step wizard (to be removed in Phase 8)
interface LegacyFormData {
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  facebook?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  [key: string]: unknown;
}

interface StepProps {
  formData: LegacyFormData;
  updateFormData: (updates: Partial<LegacyFormData>) => void;
}

export function Step3ContactLocation({ formData, updateFormData }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Contact & Location</h3>
        <p className="text-sm text-gray-500 mb-6">
          Provide contact details and physical location information.
        </p>
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
        <input
          type="text"
          value={formData.address || ''}
          onChange={(e) => updateFormData({ address: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          placeholder="123 Main Street"
        />
      </div>

      {/* City, State, Zip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
          <input
            type="text"
            value={formData.city || ''}
            onChange={(e) => updateFormData({ city: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="City"
          />
        </div>
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
          <input
            type="text"
            value={formData.state || ''}
            onChange={(e) => updateFormData({ state: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="State"
            maxLength={2}
          />
        </div>
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
          <input
            type="text"
            value={formData.zip_code || ''}
            onChange={(e) => updateFormData({ zip_code: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="12345"
          />
        </div>
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Business Phone</label>
        <input
          type="tel"
          value={formData.phone || ''}
          onChange={(e) => updateFormData({ phone: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          placeholder="(555) 123-4567"
        />
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Business Email</label>
        <input
          type="email"
          value={formData.email || ''}
          onChange={(e) => updateFormData({ email: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          placeholder="info@business.com"
        />
      </div>

      {/* Website */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
        <input
          type="url"
          value={formData.website || ''}
          onChange={(e) => updateFormData({ website: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          placeholder="https://www.business.com"
        />
      </div>

      {/* Social Media */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">Social Media (Optional)</h4>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Facebook</label>
            <input
              type="url"
              value={formData.social_media?.facebook || ''}
              onChange={(e) =>
                updateFormData({
                  social_media: { ...formData.social_media, facebook: e.target.value }
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://facebook.com/business"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Instagram</label>
            <input
              type="url"
              value={formData.social_media?.instagram || ''}
              onChange={(e) =>
                updateFormData({
                  social_media: { ...formData.social_media, instagram: e.target.value }
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://instagram.com/business"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Twitter</label>
            <input
              type="url"
              value={formData.social_media?.twitter || ''}
              onChange={(e) =>
                updateFormData({
                  social_media: { ...formData.social_media, twitter: e.target.value }
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://twitter.com/business"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">LinkedIn</label>
            <input
              type="url"
              value={formData.social_media?.linkedin || ''}
              onChange={(e) =>
                updateFormData({
                  social_media: { ...formData.social_media, linkedin: e.target.value }
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://linkedin.com/company/business"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
