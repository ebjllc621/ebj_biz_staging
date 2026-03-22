/**
 * DNA Recovery Command Tests
 *
 * @authority CLAUDE.md - Build Map v2.1 ENHANCED compliance
 * @version 1.0.0 - DNA Enhancement Commands
 * @coverage Target: 70%+
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import { DNARecovery } from '../dna-recover';

// Mock filesystem with proper fs.Stats implementation
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
  statSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

describe('DNARecovery', () => {
  const mockSessionContent = `
# DNA Plan: TestComponent

## Status
Status: INTERRUPTED
Phase: EXECUTOR

## Checkpoints
- plan-generation-started
- inventory-analysis-complete
- tier-classification-complete
- component-generation-started
- template-applied

## Artifacts
- plan-TestComponent-2025-12-03.md
- TestComponent.tsx
- TestComponent.test.tsx
`;

  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([
      'plan-TestComponent-2025-12-03.md',
      'build-UserDashboard-2025-12-02.md'
    ] as any);
    vi.mocked(fs.readFileSync).mockReturnValue(mockSessionContent);
    vi.mocked(fs.statSync).mockReturnValue({
      mtime: new Date(),
      size: 1024,
      isFile: () => true,
      isDirectory: () => false,
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isSymbolicLink: () => false,
      isFIFO: () => false,
      isSocket: () => false,
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('listSessions()', () => {
    it('should list all recoverable sessions', async () => {
      const recovery = new DNARecovery();
      const result = await recovery.listSessions({ list: true });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should filter only recoverable sessions', async () => {
      const recovery = new DNARecovery();
      const result = await recovery.listSessions({ list: true });

      expect(result.data?.every(s =>
        s.status === 'INTERRUPTED' ||
        s.status === 'INCOMPLETE' ||
        s.status === 'RECOVERABLE'
      )).toBe(true);
    });

    it('should extract component names correctly', async () => {
      const recovery = new DNARecovery();
      const result = await recovery.listSessions({ list: true });

      expect(result.data?.some(s => s.component.length > 0)).toBe(true);
    });

    it('should identify session phases correctly', async () => {
      const recovery = new DNARecovery();
      const result = await recovery.listSessions({ list: true });

      expect(result.data?.every(s =>
        s.phase === 'BRAIN' ||
        s.phase === 'EXECUTOR' ||
        s.phase === 'ENFORCER'
      )).toBe(true);
    });

    it('should find last checkpoints', async () => {
      const recovery = new DNARecovery();
      const result = await recovery.listSessions({ list: true });

      expect(result.data?.every(s => s.lastCheckpoint.length > 0)).toBe(true);
    });

    it('should handle empty session directories', async () => {
      vi.mocked(fs.existsSync)).mockReturnValue(false);

      const recovery = new DNARecovery();
      const result = await recovery.listSessions({ list: true });

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(0);
    });
  });

  describe('recoverSession()', () => {
    const sessionId = 'plan-TestComponent-2025-12-03';

    it('should recover a session successfully', async () => {
      const recovery = new DNARecovery();
      const result = await recovery.recoverSession(sessionId, {});

      expect(result.success).toBeDefined();
      expect(result.data?.session).toBeDefined();
    });

    it('should handle non-existent session', async () => {
      vi.mocked(fs.readdirSync).mockReturnValue([] as any);

      const recovery = new DNARecovery();
      const result = await recovery.recoverSession('non-existent', {});

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should display session info when --info option is provided', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      const recovery = new DNARecovery();
      await recovery.recoverSession(sessionId, { info: true });

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should validate session is recoverable', async () => {
      const recovery = new DNARecovery();
      const result = await recovery.recoverSession(sessionId, {});

      expect(result.data?.session).toBeDefined();
    });

    it('should refuse to recover failed sessions with many errors', async () => {
      const failedSessionContent = `
# Session

Status: FAILED

## Errors
error error error error error error
failed failed failed failed failed failed
`;
      vi.mocked(fs.readFileSync)).mockReturnValue(failedSessionContent);

      const recovery = new DNARecovery();
      const result = await recovery.recoverSession(sessionId, {});

      expect(result.success).toBe(false);
    });

    it('should refuse to recover sessions with no artifacts', async () => {
      const emptySessionContent = `
# Session

Status: INCOMPLETE

## Artifacts
None
`;
      vi.mocked(fs.readFileSync)).mockReturnValue(emptySessionContent);

      const recovery = new DNARecovery();
      const result = await recovery.recoverSession(sessionId, {});

      expect(result.success).toBe(false);
    });
  });

  describe('Phase Recovery', () => {
    it('should recover BRAIN phase sessions', async () => {
      const brainSessionContent = `
# DNA Plan

Status: INTERRUPTED
Phase: BRAIN

## Checkpoints
- plan-generation-started
- inventory-analysis-complete
`;
      vi.mocked(fs.readFileSync)).mockReturnValue(brainSessionContent);

      const recovery = new DNARecovery();
      const result = await recovery.recoverSession('plan-test-2025-12-03', {});

      expect(result.data?.session.phase).toBe('BRAIN');
    });

    it('should recover EXECUTOR phase sessions', async () => {
      const executorSessionContent = `
# Build Session

Status: INTERRUPTED
Phase: EXECUTOR

## Checkpoints
- component-generation-started
- template-applied
`;
      vi.mocked(fs.readFileSync)).mockReturnValue(executorSessionContent);

      const recovery = new DNARecovery();
      const result = await recovery.recoverSession('build-test-2025-12-03', {});

      expect(result.data?.session.phase).toBe('EXECUTOR');
    });

    it('should recover ENFORCER phase sessions', async () => {
      const enforcerSessionContent = `
# K9 Validation

Status: INTERRUPTED
Phase: ENFORCER

## Checkpoints
- k9-validation-started
- governance-check-complete
`;
      vi.mocked(fs.readFileSync)).mockReturnValue(enforcerSessionContent);

      const recovery = new DNARecovery();
      const result = await recovery.recoverSession('k9-test-2025-12-03', {});

      expect(result.data?.session.phase).toBe('ENFORCER');
    });
  });

  describe('Checkpoint Detection', () => {
    it('should detect BRAIN phase checkpoints', async () => {
      const recovery = new DNARecovery();
      const result = await recovery.recoverSession('plan-test-2025-12-03', {});

      expect(result.data?.session.lastCheckpoint).toBeDefined();
    });

    it('should detect EXECUTOR phase checkpoints', async () => {
      const executorContent = `
Status: INTERRUPTED
template-applied
tests-generated
`;
      vi.mocked(fs.readFileSync)).mockReturnValue(executorContent);

      const recovery = new DNARecovery();
      const result = await recovery.recoverSession('build-test-2025-12-03', {});

      expect(result.data?.session.lastCheckpoint).toContain('template-applied');
    });

    it('should detect ENFORCER phase checkpoints', async () => {
      const enforcerContent = `
Status: INTERRUPTED
governance-check-complete
`;
      vi.mocked(fs.readFileSync)).mockReturnValue(enforcerContent);

      const recovery = new DNARecovery();
      const result = await recovery.recoverSession('k9-test-2025-12-03', {});

      expect(result.data?.session.lastCheckpoint).toContain('governance-check-complete');
    });
  });

  describe('Artifact Detection', () => {
    it('should detect plan artifacts', async () => {
      const recovery = new DNARecovery();
      const result = await recovery.recoverSession('plan-test-2025-12-03', {});

      const planArtifacts = result.data?.session.artifacts.filter(a => a.type === 'plan');
      expect(planArtifacts).toBeDefined();
    });

    it('should detect component artifacts', async () => {
      const recovery = new DNARecovery();
      const result = await recovery.recoverSession('plan-test-2025-12-03', {});

      const componentArtifacts = result.data?.session.artifacts.filter(a => a.type === 'component');
      expect(componentArtifacts).toBeDefined();
    });

    it('should detect test artifacts', async () => {
      const recovery = new DNARecovery();
      const result = await recovery.recoverSession('plan-test-2025-12-03', {});

      const testArtifacts = result.data?.session.artifacts.filter(a => a.type === 'test');
      expect(testArtifacts).toBeDefined();
    });
  });

  describe('Status Detection', () => {
    it('should detect INTERRUPTED status', async () => {
      const interruptedContent = 'Status: INTERRUPTED';
      vi.mocked(fs.readFileSync)).mockReturnValue(interruptedContent);

      const recovery = new DNARecovery();
      const result = await recovery.listSessions({ list: true });

      expect(result.data?.some(s => s.status === 'INTERRUPTED')).toBe(true);
    });

    it('should detect FAILED status', async () => {
      const failedContent = 'Status: FAILED';
      vi.mocked(fs.readFileSync)).mockReturnValue(failedContent);

      const recovery = new DNARecovery();
      const result = await recovery.listSessions({ list: true });

      expect(result.data?.some(s => s.status === 'FAILED')).toBe(true);
    });

    it('should detect RECOVERABLE status', async () => {
      const recoverableContent = `
Status: INCOMPLETE
plan-generation-started
inventory-analysis-complete
tier-classification-complete
`;
      vi.mocked(fs.readFileSync)).mockReturnValue(recoverableContent);

      const recovery = new DNARecovery();
      const result = await recovery.listSessions({ list: true });

      expect(result.data?.some(s => s.status === 'RECOVERABLE')).toBe(true);
    });
  });
});
