/**
 * Listings API contracts and type definitions
 * Following service-architecture-standards.mdc and naming-authority patterns
 * P3.2 Implementation with validation patterns per anti-synthetic enforcement
 */

export interface ListingCreate {
  title: string;
  description: string;
  category: string;
  price?: number;
  location?: string;
  contactEmail: string;
}

export interface ListingUpdate {
  title?: string;
  description?: string;
  category?: string;
  price?: number;
  location?: string;
  contactEmail?: string;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  category: string;
  price?: number;
  location?: string;
  contactEmail: string;
  userId: string;
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
}

export type ListingStatus = 'draft' | 'active' | 'inactive' | 'expired' | 'deleted';

export interface ListingSearchParams {
  category?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: ListingStatus;
  userId?: string;
  page?: number;
  limit?: number;
}

export interface ListingsResponse {
  listings: Listing[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ListingResponse {
  listing: Listing;
}

export interface DeleteListingResponse {
  success: boolean;
  message: string;
  deletedId: string;
}

/**
 * Listing error codes following canonical error patterns
 */
export const LISTING_ERROR_CODES = {
  LISTING_NOT_FOUND: 'LISTING_NOT_FOUND',
  INVALID_LISTING_DATA: 'INVALID_LISTING_DATA',
  UNAUTHORIZED_LISTING_ACCESS: 'UNAUTHORIZED_LISTING_ACCESS',
  INVALID_CATEGORY: 'INVALID_CATEGORY',
  INVALID_PRICE: 'INVALID_PRICE',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED'
} as const;

export type ListingErrorCode = keyof typeof LISTING_ERROR_CODES;

/**
 * Valid listing categories
 */
export const LISTING_CATEGORIES = [
  'business',
  'service',
  'product',
  'event',
  'property',
  'job',
  'education',
  'community'
] as const;

export type ListingCategory = typeof LISTING_CATEGORIES[number];