/**
 * PostPublishShareModal - Social sharing modal after job creation
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Jobs Phase 1 - Core Job CRUD & Display
 */
'use client';

import { useState } from 'react';
import { BizModal } from '@/components/ui/BizModal';
import { Facebook, Twitter, Linkedin, Mail, Link as LinkIcon, Check } from 'lucide-react';
import type { Job } from '@features/jobs/types';

interface PostPublishShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job;
}

export function PostPublishShareModal({ isOpen, onClose, job }: PostPublishShareModalProps) {
  const [copied, setCopied] = useState(false);

  const jobUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/jobs/${job.slug}`;
  const shareText = `Check out this job opportunity: ${job.title}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(jobUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (platform: string) => {
    let shareUrl = '';

    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(jobUrl)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(jobUrl)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(jobUrl)}`;
        break;
      case 'email':
        shareUrl = `mailto:?subject=${encodeURIComponent(job.title)}&body=${encodeURIComponent(shareText + '\n\n' + jobUrl)}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }

    // Track share analytics (existing)
    // GOVERNANCE: source must be valid ENUM: 'search' | 'notification' | 'direct' | 'social' | 'listing' | 'homepage'
    fetch(`/api/jobs/${job.id}/analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        event_type: 'share',
        source: 'social' // Business owner sharing via social platform
      })
    }).catch((err) => console.error('Failed to track share:', err));

    // NEW: Record to job_shares table for platform-specific tracking
    fetch(`/api/jobs/${job.id}/shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        share_type: 'business_owner',
        platform: platform,
        share_url: jobUrl
      })
    }).catch((err) => console.error('Failed to record share:', err));
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Job Posted Successfully!"
      size="medium"
    >
      <div className="space-y-6">
        {/* Success Message */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Check className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Your job is live!
          </h3>
          <p className="text-sm text-gray-600">
            Share it with your network to reach more candidates
          </p>
        </div>

        {/* Job Details */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">{job.title}</h4>
          <p className="text-sm text-gray-600 line-clamp-2">{job.description}</p>
        </div>

        {/* Share Options */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Share on social media</h4>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleShare('facebook')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Facebook className="w-5 h-5" />
              <span className="font-medium">Facebook</span>
            </button>

            <button
              onClick={() => handleShare('twitter')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
            >
              <Twitter className="w-5 h-5" />
              <span className="font-medium">Twitter</span>
            </button>

            <button
              onClick={() => handleShare('linkedin')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors"
            >
              <Linkedin className="w-5 h-5" />
              <span className="font-medium">LinkedIn</span>
            </button>

            <button
              onClick={() => handleShare('email')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Mail className="w-5 h-5" />
              <span className="font-medium">Email</span>
            </button>
          </div>
        </div>

        {/* Copy Link */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Or copy the link</h4>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={jobUrl}
              readOnly
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm"
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

        {/* Actions */}
        <div className="flex justify-center pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </BizModal>
  );
}

export default PostPublishShareModal;
