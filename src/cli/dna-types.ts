/**
 * DNA Command Enhancement Types
 *
 * @authority CLAUDE.md - Build Map v2.1 ENHANCED compliance
 * @version 1.0.0 - DNA Enhancement Commands
 * @governance 100% dependency compliance required
 */

import { ComponentTier, OSILayer } from './templates/template-types';

// ============================================================================
// AUDIT TYPES
// ============================================================================

export interface AuditViolation {
  rule: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  message: string;
  file: string;
  line?: number;
  suggestion?: string;
}

export interface AuditWarning {
  category: string;
  message: string;
  file?: string;
  recommendation?: string;
}

export interface AuditReport {
  component: string;
  timestamp: Date;
  tier: ComponentTier;
  violations: AuditViolation[];
  warnings: AuditWarning[];
  score: number; // 0-100
  recommendations: string[];
  checks: {
    passed: number;
    failed: number;
    warnings: number;
    total: number;
  };
  categories: {
    importPaths: AuditCategoryResult;
    databaseBoundary: AuditCategoryResult;
    authentication: AuditCategoryResult;
    mediaManagement: AuditCategoryResult;
    serviceArchitecture: AuditCategoryResult;
    typeScript: AuditCategoryResult;
    osiCompliance: AuditCategoryResult;
  };
}

export interface AuditCategoryResult {
  passed: boolean;
  score: number;
  checks: number;
  violations: AuditViolation[];
  warnings: AuditWarning[];
}

export interface AuditOptions {
  componentPath: string;
  fix?: boolean;
  strict?: boolean;
  outputFormat?: 'console' | 'json' | 'markdown';
  outputPath?: string;
}

// ============================================================================
// ROLLBACK TYPES
// ============================================================================

export interface RollbackPlan {
  component: string;
  timestamp: Date;
  filesCreated: FileInfo[];
  filesModified: FileInfo[];
  dependencies: DependencyInfo[];
  safeToRollback: boolean;
  warnings: string[];
  estimatedImpact: {
    filesAffected: number;
    componentsAffected: number;
    testsAffected: number;
  };
}

export interface FileInfo {
  path: string;
  type: 'component' | 'test' | 'type' | 'style' | 'config';
  size: number;
  created: Date;
  hash?: string;
}

export interface DependencyInfo {
  component: string;
  path: string;
  importType: 'named' | 'default' | 're-export';
  usage: string[];
}

export interface RollbackOptions {
  componentName: string;
  force?: boolean;
  planOnly?: boolean;
  backup?: boolean;
  dryRun?: boolean;
}

export interface RollbackResult {
  success: boolean;
  component: string;
  filesRemoved: string[];
  filesRestored: string[];
  backupPath?: string;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// RECOVERY TYPES
// ============================================================================

export type SessionPhase = 'BRAIN' | 'EXECUTOR' | 'ENFORCER';
export type SessionStatus = 'INTERRUPTED' | 'FAILED' | 'INCOMPLETE' | 'RECOVERABLE';

export interface Session {
  id: string;
  component: string;
  timestamp: Date;
  phase: SessionPhase;
  status: SessionStatus;
  lastCheckpoint: string;
  artifacts: SessionArtifact[];
  planPath?: string;
  buildPath?: string;
  errors: string[];
}

export interface SessionArtifact {
  path: string;
  type: 'plan' | 'component' | 'test' | 'documentation';
  status: 'complete' | 'partial' | 'missing';
  size: number;
}

export interface RecoveryOptions {
  sessionId?: string;
  list?: boolean;
  info?: boolean;
  autoFix?: boolean;
}

export interface RecoveryResult {
  success: boolean;
  session: Session;
  resumedFrom: string;
  completedSteps: string[];
  errors: string[];
}

// ============================================================================
// EVIDENCE TYPES
// ============================================================================

export interface EvidenceReport {
  component: string;
  tier: ComponentTier;
  timestamp: Date;
  functionality: FunctionalityEvidence;
  tests: TestEvidence;
  integrations: IntegrationEvidence;
  operationalProof: OperationalProof;
  artifacts: EvidenceArtifact[];
  antiSyntheticCompliance: AntiSyntheticCompliance;
  overallScore: number; // 0-100
}

export interface FunctionalityEvidence {
  claimed: string[];
  proven: string[];
  missing: string[];
  verificationMethod: string;
  codeEvidence: CodeEvidence[];
}

export interface CodeEvidence {
  feature: string;
  file: string;
  lines: string;
  snippet: string;
  verified: boolean;
}

export interface TestEvidence {
  passing: number;
  failing: number;
  skipped: number;
  total: number;
  coverage: number;
  duration: number;
  suites: TestSuite[];
}

export interface TestSuite {
  name: string;
  file: string;
  tests: number;
  passed: number;
  failed: number;
  duration: number;
}

export interface IntegrationEvidence {
  api: ApiIntegrationEvidence[];
  database: DatabaseIntegrationEvidence[];
  services: ServiceIntegrationEvidence[];
}

export interface ApiIntegrationEvidence {
  endpoint: string;
  method: string;
  tested: boolean;
  responseTime: number;
  statusCode: number;
  verified: boolean;
}

export interface DatabaseIntegrationEvidence {
  query: string;
  table: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  tested: boolean;
  verified: boolean;
}

export interface ServiceIntegrationEvidence {
  service: string;
  method: string;
  tested: boolean;
  verified: boolean;
}

export interface OperationalProof {
  renders: boolean;
  interacts: boolean;
  persists: boolean;
  validates: boolean;
  errorHandling: boolean;
  performance: boolean;
  evidence: OperationalEvidence[];
}

export interface OperationalEvidence {
  check: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  evidence: string;
  timestamp: Date;
}

export interface EvidenceArtifact {
  type: 'screenshot' | 'log' | 'trace' | 'report';
  path: string;
  description: string;
  size: number;
}

export interface AntiSyntheticCompliance {
  verified: boolean;
  syntheticPatternsDetected: string[];
  realFunctionalityProven: string[];
  complianceScore: number;
}

export interface EvidenceOptions {
  componentPath: string;
  e2e?: boolean;
  screenshots?: boolean;
  apiTrace?: boolean;
  outputPath?: string;
}

// ============================================================================
// INVENTORY TYPES
// ============================================================================

export interface InventoryData {
  dependencies: DependencyInventory;
  database: DatabaseInventory;
  valid: boolean;
  timestamp: Date;
}

export interface DependencyInventory {
  diCandidates: Record<string, unknown>;
  totalImplementations: number;
  categories: string[];
}

export interface DatabaseInventory {
  schema: string;
  tables: TableInfo[];
  totalRows: number;
}

export interface TableInfo {
  name: string;
  rows: number;
  columns: string[];
}

// ============================================================================
// SESSION TRACKING TYPES
// ============================================================================

export interface SessionMetadata {
  sessionId: string;
  componentName: string;
  phase: SessionPhase;
  status: SessionStatus;
  startTime: Date;
  endTime?: Date;
  checkpoints: Checkpoint[];
}

export interface Checkpoint {
  id: string;
  phase: SessionPhase;
  description: string;
  timestamp: Date;
  artifacts: string[];
}

// ============================================================================
// COMMON RESULT TYPES
// ============================================================================

export interface CommandResult<T> {
  success: boolean;
  data?: T;
  errors: string[];
  warnings: string[];
  timestamp: Date;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// CLI OUTPUT FORMATTING
// ============================================================================

export interface FormattedOutput {
  header: string;
  sections: OutputSection[];
  footer?: string;
}

export interface OutputSection {
  title: string;
  icon: string;
  content: string[];
  color?: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
}
