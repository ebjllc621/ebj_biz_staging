/**
 * P3.3a In-Memory Listings Repository Adapter
 * Provides in-memory storage implementation for listings
 * Following Build Map v2.1 ENHANCED patterns and service architecture standards
 */

import { 
  ListingRecord, 
  CreateListingData, 
  UpdateListingData, 
  ListingQuery,
  ListingStatus 
} from '../model';
import { ListingsRepository, ListingSearchOptions } from '../repo';
import { generateId } from '../../util/id';

// Global storage for development - in production this would be replaced with database
const globalListingsStorage = new Map<string, ListingRecord>();

/**
 * In-memory implementation of ListingsRepository
 * Uses a global Map for storage with real functionality (no synthetic data)
 */
export class InMemoryListingsRepository implements ListingsRepository {
  private listings = globalListingsStorage;

  /**
   * Create a new listing with generated ID and timestamps
   */
  async create(data: CreateListingData): Promise<ListingRecord> {
    const now = new Date();
    const listing: ListingRecord = {
      id: generateId(),
      title: data.title,
      description: data.description,
      category: data.category,
      email: data.email,
      phone: data.phone,
      address: data.address,
      website: data.website,
      status: data.status || ListingStatus.DRAFT,
      ownerId: data.ownerId,
      createdAt: now,
      updatedAt: now
    };

    this.listings.set(listing.id, listing);
    return listing;
  }

  /**
   * Find listing by ID
   */
  async findById(id: string): Promise<ListingRecord | null> {
    const listing = this.listings.get(id);
    return listing || null;
  }

  /**
   * Update existing listing
   */
  async update(data: UpdateListingData): Promise<ListingRecord | null> {
    const existing = this.listings.get(data.id);
    if (!existing) {
      return null;
    }

    const updated: ListingRecord = {
      ...existing,
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.website !== undefined && { website: data.website }),
      ...(data.status !== undefined && { status: data.status }),
      updatedAt: new Date()
    };

    this.listings.set(data.id, updated);
    return updated;
  }

  /**
   * Delete listing by ID
   */
  async delete(id: string): Promise<boolean> {
    return this.listings.delete(id);
  }

  /**
   * Find listings matching query criteria
   */
  async findMany(query: ListingQuery = {}): Promise<ListingRecord[]> {
    let results = Array.from(this.listings.values());

    // Apply filters
    if (query.category) {
      results = results.filter(listing => 
        listing.category.toLowerCase() === query.category!.toLowerCase()
      );
    }

    if (query.status) {
      results = results.filter(listing => listing.status === query.status);
    }

    if (query.ownerId) {
      results = results.filter(listing => listing.ownerId === query.ownerId);
    }

    if (query.search) {
      const searchLower = query.search.toLowerCase();
      results = results.filter(listing =>
        listing.title.toLowerCase().includes(searchLower) ||
        listing.description.toLowerCase().includes(searchLower)
      );
    }

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit;

    if (limit !== undefined) {
      results = results.slice(offset, offset + limit);
    } else if (offset > 0) {
      results = results.slice(offset);
    }

    return results;
  }

  /**
   * Count listings matching query criteria
   */
  async count(query: ListingQuery = {}): Promise<number> {
    const results = await this.findMany(query);
    return results.length;
  }

  /**
   * Check if listing exists by ID
   */
  async exists(id: string): Promise<boolean> {
    return this.listings.has(id);
  }

  /**
   * Clear all listings (for testing purposes)
   */
  async clear(): Promise<void> {
    this.listings.clear();
  }

  /**
   * Get current count of listings (for debugging/monitoring)
   */
  getSize(): number {
    return this.listings.size;
  }

  /**
   * Search listings with dedicated search options
   * Implements text search, tag filtering, and pagination
   */
  async search(options: ListingSearchOptions = {}): Promise<ListingRecord[]> {
    let results = Array.from(this.listings.values());

    // Apply text search filter (searches in title and description)
    if (options.q && options.q.trim()) {
      const searchTerm = options.q.toLowerCase().trim();
      results = results.filter(listing =>
        listing.title.toLowerCase().includes(searchTerm) ||
        listing.description.toLowerCase().includes(searchTerm)
      );
    }

    // Apply tag/category filter
    if (options.tag && options.tag.trim()) {
      const tagFilter = options.tag.toLowerCase().trim();
      results = results.filter(listing =>
        listing.category.toLowerCase() === tagFilter
      );
    }

    // Apply pagination with proper bounds checking
    const limit = Math.min(Math.max(options.limit || 20, 1), 100); // Clamp to 1-100
    const offset = Math.min(Math.max(options.offset || 0, 0), 5000); // Clamp to 0-5000

    // Return paginated results
    return results.slice(offset, offset + limit);
  }
}

/**
 * Search parameters for adapter-level search
 */
export interface SearchParams {
  /** Text search query */
  q?: string;
  /** Offset for pagination */
  offset: number;
  /** Maximum number of results */
  limit: number;
  /** Sort order */
  sort?: 'recent' | 'name';
}

/**
 * Search result with items and total count
 */
export interface SearchResult {
  /** Array of matching items */
  items: ListingRecord[];
  /** Total number of matching items (before pagination) */
  total: number;
}

/**
 * Standalone search function for memory adapter
 * Implements filtering, sorting, and pagination
 * @param params - Search parameters
 * @returns Search result with items and total count
 */
export async function search(params: SearchParams): Promise<SearchResult> {
  // Get all listings from global storage
  let results = Array.from(globalListingsStorage.values());
  
  // Apply text search filter if q is provided
  if (params.q && params.q.trim()) {
    const searchTerm = params.q.toLowerCase().trim();
    results = results.filter(listing =>
      listing.title.toLowerCase().includes(searchTerm) ||
      listing.description.toLowerCase().includes(searchTerm)
    );
  }
  
  // Apply sorting
  const sortOrder = params.sort || 'recent';
  if (sortOrder === 'recent') {
    // Sort by createdAt descending (most recent first)
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } else if (sortOrder === 'name') {
    // Sort by title ascending using localeCompare for stable sort
    results.sort((a, b) => a.title.localeCompare(b.title));
  }
  
  // Get total count before pagination
  const total = results.length;
  
  // Apply pagination
  const offset = params.offset || 0;
  const limit = params.limit || 20;
  const paginatedResults = results.slice(offset, offset + limit);
  
  return {
    items: paginatedResults,
    total
  };
}