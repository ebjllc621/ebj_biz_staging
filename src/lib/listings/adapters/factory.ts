/**
 * P3.3b Listings Adapter Factory
 * Provides environment-based repository adapter selection
 * BIZ_DB environment variable controls storage backend
 */

import { ListingsRepository } from '../repo';
import { InMemoryListingsRepository } from './memory';
import { SQLiteListingsRepository } from './sqlite';

/**
 * Available database types for listings storage
 */
export type DatabaseType = 'memory' | 'sqlite';

/**
 * Configuration for adapter factory
 */
export interface AdapterFactoryConfig {
  /** Database type override (defaults to BIZ_DB env var) */
  type?: DatabaseType;
  
  /** Force development mode (uses memory even if BIZ_DB=sqlite) */
  development?: boolean;
  
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Factory for creating listings repository adapters based on environment configuration
 */
export class ListingsAdapterFactory {
  private static instance: ListingsRepository | null = null;
  
  /**
   * Create repository adapter based on configuration
   */
  static create(config: AdapterFactoryConfig = {}): ListingsRepository {
    // Allow singleton reset for testing
    if (config.development) {
      this.instance = null;
    }
    
    // Return singleton instance if exists
    if (this.instance) {
      return this.instance;
    }

    const dbType = this.determineDbType(config);
    
    if (config.debug) {
    }

    switch (dbType) {
      case 'sqlite':
        this.instance = new SQLiteListingsRepository();
        break;
      case 'memory':
      default:
        this.instance = new InMemoryListingsRepository();
        break;
    }

    return this.instance;
  }

  /**
   * Get current adapter instance (if exists)
   */
  static getInstance(): ListingsRepository | null {
    return this.instance;
  }

  /**
   * Reset factory (for testing)
   */
  static reset(): void {
    this.instance = null;
  }

  /**
   * Determine database type from environment and config
   */
  private static determineDbType(config: AdapterFactoryConfig): DatabaseType {
    // Config type override takes precedence
    if (config.type) {
      return config.type;
    }

    // Force memory in development mode
    if (config.development) {
      return 'memory';
    }

    // Check BIZ_DB environment variable
    const envDb = process.env.BIZ_DB?.toLowerCase();
    
    switch (envDb) {
      case 'sqlite':
        return 'sqlite';
      case 'memory':
        return 'memory';
      default:
        // Default to memory if not specified or invalid value
        if (envDb && envDb !== 'memory' && envDb !== 'sqlite') {
        }
        return 'memory';
    }
  }

  /**
   * Get current database type
   */
  static getCurrentType(): DatabaseType | null {
    if (!this.instance) {
      return null;
    }

    if (this.instance instanceof SQLiteListingsRepository) {
      return 'sqlite';
    } else if (this.instance instanceof InMemoryListingsRepository) {
      return 'memory';
    }

    return null;
  }

  /**
   * Check if SQLite is available (better-sqlite3 installed)
   */
  static isSQLiteAvailable(): boolean {
    try {
      require('better-sqlite3');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get adapter information for debugging
   */
  static getAdapterInfo(): {
    type: DatabaseType | null;
    singleton: boolean;
    sqliteAvailable: boolean;
    envVar: string | undefined;
  } {
    return {
      type: this.getCurrentType(),
      singleton: this.instance !== null,
      sqliteAvailable: this.isSQLiteAvailable(),
      envVar: process.env.BIZ_DB
    };
  }
}

/**
 * Default factory function for creating listings repository
 * Convenience function that uses environment-based configuration
 */
export function createListingsRepository(config?: AdapterFactoryConfig): ListingsRepository {
  return ListingsAdapterFactory.create(config);
}

/**
 * Get current repository instance
 */
export function getListingsRepository(): ListingsRepository | null {
  return ListingsAdapterFactory.getInstance();
}

/**
 * Reset repository factory (primarily for testing)
 */
export function resetListingsRepository(): void {
  ListingsAdapterFactory.reset();
}