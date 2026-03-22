/**
 * @deprecated DEP-2026-001 - DO NOT USE IN NEW CODE
 *
 * This module uses InMemoryRepository/SQLite adapters instead of MariaDB.
 * It was created in P3.3a (Sept 2025) before DatabaseService became canonical.
 *
 * CANONICAL REPLACEMENT:
 * - Use DatabaseService.query() directly (see HomePageService.getFeaturedListings)
 * - Or use ListingService from @core/services/ListingService
 *
 * @see .claude/governance/deprecation-registry.json
 * @see docs/pages/layouts/listings/phases/post_imp_troubleshooting/DNA_METHODOLOGY_GAP_REPORT_2026-01-03.md
 *
 * P3.3a Listings Module Public API (DEPRECATED)
 * Exports repository interfaces and search functionality
 */

// Export repository interfaces and types
export type {
  ListingsRepository,
  ListingSearchOptions,
  SearchParams,
  SearchResult
} from './repo';

// Export search function
export { search } from './repo';

// Export model types
export type {
  ListingRecord,
  CreateListingData,
  UpdateListingData,
  ListingQuery,
  ListingStatus
} from './model';

// Export service layer
export { ListingsService } from './service';

// Export factory functions for adapter creation
export {
  createListingsRepository,
  getListingsRepository,
  resetListingsRepository
} from './adapters/factory';