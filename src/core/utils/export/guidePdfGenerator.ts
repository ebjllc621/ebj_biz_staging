/**
 * Guide PDF Generator - Client-side PDF generation from Guide data
 *
 * @tier ADVANCED
 * @phase Phase G9A - PDF Download Generation
 * @generated ComponentBuilder v3.0
 * @governance Build Map v2.1 ENHANCED
 */

import { jsPDF } from 'jspdf';
import type { Guide } from '@core/types/guide';
import { downloadBlob } from './fileDownload';

// ============================================================================
// CONSTANTS
// ============================================================================

const PAGE_WIDTH = 215.9; // Letter size mm
const PAGE_HEIGHT = 279.4;
const MARGIN_LEFT = 20;
const MARGIN_RIGHT = 20;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 25;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const LINE_HEIGHT = 7;
const SECTION_GAP = 12;

// ============================================================================
// HTML STRIPPING
// ============================================================================

/**
 * Strip HTML tags from content, converting block elements to newlines
 * Reuses proven sanitization pattern from GuideDetailContent.tsx
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Format difficulty level for display
 */
function formatDifficulty(level: string): string {
  return level.charAt(0).toUpperCase() + level.slice(1);
}

/**
 * Format estimated time for display
 */
function formatEstimatedTime(minutes: number | null): string {
  if (!minutes || minutes < 1) return 'Less than 1 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

/**
 * Format date for display
 */
function formatDate(date: Date | null): string {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(date));
}

/**
 * Check if we need a new page and add one if so.
 * Returns the current Y position (reset if new page added).
 */
function checkPageBreak(doc: jsPDF, y: number, neededHeight: number): number {
  if (y + neededHeight > PAGE_HEIGHT - MARGIN_BOTTOM) {
    doc.addPage();
    return MARGIN_TOP;
  }
  return y;
}

/**
 * Add wrapped text and return new Y position
 */
function addWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  for (const line of lines) {
    y = checkPageBreak(doc, y, lineHeight);
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

// ============================================================================
// PDF GENERATION
// ============================================================================

export interface GuidePdfOptions {
  includeTableOfContents?: boolean;
  includeMetadata?: boolean;
}

/**
 * Generate a PDF document from a Guide.
 * Returns jsPDF instance for download or preview.
 */
export function generateGuidePdf(
  guide: Guide,
  listingName?: string,
  options: GuidePdfOptions = {}
): jsPDF {
  const {
    includeTableOfContents = true,
    includeMetadata = true,
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  let y = MARGIN_TOP;

  // ========================================================================
  // TITLE PAGE
  // ========================================================================

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  y = addWrappedText(doc, guide.title, MARGIN_LEFT, y + 20, CONTENT_WIDTH, 10);

  // Subtitle
  if (guide.subtitle) {
    y += 4;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(14);
    y = addWrappedText(doc, guide.subtitle, MARGIN_LEFT, y, CONTENT_WIDTH, 7);
  }

  // Metadata bar
  if (includeMetadata) {
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);

    const metaParts: string[] = [];
    metaParts.push(`Difficulty: ${formatDifficulty(guide.difficulty_level)}`);
    if (guide.estimated_time) {
      metaParts.push(formatEstimatedTime(guide.estimated_time));
    }
    if (guide.sections?.length) {
      metaParts.push(`${guide.sections.length} sections`);
    }
    if (guide.word_count > 0) {
      metaParts.push(`${guide.word_count.toLocaleString()} words`);
    }

    doc.text(metaParts.join('  |  '), MARGIN_LEFT, y);
    y += LINE_HEIGHT;

    // Published date and listing name
    const dateParts: string[] = [];
    if (guide.published_at) {
      dateParts.push(`Published: ${formatDate(guide.published_at)}`);
    }
    if (listingName) {
      dateParts.push(`By: ${listingName}`);
    }
    if (dateParts.length > 0) {
      doc.text(dateParts.join('  |  '), MARGIN_LEFT, y);
      y += LINE_HEIGHT;
    }

    doc.setTextColor(0, 0, 0);
  }

  // Divider
  y += 6;
  doc.setDrawColor(200, 200, 200);
  doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
  y += 8;

  // ========================================================================
  // TABLE OF CONTENTS
  // ========================================================================

  if (includeTableOfContents && guide.sections && guide.sections.length > 0) {
    y = checkPageBreak(doc, y, 20);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('TABLE OF CONTENTS', MARGIN_LEFT, y);
    y += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    for (const section of guide.sections) {
      y = checkPageBreak(doc, y, LINE_HEIGHT);
      const tocText = `${section.section_number}. ${section.title}`;
      doc.text(tocText, MARGIN_LEFT + 4, y);
      y += LINE_HEIGHT;
    }

    // Divider after TOC
    y += 6;
    doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
    y += 8;
  }

  // ========================================================================
  // OVERVIEW
  // ========================================================================

  if (guide.overview) {
    y = checkPageBreak(doc, y, 20);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('OVERVIEW', MARGIN_LEFT, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const overviewText = stripHtml(guide.overview);
    y = addWrappedText(doc, overviewText, MARGIN_LEFT, y, CONTENT_WIDTH, 6);
    y += SECTION_GAP;
  }

  // ========================================================================
  // PREREQUISITES
  // ========================================================================

  if (guide.prerequisites) {
    y = checkPageBreak(doc, y, 20);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('PREREQUISITES', MARGIN_LEFT, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const prereqText = stripHtml(guide.prerequisites);
    y = addWrappedText(doc, prereqText, MARGIN_LEFT, y, CONTENT_WIDTH, 6);
    y += SECTION_GAP;
  }

  // ========================================================================
  // SECTIONS
  // ========================================================================

  if (guide.sections && guide.sections.length > 0) {
    for (const section of guide.sections) {
      // Section divider
      y = checkPageBreak(doc, y, 25);
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.5);
      doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
      y += 10;

      // Section heading
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      const sectionTitle = `SECTION ${section.section_number}: ${section.title}`;
      y = addWrappedText(doc, sectionTitle, MARGIN_LEFT, y, CONTENT_WIDTH, 7);

      // Estimated time
      if (section.estimated_time) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text(`Estimated time: ${section.estimated_time} minutes`, MARGIN_LEFT, y + 2);
        y += 8;
        doc.setTextColor(0, 0, 0);
      } else {
        y += 4;
      }

      // Section content
      if (section.content) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        const contentText = stripHtml(section.content);
        y = addWrappedText(doc, contentText, MARGIN_LEFT, y, CONTENT_WIDTH, 6);
      } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text('No content for this section.', MARGIN_LEFT, y);
        doc.setTextColor(0, 0, 0);
        y += LINE_HEIGHT;
      }

      y += SECTION_GAP;
    }
  }

  // ========================================================================
  // FOOTER
  // ========================================================================

  y = checkPageBreak(doc, y, 30);
  y += 10;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('Generated from Bizconekt', MARGIN_LEFT, y);
  y += 5;
  if (guide.slug) {
    doc.text(`https://bizconekt.com/guides/${guide.slug}`, MARGIN_LEFT, y);
    y += 5;
  }
  doc.text(
    `Downloaded: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
    MARGIN_LEFT,
    y
  );
  doc.setTextColor(0, 0, 0);

  return doc;
}

/**
 * Generate and trigger browser download of a guide as PDF
 */
export function downloadGuidePdf(
  guide: Guide,
  listingName?: string,
  options?: GuidePdfOptions
): void {
  const doc = generateGuidePdf(guide, listingName, options);
  const blob = doc.output('blob');
  const filename = `${guide.slug || 'guide'}-guide.pdf`;
  downloadBlob(blob, filename);
}
