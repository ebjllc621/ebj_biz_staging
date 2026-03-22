/**
 * Database Types - MariaDB 10.11 Definitions
 *
 * Type definitions for MariaDB operations.
 * Build v5.0: Stub-only implementation targeting MariaDB 10.11
 */

export interface DbConnection {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<DbResult<T>>;
  transaction<T>(callback: (client: DbConnection) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export interface DbResult<T = unknown> {
  rows: T[];
  rowCount: number;
  command?: string;
  insertId?: number; // For INSERT operations (MySQL/MariaDB)
}

export interface DbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  connectionTimeoutMillis?: number;
  idleTimeoutMillis?: number;
  max?: number; // max connections in pool
}

export interface QueryOptions {
  timeout?: number;
  name?: string; // prepared statement name
}

export interface TransactionOptions {
  isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
  readOnly?: boolean;
}

/**
 * Database entity base interface
 */
export interface DbEntity {
  id: string | number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Query builder types for MariaDB
 */
export interface WhereClause {
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'ILIKE' | 'IN' | 'NOT IN';
  value: unknown;
}

export interface OrderClause {
  field: string;
  direction: 'ASC' | 'DESC';
}

export interface QueryBuilder {
  table: string;
  select?: string[];
  where?: WhereClause[];
  order?: OrderClause[];
  limit?: number;
  offset?: number;
  joins?: Array<{
    type: 'INNER' | 'LEFT' | 'RIGHT';
    table: string;
    on: string;
  }>;
}

/**
 * Migration types
 */
export interface Migration {
  version: string;
  name: string;
  up: string;
  down: string;
  executed_at?: Date;
}

export interface MigrationResult {
  success: boolean;
  version: string;
  error?: string;
}