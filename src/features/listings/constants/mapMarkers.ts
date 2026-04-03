/**
 * Map Marker Image Constants
 *
 * @tier SIMPLE
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @umm-compliant Uses UMM-prescribed path: /uploads/site/icons/map-markers/
 */

/**
 * Base URL for map marker images served to external APIs (Google Static Maps).
 * Google Static Maps requires publicly accessible URLs for custom markers.
 * Set NEXT_PUBLIC_MAP_MARKER_BASE_URL in .env to your Cloudinary folder URL.
 */
export const MAP_MARKER_BASE_URL = process.env.NEXT_PUBLIC_MAP_MARKER_BASE_URL || '';

/**
 * Base path for map marker images (UMM-compliant, used for local/Mapbox rendering)
 */
export const MAP_MARKER_BASE_PATH = '/uploads/site/icons/map-markers';

/**
 * Map marker image paths by tier (relative paths for client-side loading)
 */
export const MAP_MARKERS = {
  unclaimed: `${MAP_MARKER_BASE_PATH}/marker-unclaimed.png`,
  essentials: `${MAP_MARKER_BASE_PATH}/marker-essentials.png`,
  plus: `${MAP_MARKER_BASE_PATH}/marker-plus.png`,
  preferred: `${MAP_MARKER_BASE_PATH}/marker-preferred.png`,
  premium: `${MAP_MARKER_BASE_PATH}/marker-premium.png`,
} as const;

/**
 * Google Static Maps marker colors by tier (fallback for development)
 * Used when custom icons can't be loaded (e.g., localhost)
 */
export const MARKER_COLORS = {
  unclaimed: '0x9CA3AF',  // Gray
  essentials: '0x3B82F6', // Blue
  plus: '0x22C55E',       // Green
  preferred: '0x9333EA',  // Purple
  premium: '0xF59E0B',    // Amber/Gold
} as const;

/**
 * Marker image dimensions (in pixels)
 */
export const MAP_MARKER_SIZE = {
  width: 32,
  height: 40,
} as const;

/**
 * Get marker image path based on claimed status and tier
 * Used for client-side rendering (Mapbox, direct img tags)
 *
 * @param claimed - Whether the listing has been claimed
 * @param tier - Listing subscription tier
 * @returns Path to the appropriate marker image
 */
export function getMarkerImage(
  claimed: boolean,
  tier: 'essentials' | 'plus' | 'preferred' | 'premium'
): string {
  if (!claimed) {
    return MAP_MARKERS.unclaimed;
  }
  return MAP_MARKERS[tier] ?? MAP_MARKERS.essentials;
}

/**
 * Get full marker URL for Google Static Maps API
 * Uses the Cloudinary-hosted markers (NEXT_PUBLIC_MAP_MARKER_BASE_URL) so
 * Google's servers can fetch them from a publicly accessible URL.
 *
 * @param claimed - Whether the listing has been claimed
 * @param tier - Listing subscription tier
 * @returns Full URL to the marker image
 */
export function getMarkerFullUrl(
  claimed: boolean,
  tier: 'essentials' | 'plus' | 'preferred' | 'premium'
): string {
  if (!claimed) {
    return `${MAP_MARKER_BASE_URL}/marker-unclaimed.png`;
  }
  const markerKey = tier in MAP_MARKERS ? tier : 'essentials';
  return `${MAP_MARKER_BASE_URL}/marker-${markerKey}.png`;
}

/**
 * Get marker color for Google Static Maps API (fallback/development)
 *
 * @param claimed - Whether the listing has been claimed
 * @param tier - Listing subscription tier
 * @returns Hex color code for Google Maps marker
 */
export function getMarkerColor(
  claimed: boolean,
  tier: 'essentials' | 'plus' | 'preferred' | 'premium'
): string {
  if (!claimed) {
    return MARKER_COLORS.unclaimed;
  }
  return MARKER_COLORS[tier] ?? MARKER_COLORS.essentials;
}

/**
 * Check if we can use custom marker icons with Google Static Maps API.
 * Returns true when MAP_MARKER_BASE_URL is configured (Cloudinary or any public CDN),
 * since those URLs are publicly accessible from Google's servers regardless of environment.
 */
export function canUseCustomMarkers(): boolean {
  return Boolean(MAP_MARKER_BASE_URL);
}

/**
 * Build Google Static Maps marker parameter
 * Uses custom icon in production, falls back to color in development
 *
 * @param lat - Latitude
 * @param lng - Longitude
 * @param claimed - Whether the listing has been claimed
 * @param tier - Listing subscription tier
 * @returns Marker parameter string for Google Static Maps URL
 */
export function buildStaticMapMarker(
  lat: number,
  lng: number,
  claimed: boolean,
  tier: 'essentials' | 'plus' | 'preferred' | 'premium'
): string {
  if (canUseCustomMarkers()) {
    const iconUrl = getMarkerFullUrl(claimed, tier);
    const encodedIcon = encodeURIComponent(iconUrl);
    return `icon:${encodedIcon}%7C${lat},${lng}`;
  }
  // Fallback to color markers for development
  const color = getMarkerColor(claimed, tier);
  return `color:${color}%7C${lat},${lng}`;
}

/**
 * Marker image type for TypeScript
 */
export type MarkerTier = keyof typeof MAP_MARKERS;
