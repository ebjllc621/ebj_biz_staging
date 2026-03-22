/**
 * P3.8b Saved Searches Types
 * Type definitions for anonymous saved searches bound to clientId
 * Following Build Map v2.1 ENHANCED patterns
 */

/**
 * Saved search record structure
 */
export type SavedSearch = {
  id: string;
  clientId: string;
  name: string | null;
  params: Record<string, unknown>;
  createdAt: number;
};

/**
 * Input for creating a new saved search
 */
export type CreateSavedSearchInput = {
  clientId: string;
  name?: string | null;
  params: Record<string, unknown>;
};