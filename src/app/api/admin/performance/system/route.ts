/**
 * Admin Performance System Metrics API Route
 *
 * GET /api/admin/performance/system
 * Returns system health metrics
 *
 * @authority PHASE_5.3_BRAIN_PLAN.md
 * @tier ADVANCED
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { RowDataPacket } from '@core/types/mariadb-compat';
import { bigIntToNumber } from '@core/utils/bigint';

export const GET = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();

  // Get database size
  const dbSizeQuery = await db.query<RowDataPacket[]>(
    `SELECT SUM(data_length + index_length) / 1024 / 1024 AS sizeInMB
     FROM information_schema.TABLES
     WHERE table_schema = DATABASE()`,
    []
  );

  // Get table counts
  const tableCountQuery = await db.query<RowDataPacket[]>(
    `SELECT COUNT(*) as tableCount
     FROM information_schema.TABLES
     WHERE table_schema = DATABASE()`,
    []
  );

  // Get total rows across all tables
  const totalRowsQuery = await db.query<RowDataPacket[]>(
    `SELECT SUM(table_rows) as totalRows
     FROM information_schema.TABLES
     WHERE table_schema = DATABASE()`,
    []
  );

  const dbSizeRow = dbSizeQuery.rows[0] as { sizeInMB?: bigint | number } | undefined;
  const tableCountRow = tableCountQuery.rows[0] as { tableCount?: bigint | number } | undefined;
  const totalRowsRow = totalRowsQuery.rows[0] as { totalRows?: bigint | number } | undefined;

  const metrics = {
    database: {
      sizeInMB: Number((bigIntToNumber(dbSizeRow?.sizeInMB)).toFixed(2)),
      tableCount: bigIntToNumber(tableCountRow?.tableCount),
      totalRows: bigIntToNumber(totalRowsRow?.totalRows)
    },
    uptime: process.uptime(),
    memory: {
      usedMB: Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)),
      totalMB: Number((process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2))
    },
    timestamp: new Date().toISOString()
  };

  return createSuccessResponse({ metrics }, context.requestId);
});
