/**
 * ShareReminderBanner - Share nudge banner for listing owners
 *
 * Self-fetching component that checks if the listing owner should be reminded
 * to share their listing on social media. Only shows if criteria are met:
 * - Published > 24h ago
 * - Zero shares
 * - Has page views
 * Dismissable via localStorage.
 *
 * @tier SIMPLE
 * @phase Phase 3B
 * @authority docs/pages/layouts/listings/features/phases/PHASE_3B_BRAIN_PLAN.md
 */
'use client';

import { useState, useEffect } from 'react';
import { Share2, X } from 'lucide-react';
import type { ShareReminderInfo } from '@core/services/ShareReminderService';

// ============================================================================
// Props
// ============================================================================

interface ShareReminderBannerProps {
  listingId: number;
  listingName: string;
}

// ============================================================================
// ShareReminderBanner Component
// ============================================================================

export function ShareReminderBanner({ listingId, listingName }: ShareReminderBannerProps) {
  const [reminder, setReminder] = useState<ShareReminderInfo | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check localStorage for dismiss state
    const dismissKey = `share-reminder-dismissed-${listingId}`;
    if (typeof window !== 'undefined' && localStorage.getItem(dismissKey)) {
      return;
    }

    const fetchReminder = async () => {
      try {
        const res = await fetch(`/api/listings/${listingId}/share-reminder`, {
          credentials: 'include'
        });
        if (!res.ok) return;
        const data = await res.json();
        const reminderData: ShareReminderInfo | null = data.data?.reminder ?? null;
        if (reminderData) {
          setReminder(reminderData);
        }
      } catch {
        // Silent failure — non-critical UI
      }
    };

    void fetchReminder();
  }, [listingId]);

  const handleDismiss = () => {
    const dismissKey = `share-reminder-dismissed-${listingId}`;
    if (typeof window !== 'undefined') {
      localStorage.setItem(dismissKey, '1');
    }
    setIsDismissed(true);
  };

  if (!reminder || isDismissed) return null;

  return (
    <div
      className="relative border-l-4 bg-orange-50 rounded-lg p-4"
      style={{ borderLeftColor: '#ed6437' }}
      role="complementary"
      aria-label="Share reminder"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex-shrink-0 p-2 rounded-lg"
          style={{ backgroundColor: '#ed643720' }}
        >
          <Share2 className="w-5 h-5" style={{ color: '#ed6437' }} />
        </div>

        <div className="flex-1">
          <p className="font-medium text-gray-900 text-sm mb-1">
            Spread the word about {listingName}!
          </p>
          <p className="text-sm text-gray-600">
            {reminder.message}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Sharing on social media can increase your visibility and bring in more customers.
          </p>
        </div>

        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          aria-label="Dismiss share reminder"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default ShareReminderBanner;
