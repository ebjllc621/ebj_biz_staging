/**
 * Admin Lighthouse Reports API - List Available Reports
 *
 * GET /api/admin/lighthouse/reports
 * Returns list of available Lighthouse report dates or results for a category.
 *
 * Supports two data sources:
 * 1. Root manifest.json (primary) - Contains all results from lhci autorun
 * 2. Date-based manifests (fallback) - reports/[date]/[category]/manifest.json
 *
 * @authority .cursor/rules/admin-api-route-standard.mdc
 * @governance apiHandler wrapper, admin auth required
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import * as fs from 'fs';
import * as path from 'path';

export const dynamic = 'force-dynamic';

interface LighthouseResult {
  url: string;
  scores: {
    performance: number;
    accessibility: number;
    seo: number;
    bestPractices: number;
  };
  metrics: {
    lcp: number;
    fid: number;
    cls: number;
    fcp: number;
    tbt: number;
    ttfb: number;
  };
  timestamp: string;
}

/**
 * Parse a Lighthouse JSON report file into our result format
 */
function parseReportJson(jsonPath: string, timestamp: string): LighthouseResult | null {
  try {
    if (!fs.existsSync(jsonPath)) return null;
    const json = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    return {
      url: json.finalUrl || json.requestedUrl,
      scores: {
        performance: json.categories?.performance?.score || 0,
        accessibility: json.categories?.accessibility?.score || 0,
        seo: json.categories?.seo?.score || 0,
        bestPractices: json.categories?.['best-practices']?.score || 0,
      },
      metrics: {
        lcp: json.audits?.['largest-contentful-paint']?.numericValue || 0,
        fid: json.audits?.['max-potential-fid']?.numericValue || 0,
        cls: json.audits?.['cumulative-layout-shift']?.numericValue || 0,
        fcp: json.audits?.['first-contentful-paint']?.numericValue || 0,
        tbt: json.audits?.['total-blocking-time']?.numericValue || 0,
        ttfb: json.audits?.['server-response-time']?.numericValue || 0,
      },
      timestamp,
    };
  } catch {
    return null;
  }
}

/**
 * Determine category from URL path
 */
function getCategoryFromUrl(url: string): 'public' | 'dashboard' | 'admin' {
  if (url.includes('/admin')) return 'admin';
  if (url.includes('/dashboard')) return 'dashboard';
  return 'public';
}

/**
 * Load results from root manifest.json (primary source)
 */
function loadFromRootManifest(reportsDir: string, category: string): LighthouseResult[] {
  const rootManifestPath = path.join(reportsDir, 'manifest.json');
  if (!fs.existsSync(rootManifestPath)) return [];

  try {
    const manifest = JSON.parse(fs.readFileSync(rootManifestPath, 'utf-8'));
    const results: LighthouseResult[] = [];

    for (const entry of manifest) {
      if (!entry.isRepresentativeRun || !entry.jsonPath) continue;

      // Determine category from URL
      const entryCategory = getCategoryFromUrl(entry.url);
      if (entryCategory !== category) continue;

      // Parse the JSON report
      const jsonPath = entry.jsonPath;
      const timestamp = entry.jsonPath.match(/\d{4}_\d{2}_\d{2}/)?.[0]?.replace(/_/g, '-') || 'unknown';
      const result = parseReportJson(jsonPath, timestamp);
      if (result) {
        results.push(result);
      }
    }

    return results;
  } catch {
    return [];
  }
}

/**
 * Load results from date-based category manifest (fallback)
 */
function loadFromDateManifest(reportsDir: string, category: string): { results: LighthouseResult[]; date: string | null } {
  // Get all date directories (most recent first)
  const dateDirs = fs.readdirSync(reportsDir)
    .filter(d => d.match(/^\d{4}-\d{2}-\d{2}$/))
    .sort()
    .reverse();

  for (const dateDir of dateDirs) {
    const manifestPath = path.join(reportsDir, dateDir, category, 'manifest.json');

    if (fs.existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        const results: LighthouseResult[] = [];

        for (const entry of manifest) {
          if (entry.isRepresentativeRun && entry.jsonPath) {
            const jsonPath = path.join(reportsDir, dateDir, category, path.basename(entry.jsonPath));
            const result = parseReportJson(jsonPath, dateDir);
            if (result) {
              results.push(result);
            }
          }
        }

        if (results.length > 0) {
          return { results, date: dateDir };
        }
      } catch {
        continue;
      }
    }
  }

  return { results: [], date: null };
}

/**
 * Scan directory for individual JSON reports (last resort fallback)
 */
function loadFromIndividualReports(reportsDir: string, category: string): { results: LighthouseResult[]; date: string | null } {
  // Check date directories for individual JSON reports
  const dateDirs = fs.readdirSync(reportsDir)
    .filter(d => d.match(/^\d{4}-\d{2}-\d{2}$/))
    .sort()
    .reverse();

  for (const dateDir of dateDirs) {
    // Check category directory or dev directory
    const categoryDir = path.join(reportsDir, dateDir, category);
    const devDir = path.join(reportsDir, dateDir, 'dev');

    const searchDir = fs.existsSync(categoryDir) ? categoryDir : (fs.existsSync(devDir) ? devDir : null);
    if (!searchDir) continue;

    const files = fs.readdirSync(searchDir).filter(f => f.endsWith('.report.json'));
    if (files.length === 0) continue;

    const results: LighthouseResult[] = [];
    for (const file of files) {
      const jsonPath = path.join(searchDir, file);
      const result = parseReportJson(jsonPath, dateDir);
      if (result && getCategoryFromUrl(result.url) === category) {
        results.push(result);
      }
    }

    if (results.length > 0) {
      return { results, date: dateDir };
    }
  }

  return { results: [], date: null };
}

export const GET = apiHandler(
  async (context: ApiContext) => {
    try {
      const url = new URL(context.request.url);
      const category = url.searchParams.get('category');
      const reportsDir = path.join(process.cwd(), 'tests', 'pagePerformance', 'reports');

      if (!fs.existsSync(reportsDir)) {
        return createSuccessResponse({
          reports: [],
          results: [],
          message: 'No reports directory found. Run: npm run lighthouse:public',
        });
      }

      // If category specified, load results for that category
      if (category && ['public', 'dashboard', 'admin'].includes(category)) {
        // Strategy 1: Try root manifest.json (contains all results)
        let results = loadFromRootManifest(reportsDir, category);
        let date = 'latest';

        // Strategy 2: Try date-based category manifest
        if (results.length === 0) {
          const dateResults = loadFromDateManifest(reportsDir, category);
          results = dateResults.results;
          date = dateResults.date || 'unknown';
        }

        // Strategy 3: Scan individual JSON reports
        if (results.length === 0) {
          const individualResults = loadFromIndividualReports(reportsDir, category);
          results = individualResults.results;
          date = individualResults.date || 'unknown';
        }

        if (results.length > 0) {
          return createSuccessResponse({
            results,
            date,
            category,
            count: results.length,
          });
        }

        return createSuccessResponse({
          results: [],
          date: null,
          category,
          message: `No results found for ${category}. Run: npm run lighthouse:${category}`,
        });
      }

      // Default: list all available reports
      const dateDirs = fs.readdirSync(reportsDir)
        .filter(d => d.match(/^\d{4}-\d{2}-\d{2}$/))
        .sort()
        .reverse();

      const reports = dateDirs.map(date => {
        const summaryPath = path.join(reportsDir, date, 'summary.json');
        let summary = null;

        if (fs.existsSync(summaryPath)) {
          try {
            summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
          } catch {
            // Summary parse failed
          }
        }

        return {
          date,
          hasSummary: summary !== null,
          categories: summary?.categories ? Object.keys(summary.categories) : [],
        };
      });

      // Also check root manifest for total count
      const rootManifestPath = path.join(reportsDir, 'manifest.json');
      let rootManifestCount = 0;
      if (fs.existsSync(rootManifestPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(rootManifestPath, 'utf-8'));
          rootManifestCount = manifest.filter((e: any) => e.isRepresentativeRun).length;
        } catch {
          // Ignore
        }
      }

      return createSuccessResponse({
        reports,
        count: reports.length,
        rootManifestResults: rootManifestCount,
      });
    } catch (error: any) {
      return createErrorResponse(
        `Failed to list reports: ${error.message}`,
        500
      );
    }
  },
  {
    requireAuth: true,
  }
);
