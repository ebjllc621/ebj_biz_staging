/**
 * PII Protection Utilities
 *
 * @governance Build Map v2.1 - NO full IP addresses may be stored
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 *
 * REQUIREMENTS:
 * - Hash all IP addresses before storage
 * - Never log full IP addresses
 * - Use coarse location (city/region) when needed
 */

import * as crypto from 'crypto';

/**
 * Hash IP address for PII protection
 * Uses SHA256 with daily rotating salt
 *
 * @governance MANDATORY for all IP address storage
 * @param ipAddress - Full IP address to hash
 * @returns Hashed IP address safe for storage
 */
export function hashIPAddress(ipAddress: string): string {
  // Generate daily salt (rotates daily for privacy)
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const salt = process.env.IP_HASH_SALT || 'default-salt-change-in-production';
  const dailySalt = `${salt}-${date}`;

  // Hash IP with daily salt
  const hash = crypto
    .createHash('sha256')
    .update(`${ipAddress}:${dailySalt}`)
    .digest('hex');

  return hash.substring(0, 16); // First 16 chars sufficient for uniqueness
}

/**
 * Get coarse location from IP address
 * Returns city/region level only (not precise location)
 *
 * @governance Only coarse location allowed, never precise coordinates
 * @param ipAddress - IP address to geolocate
 * @returns Coarse location (city, region, country) or undefined
 */
export async function getCoarseLocation(
  ipAddress: string
): Promise<{
  city?: string;
  region?: string;
  country?: string;
} | undefined> {
  // Skip for localhost/private IPs
  if (
    ipAddress === '127.0.0.1' ||
    ipAddress === '::1' ||
    ipAddress.startsWith('192.168.') ||
    ipAddress.startsWith('10.') ||
    ipAddress.startsWith('172.')
  ) {
    return { city: 'Local', region: 'Local', country: 'Local' };
  }

  // TODO: Integrate with GeoIP service for coarse location
  // Example services: MaxMind GeoLite2, IP2Location (free tiers available)
  // IMPORTANT: Only use city/region/country - never precise coordinates

  // Placeholder until GeoIP service integrated
  return undefined;
}

/**
 * Extract IP address from request headers
 * Handles proxy/load balancer scenarios
 *
 * @param request - Next.js request object
 * @returns Raw IP address (MUST be hashed before storage)
 */
export function extractRawIP(request: Request): string {
  const forwarded = (request.headers.get('x-forwarded-for') || '').split(',')[0]?.trim();
  if (forwarded) return forwarded;

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;

  return '127.0.0.1'; // Fallback for development
}

/**
 * Build PII-compliant IP context for authentication
 *
 * @governance MANDATORY pattern for all auth operations
 * @param request - Next.js request object
 * @returns IP context safe for storage and logging
 */
export async function buildIPContext(request: Request): Promise<{
  hashedIP: string;
  location?: {
    city?: string;
    region?: string;
    country?: string;
  };
}> {
  const rawIP = extractRawIP(request);

  return {
    hashedIP: hashIPAddress(rawIP),
    location: await getCoarseLocation(rawIP)
  };
}

/**
 * Redact IP for logging
 * Shows only first 2 octets for debugging
 *
 * @param ipAddress - Full IP address
 * @returns Redacted IP safe for logs
 */
export function redactIPForLogging(ipAddress: string): string {
  const parts = ipAddress.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.xxx.xxx`;
  }
  return 'xxx.xxx.xxx.xxx';
}