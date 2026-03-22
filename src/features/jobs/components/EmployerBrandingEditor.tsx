/**
 * EmployerBrandingEditor Component
 *
 * Employer branding content editor with BizModal wrapper
 *
 * GOVERNANCE COMPLIANCE:
 * - 'use client' directive for client component
 * - BizModal wrapper: MANDATORY for modal editors
 * - Import aliases: @core/, @features/, @components/
 * - fetchWithCsrf for mutations
 * - UMM integration for media upload
 *
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 * @tier STANDARD
 * @phase Jobs Phase 4 - Platform Growth & Future Features
 */

'use client';

import { useState, useEffect } from 'react';
import { BizModal } from '@/components/ui/BizModal';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { EmployerBranding, GrowthStage, HiringUrgency, BrandingStatus } from '@features/jobs/types';

interface EmployerBrandingEditorProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: number;
  initialBranding?: EmployerBranding | null;
  onSave?: (branding: EmployerBranding) => void;
}

export function EmployerBrandingEditor({
  isOpen,
  onClose,
  listingId,
  initialBranding,
  onSave
}: EmployerBrandingEditorProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [headline, setHeadline] = useState(initialBranding?.headline || '');
  const [tagline, setTagline] = useState(initialBranding?.tagline || '');
  const [companyCulture, setCompanyCulture] = useState(initialBranding?.company_culture || '');
  const [benefitsHighlight, setBenefitsHighlight] = useState(initialBranding?.benefits_highlight || '');
  const [teamSize, setTeamSize] = useState(initialBranding?.team_size || '');
  const [growthStage, setGrowthStage] = useState<GrowthStage | ''>(initialBranding?.growth_stage || '');
  const [hiringUrgency, setHiringUrgency] = useState<HiringUrgency>(initialBranding?.hiring_urgency || 'ongoing');
  const [featuredMediaUrl, setFeaturedMediaUrl] = useState(initialBranding?.featured_media_url || '');
  const [ctaText, setCtaText] = useState(initialBranding?.cta_text || 'View Open Positions');
  const [ctaUrl, setCtaUrl] = useState(initialBranding?.cta_url || '');
  const [status, setStatus] = useState<BrandingStatus>(initialBranding?.status || 'draft');

  useEffect(() => {
    if (initialBranding) {
      setHeadline(initialBranding.headline || '');
      setTagline(initialBranding.tagline || '');
      setCompanyCulture(initialBranding.company_culture || '');
      setBenefitsHighlight(initialBranding.benefits_highlight || '');
      setTeamSize(initialBranding.team_size || '');
      setGrowthStage(initialBranding.growth_stage || '');
      setHiringUrgency(initialBranding.hiring_urgency);
      setFeaturedMediaUrl(initialBranding.featured_media_url || '');
      setCtaText(initialBranding.cta_text);
      setCtaUrl(initialBranding.cta_url || '');
      setStatus(initialBranding.status);
    }
  }, [initialBranding]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        listing_id: listingId,
        headline: headline || null,
        tagline: tagline || null,
        company_culture: companyCulture || null,
        benefits_highlight: benefitsHighlight || null,
        team_size: teamSize || null,
        growth_stage: growthStage || null,
        hiring_urgency: hiringUrgency,
        featured_media_url: featuredMediaUrl || null,
        cta_text: ctaText,
        cta_url: ctaUrl || null,
        status
      };

      const method = initialBranding ? 'PUT' : 'POST';
      const response = await fetchWithCsrf(`/api/listings/${listingId}/jobs/branding`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save branding');
      }

      const result = await response.json();
      if (onSave && result.data?.branding) {
        onSave(result.data.branding);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const growthStageOptions: { value: GrowthStage; label: string }[] = [
    { value: 'startup', label: 'Startup' },
    { value: 'growing', label: 'Growing' },
    { value: 'established', label: 'Established' },
    { value: 'enterprise', label: 'Enterprise' }
  ];

  const hiringUrgencyOptions: { value: HiringUrgency; label: string }[] = [
    { value: 'immediate', label: 'Hiring Now (Immediate)' },
    { value: 'ongoing', label: 'Ongoing Recruitment' },
    { value: 'seasonal', label: 'Seasonal Hiring' },
    { value: 'future', label: 'Future Opportunities' }
  ];

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={initialBranding ? 'Edit Employer Branding' : 'Create Employer Branding'}
      size="large"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Headline */}
        <div>
          <label htmlFor="headline" className="block text-sm font-medium text-gray-700 mb-1">
            Headline
          </label>
          <input
            type="text"
            id="headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="e.g., Join Our Growing Team"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            maxLength={255}
          />
        </div>

        {/* Tagline */}
        <div>
          <label htmlFor="tagline" className="block text-sm font-medium text-gray-700 mb-1">
            Tagline
          </label>
          <textarea
            id="tagline"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="Short branding tagline"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Company Culture */}
        <div>
          <label htmlFor="companyCulture" className="block text-sm font-medium text-gray-700 mb-1">
            Company Culture
          </label>
          <textarea
            id="companyCulture"
            value={companyCulture}
            onChange={(e) => setCompanyCulture(e.target.value)}
            placeholder="Describe your company culture and work environment"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Benefits Highlight */}
        <div>
          <label htmlFor="benefitsHighlight" className="block text-sm font-medium text-gray-700 mb-1">
            Benefits & Perks
          </label>
          <textarea
            id="benefitsHighlight"
            value={benefitsHighlight}
            onChange={(e) => setBenefitsHighlight(e.target.value)}
            placeholder="Highlight key benefits and perks"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Team Size and Growth Stage */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="teamSize" className="block text-sm font-medium text-gray-700 mb-1">
              Team Size
            </label>
            <input
              type="text"
              id="teamSize"
              value={teamSize}
              onChange={(e) => setTeamSize(e.target.value)}
              placeholder="e.g., 50-100 employees"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="growthStage" className="block text-sm font-medium text-gray-700 mb-1">
              Growth Stage
            </label>
            <select
              id="growthStage"
              value={growthStage}
              onChange={(e) => setGrowthStage(e.target.value as GrowthStage)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            >
              <option value="">Select...</option>
              {growthStageOptions.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Hiring Urgency */}
        <div>
          <label htmlFor="hiringUrgency" className="block text-sm font-medium text-gray-700 mb-1">
            Hiring Urgency
          </label>
          <select
            id="hiringUrgency"
            value={hiringUrgency}
            onChange={(e) => setHiringUrgency(e.target.value as HiringUrgency)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
          >
            {hiringUrgencyOptions.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Featured Media URL */}
        <div>
          <label htmlFor="featuredMediaUrl" className="block text-sm font-medium text-gray-700 mb-1">
            Featured Media URL (Image or Video)
          </label>
          <input
            type="url"
            id="featuredMediaUrl"
            value={featuredMediaUrl}
            onChange={(e) => setFeaturedMediaUrl(e.target.value)}
            placeholder="https://example.com/team-photo.jpg"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
          />
        </div>

        {/* CTA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="ctaText" className="block text-sm font-medium text-gray-700 mb-1">
              CTA Button Text
            </label>
            <input
              type="text"
              id="ctaText"
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              placeholder="View Open Positions"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              maxLength={100}
            />
          </div>
          <div>
            <label htmlFor="ctaUrl" className="block text-sm font-medium text-gray-700 mb-1">
              CTA URL (Optional)
            </label>
            <input
              type="url"
              id="ctaUrl"
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
              placeholder="Leave blank to use default jobs page"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <div className="flex space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                value="draft"
                checked={status === 'draft'}
                onChange={(e) => setStatus(e.target.value as BrandingStatus)}
                className="text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-700">Draft</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                value="published"
                checked={status === 'published'}
                onChange={(e) => setStatus(e.target.value as BrandingStatus)}
                className="text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-700">Published</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                value="archived"
                checked={status === 'archived'}
                onChange={(e) => setStatus(e.target.value as BrandingStatus)}
                className="text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-700">Archived</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Branding'}
          </button>
        </div>
      </form>
    </BizModal>
  );
}
