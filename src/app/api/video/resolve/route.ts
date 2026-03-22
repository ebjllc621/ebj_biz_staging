/**
 * POST /api/video/resolve - Resolve video watch URLs to embeddable URLs
 *
 * Handles provider-specific URL resolution:
 * - Rumble watch URLs → embed URLs via oEmbed API
 * - TikTok short URLs (vm.tiktok.com) → full URLs via redirect follow
 * - All other URLs → returned as-is (client-side parsing handles them)
 *
 * @authority Phase 7 - Media Embed Enhancement
 */

import { NextRequest, NextResponse } from 'next/server';

interface ResolveResult {
  originalUrl: string;
  resolvedUrl: string;
  provider: string;
  changed: boolean;
}

/**
 * Extract embed URL from Rumble oEmbed response
 */
async function resolveRumbleWatchUrl(url: string): Promise<string | null> {
  try {
    const oembedUrl = `https://rumble.com/api/Media/oembed.json?url=${encodeURIComponent(url)}`;
    const response = await fetch(oembedUrl, {
      signal: AbortSignal.timeout(8000),
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) return null;

    const data = await response.json();

    // oEmbed returns HTML with iframe - extract the src
    if (data.html) {
      const srcMatch = data.html.match(/src="([^"]+)"/);
      if (srcMatch && srcMatch[1]) {
        return srcMatch[1];
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve TikTok short URL by following redirects to get the full URL
 */
async function resolveTikTokShortUrl(url: string): Promise<string | null> {
  try {
    // Follow redirects to get the canonical URL with video ID
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });

    const finalUrl = response.url;

    // Check if the resolved URL has a video ID we can use
    const videoIdMatch = finalUrl.match(/tiktok\.com\/(?:@[\w.-]+\/video\/|v\/)(\d+)/);
    if (videoIdMatch && videoIdMatch[1]) {
      return finalUrl;
    }

    return null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    const trimmedUrl = url.trim();

    // Check if this is a Rumble watch URL (not already an embed URL)
    const isRumbleWatch = /rumble\.com\/(v[a-zA-Z0-9]+-[^?/]+)/.test(trimmedUrl)
      && !/rumble\.com\/embed\//.test(trimmedUrl);

    if (isRumbleWatch) {
      const embedUrl = await resolveRumbleWatchUrl(trimmedUrl);
      if (embedUrl) {
        const result: ResolveResult = {
          originalUrl: trimmedUrl,
          resolvedUrl: embedUrl,
          provider: 'rumble',
          changed: true,
        };
        return NextResponse.json({ success: true, data: result });
      }

      // oEmbed failed — return original with a warning
      return NextResponse.json({
        success: true,
        data: {
          originalUrl: trimmedUrl,
          resolvedUrl: trimmedUrl,
          provider: 'rumble',
          changed: false,
          warning: 'Could not resolve Rumble watch URL to embed URL. For best results, use the embed URL from Rumble\'s share menu.'
        }
      });
    }

    // Check if this is a TikTok short URL
    const isTikTokShort = /vm\.tiktok\.com\//.test(trimmedUrl);

    if (isTikTokShort) {
      const resolvedUrl = await resolveTikTokShortUrl(trimmedUrl);
      if (resolvedUrl) {
        const result: ResolveResult = {
          originalUrl: trimmedUrl,
          resolvedUrl: resolvedUrl,
          provider: 'tiktok',
          changed: true,
        };
        return NextResponse.json({ success: true, data: result });
      }

      return NextResponse.json({
        success: true,
        data: {
          originalUrl: trimmedUrl,
          resolvedUrl: trimmedUrl,
          provider: 'tiktok',
          changed: false,
          warning: 'Could not resolve TikTok short URL. Use the full URL from the TikTok video page.'
        }
      });
    }

    // All other URLs — return as-is
    return NextResponse.json({
      success: true,
      data: {
        originalUrl: trimmedUrl,
        resolvedUrl: trimmedUrl,
        provider: 'passthrough',
        changed: false,
      }
    });

  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to resolve video URL' },
      { status: 500 }
    );
  }
}
