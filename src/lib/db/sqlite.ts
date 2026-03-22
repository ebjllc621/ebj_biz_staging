/**
 * P3.3b SQLite Database Client
 * Provides SQLite database connection and table management
 * Windows-safe path handling with var/data storage
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

/**
 * SQLite database client with Windows-safe path handling
 */
export class SQLiteClient {
  private db: Database.Database | null = null;
  private readonly dbPath: string;

  constructor(filename = 'bizconekt.db') {
    // Windows-safe path construction using path.resolve
    const projectRoot = process.cwd();
    const dataDir = path.resolve(projectRoot, 'var', 'data');
    this.dbPath = path.resolve(dataDir, filename);
    
    // Ensure data directory exists
    this.ensureDataDirectory(dataDir);
  }

  /**
   * Get database connection (singleton pattern)
   */
  getDatabase(): Database.Database {
    if (!this.db) {
      this.connect();
    }
    return this.db!;
  }

  /**
   * Connect to SQLite database
   */
  private connect(): void {
    try {
      this.db = new Database(this.dbPath);
      
      // Enable WAL mode for better concurrent access
      this.db.pragma('journal_mode = WAL');
      
      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');
      
      // Initialize tables
      this.initializeTables();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Initialize database tables
   */
  private initializeTables(): void {
    if (!this.db) return;

    // Create listings table with all required fields
    const createListingsTable = `
      CREATE TABLE IF NOT EXISTS listings (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        website TEXT,
        status TEXT NOT NULL DEFAULT 'DRAFT',
        owner_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `;

    try {
      this.db.exec(createListingsTable);
      
      // Create indexes for better performance
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_listings_owner_id ON listings(owner_id)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at)');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Ensure data directory exists with Windows-safe creation
   */
  private ensureDataDirectory(dataDir: string): void {
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Get database file path for debugging
   */
  getDatabasePath(): string {
    return this.dbPath;
  }

  /**
   * Check if database file exists
   */
  exists(): boolean {
    return fs.existsSync(this.dbPath);
  }

  /**
   * Get database file size in bytes
   */
  getSize(): number {
    if (!this.exists()) return 0;
    const stats = fs.statSync(this.dbPath);
    return stats.size;
  }

  /**
   * Execute raw SQL for debugging/maintenance
   * Should be used sparingly in production
   */
  exec(sql: string): void {
    const db = this.getDatabase();
    db.exec(sql);
  }

  /**
   * Begin transaction
   */
  beginTransaction(): Database.Transaction {
    const db = this.getDatabase();
    return db.transaction(() => {});
  }
}

// Singleton instance for application use
let sqliteClient: SQLiteClient | null = null;

/**
 * Get singleton SQLite client instance
 */
export function getSQLiteClient(): SQLiteClient {
  if (!sqliteClient) {
    sqliteClient = new SQLiteClient();
  }
  return sqliteClient;
}

/**
 * Close SQLite client and reset singleton
 */
export function closeSQLiteClient(): void {
  if (sqliteClient) {
    sqliteClient.close();
    sqliteClient = null;
  }
}