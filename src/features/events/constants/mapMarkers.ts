/**
 * Event Map Marker Image Constants
 *
 * @tier SIMPLE
 * @phase Phase 5 - Map Integration
 * @generated ComponentBuilder v3.0
 * @governance Build Map v2.1 ENHANCED
 * @umm-compliant Uses UMM-prescribed path: /uploads/site/icons/map-markers/
 *
 * @see src/features/listings/constants/mapMarkers.ts - Canonical pattern
 */

/**
 * Base path for event map marker images (UMM-compliant)
 */
export const EVENT_MARKER_BASE_PATH = '/uploads/site/icons/map-markers';

/**
 * Event map marker image paths by event type
 */
export const EVENT_MARKERS = {
  default: `${EVENT_MARKER_BASE_PATH}/marker-event-default.png`,
  workshop: `${EVENT_MARKER_BASE_PATH}/marker-event-workshop.png`,
  concert: `${EVENT_MARKER_BASE_PATH}/marker-event-concert.png`,
  conference: `${EVENT_MARKER_BASE_PATH}/marker-event-conference.png`,
  meetup: `${EVENT_MARKER_BASE_PATH}/marker-event-meetup.png`,
} as const;

/**
 * Event marker image dimensions (in pixels)
 */
export const EVENT_MARKER_SIZE = {
  width: 32,
  height: 40,
} as const;

/**
 * Get event marker image path based on event type
 *
 * @param eventType - Event type identifier
 * @returns Path to the appropriate marker image
 */
export function getEventMarkerImage(eventType?: string): string {
  if (!eventType) {
    return EVENT_MARKERS.default;
  }

  const normalizedType = eventType.toLowerCase() as keyof typeof EVENT_MARKERS;

  if (normalizedType in EVENT_MARKERS) {
    return EVENT_MARKERS[normalizedType];
  }

  return EVENT_MARKERS.default;
}

/**
 * Event marker type for TypeScript
 */
export type EventMarkerType = keyof typeof EVENT_MARKERS;
