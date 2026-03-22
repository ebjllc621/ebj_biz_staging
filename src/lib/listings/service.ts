/**
 * P3.3a Listings Service Layer
 * Business logic and validation for listing operations
 * Following Build Map v2.1 ENHANCED patterns and service architecture standards
 */

import { 
  ListingRecord, 
  CreateListingData, 
  UpdateListingData, 
  ListingQuery 
} from './model';
import { ListingsRepository, ListingSearchOptions } from './repo';
import { createListingsRepository } from './adapters/factory';

/**
 * Service layer for listing operations
 * Handles business logic, validation, and timestamp management
 */
export class ListingsService {
  private repository: ListingsRepository;

  constructor(repository?: ListingsRepository) {
    this.repository = repository || createListingsRepository();
  }

  /**
   * Create a new listing with validation
   */
  async create(data: CreateListingData): Promise<ListingRecord> {
    // Basic validation
    this.validateCreateData(data);
    
    // Delegate to repository with timestamp handling in the adapter
    return await this.repository.create(data);
  }

  /**
   * Get listing by ID
   */
  async getById(id: string): Promise<ListingRecord | null> {
    if (!id || typeof id !== 'string') {
      return null;
    }
    
    return await this.repository.findById(id);
  }

  /**
   * Update existing listing with validation
   */
  async update(data: UpdateListingData): Promise<ListingRecord | null> {
    // Basic validation
    this.validateUpdateData(data);
    
    // Check if listing exists
    const existing = await this.repository.findById(data.id);
    if (!existing) {
      return null;
    }
    
    // Delegate to repository with timestamp handling in the adapter
    return await this.repository.update(data);
  }

  /**
   * Delete listing by ID
   */
  async delete(id: string): Promise<boolean> {
    if (!id || typeof id !== 'string') {
      return false;
    }
    
    return await this.repository.delete(id);
  }

  /**
   * Search listings with query parameters
   */
  async search(query: ListingQuery = {}): Promise<ListingRecord[]> {
    // Apply default limits for performance
    const safeQuery = {
      ...query,
      limit: query.limit || 50, // Default limit
      offset: query.offset || 0
    };
    
    return await this.repository.findMany(safeQuery);
  }

  /**
   * Get count of listings matching query
   */
  async count(query: ListingQuery = {}): Promise<number> {
    return await this.repository.count(query);
  }

  /**
   * Check if listing exists
   */
  async exists(id: string): Promise<boolean> {
    if (!id || typeof id !== 'string') {
      return false;
    }
    
    return await this.repository.exists(id);
  }

  /**
   * Search listings with dedicated search options
   * Validates search parameters and applies business logic
   */
  async searchListings(options: ListingSearchOptions = {}): Promise<ListingRecord[]> {
    // Validate and sanitize search options
    const sanitizedOptions = this.validateAndSanitizeSearchOptions(options);
    
    // Delegate to repository
    return await this.repository.search(sanitizedOptions);
  }

  /**
   * Validate create listing data
   */
  private validateCreateData(data: CreateListingData): void {
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
      throw new Error('Title is required and must be a non-empty string');
    }
    
    if (!data.description || typeof data.description !== 'string' || data.description.trim().length === 0) {
      throw new Error('Description is required and must be a non-empty string');
    }
    
    if (!data.category || typeof data.category !== 'string' || data.category.trim().length === 0) {
      throw new Error('Category is required and must be a non-empty string');
    }
    
    // Validate optional email format if provided
    if (data.email && !this.isValidEmail(data.email)) {
      throw new Error('Email must be a valid email address');
    }
    
    // Validate optional website URL if provided
    if (data.website && !this.isValidUrl(data.website)) {
      throw new Error('Website must be a valid URL');
    }
  }

  /**
   * Validate update listing data
   */
  private validateUpdateData(data: UpdateListingData): void {
    if (!data.id || typeof data.id !== 'string') {
      throw new Error('ID is required and must be a string');
    }
    
    // Validate optional fields if provided
    if (data.title !== undefined && (typeof data.title !== 'string' || data.title.trim().length === 0)) {
      throw new Error('Title must be a non-empty string when provided');
    }
    
    if (data.description !== undefined && (typeof data.description !== 'string' || data.description.trim().length === 0)) {
      throw new Error('Description must be a non-empty string when provided');
    }
    
    if (data.category !== undefined && (typeof data.category !== 'string' || data.category.trim().length === 0)) {
      throw new Error('Category must be a non-empty string when provided');
    }
    
    if (data.email !== undefined && data.email !== null && !this.isValidEmail(data.email)) {
      throw new Error('Email must be a valid email address when provided');
    }
    
    if (data.website !== undefined && data.website !== null && !this.isValidUrl(data.website)) {
      throw new Error('Website must be a valid URL when provided');
    }
  }

  /**
   * Basic email validation
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Basic URL validation
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate and sanitize search options
   */
  private validateAndSanitizeSearchOptions(options: ListingSearchOptions): ListingSearchOptions {
    const sanitized: ListingSearchOptions = {};

    // Sanitize search query
    if (options.q !== undefined) {
      if (typeof options.q !== 'string') {
        throw new Error('Search query (q) must be a string');
      }
      // Trim and limit length to prevent abuse
      const trimmed = options.q.trim();
      if (trimmed.length > 200) {
        throw new Error('Search query (q) must be 200 characters or less');
      }
      if (trimmed.length > 0) {
        sanitized.q = trimmed;
      }
    }

    // Sanitize tag filter
    if (options.tag !== undefined) {
      if (typeof options.tag !== 'string') {
        throw new Error('Tag filter must be a string');
      }
      // Trim and limit length
      const trimmed = options.tag.trim();
      if (trimmed.length > 100) {
        throw new Error('Tag filter must be 100 characters or less');
      }
      if (trimmed.length > 0) {
        sanitized.tag = trimmed;
      }
    }

    // Validate limit parameter
    if (options.limit !== undefined) {
      if (typeof options.limit !== 'number' || !Number.isInteger(options.limit)) {
        throw new Error('Limit must be an integer');
      }
      if (options.limit < 1 || options.limit > 100) {
        throw new Error('Limit must be between 1 and 100');
      }
      sanitized.limit = options.limit;
    }

    // Validate offset parameter
    if (options.offset !== undefined) {
      if (typeof options.offset !== 'number' || !Number.isInteger(options.offset)) {
        throw new Error('Offset must be an integer');
      }
      if (options.offset < 0 || options.offset > 5000) {
        throw new Error('Offset must be between 0 and 5000');
      }
      sanitized.offset = options.offset;
    }

    return sanitized;
  }
}