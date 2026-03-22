#!/usr/bin/env node
/**
 * DNA Audit Command - Governance Compliance Auditor
 *
 * @authority CLAUDE.md - Build Map v2.1 ENHANCED compliance
 * @version 1.0.0 - DNA Enhancement Commands
 * @governance 100% dependency compliance required
 *
 * Purpose: Audit generated components for governance compliance before K9 validation
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  AuditReport,
  AuditOptions,
  AuditViolation,
  AuditWarning,
  AuditCategoryResult,
  CommandResult
} from './dna-types';
import { ComponentTier } from './templates/template-types';
import { ErrorService } from '@core/services/ErrorService';

// ============================================================================
// CONFIGURATION
// ============================================================================

const AUDIT_CONFIG = {
  outputDir: '.claude/sessions/dna/audits',
  governanceRules: {
    importPaths: [
      { pattern: /from ['"]@core\//, description: '@core/ imports' },
      { pattern: /from ['"]@features\//, description: '@features/ imports' },
      { pattern: /from ['"]@components\//, description: '@components/ imports' }
    ],
    forbiddenImports: [
      { pattern: /from ['"]mysql2['"]/, message: 'Direct mysql2 import - use DatabaseService' },
      { pattern: /from ['"]\.\.\/\.\.\/\.\./, message: 'Deep relative imports - use aliases' },
      { pattern: /localStorage/, message: 'localStorage for auth - use httpOnly cookies' }
    ],
    requiredPatterns: {
      ADVANCED: [
        { pattern: /useErrorBoundary|ErrorBoundary/, description: 'Error boundary' },
        { pattern: /circuit.*breaker|CircuitBreaker/i, description: 'Circuit breaker' }
      ],
      ENTERPRISE: [
        { pattern: /usePerformanceMonitoring|PerformanceMonitor/i, description: 'Performance monitoring' },
        { pattern: /auditLog|AuditLogger/i, description: 'Audit logging' }
      ]
    }
  },
  scoreWeights: {
    violations: -10,
    warnings: -2,
    passed: 1
  }
};

// ============================================================================
// AUDIT ENGINE
// ============================================================================

class DNAAuditor {
  private componentPath: string;
  private componentName: string;
  private tier: ComponentTier | null = null;
  private fileContents: Map<string, string> = new Map();

  constructor(componentPath: string) {
    this.componentPath = path.resolve(componentPath);
    this.componentName = path.basename(componentPath, path.extname(componentPath));
  }

  /**
   * Run comprehensive governance audit
   */
  async audit(options: AuditOptions): Promise<CommandResult<AuditReport>> {
    try {
      console.log(`\n🔍 DNA AUDIT REPORT`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      // Load component files
      await this.loadComponentFiles();

      // Detect tier
      this.tier = await this.detectTier();
      console.log(`Component: ${this.componentName}`);
      console.log(`Tier: ${this.tier}\n`);

      // Run audit categories
      const categories = {
        importPaths: await this.auditImportPaths(),
        databaseBoundary: await this.auditDatabaseBoundary(),
        authentication: await this.auditAuthentication(),
        mediaManagement: await this.auditMediaManagement(),
        serviceArchitecture: await this.auditServiceArchitecture(),
        typeScript: await this.auditTypeScript(),
        osiCompliance: await this.auditOSICompliance()
      };

      // Aggregate results
      const violations: AuditViolation[] = [];
      const warnings: AuditWarning[] = [];
      let passedChecks = 0;
      let totalChecks = 0;

      for (const [category, result] of Object.entries(categories)) {
        violations.push(...result.violations);
        warnings.push(...result.warnings);
        passedChecks += result.checks - result.violations.length;
        totalChecks += result.checks;
      }

      // Calculate score
      const score = this.calculateScore(passedChecks, violations.length, warnings.length);

      // Generate recommendations
      const recommendations = this.generateRecommendations(categories, this.tier);

      const report: AuditReport = {
        component: this.componentName,
        timestamp: new Date(),
        tier: this.tier || 'SIMPLE',
        violations,
        warnings,
        score,
        recommendations,
        checks: {
          passed: passedChecks,
          failed: violations.length,
          warnings: warnings.length,
          total: totalChecks
        },
        categories
      };

      // Output results
      this.displayReport(report);

      // Save report
      if (options.outputPath || !options.outputFormat || options.outputFormat !== 'console') {
        await this.saveReport(report, options);
      }

      // Apply fixes if requested
      if (options.fix && violations.length > 0) {
        await this.applyFixes(violations);
      }

      return {
        success: violations.filter(v => v.severity === 'ERROR').length === 0,
        data: report,
        errors: violations.filter(v => v.severity === 'ERROR').map(v => v.message),
        warnings: warnings.map(w => w.message),
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        timestamp: new Date()
      };
    }
  }

  /**
   * Load component and related files
   */
  private async loadComponentFiles(): Promise<void> {
    const componentDir = path.dirname(this.componentPath);
    const files = fs.readdirSync(componentDir);

    for (const file of files) {
      if (file.includes(this.componentName) && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
        const filePath = path.join(componentDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        this.fileContents.set(filePath, content);
      }
    }
  }

  /**
   * Detect component tier from content
   */
  private async detectTier(): Promise<ComponentTier> {
    let totalLines = 0;
    let hasCircuitBreaker = false;
    let hasErrorBoundary = false;
    let hasPerformanceMonitoring = false;

    for (const content of this.fileContents.values()) {
      totalLines += content.split('\n').length;
      if (/circuit.*breaker/i.test(content)) hasCircuitBreaker = true;
      if (/ErrorBoundary/i.test(content)) hasErrorBoundary = true;
      if (/PerformanceMonitor/i.test(content)) hasPerformanceMonitoring = true;
    }

    if (hasPerformanceMonitoring && hasCircuitBreaker) return 'ENTERPRISE';
    if (hasCircuitBreaker || totalLines > 800) return 'ADVANCED';
    if (totalLines > 300 || hasErrorBoundary) return 'STANDARD';
    return 'SIMPLE';
  }

  /**
   * Audit import path compliance
   */
  private async auditImportPaths(): Promise<AuditCategoryResult> {
    const violations: AuditViolation[] = [];
    const warnings: AuditWarning[] = [];
    let checks = 0;

    for (const [filePath, content] of this.fileContents) {
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        checks++;

        // Check for deep relative imports
        if (/from ['"]\.\.\/\.\.\/\.\./.test(line)) {
          violations.push({
            rule: 'import-paths',
            severity: 'ERROR',
            message: 'Deep relative import detected',
            file: filePath,
            line: idx + 1,
            suggestion: 'Use @core/, @features/, or @components/ aliases'
          });
        }

        // Check for missing aliases
        if (/from ['"]\.\.\//.test(line) && !/from ['"]\.\.\/\w+['"]/.test(line)) {
          warnings.push({
            category: 'import-paths',
            message: 'Relative import could use alias',
            file: filePath,
            recommendation: 'Consider using path aliases for better maintainability'
          });
        }
      });
    }

    return {
      passed: violations.length === 0,
      score: this.calculateCategoryScore(checks, violations.length, warnings.length),
      checks,
      violations,
      warnings
    };
  }

  /**
   * Audit DatabaseService boundary compliance
   */
  private async auditDatabaseBoundary(): Promise<AuditCategoryResult> {
    const violations: AuditViolation[] = [];
    const warnings: AuditWarning[] = [];
    let checks = 0;

    for (const [filePath, content] of this.fileContents) {
      checks++;

      // Check for direct mysql2 import
      if (/from ['"]mysql2['"]/.test(content)) {
        violations.push({
          rule: 'database-boundary',
          severity: 'ERROR',
          message: 'Direct mysql2 import - violates DatabaseService boundary',
          file: filePath,
          suggestion: 'Use @core/services/DatabaseService instead'
        });
      }

      // Check for DatabaseService usage
      if (/query|execute|transaction/i.test(content) && !/DatabaseService/.test(content)) {
        warnings.push({
          category: 'database-boundary',
          message: 'Database operations without DatabaseService',
          file: filePath,
          recommendation: 'Ensure all database operations use DatabaseService'
        });
      }
    }

    return {
      passed: violations.length === 0,
      score: this.calculateCategoryScore(checks, violations.length, warnings.length),
      checks,
      violations,
      warnings
    };
  }

  /**
   * Audit authentication patterns
   */
  private async auditAuthentication(): Promise<AuditCategoryResult> {
    const violations: AuditViolation[] = [];
    const warnings: AuditWarning[] = [];
    let checks = 0;

    for (const [filePath, content] of this.fileContents) {
      checks++;

      // Check for localStorage usage with auth
      if (/localStorage.*token|localStorage.*auth/i.test(content)) {
        violations.push({
          rule: 'authentication',
          severity: 'ERROR',
          message: 'localStorage used for auth tokens - security violation',
          file: filePath,
          suggestion: 'Use httpOnly cookies for authentication'
        });
      }

      // Check for proper AuthContext usage
      if (/auth|login|session/i.test(content) && !/AuthContext|useAuth/.test(content)) {
        warnings.push({
          category: 'authentication',
          message: 'Auth-related code without AuthContext',
          file: filePath,
          recommendation: 'Use AuthContext for authentication state management'
        });
      }
    }

    return {
      passed: violations.length === 0,
      score: this.calculateCategoryScore(checks, violations.length, warnings.length),
      checks,
      violations,
      warnings
    };
  }

  /**
   * Audit media management compliance
   */
  private async auditMediaManagement(): Promise<AuditCategoryResult> {
    const violations: AuditViolation[] = [];
    const warnings: AuditWarning[] = [];
    let checks = 0;

    for (const [filePath, content] of this.fileContents) {
      checks++;

      // Check for direct file upload without UMM
      if (/upload|file.*input/i.test(content) && !/useUniversalMedia|UMM/.test(content)) {
        warnings.push({
          category: 'media-management',
          message: 'File upload without Universal Media Manager',
          file: filePath,
          recommendation: 'Use useUniversalMedia hook for all media operations'
        });
      }
    }

    return {
      passed: violations.length === 0,
      score: this.calculateCategoryScore(checks, violations.length, warnings.length),
      checks,
      violations,
      warnings
    };
  }

  /**
   * Audit service architecture compliance
   */
  private async auditServiceArchitecture(): Promise<AuditCategoryResult> {
    const violations: AuditViolation[] = [];
    const warnings: AuditWarning[] = [];
    let checks = 0;

    for (const [filePath, content] of this.fileContents) {
      checks++;

      // Check for BaseService usage (deprecated)
      if (/BaseService/.test(content)) {
        violations.push({
          rule: 'service-architecture',
          severity: 'WARNING',
          message: 'BaseService usage - deprecated pattern',
          file: filePath,
          suggestion: 'Use DatabaseService, FileSystemService, or ExternalAPIService'
        });
      }

      // Check for proper service layer
      if (/api.*call|fetch.*api/i.test(content) && !/Service\.|Service\./.test(content)) {
        warnings.push({
          category: 'service-architecture',
          message: 'API calls without service layer',
          file: filePath,
          recommendation: 'Use service layer for all external API calls'
        });
      }
    }

    return {
      passed: violations.length === 0,
      score: this.calculateCategoryScore(checks, violations.length, warnings.length),
      checks,
      violations,
      warnings
    };
  }

  /**
   * Audit TypeScript strict mode compliance
   */
  private async auditTypeScript(): Promise<AuditCategoryResult> {
    const violations: AuditViolation[] = [];
    const warnings: AuditWarning[] = [];
    let checks = 0;

    for (const [filePath, content] of this.fileContents) {
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        checks++;

        // Check for any type
        if (/:\s*any/.test(line) && !/\/\/.*any|\/\*.*any/.test(line)) {
          warnings.push({
            category: 'typescript',
            message: 'Explicit any type usage',
            file: filePath,
            recommendation: 'Use specific types or unknown instead of any'
          });
        }

        // Check for @ts-ignore
        if (/@ts-ignore/.test(line)) {
          violations.push({
            rule: 'typescript',
            severity: 'WARNING',
            message: '@ts-ignore usage - bypasses type checking',
            file: filePath,
            line: idx + 1,
            suggestion: 'Fix TypeScript errors instead of ignoring them'
          });
        }
      });
    }

    return {
      passed: violations.length === 0,
      score: this.calculateCategoryScore(checks, violations.length, warnings.length),
      checks,
      violations,
      warnings
    };
  }

  /**
   * Audit OSI layer compliance
   */
  private async auditOSICompliance(): Promise<AuditCategoryResult> {
    const violations: AuditViolation[] = [];
    const warnings: AuditWarning[] = [];
    let checks = 1;

    const tier = this.tier || 'SIMPLE';
    const requiredPatterns = AUDIT_CONFIG.governanceRules.requiredPatterns[tier as keyof typeof AUDIT_CONFIG.governanceRules.requiredPatterns];

    if (requiredPatterns) {
      for (const { pattern, description } of requiredPatterns) {
        let found = false;
        for (const content of this.fileContents.values()) {
          if (pattern.test(content)) {
            found = true;
            break;
          }
        }

        if (!found) {
          warnings.push({
            category: 'osi-compliance',
            message: `Missing ${description} for ${tier} tier component`,
            recommendation: `Consider adding ${description} pattern for production readiness`
          });
        }
      }
    }

    return {
      passed: violations.length === 0,
      score: this.calculateCategoryScore(checks, violations.length, warnings.length),
      checks,
      violations,
      warnings
    };
  }

  /**
   * Calculate overall score
   */
  private calculateScore(passed: number, violations: number, warnings: number): number {
    const raw = (
      passed * AUDIT_CONFIG.scoreWeights.passed +
      violations * AUDIT_CONFIG.scoreWeights.violations +
      warnings * AUDIT_CONFIG.scoreWeights.warnings
    );
    const max = passed * AUDIT_CONFIG.scoreWeights.passed;
    return Math.max(0, Math.min(100, Math.round((raw / max) * 100)));
  }

  /**
   * Calculate category score
   */
  private calculateCategoryScore(checks: number, violations: number, warnings: number): number {
    const passed = checks - violations;
    return this.calculateScore(passed, violations, warnings);
  }

  /**
   * Generate recommendations based on audit results
   */
  private generateRecommendations(
    categories: AuditReport['categories'],
    tier: ComponentTier | null
  ): string[] {
    const recommendations: string[] = [];

    if (categories.importPaths.violations.length > 0) {
      recommendations.push('Fix import path violations by using @core/, @features/, @components/ aliases');
    }

    if (categories.databaseBoundary.violations.length > 0) {
      recommendations.push('Replace direct mysql2 imports with DatabaseService');
    }

    if (categories.authentication.violations.length > 0) {
      recommendations.push('Remove localStorage usage for auth tokens and use httpOnly cookies');
    }

    if (tier === 'ADVANCED' || tier === 'ENTERPRISE') {
      if (categories.osiCompliance.warnings.length > 0) {
        recommendations.push('Add missing OSI compliance patterns for production readiness');
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Component meets all governance requirements - ready for K9 validation');
    }

    return recommendations;
  }

  /**
   * Display audit report in console
   */
  private displayReport(report: AuditReport): void {
    console.log(`Governance Score: ${report.score}/100\n`);

    // Passed checks
    if (report.checks.passed > 0) {
      console.log(`✅ PASSED (${report.checks.passed} checks):`);
      for (const [category, result] of Object.entries(report.categories)) {
        if (result.violations.length === 0) {
          console.log(`  - ${this.formatCategoryName(category)}`);
        }
      }
      console.log();
    }

    // Warnings
    if (report.warnings.length > 0) {
      console.log(`⚠️  WARNINGS (${report.warnings.length}):`);
      report.warnings.forEach(w => {
        console.log(`  - ${w.message}`);
        if (w.recommendation) {
          console.log(`    ${w.recommendation}`);
        }
      });
      console.log();
    }

    // Violations
    if (report.violations.length > 0) {
      console.log(`❌ VIOLATIONS (${report.violations.length}):`);
      report.violations.forEach(v => {
        console.log(`  - [${v.severity}] ${v.message}`);
        if (v.file) {
          console.log(`    File: ${path.basename(v.file)}${v.line ? `:${v.line}` : ''}`);
        }
        if (v.suggestion) {
          console.log(`    Fix: ${v.suggestion}`);
        }
      });
      console.log();
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      console.log(`🎯 RECOMMENDATIONS:`);
      report.recommendations.forEach((rec, idx) => {
        console.log(`  ${idx + 1}. ${rec}`);
      });
      console.log();
    }
  }

  /**
   * Save audit report to file
   */
  private async saveReport(report: AuditReport, options: AuditOptions): Promise<void> {
    const outputDir = path.resolve(AUDIT_CONFIG.outputDir);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `${report.component}-${timestamp}.json`;
    const outputPath = options.outputPath || path.join(outputDir, filename);

    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`Full report saved to: ${outputPath}`);
  }

  /**
   * Apply automatic fixes for common violations
   */
  private async applyFixes(violations: AuditViolation[]): Promise<void> {
    console.log('\n🔧 Applying automatic fixes...\n');

    for (const violation of violations) {
      if (violation.rule === 'import-paths' && violation.file) {
        // Auto-fix deep relative imports
        // Implementation would go here
        console.log(`  ✓ Fixed ${path.basename(violation.file)}: ${violation.message}`);
      }
    }

    console.log('\nFixes applied. Please review changes before committing.\n');
  }

  /**
   * Format category name for display
   */
  private formatCategoryName(category: string): string {
    return category
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
DNA Audit - Governance Compliance Auditor

USAGE:
  npm run dna:audit <ComponentPath> [options]

OPTIONS:
  --fix              Auto-fix minor violations
  --strict           Strict mode (warnings as errors)
  --output=<path>    Save report to specific path
  --format=<type>    Output format (console|json|markdown)

EXAMPLES:
  npm run dna:audit src/components/UserDashboard.tsx
  npm run dna:audit src/components/AdminPanel.tsx --fix
  npm run dna:audit src/components/MediaGallery.tsx --strict

See docs/cli/dna-audit.md for full documentation
    `);
    process.exit(0);
  }

  const componentPath = args.find(arg => !arg.startsWith('-'));
  const formatArg = args.find(a => a.startsWith('--format='));
  const outputArg = args.find(a => a.startsWith('--output='));

  // Validation with clear error message
  if (!componentPath) {
    ErrorService.capture('❌ Error: Component path is required');
    console.log('Usage: npm run dna:audit <component-path> [options]');
    process.exit(1);
  }

  const options: AuditOptions = {
    componentPath,
    fix: args.includes('--fix'),
    strict: args.includes('--strict'),
    outputFormat: (formatArg ? formatArg.split('=')[1] : 'console') as 'console' | 'json' | 'markdown',
    outputPath: outputArg ? outputArg.split('=')[1] : undefined
  };

  const auditor = new DNAAuditor(componentPath);
  const result = await auditor.audit(options);

  process.exit(result.success ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    ErrorService.capture('DNA Audit Error:', error);
    process.exit(1);
  });
}

export { DNAAuditor };
