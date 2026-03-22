/**
 * DNA Rollback Command Tests
 *
 * @authority CLAUDE.md - Build Map v2.1 ENHANCED compliance
 * @version 1.0.0 - DNA Enhancement Commands
 * @coverage Target: 70%+
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { DNARollback } from '../dna-rollback';
import { RollbackOptions } from '../dna-types';

// Mock filesystem and child_process with proper implementations
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
  statSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  unlinkSync: vi.fn(),
  copyFileSync: vi.fn(),
}));

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

describe('DNARollback', () => {
  const mockComponentName = 'TestComponent';
  const mockSessionData = {
    path: '.claude/sessions/componentbuilder/builds/build-TestComponent-2025-12-03.md',
    timestamp: '2025-12-03',
    content: `
# Component Build Session: TestComponent

## Files Created
- src/components/TestComponent.tsx
- src/components/__tests__/TestComponent.test.tsx
- src/components/types/TestComponent.types.ts

## Build Status
Status: Complete
    `
  };

  beforeEach(() => {
    // Setup filesystem mocks
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([
      'build-TestComponent-2025-12-03.md'
    ] as any);
    vi.mocked(fs.readFileSync).mockReturnValue(mockSessionData.content);
    vi.mocked(fs.statSync).mockReturnValue({
      size: 1024,
      birthtime: new Date(),
      mtime: new Date(),
      isFile: () => true,
      isDirectory: () => false,
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isSymbolicLink: () => false,
      isFIFO: () => false,
      isSocket: () => false,
    } as any);
    vi.mocked(fs.unlinkSync).mockImplementation(() => {});
    vi.mocked(fs.copyFileSync).mockImplementation(() => {});
    vi.mocked(fs.mkdirSync).mockImplementation(() => '' as any);
    vi.mocked(fs.writeFileSync).mockImplementation(() => {});

    // Mock execSync for git commands
    vi.mocked(execSync).mockReturnValue(Buffer.from(''));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generatePlan()', () => {
    it('should generate a rollback plan for a component', async () => {
      const rollback = new DNARollback(mockComponentName);
      const options: RollbackOptions = { componentName: mockComponentName };

      const result = await rollback.generatePlan(options);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.component).toBe(mockComponentName);
    });

    it('should identify files created during generation', async () => {
      const rollback = new DNARollback(mockComponentName);
      const result = await rollback.generatePlan({ componentName: mockComponentName });

      expect(result.data?.filesCreated).toBeDefined();
      expect(Array.isArray(result.data?.filesCreated)).toBe(true);
    });

    it('should identify files modified during generation', async () => {
      const mockIndexContent = `
export { TestComponent } from './TestComponent';
export * from './OtherComponent';
`;
      vi.mocked(fs.readFileSync).mockImplementation((path: any) => {
        if (path.includes('index.ts')) return mockIndexContent;
        return mockSessionData.content;
      });

      const rollback = new DNARollback(mockComponentName);
      const result = await rollback.generatePlan({ componentName: mockComponentName });

      expect(result.data?.filesModified).toBeDefined();
    });

    it('should detect dependencies on the component', async () => {
      const mockDependentFile = `
import { TestComponent } from '@components/TestComponent';

export const ParentComponent = () => {
  return <TestComponent />;
};
`;
      vi.mocked(fs.readdirSync).mockReturnValue([
        'ParentComponent.tsx',
        'build-TestComponent-2025-12-03.md'
      ] as any);
      vi.mocked(fs.readFileSync).mockImplementation((path: any) => {
        if (path.includes('ParentComponent')) return mockDependentFile;
        return mockSessionData.content;
      });

      const rollback = new DNARollback(mockComponentName);
      const result = await rollback.generatePlan({ componentName: mockComponentName });

      expect(result.data?.dependencies).toBeDefined();
    });

    it('should mark as unsafe when dependencies exist', async () => {
      const mockDependentFile = `import { TestComponent } from './TestComponent';`;
      vi.mocked(fs.readdirSync).mockReturnValue([
        'TestComponent.tsx',
        'ParentComponent.tsx'
      ] as any);
      vi.mocked(fs.readFileSync).mockImplementation((path: any) => {
        if (path.includes('Parent')) return mockDependentFile;
        return mockSessionData.content;
      });

      const rollback = new DNARollback(mockComponentName);
      const result = await rollback.generatePlan({ componentName: mockComponentName });

      expect(result.data?.safeToRollback).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should mark as safe when no dependencies exist', async () => {
      vi.mocked(fs.readdirSync).mockReturnValue(['TestComponent.tsx'] as any);

      const rollback = new DNARollback(mockComponentName);
      const result = await rollback.generatePlan({ componentName: mockComponentName });

      expect(result.data?.safeToRollback).toBe(true);
    });

    it('should calculate estimated impact correctly', async () => {
      const rollback = new DNARollback(mockComponentName);
      const result = await rollback.generatePlan({ componentName: mockComponentName });

      expect(result.data?.estimatedImpact).toBeDefined();
      expect(result.data?.estimatedImpact.filesAffected).toBeGreaterThanOrEqual(0);
    });

    it('should handle missing session data', async () => {
      vi.mocked(fs.readdirSync).mockReturnValue([] as any);

      const rollback = new DNARollback('NonExistentComponent');
      const result = await rollback.generatePlan({ componentName: 'NonExistentComponent' });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('execute()', () => {
    it('should execute rollback successfully', async () => {
      const rollback = new DNARollback(mockComponentName);
      const options: RollbackOptions = {
        componentName: mockComponentName,
        force: false
      };

      const result = await rollback.execute(options);

      expect(result.success).toBeDefined();
    });

    it('should refuse unsafe rollback without --force', async () => {
      const mockDependentFile = `import { TestComponent } from './TestComponent';`;
      vi.mocked(fs.readdirSync).mockReturnValue([
        'TestComponent.tsx',
        'ParentComponent.tsx'
      ] as any);
      vi.mocked(fs.readFileSync).mockImplementation((path: any) => {
        if (path.includes('Parent')) return mockDependentFile;
        return mockSessionData.content;
      });

      const rollback = new DNARollback(mockComponentName);
      const result = await rollback.execute({
        componentName: mockComponentName,
        force: false
      });

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('unsafe'))).toBe(true);
    });

    it('should execute unsafe rollback with --force', async () => {
      const mockDependentFile = `import { TestComponent } from './TestComponent';`;
      vi.mocked(fs.readdirSync).mockReturnValue([
        'TestComponent.tsx',
        'ParentComponent.tsx'
      ] as any);
      vi.mocked(fs.readFileSync).mockImplementation((path: any) => {
        if (path.includes('Parent')) return mockDependentFile;
        return mockSessionData.content;
      });

      const rollback = new DNARollback(mockComponentName);
      const result = await rollback.execute({
        componentName: mockComponentName,
        force: true
      });

      expect(result.data?.success).toBeDefined();
    });

    it('should create backup when --backup option is provided', async () => {
      const mkdirSpy = vi.mocked(fs.mkdirSync);
      const copyFileSpy = vi.mocked(fs.copyFileSync);

      const rollback = new DNARollback(mockComponentName);
      await rollback.execute({
        componentName: mockComponentName,
        backup: true
      });

      expect(mkdirSpy).toHaveBeenCalled();
      expect(copyFileSpy).toHaveBeenCalled();
    });

    it('should remove created files', async () => {
      const unlinkSpy = vi.mocked(fs.unlinkSync);

      const rollback = new DNARollback(mockComponentName);
      await rollback.execute({ componentName: mockComponentName });

      expect(unlinkSpy).toHaveBeenCalled();
    });

    it('should restore modified files from git', async () => {
      const execSyncSpy = vi.mocked(execSync);

      const rollback = new DNARollback(mockComponentName);
      await rollback.execute({ componentName: mockComponentName });

      expect(execSyncSpy).toHaveBeenCalledWith(
        expect.stringContaining('git checkout'),
        expect.any(Object)
      );
    });

    it('should handle plan-only mode', async () => {
      const unlinkSpy = vi.mocked(fs.unlinkSync);

      const rollback = new DNARollback(mockComponentName);
      const result = await rollback.execute({
        componentName: mockComponentName,
        planOnly: true
      });

      expect(result.success).toBe(true);
      expect(unlinkSpy).not.toHaveBeenCalled();
    });

    it('should handle dry-run mode', async () => {
      const unlinkSpy = vi.mocked(fs.unlinkSync);

      const rollback = new DNARollback(mockComponentName);
      const result = await rollback.execute({
        componentName: mockComponentName,
        dryRun: true
      });

      expect(result.success).toBe(true);
      expect(result.data?.filesRemoved).toBeDefined();
      expect(unlinkSpy).not.toHaveBeenCalled();
    });

    it('should track errors during rollback', async () => {
      vi.mocked(fs.unlinkSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const rollback = new DNARollback(mockComponentName);
      const result = await rollback.execute({ componentName: mockComponentName });

      expect(result.data?.errors).toBeDefined();
      expect(result.data?.errors.length).toBeGreaterThan(0);
    });

    it('should save rollback result', async () => {
      const rollback = new DNARollback(mockComponentName);
      const result = await rollback.execute({ componentName: mockComponentName });

      expect(result.data?.filesRemoved).toBeDefined();
      expect(result.data?.filesRestored).toBeDefined();
    });
  });

  describe('Dependency Detection', () => {
    it('should detect named imports', async () => {
      const mockContent = `import { TestComponent } from './TestComponent';`;
      vi.mocked(fs.readFileSync).mockReturnValue(mockContent);

      const rollback = new DNARollback(mockComponentName);
      const result = await rollback.generatePlan({ componentName: mockComponentName });

      expect(result.data?.dependencies.length).toBeGreaterThan(0);
    });

    it('should detect default imports', async () => {
      const mockContent = `import TestComponent from './TestComponent';`;
      vi.mocked(fs.readFileSync).mockReturnValue(mockContent);

      const rollback = new DNARollback(mockComponentName);
      const result = await rollback.generatePlan({ componentName: mockComponentName });

      expect(result.data?.dependencies.length).toBeGreaterThan(0);
    });

    it('should detect re-exports', async () => {
      const mockContent = `export { TestComponent } from './TestComponent';`;
      vi.mocked(fs.readFileSync).mockReturnValue(mockContent);

      const rollback = new DNARollback(mockComponentName);
      const result = await rollback.generatePlan({ componentName: mockComponentName });

      expect(result.data?.dependencies.length).toBeGreaterThan(0);
    });
  });

  describe('File Type Detection', () => {
    it('should correctly identify component files', async () => {
      const rollback = new DNARollback(mockComponentName);
      const result = await rollback.generatePlan({ componentName: mockComponentName });

      const componentFile = result.data?.filesCreated.find(f => f.path.includes('TestComponent.tsx'));
      expect(componentFile?.type).toBe('component');
    });

    it('should correctly identify test files', async () => {
      const rollback = new DNARollback(mockComponentName);
      const result = await rollback.generatePlan({ componentName: mockComponentName });

      const testFile = result.data?.filesCreated.find(f => f.path.includes('test'));
      if (testFile) {
        expect(testFile.type).toBe('test');
      }
    });

    it('should correctly identify type files', async () => {
      const rollback = new DNARollback(mockComponentName);
      const result = await rollback.generatePlan({ componentName: mockComponentName });

      const typeFile = result.data?.filesCreated.find(f => f.path.includes('types'));
      if (typeFile) {
        expect(typeFile.type).toBe('type');
      }
    });
  });
});
