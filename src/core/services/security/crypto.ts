/**
 * Cryptographic utilities for secure operations
 * @module crypto
 */

import { timingSafeEqual as nodeTimingSafeEqual } from 'crypto';

/**
 * Performs a timing-safe comparison of two buffers to prevent timing attacks
 *
 * @param a - First buffer to compare
 * @param b - Second buffer to compare
 * @returns true if buffers are equal, false otherwise
 * @throws {TypeError} If either parameter is not a Buffer
 */
export function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffer instances');
  }

  // Buffers must be the same length for timing-safe comparison
  if (a.length !== b.length) {
    return false;
  }

  return nodeTimingSafeEqual(a, b);
}

/**
 * Converts a string to a Buffer using UTF-8 encoding
 *
 * @param str - String to convert
 * @returns Buffer representation of the string
 */
export function stringToBuffer(str: string): Buffer {
  return Buffer.from(str, 'utf8');
}

/**
 * Securely compares two strings using timing-safe comparison
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns true if strings are equal, false otherwise
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const bufferA = stringToBuffer(a);
  const bufferB = stringToBuffer(b);

  // If lengths differ, still perform a dummy comparison to prevent timing attacks
  if (bufferA.length !== bufferB.length) {
    // Compare against a buffer of the same length as bufferA to maintain constant time
    const dummyBuffer = Buffer.alloc(bufferA.length);
    timingSafeEqual(bufferA, dummyBuffer);
    return false;
  }

  return timingSafeEqual(bufferA, bufferB);
}