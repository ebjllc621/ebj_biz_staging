/**
 * Listing Import Parsing Utilities
 *
 * CRITICAL: Supports ALL 58 database fields per ImportExportModal.md requirements
 *
 * GOVERNANCE COMPLIANCE:
 * - Build Map v2.1 ADVANCED tier
 * - TypeScript strict mode
 * - Full database field coverage
 *
 * SUPPORTED IMPORT FORMATS:
 * - Native Bizconekt format (direct field mapping)
 * - JBusiness Directory format (Joomla plugin - auto-mapped)
 *
 * @tier ADVANCED
 * @phase Phase 7 - Listing Import/Export
 * @updated 2026-02-02 - Added JBusiness Directory field mapping support
 * @see docs/components/admin/categories/ImportExportModal.md - CRITICAL REQUIREMENTS
 * @see docs/pages/layouts/admin/pageTables/listings/imports/FIELD_MAPPING.md - Field mapping reference
 */

import type { ImportListingInput } from '@core/types/import-export';

/**
 * JBusiness Directory countryId to ISO 2-char country code mapping
 * DB column: country varchar(2) - requires ISO 3166-1 alpha-2 codes
 */
const JBUSINESS_COUNTRY_MAP: Record<number, string> = {
  226: 'US',  // USA
  38: 'CA',   // Canada
  225: 'GB',  // United Kingdom
  13: 'AU',   // Australia
  101: 'IN',  // India
  81: 'DE',   // Germany
  74: 'FR',   // France
  107: 'IT',  // Italy
  109: 'JP',  // Japan
  156: 'NL'   // Netherlands
};

/**
 * Generate URL slug from listing name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Parse array field (handles array, semicolon-separated string, or JSON)
 */
function parseArrayField(value: unknown): string[] | null {
  if (!value) return null;
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    if (!value.trim()) return null;
    // Try JSON parse first
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Fall through to semicolon split
    }
    // Split by semicolon
    const parts = value.split(';').map(s => s.trim()).filter(Boolean);
    return parts.length > 0 ? parts : null;
  }
  return null;
}

/**
 * Parse keywords field - handles comma-separated strings (common in JBusiness)
 * DB 'keywords' column has CHECK (json_valid()) constraint, so must return array
 */
function parseKeywordsField(value: unknown): string[] | null {
  if (!value) return null;
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    if (!value.trim()) return null;
    // Try JSON parse first
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Fall through to comma split (JBusiness uses comma-separated keywords)
    }
    // Split by comma (common keyword separator)
    const parts = value.split(',').map(s => s.trim()).filter(Boolean);
    return parts.length > 0 ? parts : null;
  }
  return null;
}

/**
 * Parse JSON object field
 */
function parseObjectField(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === 'string') {
    if (!value.trim()) return null;
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Parse boolean field
 */
function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const v = value.toLowerCase().trim();
    return v === 'true' || v === '1' || v === 'yes';
  }
  return false;
}

/**
 * Parse number field
 */
function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  }
  return null;
}

/**
 * Parse integer field
 */
function parseInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Math.floor(value);
  if (typeof value === 'string') {
    const num = Number.parseInt(value, 10);
    return isNaN(num) ? null : num;
  }
  return null;
}

/**
 * Build social media object from individual JBusiness Directory fields
 * JBusiness stores each social platform as a separate column
 */
function buildSocialMediaFromJBusiness(item: Record<string, unknown>): Record<string, unknown> | null {
  const social: Record<string, string> = {};

  // Map JBusiness social fields to our format
  const socialFields = [
    'facebook', 'twitter', 'instagram', 'linkedin',
    'youtube', 'pinterest', 'whatsapp', 'skype',
    'googlep', 'tiktok'
  ];

  for (const field of socialFields) {
    const value = item[field];
    if (value && typeof value === 'string' && value.trim()) {
      social[field] = value.trim();
    }
  }

  return Object.keys(social).length > 0 ? social : null;
}

/**
 * Build full address from JBusiness street_number + address fields
 */
function buildAddressFromJBusiness(item: Record<string, unknown>): string | null {
  const streetNumber = item.street_number ? String(item.street_number).trim() : '';
  const address = item.address ? String(item.address).trim() : '';

  if (streetNumber && address) {
    return `${streetNumber} ${address}`;
  }
  return address || streetNumber || null;
}

/**
 * Common country name to ISO 2-char code mapping
 * Handles various input formats from imports
 */
const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  'usa': 'US', 'us': 'US', 'united states': 'US', 'united states of america': 'US',
  'canada': 'CA', 'ca': 'CA',
  'united kingdom': 'GB', 'uk': 'GB', 'gb': 'GB', 'great britain': 'GB',
  'australia': 'AU', 'au': 'AU',
  'india': 'IN', 'in': 'IN',
  'germany': 'DE', 'de': 'DE',
  'france': 'FR', 'fr': 'FR',
  'italy': 'IT', 'it': 'IT',
  'japan': 'JP', 'jp': 'JP',
  'netherlands': 'NL', 'nl': 'NL',
  'mexico': 'MX', 'mx': 'MX',
  'spain': 'ES', 'es': 'ES',
  'brazil': 'BR', 'br': 'BR',
  'china': 'CN', 'cn': 'CN'
};

/**
 * Resolve country from JBusiness countryId or direct country field
 * Returns ISO 3166-1 alpha-2 code (2 chars) for DB varchar(2) column
 */
function resolveCountry(item: Record<string, unknown>): string | null {
  // Direct country field takes precedence - convert to ISO code if needed
  if (item.country && typeof item.country === 'string') {
    const country = item.country.trim();
    // If already a 2-char code, return as-is (uppercase)
    if (country.length === 2) {
      return country.toUpperCase();
    }
    // Try to map full name to ISO code
    const mapped = COUNTRY_NAME_TO_ISO[country.toLowerCase()];
    if (mapped) {
      return mapped;
    }
    // Return first 2 chars as fallback (will be truncated by DB anyway)
    return country.substring(0, 2).toUpperCase();
  }

  // Map JBusiness countryId
  const countryIdRaw = item.countryId || item.countryid || item.country_id;
  if (countryIdRaw !== undefined && countryIdRaw !== null) {
    const countryId = typeof countryIdRaw === 'number' ? countryIdRaw : Number.parseInt(String(countryIdRaw), 10);
    if (!isNaN(countryId) && JBUSINESS_COUNTRY_MAP[countryId]) {
      return JBUSINESS_COUNTRY_MAP[countryId];
    }
    // Unknown countryId, return US as default
    if (!isNaN(countryId)) {
      return 'US';
    }
  }

  return null;
}

/**
 * Map JBusiness numeric approved status to our string enum
 *
 * JBusiness Directory approved values:
 * - 0 = rejected/not approved
 * - 1 = pending review
 * - 2 = approved
 *
 * Our system values: 'pending' | 'approved' | 'rejected' | 'pending_claim'
 *
 * Per ImportExportModal.md: imports default to 'pending' unless updating existing approved listing
 */
function resolveApprovedStatus(value: unknown): 'pending' | 'approved' | 'rejected' {
  // If already a valid string, use it
  if (typeof value === 'string') {
    const v = value.toLowerCase().trim();
    if (v === 'approved') return 'approved';
    if (v === 'rejected') return 'rejected';
    if (v === 'pending' || v === 'pending_claim') return 'pending';
  }

  // Map numeric values (JBusiness Directory format)
  if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value))) {
    const num = typeof value === 'number' ? value : Number.parseInt(value, 10);
    if (num === 2) return 'approved';
    if (num === 0) return 'rejected';
    // 1 or any other value = pending
  }

  // Default to pending per ImportExportModal.md requirements
  return 'pending';
}

/**
 * Map JBusiness numeric status/state to our string enum
 *
 * JBusiness Directory state values:
 * - 0 = inactive/unpublished
 * - 1 = active/published
 *
 * Our system values: 'active' | 'inactive' | 'pending' | 'suspended'
 */
function resolveListingStatus(value: unknown): 'active' | 'inactive' | 'pending' | 'suspended' {
  // If already a valid string, use it
  if (typeof value === 'string') {
    const v = value.toLowerCase().trim();
    if (v === 'active' || v === 'published') return 'active';
    if (v === 'inactive' || v === 'unpublished') return 'inactive';
    if (v === 'pending') return 'pending';
    if (v === 'suspended') return 'suspended';
  }

  // Map numeric values (JBusiness uses 'state' field with 0/1)
  if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value))) {
    const num = typeof value === 'number' ? value : Number.parseInt(value, 10);
    if (num === 1) return 'active';
    if (num === 0) return 'inactive';
  }

  // Default to active
  return 'active';
}

/**
 * Map item to ImportListingInput with ALL 58 fields
 * Supports both native Bizconekt format and JBusiness Directory format
 *
 * JBusiness Directory Field Mapping:
 * - alias → slug
 * - comercialName → (used if name is empty)
 * - short_description → description (if description is empty)
 * - province → state
 * - postalCode → zip_code
 * - countryId → country (mapped via JBUSINESS_COUNTRY_MAP)
 * - logoLocation → logo_url
 * - business_cover_image → cover_image_url
 * - mainSubcategory → category_id
 * - establishment_year → year_established
 * - employees → employee_count
 * - street_number + address → address (combined)
 * - facebook, twitter, etc. → social_media (JSON object)
 * - mobile → phone (fallback)
 */
function mapToImportListingInput(item: Record<string, unknown>, index: number): ImportListingInput {
  // Name resolution: try multiple fields (JBusiness uses comercialName as alternate)
  const name = String(
    item.name ||
    item.listing_name ||
    item.listingname ||
    item.comercialName ||
    item.comercialname ||
    ''
  );

  // Slug: native slug field or JBusiness alias
  const slugValue = item.slug || item.alias;
  const slug = slugValue ? String(slugValue) : (name ? generateSlug(name) : '');

  // Description: prefer description, fall back to short_description (JBusiness)
  const description = item.description
    ? String(item.description)
    : (item.short_description ? String(item.short_description) : null);

  // Address: native or combined from JBusiness street_number + address
  const address = item.address && !item.street_number
    ? String(item.address)
    : buildAddressFromJBusiness(item);

  // State: JBusiness uses 'province' for geographic state, NOT 'state' (which is publication status 0/1)
  // Priority: province (JBusiness) > state (only if not numeric, to avoid JBusiness publication status)
  let state: string | null = null;
  if (item.province) {
    state = String(item.province);
  } else if (item.state && !/^\d+$/.test(String(item.state))) {
    // Only use item.state if it's NOT purely numeric (JBusiness uses 0/1 for publication status)
    state = String(item.state);
  }

  // Zip code: multiple possible field names
  const zipCode = String(
    item.zip_code ||
    item.zipcode ||
    item.zip ||
    item.postalCode ||
    item.postalcode ||
    item.postal_code ||
    ''
  ) || undefined;

  // Country: resolve from native or JBusiness countryId
  const country = resolveCountry(item);

  // Phone: native phone or JBusiness mobile as fallback
  const phone = item.phone
    ? String(item.phone)
    : (item.mobile ? String(item.mobile) : null);

  // Logo URL: native or JBusiness logoLocation
  const logoUrl = item.logo_url
    ? String(item.logo_url)
    : (item.logoLocation || item.logolocation ? String(item.logoLocation || item.logolocation) : null);

  // Cover image: native or JBusiness business_cover_image
  const coverImageUrl = item.cover_image_url
    ? String(item.cover_image_url)
    : (item.business_cover_image ? String(item.business_cover_image) : null);

  // Category ID: native or JBusiness mainSubcategory
  const categoryId = parseInt(item.category_id || item.mainSubcategory || item.mainsubcategory);

  // Year established: native or JBusiness establishment_year
  const yearEstablished = parseInt(
    item.year_established ||
    item.establishment_year ||
    item.establishmentyear
  );

  // Employee count: native or JBusiness employees (may be string like "10-50")
  let employeeCount = parseInt(item.employee_count || item.employees);
  if (employeeCount === null && item.employees && typeof item.employees === 'string') {
    // Try to extract first number from range like "10-50"
    const match = item.employees.match(/(\d+)/);
    if (match && match[1]) {
      employeeCount = Number.parseInt(match[1], 10);
    }
  }

  // Social media: native JSON object or built from JBusiness individual fields
  let socialMedia = parseObjectField(item.social_media);
  if (!socialMedia) {
    socialMedia = buildSocialMediaFromJBusiness(item);
  }

  // Email: use owner_email fallback for JBusiness exports
  const email = item.email
    ? String(item.email)
    : null;
  const ownerEmail = String(item.owner_email || item.email || '') || undefined;

  return {
    importId: parseInt(item.id) || index + 1,
    name,
    slug,
    type: String(item.type || item.typeId || 'Standard'),
    tier: (item.tier as ImportListingInput['tier']) || 'essentials',
    // JBusiness uses numeric 'state' field (0/1), map to our status enum
    status: resolveListingStatus(item.status || item.state),
    // JBusiness uses numeric 'approved' field (0/1/2), map to our approved enum
    approved: resolveApprovedStatus(item.approved),
    owner_email: ownerEmail,
    category_id: categoryId,
    description,
    address,
    city: item.city ? String(item.city) : null,
    state,
    zip_code: zipCode,
    country,
    email,
    phone,
    website: item.website ? String(item.website) : null,
    add_ons: parseArrayField(item.add_ons || item.addons || item.addOns),
    claimed: parseBoolean(item.claimed),
    mock: parseBoolean(item.mock),

    // Extended fields for full DB coverage
    user_id: parseInt(item.user_id || item.userId || item.userid),
    year_established: yearEstablished,
    employee_count: employeeCount,
    latitude: parseNumber(item.latitude),
    longitude: parseNumber(item.longitude),
    logo_url: logoUrl,
    cover_image_url: coverImageUrl,
    gallery_images: parseArrayField(item.gallery_images),
    video_url: item.video_url ? String(item.video_url) : null,
    audio_url: item.audio_url ? String(item.audio_url) : null,
    business_hours: parseObjectField(item.business_hours),
    social_media: socialMedia,
    features: parseArrayField(item.features),
    amenities: parseArrayField(item.amenities),
    meta_title: item.meta_title ? String(item.meta_title) : null,
    meta_description: item.meta_description ? String(item.meta_description) : null,
    meta_keywords: item.meta_keywords ? String(item.meta_keywords) : null,
    custom_fields: parseObjectField(item.custom_fields),
    metadata: parseObjectField(item.metadata),
    contact_name: item.contact_name ? String(item.contact_name) : null,
    contact_email: item.contact_email ? String(item.contact_email) : null,
    contact_phone: item.contact_phone ? String(item.contact_phone) : null,
    annual_revenue: parseNumber(item.annual_revenue),
    certifications: parseArrayField(item.certifications),
    languages_spoken: parseArrayField(item.languages_spoken),
    payment_methods: parseArrayField(item.payment_methods),
    keywords: parseKeywordsField(item.keywords), // DB has json_valid() constraint - must be array
    slogan: item.slogan ? String(item.slogan) : null
  };
}

/**
 * Parse JSON import for listings - ALL 58 fields
 */
export function parseListingJSONImport(content: string): ImportListingInput[] {
  const data = JSON.parse(content);

  if (!Array.isArray(data)) {
    throw new Error('JSON must be an array of listings');
  }

  return data.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Row ${index + 1}: Invalid listing object`);
    }
    return mapToImportListingInput(item as Record<string, unknown>, index);
  });
}

/**
 * Parse CSV import for listings - ALL 58 fields
 */
export function parseListingCSVImport(content: string): ImportListingInput[] {
  const lines = content.split('\n').filter(line => line.trim());

  if (lines.length < 2) {
    throw new Error('CSV must have a header row and at least one data row');
  }

  // Parse header
  const headerLine = lines[0];
  if (!headerLine) throw new Error('CSV header is missing');

  const headers = parseCSVRow(headerLine).map(h => h.toLowerCase().trim().replace(/\s+/g, '_'));
  const nameIndex = headers.findIndex(h =>
    h === 'name' || h === 'listing_name' || h === 'listingname'
  );

  if (nameIndex === -1) {
    throw new Error('CSV must have a "name" column');
  }

  const listings: ImportListingInput[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.trim()) continue;

    const values = parseCSVRow(line);
    const item: Record<string, string> = {};

    headers.forEach((header, idx) => {
      item[header] = values[idx] || '';
    });

    listings.push(mapToImportListingInput(item, i - 1));
  }

  return listings;
}

/**
 * Parse a single CSV row (handles quoted fields)
 */
function parseCSVRow(row: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    const nextChar = row[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Parse SQL import for listings - ALL 58 fields
 * Supports both native 'listings' table and JBusiness Directory 'companies' table
 *
 * Handles phpMyAdmin multi-row INSERT format:
 * INSERT INTO `table` (cols) VALUES (row1), (row2), ...;
 */
export function parseListingSQLImport(content: string): ImportListingInput[] {
  const listings: ImportListingInput[] = [];

  // Find all INSERT statements for listings/companies tables
  // Match pattern: INSERT INTO `table_name` (columns) VALUES
  const insertHeaderRegex = /INSERT\s+INTO\s+[`"]?(\w+)[`"]?\s*\(([^)]+)\)\s*VALUES\s*/gi;

  let headerMatch;
  while ((headerMatch = insertHeaderRegex.exec(content)) !== null) {
    const tableName = headerMatch[1]?.toLowerCase() || '';

    // Only process listings or companies tables
    if (!tableName.includes('listing') && !tableName.includes('companies')) {
      continue;
    }

    const columnsStr = headerMatch[2];
    if (!columnsStr) continue;

    const columns = columnsStr.split(',').map(c =>
      c.trim().toLowerCase().replace(/`/g, '').replace(/"/g, '')
    );

    // Get the position after "VALUES " to start parsing value tuples
    const valuesStart = headerMatch.index + headerMatch[0].length;

    // Parse all value tuples following this INSERT statement
    const valuesTuples = extractSQLValueTuples(content, valuesStart);

    for (let i = 0; i < valuesTuples.length; i++) {
      const tuple = valuesTuples[i];
      if (!tuple) continue;

      const values = parseSQLValues(tuple);

      const item: Record<string, string | null> = {};
      columns.forEach((col, idx) => {
        item[col] = values[idx] ?? null;
      });

      listings.push(mapToImportListingInput(item as Record<string, unknown>, listings.length));
    }
  }

  if (listings.length === 0) {
    throw new Error('No valid INSERT statements found. Expected table name containing "listings" or "companies".');
  }

  return listings;
}

/**
 * Extract value tuples from SQL VALUES clause
 * Handles: VALUES (val1, val2), (val3, val4), ...;
 * Properly handles quoted strings with embedded parentheses
 */
function extractSQLValueTuples(content: string, startPos: number): string[] {
  const tuples: string[] = [];
  let pos = startPos;
  const len = content.length;

  while (pos < len) {
    // Skip whitespace
    while (pos < len && /\s/.test(content[pos] || '')) pos++;

    // Check for opening parenthesis
    if (content[pos] !== '(') break;

    // Find the matching closing parenthesis
    const tupleStart = pos + 1;
    let depth = 1;
    let inString = false;
    let stringChar = '';
    pos++;

    while (pos < len && depth > 0) {
      const char = content[pos];

      if (inString) {
        if (char === stringChar) {
          // Check for escaped quote
          if (content[pos + 1] === stringChar) {
            pos++; // Skip escaped quote
          } else {
            inString = false;
          }
        } else if (char === '\\' && content[pos + 1] === stringChar) {
          pos++; // Skip backslash-escaped quote
        }
      } else {
        if (char === "'" || char === '"') {
          inString = true;
          stringChar = char;
        } else if (char === '(') {
          depth++;
        } else if (char === ')') {
          depth--;
        }
      }
      pos++;
    }

    if (depth === 0) {
      // Extract tuple content (without outer parentheses)
      const tupleContent = content.slice(tupleStart, pos - 1);
      tuples.push(tupleContent);
    }

    // Skip whitespace and comma
    while (pos < len && /[\s,]/.test(content[pos] || '')) pos++;

    // Check for end of VALUES (semicolon or next INSERT)
    if (content[pos] === ';' || content.slice(pos, pos + 6).toUpperCase() === 'INSERT') {
      break;
    }
  }

  return tuples;
}

/**
 * Parse SQL VALUES clause
 */
function parseSQLValues(valuesStr: string): (string | null)[] {
  const values: (string | null)[] = [];
  let current = '';
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i];

    if (inString) {
      if (char === stringChar) {
        if (valuesStr[i + 1] === stringChar) {
          current += char;
          i++; // Skip escaped quote
        } else {
          inString = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === "'" || char === '"') {
        inString = true;
        stringChar = char;
      } else if (char === ',') {
        const trimmed = current.trim();
        values.push(trimmed.toUpperCase() === 'NULL' ? null : trimmed);
        current = '';
      } else {
        current += char;
      }
    }
  }

  const trimmed = current.trim();
  values.push(trimmed.toUpperCase() === 'NULL' ? null : trimmed);

  return values;
}
