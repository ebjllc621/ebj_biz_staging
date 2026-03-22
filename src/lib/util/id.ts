/**
 * P3.3a ID Utility with crypto.randomUUID fallback
 * Provides unique identifier generation for listings and other entities
 * Following Build Map v2.1 ENHANCED patterns and service architecture standards
 */

import { randomBytes } from 'crypto';

/**
 * Generate a unique identifier using crypto.randomUUID with fallback
 * Follows UUIDv4 format for consistency
 */
export function generateId(): string {
  // Use crypto.randomUUID if available (Node.js 15.6.0+)
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  
  // Fallback implementation for older Node.js versions
  return generateUUIDv4Fallback();
}

/**
 * Fallback UUID v4 implementation
 * Creates RFC 4122 compliant UUID v4 identifiers
 */
function generateUUIDv4Fallback(): string {
  const bytes = randomBytes(16);
  
  // Set version (4) and variant bits as per RFC 4122
  bytes[6] = (bytes[6]! & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // Variant 10
  
  // Convert to hex string with proper formatting
  const hex = bytes.toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32)
  ].join('-');
}

/**
 * Validate if a string is a valid UUID format
 */
export function isValidId(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}