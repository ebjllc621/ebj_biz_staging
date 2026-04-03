/**
 * Listings Feature Type Definitions
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @phase Phase 3 - Map Integration Types
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 */

import type { ListingCardData } from '@/features/homepage/types';

/**
 * Extended listing data with geographic coordinates for map display
 */
export interface ListingWithCoordinates extends ListingCardData {
  /** Latitude coordinate (null if not set) */
  latitude: number | null;
  /** Longitude coordinate (null if not set) */
  longitude: number | null;
  /** Whether the listing has been claimed by an owner */
  claimed: boolean;
}

/**
 * Map marker data for rendering
 */
export interface MapMarker {
  id: number;
  latitude: number;
  longitude: number;
  name: string;
  tier: 'essentials' | 'plus' | 'preferred' | 'premium';
}

/**
 * Map viewport bounds
 */
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Map view state for controlled component
 */
export interface MapViewState {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing?: number;
  pitch?: number;
}

/**
 * Sort options for listings
 */
export type SortOption = 'recent' | 'name' | 'nearest';

/**
 * Listings filter state
 * @enhanced 2026-02-12 - Advanced search params (userId, userName, type, keywords)
 */
export interface ListingsFilters {
  /** Search query string (name, description) */
  q: string;
  /** Sort option */
  sort: SortOption;
  /** Current page number */
  page: number;
  /** Filter by owner user ID */
  userId?: number;
  /** Search by owner name (fuzzy) */
  userName?: string;
  /** Filter by listing type */
  type?: string;
  /** Search in keywords */
  keywords?: string;
  /** Category slug filter */
  category?: string;
}

/**
 * Search mode for intelligent search bar
 * Detected from query prefix patterns
 */
export type ListingSearchMode = 'all' | 'id' | 'owner' | 'type' | 'keywords';

/**
 * Category filter option (for future implementation)
 */
export interface CategoryOption {
  id: number;
  name: string;
  slug: string;
}

/**
 * Sort dropdown option
 */
export interface SortDropdownOption {
  value: SortOption;
  label: string;
}

/**
 * Display mode for listings view
 */
export type DisplayMode = 'grid' | 'list';
