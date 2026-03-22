# P3.8c Saved Searches API

REST API endpoints for anonymous saved searches bound to client cookies.

## Endpoints

### GET /api/saved-searches
List all saved searches for the current client.

**Authentication**: Anonymous (client cookie)

**Response**:
```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "clientId": "client-uuid",
        "name": "My Search",
        "params": {
          "q": "apartments",
          "sort": "price_asc",
          "tags": ["furnished"]
        },
        "createdAt": 1704067200000
      }
    ]
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### POST /api/saved-searches
Create a new saved search for the current client.

**Authentication**: Anonymous (client cookie)

**Request Body**:
```json
{
  "name": "My Search Name",
  "params": {
    "q": "search query",
    "sort": "price_asc",
    "page": 1,
    "pageSize": 20,
    "tags": ["tag1", "tag2"]
  }
}
```

**Validation**:
- `name` is optional (string or null)
- `params` must be an object
- `params` can only contain allowed keys: `q`, `sort`, `page`, `pageSize`, `tags`
- Invalid keys will result in validation error

**Response** (201):
```json
{
  "ok": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "clientId": "client-uuid",
    "name": "My Search Name",
    "params": {
      "q": "search query",
      "sort": "price_asc",
      "page": 1,
      "pageSize": 20,
      "tags": ["tag1", "tag2"]
    },
    "createdAt": 1704067200000
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### DELETE /api/saved-searches/[id]
Delete a saved search by ID. Only removes searches owned by the current client.

**Authentication**: Anonymous (client cookie)

**Response** (200 - Success):
```json
{
  "ok": true,
  "data": {
    "removed": true
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Response** (404 - Not Found):
```json
{
  "ok": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "No such saved search"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Client Cookie Behavior

All endpoints use anonymous client identification via the `bnk_cid` HTTP-only cookie:

- If no client cookie exists, a new UUID is generated and set
- Cookie is HTTP-only, SameSite=Lax, Max-Age=1 year
- All saved searches are scoped to the client ID
- No user authentication required

## Security Headers

All responses include standard security headers:
- `Content-Type: application/json`
- `Cache-Control: no-cache, no-store, must-revalidate`
- `X-Content-Type-Options: nosniff`
- `x-request-id` (if provided in request)

## Error Handling

Standard JSON error responses follow the unified error format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "status": 400
  },
  "success": false,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Common error codes:
- `VALIDATION_ERROR` (400) - Invalid request parameters
- `NOT_FOUND` (404) - Resource not found
- `METHOD_NOT_ALLOWED` (405) - HTTP method not supported
- `INTERNAL_ERROR` (500) - Server error