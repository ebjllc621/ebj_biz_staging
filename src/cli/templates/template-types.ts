/**
 * ComponentBuilder Template Type Definitions
 *
 * @authority CLAUDE.md - Build Map v2.1 ENHANCED compliance
 * @version 3.0 - v5.0 Port with Corrected Tier Structure
 * @governance 100% dependency compliance required
 */

/**
 * Component Tier Classification
 * @see .cursor/rules/admin-build-map-v2.1.mdc for tier definitions
 */
export type ComponentTier = 'SIMPLE' | 'STANDARD' | 'ADVANCED' | 'ENTERPRISE';

/**
 * User Account Types (v5.0 Corrected Structure)
 * @governance Phase 0 approved tier structure
 */
export type UserAccountType = 'visitor' | 'general' | 'listing_member' | 'admin';

/**
 * Listing Tiers (v5.0 Corrected Structure)
 * @governance Phase 0 approved tier structure
 */
export type ListingTier = 'essentials' | 'plus' | 'preferred' | 'premium';

/**
 * Add-on Suites (v5.0 Corrected Structure)
 * @governance Phase 0 approved tier structure
 */
export type AddOnSuite = 'creator_suite' | 'realtor_suite' | 'restaurant_suite' | 'scribe_seo';

/**
 * OSI Security Layer Requirements
 * @authority .cursor/rules/osi-production-compliance.mdc
 */
export type OSILayer = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface OSIRequirements {
  layers: OSILayer[];
  zeroTrust?: boolean;
  multiFactorAuth?: boolean;
  anomalyDetection?: boolean;
}

/**
 * Component Complexity Metrics
 */
export interface ComplexityMetrics {
  estimatedLines: number;
  featureCount: number;
  dependencyCount: number;
  externalDependencies: number;
  internalModules: number;
  complexityScore: number;
}

/**
 * Template Selection Criteria
 */
export interface TemplateSelectionCriteria {
  componentName: string;
  features: string[];
  estimatedLines: number;
  complexity: number;
  forcedTier?: ComponentTier;
  requiresAuth?: boolean;
  requiresOSI?: OSIRequirements;
  userTier?: ListingTier | UserAccountType;
}

/**
 * Template Configuration
 */
export interface TemplateConfig {
  tier: ComponentTier;
  osiLayers: OSILayer[];
  maxDependencies: number;
  maxLines: number;
  governanceRules: number;
  circuitBreaker: boolean;
  errorBoundary: boolean;
  performanceMonitoring: boolean;
  auditLogging: boolean;
}

/**
 * Component Generation Options
 */
export interface ComponentGenerationOptions {
  componentName: string;
  tier: ComponentTier;
  features: string[];
  outputPath: string;
  includeTests?: boolean;
  includeDocs?: boolean;
  strictMode?: boolean;
}

/**
 * Template Data Structure
 */
export interface Template {
  tier: ComponentTier;
  config: TemplateConfig;
  generate: (options: ComponentGenerationOptions) => string;
  getTestTemplate?: (componentName: string) => string;
  getDocsTemplate?: (componentName: string) => string;
}

/**
 * Feature Detection Patterns
 */
export interface FeaturePattern {
  name: string;
  keywords: string[];
  complexity: number;
  requiredDependencies?: string[];
  suggestedTier?: ComponentTier;
}

/**
 * Dependency Analysis Result
 */
export interface DependencyAnalysis {
  isCompliant: boolean;
  externalCount: number;
  internalCount: number;
  violations: string[];
  recommendations: string[];
}

/**
 * Template Intelligence Metadata
 */
export interface TemplateIntelligence {
  successRate: number;
  usageCount: number;
  averageComplexity: number;
  commonPatterns: string[];
  knownIssues: string[];
  lastUpdated: string;
}

/**
 * Build Map Level Requirements
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 */
export interface BuildMapLevel {
  level: number;
  name: string;
  requirements: string[];
  enforced: boolean;
}

/**
 * Component Template Metadata
 */
export interface ComponentTemplateMetadata {
  version: string;
  tier: ComponentTier;
  lastUpdated: string;
  author: string;
  buildMapCompliance: BuildMapLevel[];
  osiCompliance: OSILayer[];
  dependencyLimit: number;
  lineLimit: number;
  testCoverage: number;
}

/**
 * Template Selector Response
 */
export interface TemplateSelectionResult {
  selectedTier: ComponentTier;
  template: Template;
  confidence: number;
  reasoning: string[];
  warnings: string[];
  recommendations: string[];
  metadata: ComponentTemplateMetadata;
}

/**
 * Governance Validation Result
 */
export interface GovernanceValidationResult {
  isValid: boolean;
  tier: ComponentTier;
  violations: Array<{
    rule: string;
    severity: 'ERROR' | 'WARNING' | 'INFO';
    message: string;
    suggestion?: string;
  }>;
  complianceScore: number;
  buildMapLevel: number;
  osiLayers: OSILayer[];
}

/**
 * Component Features Taxonomy
 */
export const FEATURE_TAXONOMY: Record<string, FeaturePattern> = {
  authentication: {
    name: 'Authentication',
    keywords: ['auth', 'login', 'session', 'security'],
    complexity: 3,
    requiredDependencies: ['@core/context/AuthContext'],
    suggestedTier: 'ADVANCED'
  },
  dataTable: {
    name: 'Data Table',
    keywords: ['table', 'grid', 'list', 'data'],
    complexity: 2,
    suggestedTier: 'STANDARD'
  },
  form: {
    name: 'Form',
    keywords: ['form', 'input', 'validation'],
    complexity: 2,
    suggestedTier: 'STANDARD'
  },
  dashboard: {
    name: 'Dashboard',
    keywords: ['dashboard', 'stats', 'analytics', 'metrics'],
    complexity: 3,
    suggestedTier: 'ADVANCED'
  },
  crud: {
    name: 'CRUD Operations',
    keywords: ['create', 'read', 'update', 'delete', 'crud'],
    complexity: 3,
    requiredDependencies: ['@core/services/DatabaseService'],
    suggestedTier: 'ADVANCED'
  },
  media: {
    name: 'Media Management',
    keywords: ['upload', 'image', 'video', 'media', 'file'],
    complexity: 3,
    requiredDependencies: ['@core/hooks/useUniversalMedia'],
    suggestedTier: 'ADVANCED'
  },
  realtime: {
    name: 'Real-time Updates',
    keywords: ['realtime', 'websocket', 'live', 'streaming'],
    complexity: 4,
    suggestedTier: 'ENTERPRISE'
  },
  reporting: {
    name: 'Reporting',
    keywords: ['report', 'export', 'pdf', 'csv'],
    complexity: 3,
    suggestedTier: 'ADVANCED'
  },
  notification: {
    name: 'Notifications',
    keywords: ['notification', 'alert', 'message', 'toast'],
    complexity: 1,
    suggestedTier: 'SIMPLE'
  },
  modal: {
    name: 'Modal Dialog',
    keywords: ['modal', 'dialog', 'popup'],
    complexity: 1,
    requiredDependencies: ['@components/common/BizModal'],
    suggestedTier: 'SIMPLE'
  }
};

/**
 * Tier Thresholds Configuration
 */
export const TIER_THRESHOLDS: Record<ComponentTier, TemplateConfig> = {
  SIMPLE: {
    tier: 'SIMPLE',
    osiLayers: [7, 6, 5],
    maxDependencies: 4,
    maxLines: 300,
    governanceRules: 45,
    circuitBreaker: false,
    errorBoundary: false,
    performanceMonitoring: false,
    auditLogging: true
  },
  STANDARD: {
    tier: 'STANDARD',
    osiLayers: [7, 6, 5, 4],
    maxDependencies: 6,
    maxLines: 800,
    governanceRules: 80,
    circuitBreaker: false,
    errorBoundary: true,
    performanceMonitoring: false,
    auditLogging: true
  },
  ADVANCED: {
    tier: 'ADVANCED',
    osiLayers: [7, 6, 5, 4, 3],
    maxDependencies: 8,
    maxLines: 1500,
    governanceRules: 125,
    circuitBreaker: true,
    errorBoundary: true,
    performanceMonitoring: true,
    auditLogging: true
  },
  ENTERPRISE: {
    tier: 'ENTERPRISE',
    osiLayers: [7, 6, 5, 4, 3, 2, 1],
    maxDependencies: 12,
    maxLines: Infinity,
    governanceRules: 165,
    circuitBreaker: true,
    errorBoundary: true,
    performanceMonitoring: true,
    auditLogging: true
  }
};
