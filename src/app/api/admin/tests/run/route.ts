/**
 * Admin Test Runner API - Run Single Test File
 *
 * POST /api/admin/tests/run
 * Triggers Vitest for a single test file.
 *
 * @authority .cursor/rules/admin-api-route-standard.mdc
 * @governance apiHandler wrapper, admin auth required
 * @phase Technical Debt Remediation - Phase 5
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

export const dynamic = 'force-dynamic';

const execAsync = promisify(exec);

// Allowed test directories for security
const ALLOWED_TEST_DIRS = [
  // Connections & Sharing tests
  'src/features/connections/services/__tests__',
  'src/features/sharing/hooks/__tests__',
  'src/features/sharing/components/__tests__',
  'src/app/api/sharing/__tests__',
  // Offers Phase 4 tests
  'src/features/offers/components/__tests__',
  'src/features/offers/hooks/__tests__',
  'src/features/dashboard/components/managers/offers/__tests__',
  'src/features/dashboard/components/managers/offers/templates/__tests__',
  'src/app/admin/offers/__tests__',
  'src/app/offers/__tests__',
  // E2E tests
  'e2e/sharing',
  'e2e/listings',
  'e2e/admin',
  'e2e/public',
  'e2e/offers',
  // Events Detail tests
  'src/features/events/components/__tests__',
  'src/features/events/hooks/__tests__',
  'src/core/services/__tests__',
  // Integration tests
  'tests/integration'
];

/**
 * Validate that the test path is within allowed directories
 */
function isValidTestPath(testPath: string): boolean {
  const normalizedPath = testPath.replace(/\\/g, '/');
  return ALLOWED_TEST_DIRS.some(dir => normalizedPath.includes(dir));
}

export const POST = apiHandler(
  async (context: ApiContext) => {
    const body = await context.request.json();
    const { testPath } = body;

    // Validation
    if (!testPath || typeof testPath !== 'string') {
      return createErrorResponse('testPath is required', 400);
    }

    // Security: Only allow tests from specific directories
    if (!isValidTestPath(testPath)) {
      return createErrorResponse('Invalid test path. Only TD Phase 5 test files are allowed.', 403);
    }

    // Ensure the test file exists and has valid extension
    const validExtensions = ['.test.ts', '.test.tsx', '.spec.ts'];
    const hasValidExtension = validExtensions.some(ext => testPath.endsWith(ext));
    if (!hasValidExtension) {
      return createErrorResponse('Invalid test file extension', 400);
    }

    const startTime = Date.now();

    try {
      // Determine if this is an E2E test or unit test
      const isE2E = testPath.startsWith('e2e/');

      // Build the test command
      const projectRoot = process.cwd();
      const fullPath = path.join(projectRoot, testPath);

      let command: string;
      if (isE2E) {
        // Use Playwright for E2E tests
        command = `npx playwright test "${fullPath}" --reporter=list`;
      } else {
        // Use Vitest for unit/integration tests
        command = `npx vitest run "${fullPath}" --reporter=verbose`;
      }

      // Execute the test
      const { stdout, stderr } = await execAsync(command, {
        cwd: projectRoot,
        timeout: 120000, // 2 minute timeout
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      });

      const duration = Date.now() - startTime;

      // Parse output to determine success
      const output = stdout + '\n' + stderr;
      // Check for vitest summary patterns - "N failed" where N > 0 indicates real failures
      const hasFailedTests = /\d+ failed/.test(output) && !/0 failed/.test(output);
      const hasFailMarker = / FAIL /.test(output);
      const success = !hasFailedTests && !hasFailMarker;

      return createSuccessResponse({
        success,
        testPath,
        duration,
        output: output.slice(-5000), // Last 5000 chars
        message: success ? 'Tests passed successfully' : 'Some tests failed'
      });
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      const execError = error as { stdout?: string; stderr?: string; message?: string };

      // Test failures throw errors, but we still want to show the output
      const output = execError.stdout || execError.stderr || execError.message || 'Unknown error';

      return createSuccessResponse({
        success: false,
        testPath,
        duration,
        output: output.slice(-5000),
        message: 'Tests failed or encountered an error'
      });
    }
  },
  {
    requireAuth: true,
    rateLimit: {
      requests: 10,
      windowMs: 60000, // 10 requests per minute
    },
  }
);

/**
 * GET /api/admin/tests/run
 * Get test runner status and available test files
 */
export const GET = apiHandler(
  async () => {
    return createSuccessResponse({
      status: 'ready',
      allowedDirs: ALLOWED_TEST_DIRS,
      message: 'Test runner is ready. POST with { testPath } to run a test.',
    });
  },
  {
    requireAuth: true,
  }
);
