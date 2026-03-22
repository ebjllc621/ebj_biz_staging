/**
 * Analytics Query Result Types
 * @phase R6.4 - TypeScript Compliance
 */

export interface CountResult {
  count: number;
}

export interface PageViewTrendResult {
  date: string;
  views: number;
}

export interface ListingViewResult {
  listingId: number;
  views: number;
}

export interface TopPageResult {
  url: string;
  views: number;
}

export interface TopSearchResult {
  query: string;
  count: number;
}
