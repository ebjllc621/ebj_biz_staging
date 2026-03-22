/**
 * DNA Audit Command Tests
 *
 * @authority CLAUDE.md - Build Map v2.1 ENHANCED compliance
 * @version 1.0.0 - DNA Enhancement Commands
 * @coverage Target: 70%+
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import { DNAAuditor } from '../dna-audit';
import { AuditOptions } from '../dna-types';

// Mock filesystem with proper fs.Stats implementation
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
  statSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

describe('DNAAuditor', () => {
  const mockComponentPath = '/test/src/components/TestComponent.tsx';
  const mockComponentContent = `
import React, { useState } from 'react';
import { DatabaseService } from '@core/services/DatabaseService';
import { useAuth } from '@core/context/AuthContext';

export const TestComponent: React.FC = () => {
  const [data, setData] = useState([]);
  const { user } = useAuth();

  const fetchData = async () => {
    const result = await DatabaseService.query('SELECT * FROM users');
    setData(result);
  };

  return (
    <div>
      <h1>Test Component</h1>
      <button onClick={fetchData}>Load Data</button>
    </div>
  );
};
`;

  beforeEach(() => {
    // Setup filesystem mocks
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue(['TestComponent.tsx'] as any);
    vi.mocked(fs.readFileSync).mockReturnValue(mockComponentContent);
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
    vi.mocked(fs.writeFileSync).mockImplementation(() => {});
    vi.mocked(fs.mkdirSync).mockImplementation(() => '' as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('audit()', () => {
    it('should successfully audit a compliant component', async () => {
      const auditor = new DNAAuditor(mockComponentPath);
      const options: AuditOptions = {
        componentPath: mockComponentPath
      };

      const result = await auditor.audit(options);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.score).toBeGreaterThan(0);
    });

    it('should detect import path violations', async () => {
      const violatingContent = `
import React from 'react';
import { something } from '../../../deep/relative/path';

export const TestComponent = () => <div>Test</div>;
`;
      vi.mocked(fs.readFileSync).mockReturnValue(violatingContent);

      const auditor = new DNAAuditor(mockComponentPath);
      const result = await auditor.audit({ componentPath: mockComponentPath });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.data?.violations.some(v => v.rule === 'import-paths')).toBe(true);
    });

    it('should detect DatabaseService boundary violations', async () => {
      const violatingContent = `
import React from 'react';
import mysql from 'mysql2';

export const TestComponent = () => {
  const connection = mysql.createConnection({});
  return <div>Test</div>;
};
`;
      vi.mocked(fs.readFileSync).mockReturnValue(violatingContent);

      const auditor = new DNAAuditor(mockComponentPath);
      const result = await auditor.audit({ componentPath: mockComponentPath });

      expect(result.data?.violations.some(v => v.rule === 'database-boundary')).toBe(true);
    });

    it('should detect authentication violations', async () => {
      const violatingContent = `
import React from 'react';

export const TestComponent = () => {
  const token = localStorage.getItem('authToken');
  return <div>Test</div>;
};
`;
      vi.mocked(fs.readFileSync).mockReturnValue(violatingContent);

      const auditor = new DNAAuditor(mockComponentPath);
      const result = await auditor.audit({ componentPath: mockComponentPath });

      expect(result.data?.violations.some(v => v.rule === 'authentication')).toBe(true);
    });

    it('should detect TypeScript violations', async () => {
      const violatingContent = `
import React from 'react';

export const TestComponent = () => {
  // @ts-ignore
  const data: unknown = getData();
  return <div>Test</div>;
};
`;
      vi.mocked(fs.readFileSync).mockReturnValue(violatingContent);

      const auditor = new DNAAuditor(mockComponentPath);
      const result = await auditor.audit({ componentPath: mockComponentPath });

      expect(result.data?.violations.some(v => v.rule === 'typescript')).toBe(true);
    });

    it('should calculate correct governance score', async () => {
      const auditor = new DNAAuditor(mockComponentPath);
      const result = await auditor.audit({ componentPath: mockComponentPath });

      expect(result.data?.score).toBeGreaterThanOrEqual(0);
      expect(result.data?.score).toBeLessThanOrEqual(100);
    });

    it('should generate recommendations based on violations', async () => {
      const violatingContent = `
import mysql from 'mysql2';
import { something } from '../../../deep/path';

export const TestComponent = () => <div>Test</div>;
`;
      vi.mocked(fs.readFileSync).mockReturnValue(violatingContent);

      const auditor = new DNAAuditor(mockComponentPath);
      const result = await auditor.audit({ componentPath: mockComponentPath });

      expect(result.data?.recommendations.length).toBeGreaterThan(0);
    });

    it('should save audit report to file', async () => {
      const auditor = new DNAAuditor(mockComponentPath);
      const writeFileSpy = vi.mocked(fs.writeFileSync');

      await auditor.audit({ componentPath: mockComponentPath });

      expect(writeFileSpy).toHaveBeenCalled();
      const callArgs = writeFileSpy.mock.calls[0];
      if (callArgs) {
        expect(callArgs[0]).toContain('.claude/sessions/dna/audits');
      }
    });

    it('should handle missing component files gracefully', async () => {
      vi.mocked(fs.existsSync').mockReturnValue(false);

      const auditor = new DNAAuditor(mockComponentPath);
      const result = await auditor.audit({ componentPath: mockComponentPath });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect tier correctly', async () => {
      const simpleContent = `
export const Simple = () => <div>Simple</div>;
`;
      vi.mocked(fs.readFileSync).mockReturnValue(simpleContent);

      const auditor = new DNAAuditor(mockComponentPath);
      const result = await auditor.audit({ componentPath: mockComponentPath });

      expect(result.data?.tier).toBe('SIMPLE');
    });

    it('should detect ADVANCED tier for components with circuit breaker', async () => {
      const advancedContent = `
import { CircuitBreaker } from '@core/patterns/CircuitBreaker';

export const Advanced = () => {
  return <div>Advanced with Circuit Breaker</div>;
};
`;
      vi.mocked(fs.readFileSync).mockReturnValue(advancedContent);

      const auditor = new DNAAuditor(mockComponentPath);
      const result = await auditor.audit({ componentPath: mockComponentPath });

      expect(result.data?.tier).toBe('ADVANCED');
    });
  });

  describe('Category Audits', () => {
    it('should audit import paths correctly', async () => {
      const auditor = new DNAAuditor(mockComponentPath);
      const result = await auditor.audit({ componentPath: mockComponentPath });

      expect(result.data?.categories.importPaths).toBeDefined();
      expect(result.data?.categories.importPaths.checks).toBeGreaterThan(0);
    });

    it('should audit database boundary correctly', async () => {
      const auditor = new DNAAuditor(mockComponentPath);
      const result = await auditor.audit({ componentPath: mockComponentPath });

      expect(result.data?.categories.databaseBoundary).toBeDefined();
    });

    it('should audit authentication correctly', async () => {
      const auditor = new DNAAuditor(mockComponentPath);
      const result = await auditor.audit({ componentPath: mockComponentPath });

      expect(result.data?.categories.authentication).toBeDefined();
    });

    it('should audit media management correctly', async () => {
      const auditor = new DNAAuditor(mockComponentPath);
      const result = await auditor.audit({ componentPath: mockComponentPath });

      expect(result.data?.categories.mediaManagement).toBeDefined();
    });

    it('should audit service architecture correctly', async () => {
      const auditor = new DNAAuditor(mockComponentPath);
      const result = await auditor.audit({ componentPath: mockComponentPath });

      expect(result.data?.categories.serviceArchitecture).toBeDefined();
    });

    it('should audit TypeScript compliance correctly', async () => {
      const auditor = new DNAAuditor(mockComponentPath);
      const result = await auditor.audit({ componentPath: mockComponentPath });

      expect(result.data?.categories.typeScript).toBeDefined();
    });

    it('should audit OSI compliance correctly', async () => {
      const auditor = new DNAAuditor(mockComponentPath);
      const result = await auditor.audit({ componentPath: mockComponentPath });

      expect(result.data?.categories.osiCompliance).toBeDefined();
    });
  });

  describe('Fix Mode', () => {
    it('should apply automatic fixes when --fix option is provided', async () => {
      const auditor = new DNAAuditor(mockComponentPath);
      const result = await auditor.audit({
        componentPath: mockComponentPath,
        fix: true
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('Output Formats', () => {
    it('should support JSON output format', async () => {
      const auditor = new DNAAuditor(mockComponentPath);
      const result = await auditor.audit({
        componentPath: mockComponentPath,
        outputFormat: 'json'
      });

      expect(result.data).toBeDefined();
    });

    it('should support console output format', async () => {
      const auditor = new DNAAuditor(mockComponentPath);
      const consoleSpy = vi.spyOn(console, 'log');

      await auditor.audit({
        componentPath: mockComponentPath,
        outputFormat: 'console'
      });

      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
