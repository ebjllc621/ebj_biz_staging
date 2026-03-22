#!/usr/bin/env node
/**
 * DNA Rollback Command - Safe Component Rollback with Dependency Tracking
 *
 * @authority CLAUDE.md - Build Map v2.1 ENHANCED compliance
 * @version 1.0.0 - DNA Enhancement Commands
 * @governance Safe rollback with dependency analysis
 *
 * Purpose: Safely rollback generated components with dependency tracking
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { ErrorService } from '@core/services/ErrorService';
import {
  RollbackPlan,
  RollbackOptions,
  RollbackResult,
  FileInfo,
  DependencyInfo,
  CommandResult
} from './dna-types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const ROLLBACK_CONFIG = {
  sessionDir: '.claude/sessions/componentbuilder/builds',
  backupDir: '.claude/sessions/dna/rollbacks',
  componentsDir: 'src/components',
  featuresDir: 'src/features',
  gitRequired: true
};

// ============================================================================
// ROLLBACK ENGINE
// ============================================================================

class DNARollback {
  private componentName: string;
  private sessionData: {
    componentName?: string;
    timestamp?: string;
    filesCreated?: string[];
    checkpoints?: unknown[];
  } | null = null;

  constructor(componentName: string) {
    this.componentName = componentName;
  }

  /**
   * Generate rollback plan
   */
  async generatePlan(options: RollbackOptions): Promise<CommandResult<RollbackPlan>> {
    try {
      console.log(`\n🔄 DNA ROLLBACK PLAN`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      console.log(`Component: ${this.componentName}\n`);

      // Load session data
      this.sessionData = await this.loadSessionData();

      if (!this.sessionData) {
        throw new Error(`No session data found for component: ${this.componentName}`);
      }

      console.log(`Generated: ${this.sessionData.timestamp || 'Unknown'}\n`);

      // Analyze files created
      const filesCreated = await this.findCreatedFiles();
      console.log(`📁 FILES TO REMOVE (${filesCreated.length}):`);
      filesCreated.forEach(f => console.log(`  - ${f.path}`));
      console.log();

      // Analyze files modified
      const filesModified = await this.findModifiedFiles();
      console.log(`📝 FILES TO RESTORE (${filesModified.length}):`);
      filesModified.forEach(f => console.log(`  - ${f.path} (${f.type})`));
      console.log();

      // Analyze dependencies
      const dependencies = await this.findDependencies();

      const safeToRollback = dependencies.length === 0;
      const warnings: string[] = [];

      if (!safeToRollback) {
        console.log(`⚠️  DEPENDENCIES (${dependencies.length}):`);
        dependencies.forEach(d => {
          console.log(`  - ${d.component} (${d.path})`);
          d.usage.forEach(u => console.log(`    └─ ${u}`));
        });
        console.log();
        warnings.push(`${dependencies.length} component(s) depend on ${this.componentName}`);
      }

      // Determine safety
      if (safeToRollback) {
        console.log(`✅ SAFE TO ROLLBACK\n`);
      } else {
        console.log(`❌ UNSAFE TO ROLLBACK`);
        console.log(`Use --force to proceed anyway, or remove dependencies first\n`);
      }

      const plan: RollbackPlan = {
        component: this.componentName,
        timestamp: new Date(),
        filesCreated,
        filesModified,
        dependencies,
        safeToRollback,
        warnings,
        estimatedImpact: {
          filesAffected: filesCreated.length + filesModified.length,
          componentsAffected: dependencies.length,
          testsAffected: filesCreated.filter(f => f.type === 'test').length
        }
      };

      // Display command suggestions
      console.log(`Generate rollback script: npm run dna:rollback ${this.componentName} --plan-only`);
      if (!safeToRollback) {
        console.log(`Force rollback: npm run dna:rollback ${this.componentName} --force`);
      } else {
        console.log(`Execute rollback: npm run dna:rollback ${this.componentName}`);
      }
      console.log();

      return {
        success: true,
        data: plan,
        errors: [],
        warnings,
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
   * Execute rollback
   */
  async execute(options: RollbackOptions): Promise<CommandResult<RollbackResult>> {
    try {
      // Generate plan first
      const planResult = await this.generatePlan(options);

      if (!planResult.success || !planResult.data) {
        throw new Error('Failed to generate rollback plan');
      }

      const plan = planResult.data;

      // Check safety
      if (!plan.safeToRollback && !options.force) {
        throw new Error('Rollback is unsafe. Use --force to proceed anyway');
      }

      if (options.planOnly) {
        console.log('\n[PLAN ONLY MODE] No changes made\n');
        return {
          success: true,
          data: {
            success: true,
            component: this.componentName,
            filesRemoved: [],
            filesRestored: [],
            errors: [],
            warnings: plan.warnings
          },
          errors: [],
          warnings: plan.warnings,
          timestamp: new Date()
        };
      }

      if (options.dryRun) {
        console.log('\n[DRY RUN MODE] Simulating rollback...\n');
        return this.simulateRollback(plan);
      }

      console.log('\n🔧 EXECUTING ROLLBACK...\n');

      const filesRemoved: string[] = [];
      const filesRestored: string[] = [];
      const errors: string[] = [];
      let backupPath: string | undefined;

      // Create backup if requested
      if (options.backup) {
        backupPath = await this.createBackup(plan);
        console.log(`✓ Backup created: ${backupPath}\n`);
      }

      // Remove created files
      for (const file of plan.filesCreated) {
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
            filesRemoved.push(file.path);
            console.log(`✓ Removed: ${path.basename(file.path)}`);
          }
        } catch (error) {
          const errMsg = `Failed to remove ${file.path}: ${error}`;
          errors.push(errMsg);
          ErrorService.capture(`✗ ${errMsg}`);
        }
      }

      console.log();

      // Restore modified files from git
      for (const file of plan.filesModified) {
        try {
          if (ROLLBACK_CONFIG.gitRequired) {
            execSync(`git checkout HEAD -- "${file.path}"`, { stdio: 'pipe' });
            filesRestored.push(file.path);
            console.log(`✓ Restored: ${path.basename(file.path)}`);
          }
        } catch (error) {
          const errMsg = `Failed to restore ${file.path}: ${error}`;
          errors.push(errMsg);
          ErrorService.capture(`✗ ${errMsg}`);
        }
      }

      console.log();

      const result: RollbackResult = {
        success: errors.length === 0,
        component: this.componentName,
        filesRemoved,
        filesRestored,
        backupPath,
        errors,
        warnings: plan.warnings
      };

      if (result.success) {
        console.log(`✅ Rollback completed successfully\n`);
        console.log(`Files removed: ${filesRemoved.length}`);
        console.log(`Files restored: ${filesRestored.length}\n`);
      } else {
        console.log(`⚠️  Rollback completed with errors\n`);
        errors.forEach(err => console.log(`  - ${err}`));
        console.log();
      }

      return {
        success: result.success,
        data: result,
        errors,
        warnings: plan.warnings,
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
   * Load session data for component
   */
  private async loadSessionData(): Promise<{ path: string; timestamp: string; content: string } | null> {
    const sessionDir = path.resolve(ROLLBACK_CONFIG.sessionDir);

    if (!fs.existsSync(sessionDir)) {
      return null;
    }

    const files = fs.readdirSync(sessionDir);
    const sessionFile = files.find(f =>
      f.toLowerCase().includes(this.componentName.toLowerCase()) &&
      f.endsWith('.md')
    );

    if (!sessionFile) {
      return null;
    }

    const sessionPath = path.join(sessionDir, sessionFile);
    const content = fs.readFileSync(sessionPath, 'utf-8');

    // Parse session file for metadata
    return {
      path: sessionPath,
      timestamp: this.extractTimestamp(sessionFile),
      content
    };
  }

  /**
   * Find files created by component generation
   */
  private async findCreatedFiles(): Promise<FileInfo[]> {
    const files: FileInfo[] = [];

    // Search in components directory
    const componentPaths = [
      path.join(ROLLBACK_CONFIG.componentsDir, `${this.componentName}.tsx`),
      path.join(ROLLBACK_CONFIG.componentsDir, `${this.componentName}.ts`),
      path.join(ROLLBACK_CONFIG.componentsDir, '__tests__', `${this.componentName}.test.tsx`),
      path.join(ROLLBACK_CONFIG.componentsDir, '__tests__', `${this.componentName}.test.ts`),
      path.join(ROLLBACK_CONFIG.componentsDir, 'types', `${this.componentName}.types.ts`),
      path.join(ROLLBACK_CONFIG.componentsDir, 'styles', `${this.componentName}.module.css`)
    ];

    // Search in features directory
    const featurePaths = this.findInDirectory(ROLLBACK_CONFIG.featuresDir, this.componentName);

    for (const filePath of [...componentPaths, ...featurePaths]) {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        files.push({
          path: filePath,
          type: this.determineFileType(filePath),
          size: stats.size,
          created: stats.birthtime
        });
      }
    }

    return files;
  }

  /**
   * Find files modified during component generation
   */
  private async findModifiedFiles(): Promise<FileInfo[]> {
    const files: FileInfo[] = [];

    // Check index files that typically get modified
    const indexPaths = [
      path.join(ROLLBACK_CONFIG.componentsDir, 'index.ts'),
      path.join(ROLLBACK_CONFIG.componentsDir, 'index.tsx')
    ];

    for (const indexPath of indexPaths) {
      if (fs.existsSync(indexPath)) {
        const content = fs.readFileSync(indexPath, 'utf-8');

        // Check if this file exports our component
        if (content.includes(this.componentName)) {
          const stats = fs.statSync(indexPath);
          files.push({
            path: indexPath,
            type: 'config',
            size: stats.size,
            created: stats.birthtime
          });
        }
      }
    }

    return files;
  }

  /**
   * Find dependencies on this component
   */
  private async findDependencies(): Promise<DependencyInfo[]> {
    const dependencies: DependencyInfo[] = [];

    try {
      // Search for imports of this component
      const searchDirs = ['src/components', 'src/features', 'src/app'];

      for (const dir of searchDirs) {
        if (!fs.existsSync(dir)) continue;

        const files = this.getAllTsxFiles(dir);

        for (const file of files) {
          // Skip the component's own files
          if (file.includes(this.componentName)) continue;

          const content = fs.readFileSync(file, 'utf-8');
          const importRegex = new RegExp(
            `import.*${this.componentName}.*from|from.*${this.componentName}`,
            'g'
          );

          const matches = content.match(importRegex);

          if (matches && matches.length > 0) {
            const componentName = path.basename(file, path.extname(file));
            dependencies.push({
              component: componentName,
              path: file,
              importType: this.detectImportType(content, this.componentName),
              usage: matches
            });
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not scan dependencies: ${error}`);
    }

    return dependencies;
  }

  /**
   * Create backup of component files
   */
  private async createBackup(plan: RollbackPlan): Promise<string> {
    const backupDir = path.resolve(ROLLBACK_CONFIG.backupDir);

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `${this.componentName}-${timestamp}`);

    fs.mkdirSync(backupPath, { recursive: true });

    // Copy all files to backup
    for (const file of plan.filesCreated) {
      if (fs.existsSync(file.path)) {
        const destPath = path.join(backupPath, path.basename(file.path));
        fs.copyFileSync(file.path, destPath);
      }
    }

    // Save plan metadata
    fs.writeFileSync(
      path.join(backupPath, 'rollback-plan.json'),
      JSON.stringify(plan, null, 2)
    );

    return backupPath;
  }

  /**
   * Simulate rollback (dry run)
   */
  private async simulateRollback(plan: RollbackPlan): Promise<CommandResult<RollbackResult>> {
    console.log('📋 Simulated actions:\n');

    const filesRemoved: string[] = [];
    const filesRestored: string[] = [];

    for (const file of plan.filesCreated) {
      console.log(`  [REMOVE] ${file.path}`);
      filesRemoved.push(file.path);
    }

    for (const file of plan.filesModified) {
      console.log(`  [RESTORE] ${file.path}`);
      filesRestored.push(file.path);
    }

    console.log('\n[DRY RUN COMPLETE] No actual changes made\n');

    return {
      success: true,
      data: {
        success: true,
        component: this.componentName,
        filesRemoved,
        filesRestored,
        errors: [],
        warnings: plan.warnings
      },
      errors: [],
      warnings: plan.warnings,
      timestamp: new Date()
    };
  }

  /**
   * Helper: Extract timestamp from filename
   */
  private extractTimestamp(filename: string): string {
    const match = filename.match(/\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : 'Unknown';
  }

  /**
   * Helper: Determine file type
   */
  private determineFileType(filePath: string): FileInfo['type'] {
    if (filePath.includes('test')) return 'test';
    if (filePath.includes('types')) return 'type';
    if (filePath.includes('styles') || filePath.endsWith('.css')) return 'style';
    if (filePath.includes('config')) return 'config';
    return 'component';
  }

  /**
   * Helper: Find files in directory recursively
   */
  private findInDirectory(dir: string, search: string): string[] {
    const results: string[] = [];

    if (!fs.existsSync(dir)) return results;

    const files = fs.readdirSync(dir);

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        results.push(...this.findInDirectory(fullPath, search));
      } else if (file.includes(search)) {
        results.push(fullPath);
      }
    }

    return results;
  }

  /**
   * Helper: Get all .tsx/.ts files recursively
   */
  private getAllTsxFiles(dir: string): string[] {
    const results: string[] = [];

    if (!fs.existsSync(dir)) return results;

    const files = fs.readdirSync(dir);

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        results.push(...this.getAllTsxFiles(fullPath));
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(fullPath);
      }
    }

    return results;
  }

  /**
   * Helper: Detect import type
   */
  private detectImportType(content: string, componentName: string): DependencyInfo['importType'] {
    if (new RegExp(`export.*${componentName}`).test(content)) return 're-export';
    if (new RegExp(`import\\s+${componentName}\\s+from`).test(content)) return 'default';
    return 'named';
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
DNA Rollback - Safe Component Rollback with Dependency Tracking

USAGE:
  npm run dna:rollback <ComponentName> [options]

OPTIONS:
  --force          Force rollback even with dependencies
  --plan-only      Generate rollback plan without executing
  --backup         Create backup before rollback
  --dry-run        Simulate rollback without making changes

EXAMPLES:
  npm run dna:rollback UserDashboard
  npm run dna:rollback AdminPanel --plan-only
  npm run dna:rollback MediaGallery --force --backup

See docs/cli/dna-rollback.md for full documentation
    `);
    process.exit(0);
  }

  const componentName = args[0] || '';
  const options: RollbackOptions = {
    componentName,
    force: args.includes('--force'),
    planOnly: args.includes('--plan-only'),
    backup: args.includes('--backup'),
    dryRun: args.includes('--dry-run')
  };

  const rollback = new DNARollback(componentName);

  if (options.planOnly) {
    const result = await rollback.generatePlan(options);
    process.exit(result.success ? 0 : 1);
  } else {
    const result = await rollback.execute(options);
    process.exit(result.success ? 0 : 1);
  }
}

if (require.main === module) {
  main().catch(error => {
    ErrorService.capture('DNA Rollback Error:', error);
    process.exit(1);
  });
}

export { DNARollback };
