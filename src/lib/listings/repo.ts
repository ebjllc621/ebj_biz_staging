/**
 * P3.3a Listings Repository Interface
 * Defines the contract for listing data access operations
 * Following Build Map v2.1 ENHANCED patterns and service architecture standards
 */

import { 
  ListingRecord, 
  CreateListingData, 
  UpdateListingData, 
  ListingQuery 
} from './model';

/**
 * Search options for listing search queries
 */
export interface ListingSearchOptions {
  /** Text search query - searches in title and description */
  q?: string;
  
  /** Tag/category filter */
  tag?: string;
  
  /** Maximum number of results (1-100) */
  limit?: number;
  
  /** Offset for pagination (0-5000) */
  offset?: number;
}

/**
 * Repository interface for listing operations
 * Defines CRUD operations and queries for listings
 */
export interface ListingsRepository {
  /**
   * Create a new listing
   * @param _data - Listing creation data
   * @returns Promise resolving to the created listing record
   */
  create(_data: CreateListingData): Promise<ListingRecord>;
  
  /**
   * Retrieve a listing by ID
   * @param _id - Listing identifier
   * @returns Promise resolving to the listing record or null if not found
   */
  findById(_id: string): Promise<ListingRecord | null>;
  
  /**
   * Update an existing listing
   * @param _data - Listing update data with id
   * @returns Promise resolving to the updated listing record or null if not found
   */
  update(_data: UpdateListingData): Promise<ListingRecord | null>;
  
  /**
   * Delete a listing by ID
   * @param _id - Listing identifier
   * @returns Promise resolving to true if deleted, false if not found
   */
  delete(_id: string): Promise<boolean>;
  
  /**
   * Find all listings matching query criteria
   * @param _query - Query parameters for filtering and pagination
   * @returns Promise resolving to array of matching listings
   */
  findMany(_query?: ListingQuery): Promise<ListingRecord[]>;
  
  /**
   * Count listings matching query criteria
   * @param _query - Query parameters for filtering
   * @returns Promise resolving to count of matching listings
   */
  count(_query?: ListingQuery): Promise<number>;
  
  /**
   * Check if a listing exists by ID
   * @param _id - Listing identifier
   * @returns Promise resolving to true if exists, false otherwise
   */
  exists(_id: string): Promise<boolean>;
  
  /**
   * Search listings with dedicated search options
   * @param _options - Search parameters for text search, filtering, and pagination
   * @returns Promise resolving to array of matching listings
   */
  search(_options?: ListingSearchOptions): Promise<ListingRecord[]>;
}

/**
 * Typed search parameters for listings search
 */
export type SearchParams = {
  /** Text search query */
  q?: string;
  /** Offset for pagination */
  offset: number;
  /** Maximum number of results */
  limit: number;
  /** Sort order */
  sort?: 'recent' | 'name';
};

/**
 * Typed search result with pagination metadata
 */
export type SearchResult<T = unknown> = {
  /** Array of matching items */
  items: T[];
  /** Total number of matching items */
  total: number;
  /** Current offset */
  offset: number;
  /** Current limit */
  limit: number;
  /** Whether there are more results after this page */
  hasNext: boolean;
  /** Whether there are results before this page */
  hasPrev: boolean;
};

/**
 * Search listings using the active repository adapter
 * Delegates to the configured adapter (memory or sqlite)
 * @param params - Search parameters including query, pagination, and sort
 * @returns Promise resolving to search results with pagination metadata
 */
export async function search(params: SearchParams): Promise<SearchResult<ListingRecord>> {
  // Import here to avoid circular dependency
  const { createListingsRepository } = await import('./adapters/factory');
  
  // Get or create the active adapter
  const adapter = createListingsRepository();
  
  // Convert SearchParams to ListingSearchOptions for adapter
  const searchOptions: ListingSearchOptions = {
    q: params.q,
    limit: params.limit,
    offset: params.offset
  };
  
  // Call adapter's search method
  const items = await adapter.search(searchOptions);
  
  // Get total count for pagination
  // Since the adapter returns an array, we need to get the full count
  // In a real implementation, this would be optimized with a separate count query
  const allItemsQuery: ListingSearchOptions = {
    q: params.q,
    limit: undefined,
    offset: 0
  };
  const allItems = await adapter.search(allItemsQuery);
  const total = allItems.length;
  
  // Compute pagination flags
  const hasNext = params.offset + params.limit < total;
  const hasPrev = params.offset > 0;
  
  // Return typed search result
  return {
    items,
    total,
    offset: params.offset,
    limit: params.limit,
    hasNext,
    hasPrev
  };
}