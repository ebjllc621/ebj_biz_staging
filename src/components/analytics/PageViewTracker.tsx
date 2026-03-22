/**
 * PageViewTracker - Automatic Page View Analytics Tracking
 *
 * Client component that tracks page views on navigation.
 * Uses the Next.js App Router navigation events via usePathname.
 *
 * @authority CLAUDE.md - Analytics tracking
 * @tier SIMPLE
 *
 * Usage: Add to root layout (ClientLayout.tsx)
 * ```tsx
 * <PageViewTracker />
 * ```
 */

'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedUrl = useRef<string | null>(null);

  useEffect(() => {
    // Build full URL with search params
    const url = searchParams?.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;

    // Skip if already tracked this URL (prevents double tracking)
    if (url === lastTrackedUrl.current) {
      return;
    }

    // Skip admin routes to avoid inflating analytics
    if (pathname?.startsWith('/admin')) {
      return;
    }

    // Skip API routes and static assets
    if (pathname?.startsWith('/api') || pathname?.startsWith('/_next')) {
      return;
    }

    // Track the page view
    lastTrackedUrl.current = url;

    // Fire-and-forget tracking (don't await)
    fetch('/api/analytics/pageview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        title: typeof document !== 'undefined' ? document.title : undefined,
        referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      }),
      credentials: 'include',
    }).catch(() => {
      // Silently ignore tracking errors - should never block user experience
    });
  }, [pathname, searchParams]);

  // This component renders nothing
  return null;
}

export default PageViewTracker;
