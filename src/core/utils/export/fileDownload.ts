/**
 * File Download Utility - Trigger browser file download
 *
 * @tier ADVANCED
 * @generated DNA v11.4.0 - Phase 5
 */

/**
 * Trigger browser file download
 * Creates a temporary blob and link element to download file
 *
 * @param content - File content as string
 * @param filename - Download filename with extension
 * @param contentType - MIME type (e.g., 'application/json', 'text/csv')
 */
export function downloadFile(
  content: string,
  filename: string,
  contentType: string
): void {
  // Create blob with content
  const blob = new Blob([content], { type: contentType });

  // Create download URL
  const url = URL.createObjectURL(blob);

  // Create temporary link element
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  // Trigger download
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Trigger browser file download from a Blob
 * Used for binary content like PDFs
 *
 * @param blob - Binary content as Blob
 * @param filename - Download filename with extension
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate filename with timestamp
 *
 * @param prefix - Filename prefix (e.g., 'categories-export')
 * @param extension - File extension without dot (e.g., 'json', 'csv')
 * @returns Timestamped filename
 */
export function generateTimestampedFilename(
  prefix: string,
  extension: string
): string {
  const date = new Date();
  const timestamp = date.toISOString().split('T')[0]; // YYYY-MM-DD
  return `${prefix}-${timestamp}.${extension}`;
}
