/**
 * DatabaseService - MariaDB 10.11 Database Access Layer
 *
 * GOVERNANCE ENFORCEMENT: MariaDB 10.11 ONLY
 * - Uses mariadb driver exclusively (provides pool statistics)
 * - Parameterization: ? placeholders (NOT $1, $2 PostgreSQL style)
 * - NO RETURNING clauses (use LAST_INSERT_ID() + SELECT pattern)
 * - Direct driver access is FORBIDDEN outside this service
 *
 * PRODUCTION IMPLEMENTATION: Uses mariadb driver for actual database operations.
 * Provides singleton pattern with connection pooling via ConnectionPoolManager.
 *
 * Build Map v2.1 ENHANCED compliance:
 * - Extends CoreService for structured service patterns
 * - MariaDB-specific implementation with mariadb package
 * - Transaction support framework
 * - Migration management structure
 * - Connection pooling architecture with real-time statistics
 *
 * @authority database-package-canonical.md - MANDATORY mariadb package
 * @tier STANDARD
 * @phase Phase 1 (Core Services)
 * @updated 2026-01-21 - Migrated from mysql2 to mariadb
 */

import mariadb from 'mariadb';
import { CoreService, ServiceConfig } from './CoreService';
import { BizError } from '@core/errors/BizError';
import {
  DbConnection,
  DbResult,
  DbConfig,
  QueryOptions,
  TransactionOptions,
  DbEntity,
  QueryBuilder,
  Migration,
  MigrationResult
} from '@core/types/db';
import { getDatabaseConfig } from '@core/config/database.config';
import { getConnectionPoolManager } from './ConnectionPoolManager';

export interface DatabaseServiceConfig extends ServiceConfig {
  database: DbConfig;
  migrations?: {
    directory: string;
    table: string;
  };
}

/**
 * MariaDB database service
 *
 * PRODUCTION IMPLEMENTATION: Uses mariadb for actual database operations.
 * Provides connection pooling and transaction support with real-time statistics.
 */
export class DatabaseService extends CoreService {
  private connection: DbConnection | null = null;
  private pool: mariadb.Pool | null = null;
  private readonly dbConfig: DbConfig;

  /**
   * Promise for ongoing initialization to prevent concurrent init attempts
   * @governance R7.1 - Auto-initialization pattern
   */
  private initializePromise: Promise<void> | null = null;

  constructor(config: DatabaseServiceConfig) {
    super({
      ...config,
      name: 'DatabaseService',
      version: '5.0.0'
    });

    this.dbConfig = config.database;
    this.logger.info('DatabaseService initialized', {
      operation: 'constructor',
      metadata: {
        host: this.dbConfig.host,
        database: this.dbConfig.database,
        port: this.dbConfig.port
      }
    });
  }

  /**
   * Initialize database connection pool
   * GOVERNANCE: Use shared pool from ConnectionPoolManager
   * DO NOT create pool directly - prevents pool fragmentation
   */
  async initialize(): Promise<void> {
    return this.executeOperation('initialize', async () => {
      this.logger.info('Initializing MariaDB/MySQL connection pool', {
        metadata: {
          host: this.dbConfig.host,
          database: this.dbConfig.database,
          port: this.dbConfig.port
        }
      });

      // GOVERNANCE: Use shared pool from ConnectionPoolManager
      this.pool = await getConnectionPoolManager().getPool();

      this.logger.info('Database service initialized successfully');
    });
  }

  /**
   * Ensure database is initialized before executing operations
   * Auto-initializes if not already initialized (thread-safe)
   *
   * @governance R7.1 - Auto-initialization pattern
   * @description Prevents "Service DatabaseService is currently unavailable" errors
   *              by automatically initializing the connection pool on first use
   */
  private async ensureInitialized(): Promise<void> {
    // Already initialized - fast path
    if (this.pool) {
      return;
    }

    // Start initialization if not already in progress
    if (!this.initializePromise) {
      this.initializePromise = this.initialize();
    }

    // Wait for initialization to complete
    await this.initializePromise;
  }

  /**
   * Execute raw SQL query
   * Uses mysql2 to execute actual database queries
   */
  async query<T = unknown>(
    sql: string,
    params?: unknown[],
    options?: QueryOptions
  ): Promise<DbResult<T>> {
    // Auto-initialize if needed (R7.1 pattern)
    await this.ensureInitialized();

    return this.executeOperation('query', async () => {
      if (!this.pool) {
        // This should never happen after ensureInitialized, but kept as safety
        throw BizError.serviceUnavailable('DatabaseService', new Error('Not initialized'));
      }

      this.logger.debug('Executing MySQL query', {
        metadata: {
          sql: sql.substring(0, 100),
          paramCount: params?.length || 0,
          timeout: options?.timeout
        }
      });

      const queryStartTime = Date.now();
      const poolManager = getConnectionPoolManager();

      try {
        // mariadb returns rows directly (not wrapped in array like mysql2)
        const rows = await this.pool.query(sql, params || []);

        // Record successful query metrics
        const latency = Date.now() - queryStartTime;
        poolManager.recordQueryExecution(latency);
        poolManager.recordQueryType(sql);

        // Handle different result types
        if (Array.isArray(rows)) {
          return {
            rows: rows as T[],
            rowCount: rows.length,
            command: sql.trim().split(/\s+/)[0]?.toUpperCase() || 'UNKNOWN'
          };
        } else {
          // INSERT/UPDATE/DELETE result
          const result = rows as any; // mariadb result structure
          return {
            rows: [] as T[],
            rowCount: result.affectedRows || 0,
            command: sql.trim().split(/\s+/)[0]?.toUpperCase() || 'UNKNOWN',
            insertId: result.insertId ? Number(result.insertId) : undefined
          };
        }
      } catch (error) {
        // Record detailed error with message for error log display
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorCode = (error as any)?.code || (error as any)?.errno?.toString();
        poolManager.recordDetailedError(
          errorMessage,
          errorCode,
          sql.substring(0, 100) // Truncated SQL for context
        );
        this.logger.error('Database query failed', error instanceof Error ? error : undefined, {
          metadata: {
            sql: sql.substring(0, 100),
            error: errorMessage
          }
        });
        throw BizError.databaseError(
          'query',
          error instanceof Error ? error : new Error('Query execution failed')
        );
      }
    });
  }

  /**
   * Execute query within transaction
   * Uses mysql2 connection with transaction support
   */
  async transaction<T>(
    callback: (client: DbConnection) => Promise<T>,
    options?: TransactionOptions
  ): Promise<T> {
    // Auto-initialize if needed (R7.1 pattern)
    await this.ensureInitialized();

    return this.executeOperation('transaction', async () => {
      if (!this.pool) {
        // This should never happen after ensureInitialized, but kept as safety
        throw BizError.serviceUnavailable('DatabaseService', new Error('Not initialized'));
      }

      this.logger.debug('Starting MySQL transaction', {
        metadata: {
          isolationLevel: options?.isolationLevel,
          readOnly: options?.readOnly
        }
      });

      const connection = await this.pool.getConnection();

      try {
        await connection.beginTransaction();

        // Create DbConnection wrapper
        const dbConnection: DbConnection = {
          query: async <T>(sql: string, params?: unknown[]): Promise<DbResult<T>> => {
            const rows = await connection.query(sql, params || []);
            const command = sql.trim().split(/\s+/)[0]?.toUpperCase() || 'UNKNOWN';

            // Debug logging for INSERT operations
            if (command === 'INSERT') {
              console.log('[DatabaseService TX] INSERT result:', {
                isArray: Array.isArray(rows),
                hasInsertId: !Array.isArray(rows) && 'insertId' in (rows as any),
                insertIdValue: !Array.isArray(rows) ? (rows as any).insertId : undefined,
                insertIdType: !Array.isArray(rows) ? typeof (rows as any).insertId : undefined
              });
            }

            if (Array.isArray(rows)) {
              return {
                rows: rows as T[],
                rowCount: rows.length,
                command
              };
            } else {
              const result = rows as any; // mariadb result structure
              // Handle BigInt insertId from mariadb
              const insertId = result.insertId !== undefined && result.insertId !== null
                ? Number(result.insertId)
                : undefined;
              return {
                rows: [] as T[],
                rowCount: result.affectedRows || 0,
                command,
                insertId
              };
            }
          },
          transaction: async <T>(cb: (client: DbConnection) => Promise<T>): Promise<T> => {
            return cb(dbConnection);
          },
          close: async (): Promise<void> => {
            // No-op for transaction connections
          }
        };

        const result = await callback(dbConnection);
        await connection.commit();

        this.logger.debug('Transaction completed successfully');
        return result;
      } catch (error) {
        await connection.rollback();
        // Record detailed error for error log display
        const poolManager = getConnectionPoolManager();
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorCode = (error as any)?.code || (error as any)?.errno?.toString();
        poolManager.recordDetailedError(
          `Transaction failed: ${errorMessage}`,
          errorCode,
          'TRANSACTION'
        );
        this.logger.error('Transaction rolled back', error instanceof Error ? error : undefined, {
          metadata: {
            error: errorMessage
          }
        });
        throw error;
      } finally {
        connection.release();
      }
    });
  }

  /**
   * Find entity by ID
   * MariaDB syntax: ? placeholder instead of $1
   */
  async findById<T extends DbEntity>(
    table: string,
    id: string | number
  ): Promise<T | null> {
    return this.executeOperation('findById', async () => {
      const result = await this.query<T>(
        `SELECT * FROM ${table} WHERE id = ?`,
        [id]
      );

      return result.rows[0] || null;
    });
  }

  /**
   * Find entities with query builder (STUB)
   */
  async find<T extends DbEntity>(query: QueryBuilder): Promise<T[]> {
    return this.executeOperation('find', async () => {
      const sql = this.buildSelectQuery(query);
      const result = await this.query<T>(sql);
      return result.rows;
    });
  }

  /**
   * Insert entity
   * MariaDB pattern: ? placeholders + LAST_INSERT_ID() instead of RETURNING
   */
  async insert<T extends DbEntity>(
    table: string,
    data: Omit<T, 'id' | 'created_at' | 'updated_at'>
  ): Promise<T> {
    return this.executeOperation('insert', async () => {
      const columns = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const values = Object.values(data);

      const sql = `
        INSERT INTO ${table} (${columns}, created_at, updated_at)
        VALUES (${placeholders}, NOW(), NOW())
      `;

      const result = await this.query<T>(sql, values);
      const insertId = result.insertId;

      if (!insertId) {
        throw BizError.databaseError('insert', new Error('No insert ID returned'));
      }

      const inserted = await this.findById<T>(table, insertId);
      if (!inserted) {
        throw BizError.databaseError('insert', new Error('Failed to retrieve inserted record'));
      }

      return inserted;
    });
  }

  /**
   * Update entity
   * MariaDB pattern: ? placeholders + SELECT after UPDATE instead of RETURNING
   */
  async update<T extends DbEntity>(
    table: string,
    id: string | number,
    data: Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<T | null> {
    return this.executeOperation('update', async () => {
      const columns = Object.keys(data);
      const setClause = columns.map(col => `${col} = ?`).join(', ');
      const values = [...Object.values(data), id];

      const sql = `
        UPDATE ${table}
        SET ${setClause}, updated_at = NOW()
        WHERE id = ?
      `;

      await this.query<T>(sql, values);
      return await this.findById<T>(table, id);
    });
  }

  /**
   * Delete entity
   * MariaDB syntax: ? placeholder instead of $1
   */
  async delete(table: string, id: string | number): Promise<boolean> {
    return this.executeOperation('delete', async () => {
      const result = await this.query(
        `DELETE FROM ${table} WHERE id = ?`,
        [id]
      );

      return (result.rowCount || 0) > 0;
    });
  }

  /**
   * Run database migrations (STUB)
   */
  async runMigrations(migrations: Migration[]): Promise<MigrationResult[]> {
    return this.executeOperation('runMigrations', async () => {
      this.logger.info('Running MariaDB migrations (STUB)', {
        metadata: { count: migrations.length }
      });

      // STUB: Return success for all migrations
      return migrations.map(migration => ({
        success: true,
        version: migration.version
      }));
    });
  }

  /**
   * Check database health
   * Performs actual health check against MariaDB/MySQL
   */
  protected async performHealthChecks(): Promise<Record<string, boolean>> {
    try {
      // Auto-initialize if needed (R7.1 pattern)
      await this.ensureInitialized();

      if (!this.pool) {
        return { connected: false };
      }

      // Actual health check query
      await this.query('SELECT 1 as health_check');

      return {
        connected: true,
        responsive: true,
        mysql: true
      };
    } catch {
      return {
        connected: false,
        responsive: false,
        mysql: false
      };
    }
  }

  /**
   * Get connection pool status
   * GOVERNANCE: Delegate to ConnectionPoolManager for centralized statistics
   */
  getPoolStatus() {
    const stats = getConnectionPoolManager().getPoolStats();
    return {
      total: stats.total,
      active: stats.active,
      idle: stats.idle,
      max: stats.total
    };
  }

  /**
   * Close database connections
   * Properly closes mysql2 connection pool
   */
  protected async shutdown(): Promise<void> {
    await super.shutdown();

    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.logger.info('Database connection pool closed');
    }
  }

  /**
   * Destroy service and close connections
   * Cleanup method for service lifecycle
   */
  async destroy(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.logger.info('DatabaseService destroyed');
    }
  }

  /**
   * Build MariaDB SELECT query from QueryBuilder
   * MariaDB syntax: ? placeholders instead of $n
   */
  private buildSelectQuery(query: QueryBuilder): string {
    const select = query.select?.join(', ') || '*';
    let sql = `SELECT ${select} FROM ${query.table}`;

    // Add JOINs
    if (query.joins?.length) {
      for (const join of query.joins) {
        sql += ` ${join.type} JOIN ${join.table} ON ${join.on}`;
      }
    }

    // Add WHERE clauses
    if (query.where?.length) {
      const whereConditions = query.where.map((clause) => {
        const placeholder = '?';
        return `${clause.field} ${clause.operator} ${placeholder}`;
      });
      sql += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Add ORDER BY
    if (query.order?.length) {
      const orderClauses = query.order.map(order => `${order.field} ${order.direction}`);
      sql += ` ORDER BY ${orderClauses.join(', ')}`;
    }

    // Add LIMIT and OFFSET
    if (query.limit) {
      sql += ` LIMIT ${query.limit}`;
    }
    if (query.offset) {
      sql += ` OFFSET ${query.offset}`;
    }

    return sql;
  }

}

/**
 * Global singleton cache for Next.js development mode
 *
 * WHY: Next.js HMR reloads modules, resetting module-level variables.
 * globalThis persists across HMR, preventing duplicate DatabaseService instances.
 *
 * @see ConnectionPoolManager.ts for detailed explanation
 */
const globalForDbService = globalThis as unknown as {
  databaseServiceInstance: DatabaseService | undefined;
};

/**
 * Get DatabaseService singleton instance
 *
 * @governance MANDATORY for all auth services - prevents per-request instantiation
 * @returns Shared DatabaseService instance
 */
export function getDatabaseService(): DatabaseService {
  // Check globalThis first (survives HMR in development)
  if (globalForDbService.databaseServiceInstance) {
    return globalForDbService.databaseServiceInstance;
  }

  // Create singleton with centralized configuration
  const config = getDatabaseConfig();
  const dbConfig: DbConfig = {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    max: config.connectionLimit || 20
  };

  const instance = new DatabaseService({
    name: 'DatabaseService',
    version: '5.0.0',
    database: dbConfig
  });

  // Store in globalThis for HMR persistence
  globalForDbService.databaseServiceInstance = instance;

  return instance;
}