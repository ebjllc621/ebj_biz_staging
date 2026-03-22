/**
 * P3.3a Listings Model Interface
 * Defines the core data structure for business listings
 * Following Build Map v2.1 ENHANCED patterns and service architecture standards
 */

/**
 * Core listing record interface
 * Represents a business listing with essential fields
 */
export interface ListingRecord {
  /** Unique identifier for the listing */
  id: string;
  
  /** Business name/title */
  title: string;
  
  /** Detailed description of the business */
  description: string;
  
  /** Business category/type */
  category: string;
  
  /** Contact email address */
  email?: string;
  
  /** Contact phone number */
  phone?: string;
  
  /** Physical address */
  address?: string;
  
  /** Website URL */
  website?: string;
  
  /** Current status of the listing */
  status: ListingStatus;
  
  /** Record creation timestamp */
  createdAt: Date;
  
  /** Last update timestamp */
  updatedAt: Date;
  
  /** User ID of the listing owner */
  ownerId?: string;
}

/**
 * Listing status enumeration
 */
export enum ListingStatus {
  /** Draft - not yet published */
  // eslint-disable-next-line no-unused-vars
  DRAFT = 'DRAFT',
  
  /** Active - visible to public */
  // eslint-disable-next-line no-unused-vars
  ACTIVE = 'ACTIVE',
  
  /** Inactive - hidden but not deleted */
  // eslint-disable-next-line no-unused-vars
  INACTIVE = 'INACTIVE',
  
  /** Pending - awaiting approval */
  // eslint-disable-next-line no-unused-vars
  PENDING = 'PENDING'
}

/**
 * Input data for creating a new listing
 * Excludes system-generated fields (id, timestamps)
 */
export interface CreateListingData {
  title: string;
  description: string;
  category: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  status?: ListingStatus;
  ownerId?: string;
}

/**
 * Input data for updating an existing listing
 * All fields optional except id
 */
export interface UpdateListingData {
  id: string;
  title?: string;
  description?: string;
  category?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  status?: ListingStatus;
}

/**
 * Query parameters for listing searches
 */
export interface ListingQuery {
  /** Filter by category */
  category?: string;
  
  /** Filter by status */
  status?: ListingStatus;
  
  /** Filter by owner */
  ownerId?: string;
  
  /** Search term for title/description */
  search?: string;
  
  /** Maximum number of results */
  limit?: number;
  
  /** Offset for pagination */
  offset?: number;
}