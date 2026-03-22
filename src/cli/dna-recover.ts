#!/usr/bin/env node
/**
 * DNA Recovery Command - Session Recovery System
 *
 * @authority CLAUDE.md - Build Map v2.1 ENHANCED compliance
 * @version 1.0.0 - DNA Enhancement Commands
 * @governance Session continuity and recovery
 *
 * Purpose: Recover from interrupted DNA generation sessions
 */

import * as fs from 'fs';
import * as path from 'path';
import { ErrorService } from '@core/services/ErrorService';
import {
  Session,
  SessionPhase,
  SessionStatus,
  SessionArtifact,
  RecoveryOptions,
  RecoveryResult,
  CommandResult
} from './dna-types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const RECOVERY_CONFIG = {
  sessionDirs: {
    dna: '.claude/sessions/dna',
    plans: '.claude/sessions/dna/plans',
    builds: '.claude/sessions/componentbuilder/builds',
    enforcement: '.claude/sessions/k9-enforcement'
  },
  checkpointMarkers: {
    BRAIN: ['plan-generation-started', 'inventory-analysis-complete', 'tier-classification-complete'],
    EXECUTOR: ['component-generation-started', 'template-applied', 'tests-generated'],
    ENFORCER: ['k9-validation-started', 'governance-check-complete', 'compliance-verified']
  }
};

// ============================================================================
// RECOVERY ENGINE
// ============================================================================

class DNARecovery {
  /**
   * List all recoverable sessions
   */
  async listSessions(options: RecoveryOptions): Promise<CommandResult<Session[]>> {
    try {
      console.log(`\n🔧 DNA SESSION RECOVERY`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      const sessions = await this.findRecoverableSessions();

      if (sessions.length === 0) {
        console.log('No recoverable sessions found.\n');
        return {
          success: true,
          data: [],
          errors: [],
          warnings: [],
          timestamp: new Date()
        };
      }

      console.log(`Found ${sessions.length} recoverable session(s):\n`);

      sessions.forEach((session, idx) => {
        console.log(`${idx + 1}. Session: ${session.id}`);
        console.log(`   Component: ${session.component}`);
        console.log(`   Phase: ${session.phase} (${session.status})`);
        console.log(`   Last Checkpoint: ${session.lastCheckpoint}`);
        console.log(`   Artifacts: ${session.artifacts.length} file(s) generated`);
        console.log(`   Status: ${this.getStatusDisplay(session)}`);
        console.log();
      });

      console.log(`Recover session: npm run dna:recover <session-id>`);
      console.log(`View details: npm run dna:recover <session-id> --info\n`);

      return {
        success: true,
        data: sessions,
        errors: [],
        warnings: [],
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
   * Recover specific session
   */
  async recoverSession(sessionId: string, options: RecoveryOptions): Promise<CommandResult<RecoveryResult>> {
    try {
      console.log(`\n🔄 RECOVERING SESSION: ${sessionId}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      // Load session
      const session = await this.loadSession(sessionId);

      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      if (options.info) {
        this.displaySessionInfo(session);
        return {
          success: true,
          data: {
            success: true,
            session,
            resumedFrom: session.lastCheckpoint,
            completedSteps: [],
            errors: []
          },
          errors: [],
          warnings: [],
          timestamp: new Date()
        };
      }

      console.log(`Component: ${session.component}`);
      console.log(`Phase: ${session.phase}`);
      console.log(`Status: ${session.status}`);
      console.log(`Last Checkpoint: ${session.lastCheckpoint}\n`);

      // Validate session is recoverable
      const validation = this.validateRecovery(session);

      if (!validation.canRecover) {
        console.log(`❌ CANNOT RECOVER: ${validation.reason}\n`);

        if (validation.suggestions.length > 0) {
          console.log(`Suggestions:`);
          validation.suggestions.forEach(s => console.log(`  - ${s}`));
          console.log();
        }

        return {
          success: false,
          errors: [validation.reason],
          warnings: validation.suggestions,
          timestamp: new Date()
        };
      }

      // Execute recovery based on phase
      const completedSteps: string[] = [];
      const errors: string[] = [];

      console.log(`📋 Recovery Steps:\n`);

      switch (session.phase) {
        case 'BRAIN':
          await this.recoverBrainPhase(session, completedSteps, errors);
          break;
        case 'EXECUTOR':
          await this.recoverExecutorPhase(session, completedSteps, errors);
          break;
        case 'ENFORCER':
          await this.recoverEnforcerPhase(session, completedSteps, errors);
          break;
      }

      const result: RecoveryResult = {
        success: errors.length === 0,
        session,
        resumedFrom: session.lastCheckpoint,
        completedSteps,
        errors
      };

      if (result.success) {
        console.log(`\n✅ SESSION RECOVERED SUCCESSFULLY\n`);
        console.log(`Completed Steps: ${completedSteps.length}`);
        console.log(`Next: Continue with DNA workflow\n`);
      } else {
        console.log(`\n⚠️  PARTIAL RECOVERY\n`);
        console.log(`Completed: ${completedSteps.length} steps`);
        console.log(`Errors: ${errors.length}\n`);
        errors.forEach(err => console.log(`  - ${err}`));
        console.log();
      }

      return {
        success: result.success,
        data: result,
        errors,
        warnings: [],
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
   * Find all recoverable sessions
   */
  private async findRecoverableSessions(): Promise<Session[]> {
    const sessions: Session[] = [];

    // Scan DNA plan sessions
    const planSessions = await this.scanDirectory(
      RECOVERY_CONFIG.sessionDirs.plans,
      'BRAIN'
    );
    sessions.push(...planSessions);

    // Scan ComponentBuilder build sessions
    const buildSessions = await this.scanDirectory(
      RECOVERY_CONFIG.sessionDirs.builds,
      'EXECUTOR'
    );
    sessions.push(...buildSessions);

    // Scan K9 enforcement sessions
    const enforcementSessions = await this.scanDirectory(
      RECOVERY_CONFIG.sessionDirs.enforcement,
      'ENFORCER'
    );
    sessions.push(...enforcementSessions);

    // Filter only recoverable sessions
    return sessions.filter(s =>
      s.status === 'INTERRUPTED' ||
      s.status === 'INCOMPLETE' ||
      s.status === 'RECOVERABLE'
    );
  }

  /**
   * Scan directory for session files
   */
  private async scanDirectory(dirPath: string, phase: SessionPhase): Promise<Session[]> {
    const sessions: Session[] = [];

    if (!fs.existsSync(dirPath)) {
      return sessions;
    }

    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      if (!file.endsWith('.md') && !file.endsWith('.json')) continue;

      const filePath = path.join(dirPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Parse session metadata
      const session = this.parseSessionFile(filePath, content, phase);

      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  /**
   * Parse session file for metadata
   */
  private parseSessionFile(filePath: string, content: string, phase: SessionPhase): Session | null {
    try {
      const fileName = path.basename(filePath, path.extname(filePath));

      // Extract component name
      const componentMatch = fileName.match(/(?:build|plan)-(.+?)-\d{4}/);
      const component = (componentMatch && componentMatch[1]) ? componentMatch[1] : fileName;

      // Determine status based on content
      let status: SessionStatus = 'INCOMPLETE';

      if (content.includes('INTERRUPTED') || content.includes('interrupted')) {
        status = 'INTERRUPTED';
      } else if (content.includes('FAILED') || content.includes('failed')) {
        status = 'FAILED';
      } else if (this.hasCompleteCheckpoints(content, phase)) {
        status = 'RECOVERABLE';
      }

      // Find last checkpoint
      const lastCheckpoint = this.findLastCheckpoint(content, phase);

      // Find artifacts
      const artifacts = this.findArtifacts(content, phase);

      // Get timestamp
      const stats = fs.statSync(filePath);
      const timestamp = stats.mtime;

      // Check for errors
      const errorMatches = content.match(/error|exception|failed/gi) || [];

      return {
        id: fileName,
        component,
        timestamp,
        phase,
        status,
        lastCheckpoint,
        artifacts,
        planPath: phase === 'BRAIN' ? filePath : undefined,
        buildPath: phase === 'EXECUTOR' ? filePath : undefined,
        errors: errorMatches.slice(0, 5) // Limit to 5 error excerpts
      };
    } catch (error) {
      console.warn(`Warning: Could not parse session file ${filePath}: ${error}`);
      return null;
    }
  }

  /**
   * Check if session has complete checkpoints
   */
  private hasCompleteCheckpoints(content: string, phase: SessionPhase): boolean {
    const checkpoints = RECOVERY_CONFIG.checkpointMarkers[phase];
    const foundCheckpoints = checkpoints.filter(cp =>
      content.toLowerCase().includes(cp.toLowerCase())
    );

    return foundCheckpoints.length >= Math.floor(checkpoints.length / 2);
  }

  /**
   * Find last checkpoint in session
   */
  private findLastCheckpoint(content: string, phase: SessionPhase): string {
    const checkpoints = RECOVERY_CONFIG.checkpointMarkers[phase];

    for (let i = checkpoints.length - 1; i >= 0; i--) {
      const checkpoint = checkpoints[i];
      if (checkpoint && content.toLowerCase().includes(checkpoint.toLowerCase())) {
        return checkpoint;
      }
    }

    return 'Session started';
  }

  /**
   * Find artifacts in session
   */
  private findArtifacts(content: string, phase: SessionPhase): SessionArtifact[] {
    const artifacts: SessionArtifact[] = [];

    // Look for file references in content
    const fileMatches = content.match(/\b[\w-]+\.(tsx?|md|json)\b/gi) || [];

    const uniqueFiles = [...new Set(fileMatches)];

    for (const file of uniqueFiles) {
      artifacts.push({
        path: file,
        type: this.determineArtifactType(file, phase),
        status: 'complete',
        size: 0
      });
    }

    return artifacts;
  }

  /**
   * Determine artifact type
   */
  private determineArtifactType(fileName: string, phase: SessionPhase): SessionArtifact['type'] {
    if (phase === 'BRAIN' || fileName.includes('plan')) return 'plan';
    if (fileName.includes('test')) return 'test';
    if (fileName.endsWith('.md')) return 'documentation';
    return 'component';
  }

  /**
   * Load specific session
   */
  private async loadSession(sessionId: string): Promise<Session | null> {
    const sessions = await this.findRecoverableSessions();
    return sessions.find(s => s.id === sessionId) || null;
  }

  /**
   * Validate if session can be recovered
   */
  private validateRecovery(session: Session): {
    canRecover: boolean;
    reason: string;
    suggestions: string[];
  } {
    if (session.status === 'FAILED' && session.errors.length > 5) {
      return {
        canRecover: false,
        reason: 'Session has too many errors to recover automatically',
        suggestions: [
          'Review error logs to identify root cause',
          'Consider starting fresh generation with: npm run dna ' + session.component,
          'Check governance compliance before retrying'
        ]
      };
    }

    if (session.artifacts.length === 0) {
      return {
        canRecover: false,
        reason: 'No artifacts found - session may not have started properly',
        suggestions: [
          'Start new generation session',
          'Check session file integrity'
        ]
      };
    }

    return {
      canRecover: true,
      reason: 'Session is recoverable',
      suggestions: []
    };
  }

  /**
   * Recover BRAIN phase
   */
  private async recoverBrainPhase(
    session: Session,
    completedSteps: string[],
    errors: string[]
  ): Promise<void> {
    console.log(`1. ⏭️  Resuming plan generation from: ${session.lastCheckpoint}`);

    if (session.planPath && fs.existsSync(session.planPath)) {
      console.log(`   ✓ Found existing plan file`);
      completedSteps.push('Plan file located');
    } else {
      console.log(`   ⚠️  Plan file not found - may need regeneration`);
      errors.push('Plan file missing');
    }

    console.log(`2. 🔄 Next: Resume DNA workflow with ComponentBuilder`);
    console.log(`   Command: Resume with existing plan or regenerate\n`);
  }

  /**
   * Recover EXECUTOR phase
   */
  private async recoverExecutorPhase(
    session: Session,
    completedSteps: string[],
    errors: string[]
  ): Promise<void> {
    console.log(`1. ⏭️  Resuming component generation from: ${session.lastCheckpoint}`);

    if (session.buildPath && fs.existsSync(session.buildPath)) {
      console.log(`   ✓ Found existing build session`);
      completedSteps.push('Build session located');

      // Check for generated artifacts
      const artifactCount = session.artifacts.filter(a => a.status === 'complete').length;
      console.log(`   ✓ Found ${artifactCount} completed artifact(s)`);
      completedSteps.push(`${artifactCount} artifacts verified`);
    } else {
      console.log(`   ⚠️  Build session file not found`);
      errors.push('Build session missing');
    }

    console.log(`2. 🔄 Next: Continue with K9 enforcement validation`);
    console.log(`   Command: Proceed to governance validation\n`);
  }

  /**
   * Recover ENFORCER phase
   */
  private async recoverEnforcerPhase(
    session: Session,
    completedSteps: string[],
    errors: string[]
  ): Promise<void> {
    console.log(`1. ⏭️  Resuming K9 validation from: ${session.lastCheckpoint}`);

    if (session.lastCheckpoint.includes('governance-check-complete')) {
      console.log(`   ✓ Governance checks completed`);
      completedSteps.push('Governance validated');
    } else {
      console.log(`   🔄 Need to rerun governance checks`);
    }

    console.log(`2. 🔄 Next: Complete final compliance verification`);
    console.log(`   Command: Run final K9 enforcement check\n`);
  }

  /**
   * Display detailed session information
   */
  private displaySessionInfo(session: Session): void {
    console.log(`\n📋 SESSION DETAILS`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    console.log(`Session ID: ${session.id}`);
    console.log(`Component: ${session.component}`);
    console.log(`Phase: ${session.phase}`);
    console.log(`Status: ${session.status}`);
    console.log(`Timestamp: ${session.timestamp.toISOString()}`);
    console.log(`Last Checkpoint: ${session.lastCheckpoint}\n`);

    console.log(`Artifacts (${session.artifacts.length}):`);
    session.artifacts.forEach(a => {
      console.log(`  - ${a.path} (${a.type}, ${a.status})`);
    });
    console.log();

    if (session.errors.length > 0) {
      console.log(`Errors (${session.errors.length}):`);
      session.errors.slice(0, 5).forEach(e => {
        console.log(`  - ${e}`);
      });
      console.log();
    }

    if (session.planPath) {
      console.log(`Plan Path: ${session.planPath}`);
    }
    if (session.buildPath) {
      console.log(`Build Path: ${session.buildPath}`);
    }
    console.log();
  }

  /**
   * Get status display text
   */
  private getStatusDisplay(session: Session): string {
    switch (session.status) {
      case 'RECOVERABLE':
        return 'RECOVERABLE';
      case 'INTERRUPTED':
        return 'INTERRUPTED';
      case 'FAILED':
        return 'REQUIRES MANUAL FIX';
      case 'INCOMPLETE':
        return 'INCOMPLETE';
      default:
        return session.status;
    }
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    console.log(`
DNA Recovery - Session Recovery System

USAGE:
  npm run dna:recover [<session-id>] [options]

OPTIONS:
  --list           List all recoverable sessions
  --info           Show detailed session information
  --auto-fix       Attempt automatic fixes

EXAMPLES:
  npm run dna:recover --list
  npm run dna:recover dna-UserDashboard-2025-12-03 --info
  npm run dna:recover dna-MediaGallery-2025-12-03 --auto-fix

See docs/cli/dna-recover.md for full documentation
    `);
    process.exit(0);
  }

  const recovery = new DNARecovery();

  if (args.includes('--list') || args.length === 0) {
    const result = await recovery.listSessions({ list: true });
    process.exit(result.success ? 0 : 1);
  } else {
    const sessionId = args[0] || '';
    const options: RecoveryOptions = {
      sessionId,
      info: args.includes('--info'),
      autoFix: args.includes('--auto-fix')
    };

    const result = await recovery.recoverSession(sessionId, options);
    process.exit(result.success ? 0 : 1);
  }
}

if (require.main === module) {
  main().catch(error => {
    ErrorService.capture('DNA Recovery Error:', error);
    process.exit(1);
  });
}

export { DNARecovery };
