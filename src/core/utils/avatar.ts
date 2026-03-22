/**
 * Avatar Display Utilities
 *
 * Centralized avatar display functions for consistent UX across all components.
 *
 * @authority AVATAR_DISPLAY_GOVERNANCE.md
 * @reference src/features/profile/components/ProfileHeroBanner.tsx:46-53
 *
 * GOVERNANCE REQUIREMENTS:
 * 1. ALL avatar initials MUST use getAvatarInitials() from this file
 * 2. Initials are derived from display_name (preferred) or username (fallback)
 * 3. For names with spaces, use first letter of first and last word
 * 4. Default fallback color is #022641 (Navy Blue)
 */

/**
 * Default avatar background color (Navy Blue - Bizconekt brand)
 */
export const DEFAULT_AVATAR_BG_COLOR = '#022641';

/**
 * Get avatar initials from display name or username
 *
 * Priority: display_name → username → '?'
 *
 * For "Axs Thomasson" → "AT" (first letter of first and last word)
 * For "John" → "JO" (first two characters)
 * For username "ebjllc621" → "EB" (first two characters)
 *
 * @param displayName - User's display name (e.g., "Axs Thomasson")
 * @param username - User's username (e.g., "ebjllc621")
 * @returns Two-character initials string
 *
 * @example
 * getAvatarInitials("Axs Thomasson", "ebjllc621") // "AT"
 * getAvatarInitials(null, "ebjllc621") // "EB"
 * getAvatarInitials("John", "john123") // "JO"
 */
export function getAvatarInitials(
  displayName: string | null | undefined,
  username?: string | null
): string {
  // Prefer display_name over username
  const nameToUse = displayName?.trim() || username?.trim() || '';

  if (!nameToUse) return '?';

  // Split by space and check if we have multiple words
  const parts = nameToUse.split(' ').filter(Boolean);

  if (parts.length >= 2) {
    const firstPart = parts[0];
    const lastPart = parts[parts.length - 1];
    if (firstPart && lastPart) {
      // Multi-word name: first letter of first word + first letter of last word
      return `${firstPart[0]}${lastPart[0]}`.toUpperCase();
    }
  }

  // Single word: first two characters
  return nameToUse.substring(0, 2).toUpperCase() || '?';
}

/**
 * Get avatar background color with fallback
 *
 * @param avatarBgColor - User's selected background color
 * @returns Hex color string (user's color or default navy)
 */
export function getAvatarBgColor(avatarBgColor: string | null | undefined): string {
  return avatarBgColor || DEFAULT_AVATAR_BG_COLOR;
}
