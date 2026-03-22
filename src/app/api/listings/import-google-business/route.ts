/**
 * Google Business Import API Route
 *
 * POST /api/listings/import-google-business
 * Extracts business data from Google Places API using a Google Maps URL
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier STANDARD
 * @governance apiHandler wrapper MANDATORY
 * @governance CSRF protection for state-changing operations
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
// withCsrf removed: this route is read-only (proxies Google Places API, no DB writes)

// ============================================================================
// TYPES
// ============================================================================

interface GooglePlaceResult {
  name?: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  opening_hours?: {
    weekday_text?: string[];
    periods?: Array<{
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }>;
  };
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  editorial_summary?: {
    overview?: string;
  };
  url?: string;
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
    html_attributions: string[];
  }>;
}

interface ImportedBusinessData {
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  phone: string;
  website: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  business_hours: Array<{
    day: string;
    open: string;
    close: string;
    is_closed: boolean;
  }>;
  photos: string[];
  social_media: {
    facebook: string;
    instagram: string;
    twitter: string;
    linkedin: string;
    youtube: string;
    tiktok: string;
  };
  owner_details: {
    name: string;
    email: string;
    phone: string;
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extract place ID from various Google Maps URL formats
 */
function extractPlaceId(url: string): string | null {
  // Format 1: https://www.google.com/maps/place/.../@lat,lng,zoom/data=...!1s0x...!2s<PLACE_ID>
  // Format 2: https://maps.google.com/?cid=<CID>
  // Format 3: https://www.google.com/maps/place/?q=place_id:<PLACE_ID>
  // Format 4: URLs with /data= containing ChIJ... place IDs

  try {
    const urlObj = new URL(url);

    // Check for place_id in query params
    const placeIdParam = urlObj.searchParams.get('place_id');
    if (placeIdParam) return placeIdParam;

    // Check for q=place_id: format
    const q = urlObj.searchParams.get('q');
    if (q && q.startsWith('place_id:')) {
      return q.replace('place_id:', '');
    }

    // Extract from /data= parameter (contains encoded place ID)
    // Format: !1s<hex>!2s<place_id>
    const dataMatch = url.match(/!1s([^!]+)!2s(ChIJ[^!/]+)/);
    if (dataMatch && dataMatch[2]) {
      return dataMatch[2];
    }

    // Alternative format in data
    const chijMatch = url.match(/ChIJ[a-zA-Z0-9_-]{20,}/);
    if (chijMatch) {
      return chijMatch[0];
    }

    // Extract from /place/ path when it contains the business name
    // We'll need to use text search in this case
    return null;
  } catch {
    return null;
  }
}

/**
 * Search for a place using text query (fallback when place ID not found)
 */
async function searchPlaceByText(query: string, apiKey: string): Promise<string | null> {
  const searchUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
  searchUrl.searchParams.set('query', query);
  searchUrl.searchParams.set('key', apiKey);

  const response = await fetch(searchUrl.toString());
  const data = await response.json();

  if (data.status === 'OK' && data.results && data.results.length > 0) {
    return data.results[0].place_id;
  }

  return null;
}

/**
 * Extract business name from Google Maps URL for text search fallback
 */
function extractBusinessNameFromUrl(url: string): string | null {
  try {
    // Format: /maps/place/Business+Name/@...
    const placeMatch = url.match(/\/place\/([^/@]+)/);
    if (placeMatch && placeMatch[1]) {
      // Decode URL-encoded name and replace + with spaces
      return decodeURIComponent(placeMatch[1]).replace(/\+/g, ' ');
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Parse address components from Google Places API response
 */
function parseAddressComponents(components: GooglePlaceResult['address_components']): {
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
} {
  const result = { street_address: '', city: '', state: '', zip_code: '', country: '' };

  if (!components) return result;

  let streetNumber = '';
  let route = '';

  for (const component of components) {
    if (component.types.includes('street_number')) {
      streetNumber = component.long_name;
    } else if (component.types.includes('route')) {
      route = component.long_name;
    } else if (component.types.includes('locality')) {
      result.city = component.long_name;
    } else if (component.types.includes('administrative_area_level_1')) {
      result.state = component.short_name;
    } else if (component.types.includes('postal_code')) {
      result.zip_code = component.long_name;
    } else if (component.types.includes('country')) {
      result.country = component.short_name;
    }
  }

  // Build street address from components
  if (streetNumber && route) {
    result.street_address = `${streetNumber} ${route}`;
  } else if (route) {
    result.street_address = route;
  } else if (streetNumber) {
    result.street_address = streetNumber;
  }

  return result;
}

/**
 * Parse opening hours from Google Places API response
 */
function parseBusinessHours(openingHours: GooglePlaceResult['opening_hours']): ImportedBusinessData['business_hours'] {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (!openingHours?.periods) {
    // Return default closed hours
    return dayNames.map(day => ({
      day,
      open: '',
      close: '',
      is_closed: true
    }));
  }

  // Initialize all days as closed
  const hoursMap = new Map(dayNames.map(day => [day, { day, open: '', close: '', is_closed: true }]));

  for (const period of openingHours.periods) {
    const dayIndex = period.open.day;
    if (dayIndex < 0 || dayIndex >= dayNames.length) continue;

    const dayName = dayNames[dayIndex] as string;
    const openTime = period.open.time
      ? `${period.open.time.slice(0, 2)}:${period.open.time.slice(2)}`
      : '';
    const closeTime = period.close?.time
      ? `${period.close.time.slice(0, 2)}:${period.close.time.slice(2)}`
      : '23:59';

    hoursMap.set(dayName, {
      day: dayName,
      open: openTime,
      close: closeTime,
      is_closed: false
    });
  }

  // Return in order starting from Sunday
  return dayNames.map(day => hoursMap.get(day)!);
}

/**
 * Convert Google Places photo references to full URLs
 */
function getPhotoUrls(photos: GooglePlaceResult['photos'], apiKey: string, maxPhotos = 10): string[] {
  if (!photos || photos.length === 0) return [];

  return photos.slice(0, maxPhotos).map(photo => {
    const params = new URLSearchParams({
      photoreference: photo.photo_reference,
      maxwidth: '800',
      key: apiKey
    });
    return `https://maps.googleapis.com/maps/api/place/photo?${params.toString()}`;
  });
}

/**
 * Extract social media URLs from website (basic inference)
 * Note: Google Places API doesn't provide social media directly
 */
function extractSocialMediaFromWebsite(website: string): ImportedBusinessData['social_media'] {
  const defaultSocial = {
    facebook: '',
    instagram: '',
    twitter: '',
    linkedin: '',
    youtube: '',
    tiktok: ''
  };

  // If no website, return empty
  if (!website) return defaultSocial;

  // Try to infer social media links from common URL patterns
  // This is a basic implementation - in production you might scrape the website
  const websiteLower = website.toLowerCase();

  if (websiteLower.includes('facebook.com')) {
    defaultSocial.facebook = website;
  } else if (websiteLower.includes('instagram.com')) {
    defaultSocial.instagram = website;
  } else if (websiteLower.includes('twitter.com') || websiteLower.includes('x.com')) {
    defaultSocial.twitter = website;
  } else if (websiteLower.includes('linkedin.com')) {
    defaultSocial.linkedin = website;
  } else if (websiteLower.includes('youtube.com')) {
    defaultSocial.youtube = website;
  } else if (websiteLower.includes('tiktok.com')) {
    defaultSocial.tiktok = website;
  }

  return defaultSocial;
}

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export const POST = apiHandler(async (context: ApiContext) => {
  const { request } = context;

  // Get API key from environment
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return createErrorResponse(
      BizError.badRequest('Google Maps API key not configured'),
      context.requestId
    );
  }

  // Parse request body
  let body: { url: string };
  try {
    body = await request.json();
  } catch {
    return createErrorResponse(
      BizError.badRequest('Invalid request body'),
      context.requestId
    );
  }

  const { url } = body;

  if (!url || typeof url !== 'string') {
    return createErrorResponse(
      BizError.badRequest('URL is required'),
      context.requestId
    );
  }

  // Validate URL format
  if (!url.includes('google.com/maps') && !url.includes('maps.google.com')) {
    return createErrorResponse(
      BizError.badRequest('Please provide a valid Google Maps URL'),
      context.requestId
    );
  }

  try {
    // Try to extract place ID from URL
    let placeId = extractPlaceId(url);

    // If no place ID found, try text search with business name from URL
    if (!placeId) {
      const businessName = extractBusinessNameFromUrl(url);
      if (businessName) {
        placeId = await searchPlaceByText(businessName, apiKey);
      }
    }

    if (!placeId) {
      return createErrorResponse(
        BizError.badRequest('Could not identify the business from this URL. Please ensure you are using a direct Google Maps business link.'),
        context.requestId
      );
    }

    // Call Google Places API for place details
    const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    detailsUrl.searchParams.set('place_id', placeId);
    detailsUrl.searchParams.set('key', apiKey);
    detailsUrl.searchParams.set('fields', [
      'name',
      'formatted_address',
      'formatted_phone_number',
      'international_phone_number',
      'website',
      'opening_hours',
      'geometry',
      'address_components',
      'editorial_summary',
      'photos'
    ].join(','));

    const response = await fetch(detailsUrl.toString());
    const data = await response.json();

    if (data.status !== 'OK') {
      const errorMessages: Record<string, string> = {
        'ZERO_RESULTS': 'No business found for this URL',
        'INVALID_REQUEST': 'Invalid Google Maps URL',
        'OVER_QUERY_LIMIT': 'API quota exceeded. Please try again later.',
        'REQUEST_DENIED': 'API request denied. Please check API key configuration.',
        'NOT_FOUND': 'Business not found'
      };

      return createErrorResponse(
        BizError.badRequest(errorMessages[data.status] || `Google API error: ${data.status}`),
        context.requestId
      );
    }

    const place: GooglePlaceResult = data.result;
    const addressParts = parseAddressComponents(place.address_components);

    // Build imported data
    // Use extracted street address, or fall back to full formatted address
    const importedData: ImportedBusinessData = {
      name: place.name || '',
      address: addressParts.street_address || place.formatted_address || '',
      city: addressParts.city,
      state: addressParts.state,
      zip_code: addressParts.zip_code,
      country: addressParts.country || 'US',
      phone: place.formatted_phone_number || place.international_phone_number || '',
      website: place.website || '',
      description: place.editorial_summary?.overview || '',
      latitude: place.geometry?.location?.lat || null,
      longitude: place.geometry?.location?.lng || null,
      business_hours: parseBusinessHours(place.opening_hours),
      photos: getPhotoUrls(place.photos, apiKey),
      social_media: extractSocialMediaFromWebsite(place.website || ''),
      owner_details: {
        // Google Places API doesn't provide owner details
        // User will need to fill these in manually
        name: '',
        email: '',
        phone: ''
      }
    };

    return createSuccessResponse(
      importedData,
      context.requestId
    );
  } catch (error) {
    return createErrorResponse(
      error instanceof BizError
        ? error
        : BizError.internalServerError('GoogleBusinessImport', error instanceof Error ? error : undefined),
      context.requestId
    );
  }
});
