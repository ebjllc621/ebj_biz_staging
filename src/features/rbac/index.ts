/**
 * AUTH-P1-1F-002_RBAC_Stub_v1 - Module Exports
 *
 * Central export point for RBAC module components
 */

// Core service
export { RbacService } from './RbacService';

// Types
export type {
  Role,
  Action,
  Resource,
  Principal,
  AuthorizationResult,
  PolicyMatrix
} from './types';

// Policy utilities
export {
  isAllowed,
  getAllowedResources,
  hasActionPermission,
  policy
} from './policy';