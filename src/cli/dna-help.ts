/**
 * DNA CLI Enhanced Help System
 *
 * @authority CLAUDE.md - Build Map v2.1 ENHANCED compliance
 * @version 1.0.0 - DNA Enhancement Commands
 * @governance Comprehensive CLI documentation
 */

export class DNAHelp {
  /**
   * Display main DNA help
   */
  static showMainHelp(): void {
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                 DNA Command - Enhanced BrainTool Method                   ║
╚═══════════════════════════════════════════════════════════════════════════╝

GENERATION COMMANDS:
  npm run dna <ComponentName> [features...] [options]
    Generate component with automatic tier classification

  npm run dna:inventory
    Refresh dependency and database inventories (required before builds)

AUDIT & VALIDATION:
  npm run dna:audit <ComponentPath> [options]
    Audit component for governance compliance before K9 validation

  npm run dna:audit <ComponentPath> --fix
    Auto-fix minor governance violations

ROLLBACK & RECOVERY:
  npm run dna:rollback <ComponentName> [options]
    Safely rollback generated component with dependency tracking

  npm run dna:rollback <ComponentName> --force
    Force rollback even with dependencies

  npm run dna:recover [<SessionId>] [options]
    Recover from interrupted DNA generation sessions

  npm run dna:recover --list
    List all recoverable sessions

EVIDENCE & PROOF:
  npm run dna:evidence <ComponentPath> [options]
    Generate proof-of-functionality evidence

  npm run dna:evidence <ComponentPath> --e2e
    Include E2E test evidence

PLANNING & STATUS:
  npm run dna:next-phase
    Advance to next implementation phase

  npm run dna:phase-status
    Show current phase status and progress

HELP:
  npm run dna:help
    Show this help message

  npm run dna:audit --help
    Show audit command help

  npm run dna:rollback --help
    Show rollback command help

  npm run dna:recover --help
    Show recovery command help

  npm run dna:evidence --help
    Show evidence command help

═══════════════════════════════════════════════════════════════════════════

GENERATION MODES:

  --mode=PRODUCTION (default)
    Strict governance, real agents, production-ready

  --mode=DEVELOPMENT
    Relaxed governance, mock agents, rapid iteration

  --mode=TESTING
    Test mode with mocks

AGENT MODES:

  (default)
    Mock agents for fast development

  --real-agents
    Real agent API integration for production

COMPONENT OPTIONS:

  --tier=<SIMPLE|STANDARD|ADVANCED|ENTERPRISE>
    Force specific tier classification

  --strict
    Enable strict governance mode

  --phased
    Generate master plan + phase-by-phase execution

  --remediation
    Use only canonical implementations (consolidation mode)

═══════════════════════════════════════════════════════════════════════════

EXAMPLES:

  Basic component generation:
    npm run dna SimpleButton

  Component with features:
    npm run dna UserDashboard stats charts --real-agents

  Production component with strict governance:
    npm run dna AdminManager table auth --real-agents --strict

  Force specific tier:
    npm run dna ComplexForm --tier=ADVANCED

  Audit component before deployment:
    npm run dna:audit src/components/UserDashboard.tsx

  Auto-fix governance violations:
    npm run dna:audit src/components/AdminPanel.tsx --fix

  Rollback component safely:
    npm run dna:rollback TestComponent

  Force rollback with dependencies:
    npm run dna:rollback TestComponent --force --backup

  List recoverable sessions:
    npm run dna:recover --list

  Recover specific session:
    npm run dna:recover dna-UserDashboard-2025-12-03

  Generate functionality evidence:
    npm run dna:evidence src/components/UserDashboard.tsx

  Evidence with E2E tests:
    npm run dna:evidence src/components/AdminPanel.tsx --e2e --api-trace

═══════════════════════════════════════════════════════════════════════════

WORKFLOW:

  1. INVENTORY PROOF (Phase 0 - Required)
     npm run dna:inventory
     └─ Generates dependency and database inventories

  2. COMPONENT GENERATION (Phase A - DNA Brain)
     npm run dna ComponentName [features...]
     └─ Analyzes requirements and generates execution plan

  3. BUILD EXECUTION (Phase B - ComponentBuilder)
     Automatic handoff from DNA to ComponentBuilder
     └─ Generates component code following templates

  4. GOVERNANCE VALIDATION (Phase C - K9 Enforcer)
     Automatic K9 enforcement validation
     └─ Ensures 100% governance compliance

  5. AUDIT & EVIDENCE (Optional - Quality Assurance)
     npm run dna:audit <component>
     npm run dna:evidence <component>
     └─ Pre-deployment validation and proof generation

═══════════════════════════════════════════════════════════════════════════

DOCUMENTATION:

  Full documentation: docs/cli/dna-command.md
  Audit guide: docs/cli/dna-audit.md
  Rollback guide: docs/cli/dna-rollback.md
  Recovery guide: docs/cli/dna-recover.md
  Evidence guide: docs/cli/dna-evidence.md

═══════════════════════════════════════════════════════════════════════════

For command-specific help, use --help flag:
  npm run dna:audit --help
  npm run dna:rollback --help
  npm run dna:recover --help
  npm run dna:evidence --help

    `);
  }

  /**
   * Display audit command help
   */
  static showAuditHelp(): void {
    console.log(`
DNA Audit - Governance Compliance Auditor

PURPOSE:
  Audit generated components for governance compliance before K9 validation.
  Checks import paths, database boundaries, authentication, media management,
  service architecture, TypeScript compliance, and OSI layer requirements.

USAGE:
  npm run dna:audit <ComponentPath> [options]

OPTIONS:
  --fix              Auto-fix minor violations (import paths, formatting)
  --strict           Strict mode (treat warnings as errors)
  --output=<path>    Save report to specific path
  --format=<type>    Output format: console (default), json, markdown

EXAMPLES:
  Basic audit:
    npm run dna:audit src/components/UserDashboard.tsx

  Auto-fix violations:
    npm run dna:audit src/components/AdminPanel.tsx --fix

  Strict mode audit:
    npm run dna:audit src/components/MediaGallery.tsx --strict

  Save JSON report:
    npm run dna:audit src/components/ComplexForm.tsx --format=json

AUDIT CATEGORIES:
  ✓ Import Path Compliance      - @core/, @features/, @components/ usage
  ✓ Database Boundary            - DatabaseService usage (no direct mysql2)
  ✓ Authentication Patterns      - httpOnly cookies (no localStorage)
  ✓ Media Management             - Universal Media Manager compliance
  ✓ Service Architecture         - Service layer patterns (no BaseService)
  ✓ TypeScript Compliance        - Strict mode, no any/ts-ignore
  ✓ OSI Layer Requirements       - Security patterns based on tier

SCORING:
  90-100: Excellent - Ready for K9 validation
  70-89:  Good - Minor improvements recommended
  50-69:  Fair - Multiple violations need attention
  0-49:   Poor - Significant rework required

OUTPUT:
  Console display with:
    - Governance score (0-100)
    - Passed checks by category
    - Warnings with recommendations
    - Violations with fix suggestions
    - Overall recommendations

  Saved report includes:
    - Full violation details with line numbers
    - Code context for each issue
    - Automated fix suggestions
    - Compliance history

See docs/cli/dna-audit.md for full documentation
    `);
  }

  /**
   * Display rollback command help
   */
  static showRollbackHelp(): void {
    console.log(`
DNA Rollback - Safe Component Rollback with Dependency Tracking

PURPOSE:
  Safely rollback generated components with comprehensive dependency analysis.
  Prevents orphaned imports and ensures clean repository state.

USAGE:
  npm run dna:rollback <ComponentName> [options]

OPTIONS:
  --force          Force rollback even with dependencies
  --plan-only      Generate rollback plan without executing
  --backup         Create backup before rollback
  --dry-run        Simulate rollback without making changes

EXAMPLES:
  Basic rollback:
    npm run dna:rollback UserDashboard

  Plan-only mode:
    npm run dna:rollback AdminPanel --plan-only

  Force with backup:
    npm run dna:rollback MediaGallery --force --backup

  Dry run:
    npm run dna:rollback ComplexForm --dry-run

ROLLBACK PLAN INCLUDES:
  📁 Files to Remove
     - Component files (.tsx, .ts)
     - Test files
     - Type definitions
     - Style files

  📝 Files to Restore
     - Index exports
     - Modified imports
     - Configuration files

  ⚠️  Dependencies
     - Components importing this one
     - Usage locations
     - Import types (named, default, re-export)

SAFETY CHECKS:
  ✓ Dependency scanning across codebase
  ✓ Import usage detection
  ✓ Safe-to-rollback determination
  ✓ Backup creation (optional)
  ✓ Git restoration of modified files

WORKFLOW:
  1. Scans for all files created during generation
  2. Identifies modified files (index.ts, exports)
  3. Searches codebase for dependencies
  4. Determines rollback safety
  5. Creates backup if requested
  6. Removes created files
  7. Restores modified files from git

WARNINGS:
  - Unsafe rollback blocked without --force
  - Dependencies must be removed first
  - Git required for file restoration
  - Backup recommended for force rollback

See docs/cli/dna-rollback.md for full documentation
    `);
  }

  /**
   * Display recovery command help
   */
  static showRecoveryHelp(): void {
    console.log(`
DNA Recovery - Session Recovery System

PURPOSE:
  Recover from interrupted DNA generation sessions. Resumes work from last
  checkpoint across BRAIN, EXECUTOR, and ENFORCER phases.

USAGE:
  npm run dna:recover [<session-id>] [options]

OPTIONS:
  --list           List all recoverable sessions
  --info           Show detailed session information
  --auto-fix       Attempt automatic fixes

EXAMPLES:
  List sessions:
    npm run dna:recover --list

  Recover session:
    npm run dna:recover dna-UserDashboard-2025-12-03

  View details:
    npm run dna:recover dna-MediaGallery-2025-12-03 --info

  Auto-fix issues:
    npm run dna:recover dna-ComplexForm-2025-12-03 --auto-fix

SESSION PHASES:

  BRAIN (DNA Planning)
    Checkpoints:
      - plan-generation-started
      - inventory-analysis-complete
      - tier-classification-complete
    Recovery: Resume plan generation from last checkpoint

  EXECUTOR (ComponentBuilder)
    Checkpoints:
      - component-generation-started
      - template-applied
      - tests-generated
    Recovery: Continue component generation

  ENFORCER (K9 Validation)
    Checkpoints:
      - k9-validation-started
      - governance-check-complete
      - compliance-verified
    Recovery: Resume governance validation

SESSION STATUS:
  RECOVERABLE    - Ready to resume (50%+ checkpoints complete)
  INTERRUPTED    - Mid-execution interruption
  INCOMPLETE     - Missing required steps
  FAILED         - Requires manual intervention

RECOVERY VALIDATION:
  ✓ Session integrity check
  ✓ Artifact verification
  ✓ Error analysis
  ✓ Checkpoint validation
  ✓ Recovery feasibility

SESSION LOCATIONS:
  - DNA Plans: .claude/sessions/dna/plans/
  - Builds: .claude/sessions/componentbuilder/builds/
  - Enforcement: .claude/sessions/k9-enforcement/

See docs/cli/dna-recover.md for full documentation
    `);
  }

  /**
   * Display evidence command help
   */
  static showEvidenceHelp(): void {
    console.log(`
DNA Evidence - Proof of Functionality Generator

PURPOSE:
  Generate comprehensive proof-of-functionality evidence for anti-synthetic
  enforcement. Verifies components actually work, not just claim to work.

USAGE:
  npm run dna:evidence <ComponentPath> [options]

OPTIONS:
  --e2e               Include E2E test evidence
  --screenshots       Generate component screenshots
  --api-trace         Include API call tracing
  --output=<path>     Save report to specific path

EXAMPLES:
  Basic evidence:
    npm run dna:evidence src/components/UserDashboard.tsx

  Full evidence with E2E:
    npm run dna:evidence src/components/AdminPanel.tsx --e2e

  Complete proof package:
    npm run dna:evidence src/components/MediaGallery.tsx --screenshots --api-trace

EVIDENCE CATEGORIES:

  ✅ Functionality Verification
     - Claimed functionality detection
     - Code evidence extraction
     - Real implementation proof
     - Missing functionality identification

  ✅ Test Evidence
     - Test execution results
     - Code coverage metrics
     - Performance benchmarks
     - Test suite analysis

  ✅ Integration Verification
     - API endpoint testing
     - Database operation verification
     - Service integration proof
     - External dependency validation

  ✅ Operational Proof
     - Component renders successfully
     - User interactions work
     - Data persistence verified
     - Input validation operational
     - Error handling functional
     - Performance optimized

  ✅ Anti-Synthetic Compliance
     - No fake status displays
     - No hardcoded success claims
     - Real functionality proven
     - Synthetic pattern detection

SCORING:
  90-100: Excellent - Production ready, all functionality proven
  70-89:  Good - Minor gaps, mostly functional
  50-69:  Fair - Significant missing functionality
  0-49:   Poor - Synthetic implementation detected

ARTIFACTS GENERATED:
  📸 Component render screenshots
  📋 Test execution logs
  📊 API call traces
  💾 Database query logs
  📝 Evidence summary report

ANTI-SYNTHETIC DETECTION:
  ❌ Status displays without real functionality
  ❌ Hardcoded success without operations
  ❌ Progress claims without actual work
  ❌ "OPERATIONAL" labels with no backend
  ✅ Real functionality with code proof
  ✅ Working operations with test evidence
  ✅ Verified integrations with traces

See docs/cli/dna-evidence.md for full documentation
    `);
  }

  /**
   * Show quick reference
   */
  static showQuickReference(): void {
    console.log(`
DNA Quick Reference Card

GENERATE:     npm run dna <ComponentName> [features...]
INVENTORY:    npm run dna:inventory
AUDIT:        npm run dna:audit <path>
ROLLBACK:     npm run dna:rollback <ComponentName>
RECOVER:      npm run dna:recover --list
EVIDENCE:     npm run dna:evidence <path>

Full help:    npm run dna:help
    `);
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('audit')) {
    DNAHelp.showAuditHelp();
  } else if (args.includes('rollback')) {
    DNAHelp.showRollbackHelp();
  } else if (args.includes('recover') || args.includes('recovery')) {
    DNAHelp.showRecoveryHelp();
  } else if (args.includes('evidence')) {
    DNAHelp.showEvidenceHelp();
  } else if (args.includes('quick') || args.includes('ref')) {
    DNAHelp.showQuickReference();
  } else {
    DNAHelp.showMainHelp();
  }
}

export default DNAHelp;
