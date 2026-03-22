# Database Directory

This directory was cleaned up on 2025-09-23T21:13:41.621Z.

The former db/migrations directory has been removed as all migration files
have been consolidated into the root ./migrations directory.

## Migration Documentation Preserved

The detailed migration documentation from db/migrations/README.md has been
preserved in: .dna_state/P3A/cleanup/preserved/db-migrations-README.md

## Current Migration Location

All database migrations are now located in: ./migrations/

Use the following commands for database operations:
- `npm run db:migrate:up` - Apply migrations
- `npm run db:migrate:down` - Rollback migrations
- `npm run schema:audit` - Verify schema compliance
