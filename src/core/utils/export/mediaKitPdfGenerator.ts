/**
 * Media Kit PDF Generator - Server/Client-side PDF generation for Internet Personality profiles
 *
 * @tier ADVANCED
 * @phase Tier 3 Creator Profiles - Phase 9C
 * @generated ComponentBuilder
 * @governance Build Map v2.1 ENHANCED
 * @reference src/core/utils/export/guidePdfGenerator.ts - Canonical PDF pattern replicated
 */

import { jsPDF } from 'jspdf';

// ============================================================================
// CONSTANTS — same as guidePdfGenerator
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
// DATA INTERFACE
// ============================================================================

export interface MediaKitData {
  profile: {
    display_name: string;
    headline: string | null;
    bio: string | null;
    location: string | null;
    content_categories: string[];
    platforms: (string | { name: string; url?: string; verified?: boolean })[];
    collaboration_types: string[];
    total_reach: number;
    avg_engagement_rate: number | null;
    rating_average: number;
    rating_count: number;
    view_count: number;
    contact_count: number;
    website_url: string | null;
    social_links: Record<string, string> | null;
    management_contact: string | null;
    creating_since: number | null;
    rate_card: Record<string, unknown> | null;
    slug: string;
  };
  collaborations: Array<{
    brand_name: string | null;
    collaboration_type: string | null;
    description: string | null;
    collaboration_date: string | null;
  }>;
  platformMetrics: Record<string, {
    follower_count: number;
    avg_engagement_rate: number | null;
    total_views: number;
    platform_username: string | null;
  } | null>;
  connectedPlatforms: string[];
  generatedAt: string;
  profileUrl: string;
}

// ============================================================================
// HELPERS — replicated exactly from guidePdfGenerator
// ============================================================================

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

/**
 * Format a number with K/M suffix
 */
function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return n.toLocaleString();
}

/**
 * Capitalize first letter of each word
 */
function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');
}

// ============================================================================
// PDF GENERATION
// ============================================================================

/**
 * Generate a PDF document from MediaKitData.
 * Returns jsPDF instance for download, blob, or buffer export.
 */
export function generateMediaKitPdf(data: MediaKitData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  let y = MARGIN_TOP;

  // ========================================================================
  // SECTION 1: HEADER BLOCK
  // ========================================================================

  // Display name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  y = addWrappedText(doc, data.profile.display_name, MARGIN_LEFT, y + 10, CONTENT_WIDTH, 10);

  // Headline
  if (data.profile.headline) {
    y += 2;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(14);
    y = addWrappedText(doc, data.profile.headline, MARGIN_LEFT, y, CONTENT_WIDTH, 7);
  }

  // Location + Creating Since
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);

  const headerMeta: string[] = [];
  if (data.profile.location) {
    headerMeta.push(data.profile.location);
  }
  if (data.profile.creating_since) {
    headerMeta.push(`Creating since ${data.profile.creating_since}`);
  }
  if (headerMeta.length > 0) {
    doc.text(headerMeta.join('  |  '), MARGIN_LEFT, y);
    y += LINE_HEIGHT;
  }

  doc.setTextColor(0, 0, 0);

  // Divider
  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
  y += 8;

  // ========================================================================
  // SECTION 2: BIO
  // ========================================================================

  if (data.profile.bio) {
    y = checkPageBreak(doc, y, 20);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('ABOUT', MARGIN_LEFT, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    y = addWrappedText(doc, data.profile.bio, MARGIN_LEFT, y, CONTENT_WIDTH, 6);
    y += SECTION_GAP;
  }

  // ========================================================================
  // SECTION 3: PLATFORM STATS
  // ========================================================================

  if (data.connectedPlatforms.length > 0) {
    y = checkPageBreak(doc, y, 25);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('PLATFORM STATS', MARGIN_LEFT, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    for (const platform of data.connectedPlatforms) {
      y = checkPageBreak(doc, y, LINE_HEIGHT + 2);
      const metrics = data.platformMetrics[platform];
      const label = titleCase(platform);

      if (metrics) {
        const parts: string[] = [
          `${label}: ${formatCount(metrics.follower_count)} followers`,
          'Verified',
        ];
        if (metrics.avg_engagement_rate !== null) {
          parts.push(`${metrics.avg_engagement_rate.toFixed(1)}% engagement`);
        }
        if (metrics.total_views > 0) {
          parts.push(`${formatCount(metrics.total_views)} total views`);
        }
        if (metrics.platform_username) {
          parts.push(`@${metrics.platform_username}`);
        }
        doc.text(parts.join('  |  '), MARGIN_LEFT + 4, y);
      } else {
        doc.text(`${label}: Connected`, MARGIN_LEFT + 4, y);
      }
      y += LINE_HEIGHT;
    }
    y += SECTION_GAP - LINE_HEIGHT;
  }

  // ========================================================================
  // SECTION 4: AUDIENCE OVERVIEW
  // ========================================================================

  y = checkPageBreak(doc, y, 30);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('AUDIENCE OVERVIEW', MARGIN_LEFT, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);

  const audienceLines: string[] = [
    `Total Reach: ${formatCount(data.profile.total_reach)}`,
  ];
  if (data.profile.avg_engagement_rate !== null) {
    audienceLines.push(`Avg Engagement Rate: ${data.profile.avg_engagement_rate.toFixed(1)}%`);
  }
  if (data.profile.rating_count > 0) {
    audienceLines.push(`Rating: ${Number(data.profile.rating_average).toFixed(1)} from ${data.profile.rating_count} reviews`);
  }
  audienceLines.push(`Profile Views: ${formatCount(data.profile.view_count)}`);
  audienceLines.push(`Contact Requests: ${formatCount(data.profile.contact_count)}`);

  for (const line of audienceLines) {
    y = checkPageBreak(doc, y, LINE_HEIGHT);
    doc.text(line, MARGIN_LEFT + 4, y);
    y += LINE_HEIGHT;
  }
  y += SECTION_GAP - LINE_HEIGHT;

  // ========================================================================
  // SECTION 5: CONTENT CATEGORIES
  // ========================================================================

  if (data.profile.content_categories.length > 0) {
    y = checkPageBreak(doc, y, 20);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('CONTENT CATEGORIES', MARGIN_LEFT, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    y = addWrappedText(
      doc,
      data.profile.content_categories.map(titleCase).join(', '),
      MARGIN_LEFT + 4,
      y,
      CONTENT_WIDTH - 4,
      LINE_HEIGHT
    );
    y += SECTION_GAP - LINE_HEIGHT;
  }

  // ========================================================================
  // SECTION 6: COLLABORATION TYPES
  // ========================================================================

  if (data.profile.collaboration_types.length > 0) {
    y = checkPageBreak(doc, y, 20);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('COLLABORATION TYPES', MARGIN_LEFT, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    for (const type of data.profile.collaboration_types) {
      y = checkPageBreak(doc, y, LINE_HEIGHT);
      doc.text(`• ${titleCase(type)}`, MARGIN_LEFT + 4, y);
      y += LINE_HEIGHT;
    }
    y += SECTION_GAP - LINE_HEIGHT;
  }

  // ========================================================================
  // SECTION 7: RATE CARD
  // ========================================================================

  if (data.profile.rate_card && Object.keys(data.profile.rate_card).length > 0) {
    y = checkPageBreak(doc, y, 25);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('RATE CARD', MARGIN_LEFT, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    for (const [key, value] of Object.entries(data.profile.rate_card)) {
      y = checkPageBreak(doc, y, LINE_HEIGHT);
      doc.text(`${titleCase(key)}: ${String(value)}`, MARGIN_LEFT + 4, y);
      y += LINE_HEIGHT;
    }
    y += SECTION_GAP - LINE_HEIGHT;
  }

  // ========================================================================
  // SECTION 8: PAST COLLABORATIONS
  // ========================================================================

  if (data.collaborations.length > 0) {
    y = checkPageBreak(doc, y, 25);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('PAST COLLABORATIONS', MARGIN_LEFT, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    // Show up to 8 recent collaborations
    const shown = data.collaborations.slice(0, 8);
    for (const collab of shown) {
      y = checkPageBreak(doc, y, LINE_HEIGHT * 2 + 4);

      const parts: string[] = [];
      if (collab.brand_name) parts.push(collab.brand_name);
      if (collab.collaboration_type) parts.push(titleCase(collab.collaboration_type));
      if (collab.collaboration_date) parts.push(collab.collaboration_date);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(parts.join('  —  '), MARGIN_LEFT + 4, y);
      y += 5;

      if (collab.description) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const preview = collab.description.length > 120
          ? collab.description.slice(0, 120) + '...'
          : collab.description;
        y = addWrappedText(doc, preview, MARGIN_LEFT + 8, y, CONTENT_WIDTH - 8, 5);
      }
      y += 3;
    }
    y += SECTION_GAP - 3;
  }

  // ========================================================================
  // SECTION 9: CONTACT INFO
  // ========================================================================

  y = checkPageBreak(doc, y, 25);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('CONTACT', MARGIN_LEFT, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);

  const contactLines: string[] = [];
  if (data.profile.management_contact) {
    contactLines.push(`Management: ${data.profile.management_contact}`);
  }
  if (data.profile.website_url) {
    contactLines.push(`Website: ${data.profile.website_url}`);
  }
  if (data.profile.social_links) {
    for (const [platform, handle] of Object.entries(data.profile.social_links)) {
      contactLines.push(`${titleCase(platform)}: ${handle}`);
    }
  }

  if (contactLines.length > 0) {
    for (const line of contactLines) {
      y = checkPageBreak(doc, y, LINE_HEIGHT);
      doc.text(line, MARGIN_LEFT + 4, y);
      y += LINE_HEIGHT;
    }
  } else {
    doc.setTextColor(150, 150, 150);
    doc.text('Contact details not provided.', MARGIN_LEFT + 4, y);
    doc.setTextColor(0, 0, 0);
    y += LINE_HEIGHT;
  }
  y += SECTION_GAP - LINE_HEIGHT;

  // ========================================================================
  // SECTION 10: FOOTER
  // ========================================================================

  y = checkPageBreak(doc, y, 30);
  y += 8;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);

  const generatedDate = new Date(data.generatedAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  doc.text(`Generated on ${generatedDate}`, MARGIN_LEFT, y);
  y += 5;
  doc.text(data.profileUrl, MARGIN_LEFT, y);
  y += 5;
  doc.text('Powered by Bizconekt', MARGIN_LEFT, y);

  doc.setTextColor(0, 0, 0);

  return doc;
}

/**
 * Get media kit PDF as Blob (for browser download)
 */
export function getMediaKitBlob(data: MediaKitData): Blob {
  const doc = generateMediaKitPdf(data);
  return doc.output('blob');
}

/**
 * Get media kit PDF as ArrayBuffer (for server-side upload)
 */
export function getMediaKitBuffer(data: MediaKitData): ArrayBuffer {
  const doc = generateMediaKitPdf(data);
  return doc.output('arraybuffer');
}
