/**
 * ReferralTemplateModal - Create and send referral invitations
 *
 * @tier STANDARD
 * @phase Contacts Enhancement Phase 3
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority MASTER_BRAIN_PLAN_INDEX.md
 * @reference src/features/contacts/components/AddContactModal.tsx - Modal pattern
 *
 * Features:
 * - Pre-populated from contact data
 * - Customizable referral message
 * - Referral link generation
 * - Copy to clipboard
 * - Share via email/SMS options
 * - BizModal compliance
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { UserPlus, Copy, Check, Mail, MessageCircle } from 'lucide-react';
import { fetchCsrfToken } from '@core/utils/csrf';
import BizModal from '@/components/BizModal/BizModal';
import type { Contact } from '../types';

interface ReferralTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReferralCreated: () => void;
  /** Contact to refer (pre-populates form) */
  contact?: Contact | null;
}

export function ReferralTemplateModal({
  isOpen,
  onClose,
  onReferralCreated,
  contact
}: ReferralTemplateModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    referred_email: '',
    referred_phone: '',
    referred_name: '',
    referral_message: ''
  });

  // Pre-populate from contact
  useEffect(() => {
    if (contact) {
      setFormData({
        referred_email: contact.contact_email || '',
        referred_phone: contact.contact_phone || '',
        referred_name: contact.contact_name || contact.display_name || '',
        referral_message: `Hi ${contact.contact_name || contact.display_name || 'there'},\n\nI've been using Bizconekt to grow my professional network and thought you'd love it too! It's a great platform for connecting with other professionals.\n\nLooking forward to connecting with you there!`
      });
    } else {
      setFormData({
        referred_email: '',
        referred_phone: '',
        referred_name: '',
        referral_message: "Hi there,\n\nI've been using Bizconekt to grow my professional network and thought you'd love it too! It's a great platform for connecting with other professionals.\n\nLooking forward to connecting with you there!"
      });
    }
    setReferralLink(null);
    setCopied(false);
    setError(null);
  }, [contact, isOpen]);

  const handleInputChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    // Validate email
    if (!formData.referred_email.trim()) {
      setError('Email address is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.referred_email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const csrfToken = await fetchCsrfToken();

      const response = await fetch('/api/contacts/referrals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || ''
        },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          contact_id: contact?.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create referral');
      }

      // Set referral link for copy/share
      setReferralLink(data.data?.referral?.referral_link || null);
      onReferralCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create referral');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, contact, onReferralCreated]);

  const handleCopyLink = useCallback(async () => {
    if (!referralLink) return;

    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = referralLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [referralLink]);

  const handleEmailShare = useCallback(() => {
    if (!referralLink) return;

    const subject = encodeURIComponent('Join me on Bizconekt!');
    const body = encodeURIComponent(
      `${formData.referral_message}\n\nJoin here: ${referralLink}`
    );
    window.open(`mailto:${formData.referred_email}?subject=${subject}&body=${body}`);
  }, [referralLink, formData]);

  const handleSmsShare = useCallback(() => {
    if (!referralLink || !formData.referred_phone) return;

    const body = encodeURIComponent(
      `Join me on Bizconekt! ${referralLink}`
    );
    window.open(`sms:${formData.referred_phone}?body=${body}`);
  }, [referralLink, formData.referred_phone]);

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Refer to Bizconekt"
      subtitle={contact ? `Referring ${contact.contact_name || contact.display_name}` : undefined}
      maxWidth="lg"
    >
      <div className="space-y-6 p-6">
        {/* Success State - Show referral link */}
        {referralLink ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <Check className="w-5 h-5" />
              <span className="font-medium">Referral recorded!</span>
            </div>

            <p className="text-sm text-gray-600">
              Your referral has been saved and is tracked on your dashboard.
              Now share the link below so they can sign up:
            </p>

            {/* Referral Link Box */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Referral Link</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-white px-3 py-2 rounded border truncate">
                  {referralLink}
                </code>
                <button
                  onClick={handleCopyLink}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-[#022641] text-white hover:bg-[#033a5c] transition-colors"
                  aria-label="Copy link"
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Share Options */}
            <div className="text-sm font-semibold text-gray-900 mb-2">Send the link via:</div>
            <div className="flex gap-3">
              <button
                onClick={handleEmailShare}
                className="flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-lg bg-[#022641] text-white hover:bg-[#033a5c] transition-colors"
              >
                <Mail className="w-5 h-5" />
                <span>Email</span>
              </button>
              {formData.referred_phone && (
                <button
                  onClick={handleSmsShare}
                  className="flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-lg bg-[#ed6437] text-white hover:bg-[#d55730] transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>SMS</span>
                </button>
              )}
            </div>

            <p className="text-xs text-gray-500 italic">
              The referral won&apos;t reach them until you share the link above.
            </p>

            {/* Done Button */}
            <button
              onClick={onClose}
              className="w-full min-h-[44px] mt-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          /* Form State */
          <>
            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Contact Info Section */}
            <div className="space-y-4">
              <div className="text-sm font-semibold text-gray-900 mb-2">Contact Information</div>

              {/* Name */}
              <div>
                <label htmlFor="referred_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  id="referred_name"
                  name="referred_name"
                  value={formData.referred_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biz-orange focus:border-transparent"
                  placeholder="Enter name"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="referred_email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="referred_email"
                  name="referred_email"
                  value={formData.referred_email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biz-orange focus:border-transparent"
                  placeholder="Enter email address"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="referred_phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone (optional)
                </label>
                <input
                  type="tel"
                  id="referred_phone"
                  name="referred_phone"
                  value={formData.referred_phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biz-orange focus:border-transparent"
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            {/* Message Section */}
            <div className="space-y-4">
              <div className="text-sm font-semibold text-gray-900 mb-2">Personalized Message</div>
              <textarea
                id="referral_message"
                name="referral_message"
                value={formData.referral_message}
                onChange={handleInputChange}
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biz-orange focus:border-transparent resize-none"
                placeholder="Add a personal message..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 min-h-[44px] rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-lg bg-[#022641] text-white hover:bg-[#033a5c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UserPlus className="w-5 h-5" />
                {isSubmitting ? 'Creating...' : 'Create Referral'}
              </button>
            </div>
          </>
        )}
      </div>
    </BizModal>
  );
}

export default ReferralTemplateModal;
