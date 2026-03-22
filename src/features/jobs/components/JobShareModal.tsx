/**
 * JobShareModal - Social sharing modal for jobs
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Jobs Share & Recommend Integration
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/job_ops/build/3-5-26/JOB_SHARE_RECOMMEND_BRAIN_PLAN.md
 * @reference src/features/offers/components/OfferShareModal.tsx
 *
 * Platforms: Facebook, Instagram, X, LinkedIn, Nextdoor, WhatsApp, SMS, Email, Copy Link
 * UTM tagging included for analytics tracking
 */
'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import {
  Facebook,
  Linkedin,
  Mail,
  Link as LinkIcon,
  Check,
  Share2,
  Briefcase,
  Smartphone
} from 'lucide-react';
import { BizModal } from '@/components/ui/BizModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import type { Job, JobWithCoordinates } from '@features/jobs/types';

// X (Twitter) icon component
function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

// Instagram gradient icon
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

// Nextdoor icon
function NextdoorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 2c4.418 0 8 3.582 8 8s-3.582 8-8 8-8-3.582-8-8 3.582-8 8-8zm0 3a5 5 0 00-5 5v4h2v-4a3 3 0 116 0v4h2v-4a5 5 0 00-5-5z" />
    </svg>
  );
}

// WhatsApp icon
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

interface JobShareModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Job being shared */
  job: Job | JobWithCoordinates;
  /** Company/listing name */
  listingName?: string;
  /** Company logo URL */
  listingLogo?: string;
}

interface SharePlatform {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  hoverColor: string;
}

const sharePlatforms: SharePlatform[] = [
  { id: 'facebook', name: 'Facebook', icon: Facebook, bgColor: 'bg-blue-600', hoverColor: 'hover:bg-blue-700' },
  { id: 'instagram', name: 'Instagram', icon: InstagramIcon, bgColor: 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400', hoverColor: 'hover:opacity-90' },
  { id: 'x', name: 'X', icon: XIcon, bgColor: 'bg-black', hoverColor: 'hover:bg-gray-800' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, bgColor: 'bg-blue-700', hoverColor: 'hover:bg-blue-800' },
  { id: 'nextdoor', name: 'Nextdoor', icon: NextdoorIcon, bgColor: 'bg-green-600', hoverColor: 'hover:bg-green-700' },
  { id: 'whatsapp', name: 'WhatsApp', icon: WhatsAppIcon, bgColor: 'bg-green-500', hoverColor: 'hover:bg-green-600' },
  { id: 'sms', name: 'SMS', icon: Smartphone, bgColor: 'bg-gray-600', hoverColor: 'hover:bg-gray-700' },
  { id: 'email', name: 'Email', icon: Mail, bgColor: 'bg-gray-500', hoverColor: 'hover:bg-gray-600' },
];

/**
 * Format employment type for display
 */
function formatEmploymentType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function JobShareModalInner({
  isOpen,
  onClose,
  job,
  listingName,
  listingLogo
}: JobShareModalProps) {
  const [copied, setCopied] = useState(false);

  // Get company name from job or props
  const companyName = listingName || (job as JobWithCoordinates).listing_name || 'Company';

  // Build job URL with UTM parameters
  const buildShareUrl = useCallback((platform: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://bizconekt.com';
    const url = new URL(`${baseUrl}/jobs/${job.slug}`);

    // Add UTM parameters for tracking
    url.searchParams.set('utm_source', platform);
    url.searchParams.set('utm_medium', 'social');
    url.searchParams.set('utm_campaign', 'job_share');
    url.searchParams.set('utm_content', job.slug);

    return url.toString();
  }, [job.slug]);

  // Build share text
  const getShareText = useCallback(() => {
    const location = job.work_location_type === 'remote'
      ? 'Remote'
      : [job.city, job.state].filter(Boolean).join(', ') || '';

    const locationText = location ? ` in ${location}` : '';
    return `Check out this job opportunity: ${job.title}${locationText} at ${companyName}!`;
  }, [job, companyName]);

  const handleShare = useCallback((platform: string) => {
    const shareUrl = buildShareUrl(platform);
    const shareText = getShareText();
    let targetUrl = '';

    // Track share to job_shares table
    fetch(`/api/jobs/${job.id}/shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        platform: platform === 'x' ? 'twitter' : platform,
        share_type: 'consumer',
        share_url: shareUrl
      })
    }).catch((err) => console.error('Failed to record share:', err));

    // Track share analytics
    // GOVERNANCE: source must be valid ENUM: 'search' | 'notification' | 'direct' | 'social' | 'listing' | 'homepage'
    fetch(`/api/jobs/${job.id}/analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        event_type: 'share',
        source: 'social'
      })
    }).catch((err) => console.error('Failed to track share:', err));

    switch (platform) {
      case 'facebook':
        targetUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
        break;
      case 'instagram':
        // Instagram doesn't have a direct share URL, copy to clipboard
        navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      case 'x':
        targetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'linkedin':
        targetUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'nextdoor':
        targetUrl = `https://nextdoor.com/share/?u=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
        break;
      case 'whatsapp':
        targetUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
        break;
      case 'sms':
        targetUrl = `sms:?body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
        break;
      case 'email':
        targetUrl = `mailto:?subject=${encodeURIComponent(`Job Opportunity: ${job.title}`)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
        break;
    }

    if (targetUrl) {
      window.open(targetUrl, '_blank', 'width=600,height=400');
    }
  }, [buildShareUrl, getShareText, job.id, job.title]);

  const handleCopyLink = useCallback(() => {
    const shareUrl = buildShareUrl('copy');
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    // Track share to job_shares table
    fetch(`/api/jobs/${job.id}/shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        platform: 'copy_link',
        share_type: 'consumer',
        share_url: shareUrl
      })
    }).catch((err) => console.error('Failed to record share:', err));

    // Track copy analytics
    fetch(`/api/jobs/${job.id}/analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        event_type: 'share',
        source: 'social'
      })
    }).catch((err) => console.error('Failed to track share:', err));
  }, [buildShareUrl, job.id]);

  // Build location display
  const location = job.work_location_type === 'remote'
    ? 'Remote'
    : [job.city, job.state].filter(Boolean).join(', ') || 'Location TBD';

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Share This Job"
      subtitle="Help others discover this opportunity"
      size="medium"
    >
      <div className="space-y-6">
        {/* Job Preview */}
        <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
          {listingLogo || (job as JobWithCoordinates).listing_logo ? (
            <div className="relative w-16 h-16 rounded-lg bg-white flex-shrink-0 overflow-hidden">
              <Image
                src={listingLogo || (job as JobWithCoordinates).listing_logo || ''}
                alt={companyName}
                fill
                sizes="64px"
                className="object-contain"
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-biz-navy to-blue-700 flex items-center justify-center flex-shrink-0">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{job.title}</h3>
            <p className="text-sm text-gray-600">{companyName}</p>
            <div className="flex flex-wrap gap-2 mt-1">
              <span className="inline-flex px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                {formatEmploymentType(job.employment_type)}
              </span>
              <span className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                {location}
              </span>
            </div>
          </div>
        </div>

        {/* Share Buttons Grid */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            Share on social media
          </h4>
          <div className="grid grid-cols-4 gap-3">
            {sharePlatforms.map((platform) => {
              const Icon = platform.icon;
              return (
                <button
                  key={platform.id}
                  onClick={() => handleShare(platform.id)}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3 ${platform.bgColor} ${platform.hoverColor} text-white rounded-lg transition-all`}
                  title={platform.name}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{platform.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Copy Link */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Or copy the link</h4>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={buildShareUrl('copy')}
              readOnly
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm truncate"
            />
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <LinkIcon className="w-4 h-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-center pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </BizModal>
  );
}

/**
 * JobShareModal with ErrorBoundary (STANDARD tier requirement)
 */
export function JobShareModal(props: JobShareModalProps) {
  return (
    <ErrorBoundary componentName="JobShareModal">
      <JobShareModalInner {...props} />
    </ErrorBoundary>
  );
}

export default JobShareModal;
