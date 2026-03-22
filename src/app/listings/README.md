# Listings Page

## URL Parameters

This page supports the following URL parameters for server-side filtering and pagination:

### Query Parameters

- **`q`** (string, optional): Search query to filter listings by title or content
  - Example: `/listings?q=apartment`

- **`sort`** (string, optional): Sort order for results
  - Accepted values: `recent`, `name`
  - Default: No sorting applied
  - Example: `/listings?sort=recent`

- **`page`** (string/number, optional): Page number for pagination
  - Default: `1`
  - Must be >= 1
  - Example: `/listings?page=2`

- **`tags`** (string, optional): Comma-separated list of tags to filter by
  - CSV format with automatic normalization (whitespace trimmed, duplicates removed)
  - Example: `/listings?tags=apartment,downtown`

### Combined Examples

- `/listings` - Show all listings, page 1
- `/listings?q=house&sort=recent&page=1` - Search for "house", sort by recent, page 1
- `/listings?sort=name&page=3` - All listings sorted by name, page 3
- `/listings?tags=apartment,downtown&q=modern` - Search for "modern" with apartment and downtown tags
- `/listings?tags=luxury,waterfront&sort=recent` - Filter by luxury and waterfront tags, sorted by recent

## Implementation Notes

- **Page Size**: Fixed at 20 items per page
- **Server Component**: Performs server-side fetch to `/api/listings/search`
- **Client Controls**: Will be added in subsequent steps P3.5b/c for interactive filtering and pagination

## Tag Filtering

The TagFilter component provides an intuitive interface for tag-based filtering:

- **Input Normalization**: Automatically trims whitespace and removes duplicates
- **CSV Format**: Tags are stored as comma-separated values in the URL
- **Reset Page**: Changing tags automatically resets to page 1
- **Parameter Preservation**: Maintains existing search query and sort parameters
- **Clear Function**: One-click clearing of all tags

## Saved Searches

The page now includes saved search functionality allowing users to save and reuse search configurations:

### SaveSearchButton Component
- **Client Component**: Reads current URL parameters (q, sort, page, tags)
- **Save Functionality**: Prompts for optional name and POSTs to `/api/saved-searches`
- **Status Display**: Shows aria-live status updates (saving/saved/error)
- **Event System**: Triggers `savedsearch:created` window event on success

### SavedSearchesPanel Component
- **Client Component**: Fetches and displays saved searches from `/api/saved-searches`
- **List Management**: Shows saved searches with name/auto-generated labels and creation dates
- **Apply Function**: One-click navigation to listings with saved parameters
- **Delete Function**: Optimistic UI deletion with confirmation dialog
- **Auto-refresh**: Listens for save events and refreshes list automatically
- **Accessibility**: Full ARIA support with proper roles and labels

### Anonymous Cookie Model
- **Client Identification**: Uses anonymous client cookies for ownership
- **Session Persistence**: Saved searches persist across browser sessions
- **Privacy-First**: No account registration required
- **Security**: Client ID-based ownership prevents cross-user access

### Usage Notes
1. Perform any search/filter operation on the listings page
2. Click "Save Search" button to save current parameters
3. Optionally provide a descriptive name, or auto-generate from parameters
4. Use the Saved Searches panel to apply or delete saved searches
5. Saved searches are tied to your browser via anonymous client cookie

## Implementation Status

- ✅ P3.5a: Server-side listings page with API fetch
- ✅ P3.5b: Client-side search controls
- ✅ P3.5c: Interactive pagination controls
- ✅ P3.5d: Polished results presentation and error handling
- ✅ P3.5f: Tag filter controls with CSV support
- ✅ P3.8c: REST API for saved searches (anonymous)
- ✅ P3.8d: UI save button and panel with list/apply/delete functionality