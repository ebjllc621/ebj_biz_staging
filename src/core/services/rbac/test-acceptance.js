/**
 * Acceptance Test for AUTH_rbac_can_min_v1
 *
 * Tests:
 * - can('admin','user:any:read') === true
 * - can('user','user:any:update') === false
 */

const { RbacService } = require('./RbacService.ts');

const service = new RbacService();

// Test 1: Admin should be able to read any user
const test1 = service.can('admin', 'user:any:read');
console.log(`Test 1 - can('admin','user:any:read'): ${test1} (expected: true)`);

// Test 2: User should NOT be able to update any user
const test2 = service.can('user', 'user:any:update');
console.log(`Test 2 - can('user','user:any:update'): ${test2} (expected: false)`);

// Additional verification tests
console.log('\nAdditional Verification:');
console.log(`User can session:read: ${service.can('user', 'session:read')} (expected: true)`);
console.log(`User can self:update: ${service.can('user', 'self:update')} (expected: true)`);
console.log(`Admin can self:update: ${service.can('admin', 'self:update')} (expected: true)`);
console.log(`Admin can user:any:update: ${service.can('admin', 'user:any:update')} (expected: true)`);

// Results
const passed = test1 === true && test2 === false;
console.log(`\nAcceptance Criteria: ${passed ? '✅ PASSED' : '❌ FAILED'}`);

process.exit(passed ? 0 : 1);
