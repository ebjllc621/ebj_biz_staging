/**
 * P3.8b Saved Searches SQLite Implementation
 * SQLite-backed storage for anonymous saved searches bound to clientId
 * Following Build Map v2.1 ENHANCED patterns and service architecture standards
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { SavedSearch, CreateSavedSearchInput } from './types';
import { getDb } from '../listings/adapters/sqlite';

/**
 * Ensure saved_searches table exists with proper schema and indexes
 */
function ensureSchema(db: Database.Database): void {
  // Create saved_searches table
  db.exec(`CREATE TABLE IF NOT EXISTS saved_searches (
    id TEXT PRIMARY KEY,
    clientId TEXT NOT NULL,
    name TEXT,
    params TEXT NOT NULL,
    createdAt INTEGER NOT NULL
  );`);

  // Create index for efficient clientId lookups
  db.exec(`CREATE INDEX IF NOT EXISTS idx_saved_searches_client ON saved_searches(clientId);`);
}

/**
 * Create a new saved search
 */
export function createSaved(input: CreateSavedSearchInput): SavedSearch {
  const db = getDb();
  ensureSchema(db);
  
  const id = randomUUID();
  const createdAt = Date.now();
  
  const stmt = db.prepare('INSERT INTO saved_searches (id, clientId, name, params, createdAt) VALUES (?, ?, ?, ?, ?)');
  stmt.run(id, input.clientId, input.name ?? null, JSON.stringify(input.params), createdAt);
  
  return {
    id,
    clientId: input.clientId,
    name: input.name ?? null,
    params: input.params,
    createdAt
  };
}

/**
 * List all saved searches for a client, ordered by creation date (newest first)
 */
export function listSaved(clientId: string): SavedSearch[] {
  const db = getDb();
  ensureSchema(db);
  
  const rows = db.prepare('SELECT id, clientId, name, params, createdAt FROM saved_searches WHERE clientId = ? ORDER BY createdAt DESC')
    .all(clientId) as Array<{
      id: string;
      clientId: string; 
      name: string | null;
      params: string;
      createdAt: number;
    }>;
  
  return rows.map(r => ({
    ...r,
    params: JSON.parse(r.params)
  }));
}

/**
 * Remove a saved search by ID and clientId (ensures ownership)
 */
export function removeSaved(clientId: string, id: string): boolean {
  const db = getDb();
  ensureSchema(db);
  
  const res = db.prepare('DELETE FROM saved_searches WHERE id = ? AND clientId = ?').run(id, clientId);
  return res.changes > 0;
}