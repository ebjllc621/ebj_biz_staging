/**
 * Token utilities for secure token generation and manipulation
 * Provides base64url encoding/decoding, SHA-256 hashing, and secure random token generation
 */

import { createHash, randomBytes } from 'crypto';

/**
 * Encode buffer to base64url format (no padding)
 * @param buf - Buffer to encode
 * @returns Base64url encoded string without padding
 */
export function base64urlEncode(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Decode base64url string to buffer
 * @param str - Base64url encoded string
 * @returns Decoded buffer
 */
export function base64urlDecode(str: string): Buffer {
  // Add padding if needed
  const padding = '='.repeat((4 - (str.length % 4)) % 4);
  const base64 = str
    .replace(/-/g, '+')
    .replace(/_/g, '/') + padding;

  return Buffer.from(base64, 'base64');
}

/**
 * Generate SHA-256 hash of buffer
 * @param buf - Buffer to hash
 * @returns SHA-256 hash as buffer
 */
export function sha256(buf: Buffer): Buffer {
  return createHash('sha256').update(buf).digest();
}

/**
 * Generate cryptographically secure random token
 * @param bytes - Number of random bytes to generate (default: 32)
 * @returns Random token as buffer
 */
export function genRawToken(bytes: number = 32): Buffer {
  return randomBytes(bytes);
}