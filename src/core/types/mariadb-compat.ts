/**
 * MariaDB Compatibility Types
 *
 * Provides type aliases for mysql2 types that don't exist in mariadb package.
 * This allows existing code to continue working without changes.
 *
 * @authority database-package-canonical.md
 * @created 2026-01-21
 */

/**
 * RowDataPacket - Generic row data type
 * mariadb returns plain objects, so this is just an alias
 */
export type RowDataPacket = Record<string, any>;

/**
 * ResultSetHeader - Result metadata for INSERT/UPDATE/DELETE
 * mariadb returns similar structure with different property names
 */
export interface ResultSetHeader {
  affectedRows: number;
  insertId: number;
  warningStatus?: number;
}

/**
 * Type helper for query results
 */
export type QueryResult<T> = T[] | ResultSetHeader;
