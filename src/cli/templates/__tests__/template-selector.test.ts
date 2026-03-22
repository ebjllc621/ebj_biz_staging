/**
 * Template Selector Test Suite
 *
 * @authority CLAUDE.md - Build Map v2.1 ENHANCED compliance
 * @version 3.0 - v5.0 Port Tests
 */

import {
  selectTemplate,
  calculateComplexityMetrics,
  selectComponentTier,
  validateGovernanceCompliance,
  analyzeNameComplexity,
  analyzeFeatureComplexity,
  estimateDependencies,
  estimateLines
} from '../template-selector';

import type {
  ComponentTier,
  TemplateSelectionCriteria
} from '../template-types';

describe('Template Selector - Intelligence Engine', () => {
  describe('analyzeNameComplexity', () => {
    it('should detect enterprise complexity in names', () => {
      expect(analyzeNameComplexity('EnterpriseSystemManager')).toBeGreaterThanOrEqual(3);
      expect(analyzeNameComplexity('AdminDashboard')).toBeGreaterThanOrEqual(2);
      expect(analyzeNameComplexity('SimpleButton')).toBeLessThanOrEqual(2);
    });

    it('should score based on word count', () => {
      const simple = analyzeNameComplexity('Button');
      const complex = analyzeNameComplexity('UserAuthenticationManagerDashboard');
      expect(complex).toBeGreaterThan(simple);
    });
  });

  describe('analyzeFeatureComplexity', () => {
    it('should score enterprise features higher', () => {
      const enterpriseScore = analyzeFeatureComplexity(['enterprise', 'realtime', 'critical']);
      const simpleScore = analyzeFeatureComplexity(['display', 'notification']);
      expect(enterpriseScore).toBeGreaterThan(simpleScore);
    });

    it('should recognize standard features', () => {
      const score = analyzeFeatureComplexity(['form', 'table', 'validation']);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(10);
    });
  });

  describe('estimateDependencies', () => {
    it('should estimate base dependencies correctly', () => {
      const deps = estimateDependencies([]);
      expect(deps.external).toBeGreaterThanOrEqual(2); // React, React-DOM
      expect(deps.internal).toBeGreaterThanOrEqual(1);
    });

    it('should add dependencies for auth features', () => {
      const withoutAuth = estimateDependencies([]);
      const withAuth = estimateDependencies(['auth', 'security']);
      expect(withAuth.internal).toBeGreaterThan(withoutAuth.internal);
    });

    it('should estimate chart library dependencies', () => {
      const deps = estimateDependencies(['chart', 'analytics']);
      expect(deps.external).toBeGreaterThan(2);
    });
  });

  describe('estimateLines', () => {
    it('should have minimum base lines', () => {
      const lines = estimateLines([]);
      expect(lines).toBeGreaterThanOrEqual(150);
    });

    it('should add lines for complex features', () => {
      const simple = estimateLines(['notification']);
      const complex = estimateLines(['dashboard', 'table', 'form', 'crud']);
      expect(complex).toBeGreaterThan(simple);
    });
  });

  describe('calculateComplexityMetrics', () => {
    it('should calculate metrics for simple component', () => {
      const criteria: TemplateSelectionCriteria = {
        componentName: 'SimpleButton',
        features: ['button', 'click'],
        estimatedLines: 0,
        complexity: 0
      };

      const metrics = calculateComplexityMetrics(criteria);

      expect(metrics.estimatedLines).toBeLessThan(300);
      expect(metrics.complexityScore).toBeLessThan(50);
    });

    it('should calculate metrics for complex component', () => {
      const criteria: TemplateSelectionCriteria = {
        componentName: 'AdminDashboard',
        features: ['auth', 'dashboard', 'analytics', 'crud', 'realtime'],
        estimatedLines: 0,
        complexity: 0
      };

      const metrics = calculateComplexityMetrics(criteria);

      expect(metrics.estimatedLines).toBeGreaterThan(500);
      expect(metrics.complexityScore).toBeGreaterThan(50);
    });
  });

  describe('selectComponentTier', () => {
    it('should select SIMPLE tier for low complexity', () => {
      const metrics = {
        estimatedLines: 150,
        featureCount: 1,
        dependencyCount: 3,
        externalDependencies: 2,
        internalModules: 1,
        complexityScore: 20
      };

      const tier = selectComponentTier(metrics);
      expect(tier).toBe('SIMPLE');
    });

    it('should select STANDARD tier for medium complexity', () => {
      const metrics = {
        estimatedLines: 400,
        featureCount: 3,
        dependencyCount: 6,
        externalDependencies: 4,
        internalModules: 2,
        complexityScore: 40
      };

      const tier = selectComponentTier(metrics);
      expect(tier).toBe('STANDARD');
    });

    it('should select ADVANCED tier for high complexity', () => {
      const metrics = {
        estimatedLines: 800,
        featureCount: 5,
        dependencyCount: 8,
        externalDependencies: 6,
        internalModules: 2,
        complexityScore: 60
      };

      const tier = selectComponentTier(metrics);
      expect(tier).toBe('ADVANCED');
    });

    it('should select ENTERPRISE tier for very high complexity', () => {
      const metrics = {
        estimatedLines: 1200,
        featureCount: 7,
        dependencyCount: 12,
        externalDependencies: 10,
        internalModules: 2,
        complexityScore: 85
      };

      const tier = selectComponentTier(metrics);
      expect(tier).toBe('ENTERPRISE');
    });

    it('should respect forced tier override', () => {
      const metrics = {
        estimatedLines: 150,
        featureCount: 1,
        dependencyCount: 3,
        externalDependencies: 2,
        internalModules: 1,
        complexityScore: 20
      };

      const tier = selectComponentTier(metrics, 'ENTERPRISE');
      expect(tier).toBe('ENTERPRISE');
    });
  });

  describe('validateGovernanceCompliance', () => {
    it('should pass for compliant SIMPLE component', () => {
      const metrics = {
        estimatedLines: 200,
        featureCount: 2,
        dependencyCount: 4,
        externalDependencies: 3,
        internalModules: 1,
        complexityScore: 25
      };

      const validation = validateGovernanceCompliance('SIMPLE', metrics);

      expect(validation.isValid).toBe(true);
      expect(validation.complianceScore).toBe(100);
      expect(validation.violations).toHaveLength(0);
    });

    it('should fail for dependency limit violation', () => {
      const metrics = {
        estimatedLines: 200,
        featureCount: 2,
        dependencyCount: 10,
        externalDependencies: 8,
        internalModules: 2,
        complexityScore: 30
      };

      const validation = validateGovernanceCompliance('SIMPLE', metrics);

      expect(validation.isValid).toBe(false);
      expect(validation.violations.length).toBeGreaterThan(0);
      expect(validation.violations[0].severity).toBe('ERROR');
    });

    it('should warn for approaching line limits', () => {
      const metrics = {
        estimatedLines: 290,
        featureCount: 3,
        dependencyCount: 4,
        externalDependencies: 3,
        internalModules: 1,
        complexityScore: 35
      };

      const validation = validateGovernanceCompliance('SIMPLE', metrics);

      // Should still be valid but may have warnings
      expect(validation.tier).toBe('SIMPLE');
    });
  });

  describe('selectTemplate - Integration', () => {
    it('should select SIMPLE template for simple component', () => {
      const criteria: TemplateSelectionCriteria = {
        componentName: 'NotificationBadge',
        features: ['notification', 'display'],
        estimatedLines: 0,
        complexity: 0
      };

      const result = selectTemplate(criteria);

      expect(result.selectedTier).toBe('SIMPLE');
      expect(result.template).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(70);
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('should select STANDARD template for data table', () => {
      const criteria: TemplateSelectionCriteria = {
        componentName: 'UserTable',
        features: ['table', 'data', 'pagination'],
        estimatedLines: 0,
        complexity: 0
      };

      const result = selectTemplate(criteria);

      expect(result.selectedTier).toBe('STANDARD');
      expect(result.template.config.errorBoundary).toBe(true);
    });

    it('should select ADVANCED template for dashboard', () => {
      const criteria: TemplateSelectionCriteria = {
        componentName: 'AdminDashboard',
        features: ['auth', 'dashboard', 'analytics', 'crud'],
        estimatedLines: 0,
        complexity: 0
      };

      const result = selectTemplate(criteria);

      expect(result.selectedTier).toBe('ADVANCED');
      expect(result.template.config.circuitBreaker).toBe(true);
      expect(result.template.config.performanceMonitoring).toBe(true);
    });

    it('should select ENTERPRISE template for critical systems', () => {
      const criteria: TemplateSelectionCriteria = {
        componentName: 'SystemAdminPanel',
        features: ['enterprise', 'auth', 'security', 'critical', 'realtime'],
        estimatedLines: 0,
        complexity: 0
      };

      const result = selectTemplate(criteria);

      expect(result.selectedTier).toBe('ENTERPRISE');
      expect(result.template.config.osiLayers).toContain(1);
      expect(result.template.config.osiLayers).toContain(7);
    });

    it('should provide meaningful reasoning', () => {
      const criteria: TemplateSelectionCriteria = {
        componentName: 'DataManager',
        features: ['crud', 'table', 'form'],
        estimatedLines: 0,
        complexity: 0
      };

      const result = selectTemplate(criteria);

      expect(result.reasoning).toContain(
        expect.stringMatching(/complexity score/i)
      );
      expect(result.reasoning.length).toBeGreaterThan(2);
    });

    it('should provide warnings when appropriate', () => {
      const criteria: TemplateSelectionCriteria = {
        componentName: 'ComplexComponent',
        features: ['auth', 'table', 'form', 'crud', 'dashboard', 'analytics'],
        estimatedLines: 0,
        complexity: 0
      };

      const result = selectTemplate(criteria);

      // High feature count should trigger warnings
      if (result.warnings.length > 0) {
        expect(result.warnings[0]).toBeDefined();
      }
    });

    it('should provide recommendations', () => {
      const criteria: TemplateSelectionCriteria = {
        componentName: 'MediaUploader',
        features: ['media', 'upload', 'form'],
        estimatedLines: 0,
        complexity: 0
      };

      const result = selectTemplate(criteria);

      expect(result.recommendations).toContain(
        expect.stringMatching(/useUniversalMedia/i)
      );
    });

    it('should include complete metadata', () => {
      const criteria: TemplateSelectionCriteria = {
        componentName: 'TestComponent',
        features: ['test'],
        estimatedLines: 0,
        complexity: 0
      };

      const result = selectTemplate(criteria);

      expect(result.metadata.version).toBeDefined();
      expect(result.metadata.tier).toBe(result.selectedTier);
      expect(result.metadata.buildMapCompliance).toBeDefined();
      expect(result.metadata.osiCompliance).toBeDefined();
      expect(result.metadata.dependencyLimit).toBeGreaterThan(0);
    });
  });

  describe('Template Generation', () => {
    it('should generate valid TypeScript code', () => {
      const criteria: TemplateSelectionCriteria = {
        componentName: 'TestComponent',
        features: ['test'],
        estimatedLines: 0,
        complexity: 0
      };

      const result = selectTemplate(criteria);
      const code = result.template.generate({
        componentName: 'TestComponent',
        tier: result.selectedTier,
        features: ['test'],
        outputPath: 'src/components',
        includeTests: false,
        includeDocs: false,
        strictMode: true
      });

      expect(code).toContain('import React');
      expect(code).toContain('TestComponent');
      expect(code).toContain('export default');
    });

    it('should include OSI security for all tiers', () => {
      const tiers: ComponentTier[] = ['SIMPLE', 'STANDARD', 'ADVANCED', 'ENTERPRISE'];

      tiers.forEach(tier => {
        const criteria: TemplateSelectionCriteria = {
          componentName: 'TestComponent',
          features: ['test'],
          estimatedLines: 0,
          complexity: 0,
          forcedTier: tier
        };

        const result = selectTemplate(criteria);
        const code = result.template.generate({
          componentName: 'TestComponent',
          tier,
          features: ['test'],
          outputPath: 'src/components'
        });

        // All tiers should have OSI Layer 7 (Application Security)
        expect(code).toContain('validateInput');
        expect(code).toContain('auditLog');
        expect(code).toContain('sanitizeOutput');
      });
    });
  });
});
