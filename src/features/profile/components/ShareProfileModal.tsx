/**
 * ShareProfileModal - Modal with multiple profile sharing options
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @brain-plan docs/pages/layouts/home/user/user_profile/phases/PHASE_2_SHAREPROFILEMODAL_BRAIN_PLAN.md
 *
 * GOVERNANCE COMPLIANCE:
 * - Uses branded BizModal from @/components/BizModal (gradient header + logo)
 * - ErrorBoundary wrapper (STANDARD tier requirement)
 * - Client Component ('use client')
 * - Tailwind CSS styling
 *
 * Features:
 * - Profile URL display with copy functionality (Phase 3)
 * - Social media share buttons (Phase 4)
 * - QR code generation (Phase 5)
 * - Email share option (Phase 6)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Link2, Share2, Mail, QrCode, Check, Copy, Twitter, Facebook, Linkedin, Download } from 'lucide-react';
import BizModal from '@/components/BizModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import QRCode from 'qrcode';
import { ErrorService } from '@core/services/ErrorService';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ShareProfileModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Profile data to share */
  profile: {
    id: number;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  /** Pre-constructed profile URL */
  profileUrl: string;
  /** Optional callback when share completes */
  onShareComplete?: () => void;
}

// ============================================================================
// SHAREPROFILEMODAL CONTENT
// ============================================================================

function ShareProfileModalContent({
  isOpen,
  onClose,
  profile,
  profileUrl,
}: ShareProfileModalProps) {
  const displayName = profile.display_name || profile.username;
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState<'generating' | 'ready' | 'error'>('generating');

  /**
   * Handle copy link to clipboard
   * @governance Follows ShareLink.tsx canonical pattern
   */
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (err) {
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 3000);
    }
  };

  /**
   * Generate share URL for social platforms
   * @governance Standard share intent URLs, no API keys required
   */
  const generateShareUrl = (platform: 'twitter' | 'facebook' | 'linkedin'): string => {
    const shareText = `Check out ${displayName}'s profile on Bizconekt`;

    switch (platform) {
      case 'twitter':
        return `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(profileUrl)}`;
      case 'facebook':
        return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`;
      case 'linkedin':
        return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`;
    }
  };

  /**
   * Handle social share button click
   * @governance Opens in new window with security attributes
   */
  const handleSocialShare = (platform: 'twitter' | 'facebook' | 'linkedin') => {
    const url = generateShareUrl(platform);
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400');
  };

  /**
   * Generate QR code with centered Bizconekt logo
   * @governance Client-side generation only, no API calls
   * @canonical This is the canonical QR code generation pattern with logo overlay
   */
  useEffect(() => {
    const generateQrCodeWithLogo = async () => {
      try {
        setQrStatus('generating');

        // Generate QR code with higher error correction for logo overlay
        // 'H' level allows up to 30% of the code to be obscured
        const qrDataUrl = await QRCode.toDataURL(profileUrl, {
          width: 200,
          margin: 2,
          color: {
            dark: '#022641',  // Bizconekt navy
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'H'  // High error correction for logo overlay
        });

        // Create canvas to composite QR code with logo
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context not available');

        // Load QR code image
        const qrImage = new Image();
        qrImage.src = qrDataUrl;

        await new Promise<void>((resolve, reject) => {
          qrImage.onload = () => resolve();
          qrImage.onerror = () => reject(new Error('Failed to load QR image'));
        });

        // Set canvas size to match QR code
        canvas.width = qrImage.width;
        canvas.height = qrImage.height;

        // Draw QR code
        ctx.drawImage(qrImage, 0, 0);

        // Load and overlay the Bizconekt logo
        const logoImage = new Image();
        logoImage.src = '/uploads/site/branding/logo-icon.png';

        await new Promise<void>((resolve) => {
          logoImage.onload = () => resolve();
          logoImage.onerror = () => {
            // Fallback: if logo fails to load, use QR without logo
            console.warn('Logo failed to load, using QR without logo');
            resolve();
          };
        });

        // Only overlay logo if it loaded successfully
        if (logoImage.complete && logoImage.naturalWidth > 0) {
          // Calculate logo size (approximately 20% of QR code size)
          const logoSize = canvas.width * 0.22;
          const logoX = (canvas.width - logoSize) / 2;
          const logoY = (canvas.height - logoSize) / 2;

          // Draw white background circle behind logo for better visibility
          ctx.beginPath();
          ctx.arc(
            canvas.width / 2,
            canvas.height / 2,
            logoSize / 2 + 4, // Slightly larger than logo
            0,
            Math.PI * 2
          );
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();

          // Draw logo centered
          ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
        }

        // Convert canvas to data URL
        const finalDataUrl = canvas.toDataURL('image/png');
        setQrDataUrl(finalDataUrl);
        setQrStatus('ready');
      } catch (err) {
        ErrorService.capture('QR generation failed:', err);
        setQrStatus('error');
      }
    };

    generateQrCodeWithLogo();
  }, [profileUrl]);

  /**
   * Handle QR code download
   * @governance Creates download from data URL, no external requests
   */
  const handleDownloadQr = () => {
    if (!qrDataUrl) return;

    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${profile.username}-bizconekt-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * Handle email share - opens default email client with pre-filled content
   * @governance Uses mailto: protocol, no external API calls
   */
  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Check out ${displayName}'s profile on Bizconekt`);
    const body = encodeURIComponent(
      `Hi,\n\nI wanted to share this profile with you:\n\n${displayName} on Bizconekt\n${profileUrl}\n\nBest regards`
    );

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Share Profile"
      subtitle={`Share ${displayName}'s profile`}
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Profile Preview Section */}
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex-shrink-0">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
                <span className="text-2xl font-semibold text-orange-600">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {displayName}
            </h3>
            <p className="text-sm text-gray-500">
              @{profile.username}
            </p>
          </div>
        </div>

        {/* Copy Link Section */}
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <Link2 className="w-5 h-5 text-[#022641]" />
            <h4 className="font-medium text-[#022641]">Copy Link</h4>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={profileUrl}
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-600"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              type="button"
              onClick={handleCopyLink}
              disabled={copyStatus === 'copied'}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors
                ${copyStatus === 'copied'
                  ? 'bg-green-600 text-white'
                  : copyStatus === 'error'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-[#ed6437] text-white hover:bg-[#d55a2f]'
                }
              `}
            >
              {copyStatus === 'copied' ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : copyStatus === 'error' ? (
                <>
                  <Copy className="w-4 h-4" />
                  Failed
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
          </div>
          {copyStatus === 'error' && (
            <p className="text-xs text-red-500 mt-2">
              Unable to copy to clipboard. Please select and copy manually.
            </p>
          )}
        </div>

        {/* Social Media Section */}
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <Share2 className="w-5 h-5 text-[#022641]" />
            <h4 className="font-medium text-[#022641]">Share on Social Media</h4>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleSocialShare('twitter')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-700 text-white rounded-md transition-colors"
              aria-label="Share on Twitter/X"
            >
              <Twitter className="w-4 h-4" />
              <span>Twitter/X</span>
            </button>
            <button
              type="button"
              onClick={() => handleSocialShare('facebook')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#6BA3E8] hover:bg-[#1877F2] text-white rounded-md transition-colors"
              aria-label="Share on Facebook"
            >
              <Facebook className="w-4 h-4" />
              <span>Facebook</span>
            </button>
            <button
              type="button"
              onClick={() => handleSocialShare('linkedin')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#5BA4D4] hover:bg-[#0077B5] text-white rounded-md transition-colors"
              aria-label="Share on LinkedIn"
            >
              <Linkedin className="w-4 h-4" />
              <span>LinkedIn</span>
            </button>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <QrCode className="w-5 h-5 text-[#022641]" />
            <h4 className="font-medium text-[#022641]">QR Code</h4>
          </div>
          <div className="flex flex-col items-center py-4 bg-gray-50 rounded-md">
            {qrStatus === 'generating' && (
              <div className="text-center text-gray-600">
                <QrCode className="w-16 h-16 mx-auto mb-2 opacity-30 animate-pulse" />
                <p className="text-sm">Generating QR code...</p>
              </div>
            )}
            {qrStatus === 'ready' && qrDataUrl && (
              <>
                <img
                  src={qrDataUrl}
                  alt={`QR code for ${displayName}'s profile`}
                  className="w-48 h-48"
                />
                <p className="text-xs text-gray-500 mt-2 mb-3">
                  Scan to visit profile
                </p>
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="flex items-center gap-2 px-4 py-2 bg-[#022641] hover:bg-[#033a5c] text-white rounded-md transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download QR</span>
                </button>
              </>
            )}
            {qrStatus === 'error' && (
              <div className="text-center text-red-500">
                <QrCode className="w-16 h-16 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Failed to generate QR code</p>
              </div>
            )}
          </div>
        </div>

        {/* Email Share Section */}
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <Mail className="w-5 h-5 text-[#022641]" />
            <h4 className="font-medium text-[#022641]">Share via Email</h4>
          </div>
          <button
            type="button"
            onClick={handleEmailShare}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#022641] hover:bg-[#033a5c] text-white rounded-md transition-colors"
          >
            <Mail className="w-4 h-4" />
            <span>Open Email Client</span>
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Opens your default email app with a pre-filled message
          </p>
        </div>
      </div>
    </BizModal>
  );
}

// ============================================================================
// SHAREPROFILEMODAL COMPONENT (WITH ERRORBOUNDARY)
// ============================================================================

/**
 * ShareProfileModal - Wrapped with ErrorBoundary (STANDARD tier requirement)
 */
export function ShareProfileModal(props: ShareProfileModalProps) {
  return (
    <ErrorBoundary componentName="ShareProfileModal">
      <ShareProfileModalContent {...props} />
    </ErrorBoundary>
  );
}

export default ShareProfileModal;
