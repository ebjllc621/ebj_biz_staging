'use client';

/**
 * NewListingModal - Section 6: SEO Information
 * Meta title, description, and keywords for search engine optimization
 * Authority: PHASE_6_BRAIN_PLAN.md
 * Tier: ENTERPRISE
 */

import React from 'react';
import Image from 'next/image';
import { ListingFormData } from '../../../types/listing-form.types';

export interface Section6SEOProps {
  formData: ListingFormData;
  onUpdateField: <K extends keyof ListingFormData>(
    field: K,
    value: ListingFormData[K]
  ) => void;
  onUpdateSection: (data: Partial<ListingFormData>) => void;
}

export function Section6SEO({
  formData,
  onUpdateField,
}: Section6SEOProps) {
  const metaTitleLength = formData.metaTitle?.length || 0;
  const metaDescriptionLength = formData.metaDescription?.length || 0;
  const metaKeywordsLength = formData.metaKeywords?.length || 0;

  return (
    <div className="space-y-6">
      {/* Info Grid - Two columns on desktop, single on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SEO Optimization Info Box */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg
                className="w-6 h-6 text-orange-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-navy-900">SEO Optimization</h4>
              <p className="text-sm text-gray-700 mt-1">
                Optimize your listing for search engines with effective meta
                information.
              </p>
              {/* SEO Tips Inner Box */}
              <div className="mt-3 p-3 bg-white rounded border border-blue-200">
                <h5 className="text-sm font-semibold text-navy-900 mb-2">
                  SEO Tips:
                </h5>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Use your main keyword in the meta title</li>
                  <li>• Write a meta description that encourages clicks</li>
                  <li>• Add local keywords for your area</li>
                  <li>• Match your meta info to your page content</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* SEO Scribe Promo Box */}
        <div className="p-4 bg-orange-50 border-2 border-orange-300 rounded-lg">
          <h4 className="text-lg font-bold text-orange-600">SEO Scribe</h4>
          <p className="text-sm text-gray-700 mt-2">
            Bizconekt's AI-powered SEO Solution Tool coming soon!
          </p>
          <div className="mt-3 flex justify-center">
            <a
              href="https://www.seo-scribe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block hover:opacity-80 transition-opacity"
            >
              <Image
                src="/uploads/site/branding/SEOScribe_Full_NoBkg.png"
                alt="SEO Scribe - AI-powered SEO Solution"
                width={140}
                height={40}
                className="object-contain"
              />
            </a>
          </div>
          <p className="text-sm font-medium text-orange-600 mt-3">
            Use for free to create your listing today!
          </p>
          <p className="text-xs text-gray-500 mt-2">
            <a
              href="/seo-scribe"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-orange-600"
            >
              Learn more about SEO Scribe
            </a>
          </p>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        {/* Meta Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Meta Title
            <span
              className="ml-2 text-xs text-gray-500"
              aria-live="polite"
            >
              {metaTitleLength}/60
            </span>
          </label>
          <input
            type="text"
            maxLength={60}
            value={formData.metaTitle || ''}
            onChange={(e) => onUpdateField('metaTitle', e.target.value)}
            placeholder="SEO-friendly title for search engines"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            aria-describedby="meta-title-help"
          />
          <p id="meta-title-help" className="mt-1 text-xs text-gray-500">
            The title that appears in search engine results (recommended: 50-60 characters)
          </p>
        </div>

        {/* Meta Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Meta Description
            <span
              className="ml-2 text-xs text-gray-500"
              aria-live="polite"
            >
              {metaDescriptionLength}/160
            </span>
          </label>
          <textarea
            maxLength={160}
            rows={3}
            value={formData.metaDescription || ''}
            onChange={(e) => onUpdateField('metaDescription', e.target.value)}
            placeholder="Brief description of your business for search results"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            aria-describedby="meta-description-help"
          />
          <p id="meta-description-help" className="mt-1 text-xs text-gray-500">
            The description that appears in search engine results (recommended: 150-160 characters)
          </p>
        </div>

        {/* Meta Keywords */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Meta Keywords
            <span
              className="ml-2 text-xs text-gray-500"
              aria-live="polite"
            >
              {metaKeywordsLength}/250
            </span>
          </label>
          <input
            type="text"
            maxLength={250}
            value={formData.metaKeywords || ''}
            onChange={(e) => onUpdateField('metaKeywords', e.target.value)}
            placeholder="keyword1, keyword2, keyword3"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            aria-describedby="meta-keywords-help"
          />
          <p id="meta-keywords-help" className="mt-1 text-xs text-gray-500">
            Comma-separated keywords that describe your business (max 250 characters)
          </p>
        </div>
      </div>
    </div>
  );
}
