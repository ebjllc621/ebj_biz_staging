/**
 * Lighthouse Runner Service
 *
 * Service layer for executing and managing Lighthouse performance tests.
 * Follows DatabaseService pattern for consistent service architecture.
 *
 * @see tests/pagePerformance/LIGHTHOUSE_PERFORMANCE_BRAIN_PLAN.md
 * @authority .cursor/rules/service-architecture-standards.mdc
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { ErrorService } from '@core/services/ErrorService';

/**
 * Lighthouse configuration options
 */
export interface LighthouseConfig {
  category: 'public' | 'dashboard' | 'admin';
  pages?: string[];
  thresholds?: ThresholdConfig;
  outputDir?: string;
}

/**
 * Performance thresholds for assertions
 */
export interface ThresholdConfig {
  performance: number;
  accessibility: number;
  seo?: number;
  bestPractices: number;
  lcp: number; // Largest Contentful Paint (ms)
  tbt: number; // Total Blocking Time (ms)
}

/**
 * Lighthouse test result
 */
export interface LighthouseResult {
  url: string;
  scores: {
    performance: number;
    accessibility: number;
    seo: number;
    bestPractices: number;
  };
  metrics: {
    lcp: number;  // Largest Contentful Paint
    fid: number;  // First Input Delay
    cls: number;  // Cumulative Layout Shift
    fcp: number;  // First Contentful Paint
    tbt: number;  // Total Blocking Time
    ttfb: number; // Time to First Byte
  };
  timestamp: string;
}

/**
 * Trend analysis result
 */
export interface TrendAnalysis {
  category: string;
  dataPoints: number;
  dateRange: {
    start: string;
    end: string;
  };
  trends: {
    performance: TrendMetric;
    accessibility: TrendMetric;
    seo: TrendMetric;
    bestPractices: TrendMetric;
  };
}

interface TrendMetric {
  first: number;
  last: number;
  change: number;
  percentChange: number;
  trend: 'improving' | 'declining' | 'stable';
}

/**
 * Lighthouse Runner Service
 *
 * Manages Lighthouse test execution, report storage, and historical analysis.
 */
export class LighthouseRunnerService {
  private readonly reportsDir: string;
  private readonly scriptsDir: string;

  constructor() {
    this.reportsDir = path.join(process.cwd(), 'tests', 'pagePerformance', 'reports');
    this.scriptsDir = path.join(process.cwd(), 'tests', 'pagePerformance', 'scripts');
  }

  /**
   * Run Lighthouse test for a single page
   */
  async runSingle(url: string, config: LighthouseConfig): Promise<LighthouseResult> {
    try {
      const category = config.category;
      const dateDir = this.getDateDirectory();
      const categoryDir = path.join(dateDir, category);

      // Ensure output directory exists
      this.ensureDirectory(categoryDir);

      // Run Lighthouse via CLI
      const scriptPath = path.join(this.scriptsDir, 'run-lighthouse.ts');
      execSync(`npx ts-node "${scriptPath}" --category=${category}`, {
        stdio: 'inherit',
        cwd: process.cwd(),
      });

      // Parse result from manifest
      const result = await this.parseResultFromManifest(categoryDir, url);

      return result;
    } catch (error: any) {
      throw new Error(`Lighthouse test failed: ${error.message}`);
    }
  }

  /**
   * Run Lighthouse tests for batch of pages by category
   *
   * Note: In web server context, execSync may fail or timeout.
   * For production use, run tests via CLI: npm run lighthouse:[category]
   */
  async runBatch(config: LighthouseConfig): Promise<LighthouseResult[]> {
    const category = config.category;
    const dateDir = this.getDateDirectory();
    const categoryDir = path.join(dateDir, category);

    // First, check if we have existing results we can return
    if (fs.existsSync(categoryDir)) {
      try {
        const results = await this.parseResultsFromManifest(categoryDir);
        if (results.length > 0) {
          return results;
        }
      } catch {
        // No existing results, will try to run
      }
    }

    // In web server context, running execSync with Lighthouse is problematic
    // because tests take 30-60+ seconds per page and will timeout
    // Provide helpful guidance instead
    throw new Error(
      `Lighthouse tests must be run via CLI for reliability. ` +
      `Please use: npm run lighthouse:${category} ` +
      `(Tests take 30-60 seconds per page and cannot run in API context)`
    );
  }

  /**
   * Run all Lighthouse tests (all categories)
   */
  async runAll(): Promise<Map<string, LighthouseResult[]>> {
    const results = new Map<string, LighthouseResult[]>();

    for (const category of ['public', 'dashboard', 'admin'] as const) {
      try {
        const categoryResults = await this.runBatch({ category });
        results.set(category, categoryResults);
      } catch (error: any) {
        ErrorService.capture(`Failed to run ${category} tests:`, error.message);
        results.set(category, []);
      }
    }

    return results;
  }

  /**
   * Get historical results for a specific URL
   */
  async getHistory(url: string, days: number = 30): Promise<LighthouseResult[]> {
    const results: LighthouseResult[] = [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    if (!fs.existsSync(this.reportsDir)) {
      return results;
    }

    const dateDirs = fs.readdirSync(this.reportsDir).filter(d => d.match(/^\d{4}-\d{2}-\d{2}$/));

    for (const dateDir of dateDirs) {
      const dirDate = new Date(dateDir);
      if (dirDate < cutoffDate) continue;

      // Check all category directories
      for (const category of ['public', 'dashboard', 'admin']) {
        const categoryDir = path.join(this.reportsDir, dateDir, category);
        const manifestPath = path.join(categoryDir, 'manifest.json');

        if (fs.existsSync(manifestPath)) {
          try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
            const urlResults = manifest.filter((m: any) => m.url === url);

            for (const urlResult of urlResults) {
              if (urlResult.isRepresentativeRun && urlResult.jsonPath) {
                const jsonPath = path.join(categoryDir, path.basename(urlResult.jsonPath));
                if (fs.existsSync(jsonPath)) {
                  const json = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
                  results.push(this.parseResult(json, dateDir));
                }
              }
            }
          } catch (error) {
            console.warn(`Failed to parse ${dateDir}/${category} manifest`);
          }
        }
      }
    }

    return results.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  /**
   * Get trend analysis for a category
   */
  async getTrends(category: string, days: number = 30): Promise<TrendAnalysis | null> {
    if (!fs.existsSync(this.reportsDir)) {
      return null;
    }

    const trendData: Array<{
      date: string;
      scores: {
        performance: number;
        accessibility: number;
        seo: number;
        bestPractices: number;
      };
    }> = [];

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const dateDirs = fs.readdirSync(this.reportsDir).filter(d => d.match(/^\d{4}-\d{2}-\d{2}$/));

    for (const dateDir of dateDirs) {
      const dirDate = new Date(dateDir);
      if (dirDate < cutoffDate) continue;

      const summaryPath = path.join(this.reportsDir, dateDir, 'summary.json');
      if (fs.existsSync(summaryPath)) {
        try {
          const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
          if (summary.categories[category]) {
            trendData.push({
              date: dateDir,
              scores: summary.categories[category].averageScores,
            });
          }
        } catch (error) {
          console.warn(`Failed to parse ${dateDir}/summary.json`);
        }
      }
    }

    if (trendData.length < 2) {
      return null;
    }

    return this.analyzeTrends(category, trendData);
  }

  /**
   * Parse result from Lighthouse JSON
   */
  private parseResult(json: any, timestamp: string): LighthouseResult {
    return {
      url: json.finalUrl || json.requestedUrl,
      scores: {
        performance: json.categories.performance?.score || 0,
        accessibility: json.categories.accessibility?.score || 0,
        seo: json.categories.seo?.score || 0,
        bestPractices: json.categories['best-practices']?.score || 0,
      },
      metrics: {
        lcp: json.audits['largest-contentful-paint']?.numericValue || 0,
        fid: json.audits['max-potential-fid']?.numericValue || 0,
        cls: json.audits['cumulative-layout-shift']?.numericValue || 0,
        fcp: json.audits['first-contentful-paint']?.numericValue || 0,
        tbt: json.audits['total-blocking-time']?.numericValue || 0,
        ttfb: json.audits['server-response-time']?.numericValue || 0,
      },
      timestamp,
    };
  }

  /**
   * Parse results from manifest file
   */
  private async parseResultsFromManifest(categoryDir: string): Promise<LighthouseResult[]> {
    const manifestPath = path.join(categoryDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error('Manifest file not found');
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const results: LighthouseResult[] = [];
    const timestamp = path.basename(path.dirname(categoryDir));

    for (const entry of manifest) {
      if (entry.isRepresentativeRun && entry.jsonPath) {
        const jsonPath = path.join(categoryDir, path.basename(entry.jsonPath));
        if (fs.existsSync(jsonPath)) {
          const json = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
          results.push(this.parseResult(json, timestamp));
        }
      }
    }

    return results;
  }

  /**
   * Parse single result from manifest
   */
  private async parseResultFromManifest(categoryDir: string, url: string): Promise<LighthouseResult> {
    const results = await this.parseResultsFromManifest(categoryDir);
    const result = results.find(r => r.url === url);

    if (!result) {
      throw new Error(`No result found for URL: ${url}`);
    }

    return result;
  }

  /**
   * Analyze trends from historical data
   */
  private analyzeTrends(
    category: string,
    trendData: Array<{ date: string; scores: any }>
  ): TrendAnalysis {
    const first = trendData[0]?.scores;
    const last = trendData[trendData.length - 1]?.scores;

    if (!first || !last) {
      throw new Error('Invalid trend data');
    }

    const calculateTrend = (metric: keyof typeof first): TrendMetric => {
      const firstValue = first[metric] ?? 0;
      const lastValue = last[metric] ?? 0;
      const change = lastValue - firstValue;
      const percentChange = firstValue > 0 ? (change / firstValue) * 100 : 0;

      return {
        first: firstValue,
        last: lastValue,
        change,
        percentChange: parseFloat(percentChange.toFixed(2)),
        trend: change > 0 ? 'improving' : change < 0 ? 'declining' : 'stable',
      };
    };

    return {
      category,
      dataPoints: trendData.length,
      dateRange: {
        start: trendData[0]?.date || '',
        end: trendData[trendData.length - 1]?.date || '',
      },
      trends: {
        performance: calculateTrend('performance'),
        accessibility: calculateTrend('accessibility'),
        seo: calculateTrend('seo'),
        bestPractices: calculateTrend('bestPractices'),
      },
    };
  }

  /**
   * Get current date directory (YYYY-MM-DD)
   */
  private getDateDirectory(): string {
    const date = new Date().toISOString().split('T')[0] as string;
    return path.join(this.reportsDir, date);
  }

  /**
   * Ensure directory exists
   */
  private ensureDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
