/**
 * Core Registry Exports
 *
 * Centralized exports for singleton service registries
 */

import AuthServiceRegistry from './AuthServiceRegistry';
export default AuthServiceRegistry;
export { AuthServiceRegistry };
export type { AuthRegistryHealthStatus, AuthServiceHealth } from './AuthServiceRegistry';