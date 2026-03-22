/**
 * P3.3b SQLite Listings Repository Adapter
 * Provides SQLite-backed storage implementation for listings
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
import { getSQLiteClient } from '../../db/sqlite';
import Database from 'better-sqlite3';

/**
 * Database row interface for SQLite listings table
 */
interface ListingRow {
  id: string;
  title: string;
  description: string;
  category: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  status: string;
  owner_id?: string | null;
  created_at: number;
  updated_at: number;
}

/**
 * SQLite implementation of ListingsRepository
 * Uses better-sqlite3 for persistent storage with Windows compatibility
 */
export class SQLiteListingsRepository implements ListingsRepository {
  private getClient() {
    return getSQLiteClient();
  }

  /**
   * Create a new listing with generated ID and timestamps
   */
  async create(data: CreateListingData): Promise<ListingRecord> {
    const client = this.getClient();
    const db = client.getDatabase();
    
    const now = Date.now();
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
      createdAt: new Date(now),
      updatedAt: new Date(now)
    };

    const insertQuery = `
      INSERT INTO listings (
        id, title, description, category, email, phone, address, website, 
        status, owner_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      const stmt = db.prepare(insertQuery);
      stmt.run(
        listing.id,
        listing.title,
        listing.description,
        listing.category,
        listing.email || null,
        listing.phone || null,
        listing.address || null,
        listing.website || null,
        listing.status,
        listing.ownerId || null,
        now,
        now
      );

      return listing;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find listing by ID
   */
  async findById(id: string): Promise<ListingRecord | null> {
    const client = this.getClient();
    const db = client.getDatabase();
    
    const selectQuery = `
      SELECT id, title, description, category, email, phone, address, website,
             status, owner_id, created_at, updated_at
      FROM listings 
      WHERE id = ?
    `;

    try {
      const stmt = db.prepare(selectQuery);
      const row = stmt.get(id) as ListingRow | undefined;
      
      if (!row) return null;

      return this.mapRowToListing(row);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update existing listing
   */
  async update(data: UpdateListingData): Promise<ListingRecord | null> {
    const client = this.getClient();
    const db = client.getDatabase();
    
    // First check if listing exists
    const existing = await this.findById(data.id);
    if (!existing) {
      return null;
    }

    // Build dynamic update query based on provided fields
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.category !== undefined) {
      updates.push('category = ?');
      values.push(data.category);
    }
    if (data.email !== undefined) {
      updates.push('email = ?');
      values.push(data.email || null);
    }
    if (data.phone !== undefined) {
      updates.push('phone = ?');
      values.push(data.phone || null);
    }
    if (data.address !== undefined) {
      updates.push('address = ?');
      values.push(data.address || null);
    }
    if (data.website !== undefined) {
      updates.push('website = ?');
      values.push(data.website || null);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }

    // Always update the updated_at timestamp
    const now = Date.now();
    updates.push('updated_at = ?');
    values.push(now);
    
    // Add ID for WHERE clause
    values.push(data.id);

    const updateQuery = `
      UPDATE listings 
      SET ${updates.join(', ')} 
      WHERE id = ?
    `;

    try {
      const stmt = db.prepare(updateQuery);
      const result = stmt.run(...values);
      
      if (result.changes === 0) {
        return null;
      }

      // Return updated listing
      return await this.findById(data.id);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete listing by ID
   */
  async delete(id: string): Promise<boolean> {
    const client = this.getClient();
    const db = client.getDatabase();
    
    const deleteQuery = 'DELETE FROM listings WHERE id = ?';

    try {
      const stmt = db.prepare(deleteQuery);
      const result = stmt.run(id);
      
      return result.changes > 0;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find listings matching query criteria
   */
  async findMany(query: ListingQuery = {}): Promise<ListingRecord[]> {
    const client = this.getClient();
    const db = client.getDatabase();
    
    // Build dynamic query based on filters
    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (query.category) {
      conditions.push('LOWER(category) = LOWER(?)');
      values.push(query.category);
    }

    if (query.status) {
      conditions.push('status = ?');
      values.push(query.status);
    }

    if (query.ownerId) {
      conditions.push('owner_id = ?');
      values.push(query.ownerId);
    }

    if (query.search) {
      conditions.push('(LOWER(title) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?))');
      const searchPattern = `%${query.search}%`;
      values.push(searchPattern, searchPattern);
    }

    let selectQuery = `
      SELECT id, title, description, category, email, phone, address, website,
             status, owner_id, created_at, updated_at
      FROM listings
    `;

    if (conditions.length > 0) {
      selectQuery += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add ordering by creation date (newest first)
    selectQuery += ' ORDER BY created_at DESC';

    // Add pagination
    if (query.limit !== undefined) {
      selectQuery += ' LIMIT ?';
      values.push(query.limit);
      
      if (query.offset !== undefined) {
        selectQuery += ' OFFSET ?';
        values.push(query.offset);
      }
    } else if (query.offset !== undefined) {
      selectQuery += ' OFFSET ?';
      values.push(query.offset);
    }

    try {
      const stmt = db.prepare(selectQuery);
      const rows = stmt.all(...values) as ListingRow[];
      
      return rows.map(row => this.mapRowToListing(row));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Count listings matching query criteria
   */
  async count(query: ListingQuery = {}): Promise<number> {
    const client = this.getClient();
    const db = client.getDatabase();
    
    // Build dynamic count query based on filters
    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (query.category) {
      conditions.push('LOWER(category) = LOWER(?)');
      values.push(query.category);
    }

    if (query.status) {
      conditions.push('status = ?');
      values.push(query.status);
    }

    if (query.ownerId) {
      conditions.push('owner_id = ?');
      values.push(query.ownerId);
    }

    if (query.search) {
      conditions.push('(LOWER(title) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?))');
      const searchPattern = `%${query.search}%`;
      values.push(searchPattern, searchPattern);
    }

    let countQuery = 'SELECT COUNT(*) as count FROM listings';

    if (conditions.length > 0) {
      countQuery += ` WHERE ${conditions.join(' AND ')}`;
    }

    try {
      const stmt = db.prepare(countQuery);
      const result = stmt.get(...values) as { count: number };
      
      return result.count;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if listing exists by ID
   */
  async exists(id: string): Promise<boolean> {
    const client = this.getClient();
    const db = client.getDatabase();
    
    const existsQuery = 'SELECT 1 FROM listings WHERE id = ? LIMIT 1';

    try {
      const stmt = db.prepare(existsQuery);
      const result = stmt.get(id);
      
      return result !== undefined;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Clear all listings (for testing purposes)
   */
  async clear(): Promise<void> {
    const client = this.getClient();
    const db = client.getDatabase();
    
    try {
      const stmt = db.prepare('DELETE FROM listings');
      stmt.run();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get current count of listings (for debugging/monitoring)
   */
  async getSize(): Promise<number> {
    return await this.count();
  }

  /**
   * Search listings with dedicated search options
   * Implements text search with LIKE queries, tag filtering, and pagination
   */
  async search(options: ListingSearchOptions = {}): Promise<ListingRecord[]> {
    const client = this.getClient();
    const db = client.getDatabase();
    
    // Build dynamic query based on search options
    const conditions: string[] = [];
    const values: (string | number)[] = [];

    // Apply text search filter (searches in title and description)
    if (options.q && options.q.trim()) {
      conditions.push('(LOWER(title) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?))');
      const searchPattern = `%${options.q.trim()}%`;
      values.push(searchPattern, searchPattern);
    }

    // Apply tag/category filter
    if (options.tag && options.tag.trim()) {
      conditions.push('LOWER(category) = LOWER(?)');
      values.push(options.tag.trim());
    }

    // Build the main query
    let selectQuery = `
      SELECT id, title, description, category, email, phone, address, website,
             status, owner_id, created_at, updated_at
      FROM listings
    `;

    if (conditions.length > 0) {
      selectQuery += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add ordering by creation date (newest first)
    selectQuery += ' ORDER BY created_at DESC';

    // Apply pagination with proper bounds checking
    const limit = Math.min(Math.max(options.limit || 20, 1), 100); // Clamp to 1-100
    const offset = Math.min(Math.max(options.offset || 0, 0), 5000); // Clamp to 0-5000

    selectQuery += ' LIMIT ? OFFSET ?';
    values.push(limit, offset);

    try {
      const stmt = db.prepare(selectQuery);
      const rows = stmt.all(...values) as ListingRow[];
      
      return rows.map(row => this.mapRowToListing(row));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Map database row to ListingRecord interface
   */
  private mapRowToListing(row: ListingRow): ListingRecord {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      email: row.email || undefined,
      phone: row.phone || undefined,
      address: row.address || undefined,
      website: row.website || undefined,
      status: row.status as ListingStatus,
      ownerId: row.owner_id || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
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
 * Map database row to ListingRecord (standalone helper)
 */
function mapRowToListing(row: ListingRow): ListingRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    email: row.email || undefined,
    phone: row.phone || undefined,
    address: row.address || undefined,
    website: row.website || undefined,
    status: row.status as ListingStatus,
    ownerId: row.owner_id || undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

/**
 * Get direct database access (for other modules like saved searches)
 */
export function getDb(): Database.Database {
  const client = getSQLiteClient();
  return client.getDatabase();
}

/**
 * Standalone search function for SQLite adapter
 * Uses parameterized queries for security and implements filtering, sorting, and pagination
 * @param params - Search parameters
 * @returns Search result with items and total count
 */
export async function search(params: SearchParams): Promise<SearchResult> {
  const client = getSQLiteClient();
  const db = client.getDatabase();
  
  // Build WHERE clause conditions
  const conditions: string[] = [];
  const countValues: (string | number)[] = [];
  const selectValues: (string | number)[] = [];
  
  // Apply text search filter if q is provided (case-insensitive LIKE)
  if (params.q && params.q.trim()) {
    conditions.push('(LOWER(title) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?))');
    const searchPattern = `%${params.q.trim()}%`;
    countValues.push(searchPattern, searchPattern);
    selectValues.push(searchPattern, searchPattern);
  }
  
  // Build WHERE clause
  const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
  
  // Build ORDER BY clause based on sort parameter
  let orderByClause: string;
  const sortOrder = params.sort || 'recent';
  if (sortOrder === 'recent') {
    // Sort by createdAt descending (most recent first)
    orderByClause = ' ORDER BY created_at DESC';
  } else if (sortOrder === 'name') {
    // Sort by title ascending
    orderByClause = ' ORDER BY title ASC';
  } else {
    // Default to recent
    orderByClause = ' ORDER BY created_at DESC';
  }
  
  // First, get total count of matching records
  const countQuery = `SELECT COUNT(*) as count FROM listings${whereClause}`;
  
  try {
    const countStmt = db.prepare(countQuery);
    const countResult = countStmt.get(...countValues) as { count: number };
    const total = countResult.count;
    
    // Then, get paginated results with sorting
    const selectQuery = `
      SELECT id, title, description, category, email, phone, address, website,
             status, owner_id, created_at, updated_at
      FROM listings${whereClause}${orderByClause}
      LIMIT ? OFFSET ?
    `;
    
    // Add limit and offset to values (use parameters only, no string concatenation)
    const limit = params.limit || 20;
    const offset = params.offset || 0;
    selectValues.push(limit, offset);
    
    const selectStmt = db.prepare(selectQuery);
    const rows = selectStmt.all(...selectValues) as ListingRow[];
    
    // Map rows to ListingRecord objects
    const items = rows.map(mapRowToListing);
    
    return {
      items,
      total
    };
  } catch (error) {
    throw error;
  }
}