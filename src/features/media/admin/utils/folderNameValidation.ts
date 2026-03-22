/**
 * Shared folder/file name validation utilities.
 *
 * Used by CreateFolderModal and RenameFolderModal.
 *
 * @phase Phase 4A - Admin Media Manager Core (tech-debt cleanup)
 */

/** Valid name pattern: alphanumeric, hyphens, underscores, dots, spaces */
export const VALID_NAME_RE = /^[a-zA-Z0-9 _.-]+$/;

export function validateFolderName(name: string): string | null {
  if (!name.trim()) return 'Folder name is required';
  if (!VALID_NAME_RE.test(name))
    return 'Use alphanumeric characters, hyphens, underscores, dots, or spaces only';
  if (name.length > 100) return 'Folder name is too long (max 100 characters)';
  return null;
}
