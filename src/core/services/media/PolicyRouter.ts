/**
 * Media Policy Router
 *
 * Routes media uploads to appropriate providers based on Bizconekt ownership rules:
 *
 * CLOUDINARY-FIRST (User-Generated Content) - Served from Cloudinary CDN:
 * - users/**      → Cloudinary (avatars, profile media, audio, documents)
 * - listings/**   → Cloudinary (logos, covers, galleries, videos)
 * - offers/**     → Cloudinary
 * - events/**     → Cloudinary
 * - documents/**  → Cloudinary (user documents)
 * - Cloudstock/** → Cloudinary (provider stock images for testing/dev)
 * - NO LOCAL STORAGE for user content - Cloudinary is the only storage
 *
 * LOCAL-FIRST (Site/System Assets) - Served from local + async Cloudinary backup:
 * - site/**           → Local (branding, logos, favicons) + BACKUP to Cloudinary
 * - marketing/**      → Local (company marketing packages, page-building assets) + BACKUP to Cloudinary
 * - content/**        → Local (system content) + BACKUP to Cloudinary
 * - system/icons/**   → Local (UI icons) + BACKUP to Cloudinary
 * - temp/**           → Local only (no backup needed)
 *
 * MIRRORING DIRECTION: Local → Cloudinary (backup site assets)
 * NOT: Cloudinary → Local (never download user uploads to server)
 *
 * @authority Universal Media Manager compliance
 * @compliance E2.5 - Service Location Migration
 * @see .cursor/rules/universal-media-manager.mdc
 * @migrated-from src/services/media/PolicyRouter.ts
 */

export type MediaProviderType = 'local' | 'cloudinary';

export interface PolicyRouterConfig {
  /** Prefixes that should route to local storage */
  localPrefixes: string[];
  /** Prefixes that should route to cloud storage */
  cloudPrefixes: string[];
  /** Default provider when no prefix matches */
  defaultProvider: MediaProviderType;
}

export class PolicyRouter {
  private config: PolicyRouterConfig;

  constructor(config?: Partial<PolicyRouterConfig>) {
    this.config = {
      localPrefixes: [
        'site/',
        'marketing/',
        'content/images',
        'content/video',
        'system/icons',
        'temp/',
      ],
      cloudPrefixes: [
        'users/',
        'listings/',
        'offers/',
        'events/',
        'documents/',
        'jobs/',
        'review/',
        'Cloudstock/',
      ],
      defaultProvider: 'local',
      ...config,
    };
  }

  /**
   * Determine which provider should handle uploads for a given folder path
   * @param entityType The entity type (maps to folder structure)
   * @param entityId The entity ID
   * @param subfolder Optional subfolder within entity
   * @returns The provider type that should handle this upload
   */
  routeProvider(entityType: string, entityId?: string, subfolder?: string): MediaProviderType {
    // Build the folder path similar to how providers construct it
    const folderPath = this.buildFolderPath(entityType, entityId, subfolder);

    // Check against local prefixes first (site-owned assets)
    for (const prefix of this.config.localPrefixes) {
      if (folderPath.startsWith(prefix)) {

        return 'local';
      }
    }

    // Check against cloud prefixes (user-generated content)
    for (const prefix of this.config.cloudPrefixes) {
      if (folderPath.startsWith(prefix)) {

        return 'cloudinary';
      }
    }

    // Use default provider for unmatched paths

    return this.config.defaultProvider;
  }

  /**
   * Check if a folder path should trigger mirroring to Cloudinary backup
   * Mirroring is triggered for LOCAL-FIRST content (sites/**, content/**, system/**)
   * These are site-owned assets that should be backed up to Cloudinary CDN
   *
   * User-generated content (users/**, listings/**, events/**) uploads directly to
   * Cloudinary and does NOT get mirrored locally - Cloudinary is the system of record.
   *
   * @param entityType The entity type
   * @param entityId The entity ID
   * @param subfolder Optional subfolder
   * @returns True if mirroring to Cloudinary should be performed
   */
  shouldMirror(entityType: string, entityId?: string, subfolder?: string): boolean {
    const folderPath = this.buildFolderPath(entityType, entityId, subfolder);

    // Only mirror LOCAL-FIRST content TO Cloudinary as backup
    // Site assets (branding, logos, system icons) should be backed up
    for (const prefix of this.config.localPrefixes) {
      // Skip temp files - no backup needed
      if (prefix === 'temp/') continue;

      if (folderPath.startsWith(prefix)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get the system of record (authoritative source) for a folder path
   * @param entityType The entity type
   * @param entityId The entity ID
   * @param subfolder Optional subfolder
   * @returns The provider that is the authoritative source
   */
  getSystemOfRecord(entityType: string, entityId?: string, subfolder?: string): MediaProviderType {
    return this.routeProvider(entityType, entityId, subfolder);
  }

  /**
   * Get configuration for debugging and monitoring
   * @returns Current policy configuration
   */
  getConfig(): PolicyRouterConfig {
    return { ...this.config };
  }

  /**
   * Update policy configuration (for dynamic policy changes)
   * @param newConfig Partial configuration to merge
   */
  updateConfig(newConfig: Partial<PolicyRouterConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Validate if an entity type and path combination is allowed
   * @param entityType The entity type
   * @param entityId The entity ID
   * @param subfolder Optional subfolder
   * @returns True if the path is valid according to policy
   */
  validatePath(entityType: string, entityId?: string, subfolder?: string): boolean {
    const folderPath = this.buildFolderPath(entityType, entityId, subfolder);

    // Basic validation rules
    if (!entityType || entityType.trim() === '') {
      return false;
    }

    // Check for invalid characters or patterns
    if (folderPath.includes('..') || folderPath.includes('//')) {
      return false;
    }

    // Ensure path follows expected patterns
    const allPrefixes = [...this.config.localPrefixes, ...this.config.cloudPrefixes];
    const hasValidPrefix = allPrefixes.some(prefix => folderPath.startsWith(prefix));

    // Allow paths that match known prefixes or follow the default pattern
    return hasValidPrefix || this.isValidDefaultPath(folderPath);
  }

  /**
   * Get routing statistics for monitoring
   * @returns Routing statistics
   */
  getRoutingStats(): {
    localPrefixes: string[];
    cloudPrefixes: string[];
    defaultProvider: MediaProviderType;
    totalRules: number;
  } {
    return {
      localPrefixes: [...this.config.localPrefixes],
      cloudPrefixes: [...this.config.cloudPrefixes],
      defaultProvider: this.config.defaultProvider,
      totalRules: this.config.localPrefixes.length + this.config.cloudPrefixes.length,
    };
  }

  // Private helper methods

  private buildFolderPath(entityType: string, entityId?: string, subfolder?: string): string {
    const parts = [entityType];
    if (entityId) {
      parts.push(entityId);
    }
    if (subfolder) {
      parts.push(subfolder);
    }
    return parts.join('/');
  }

  private isValidDefaultPath(folderPath: string): boolean {
    // Allow simple entity/id patterns for the default provider
    const pathParts = folderPath.split('/');
    return pathParts.length >= 1 && pathParts.length <= 3 &&
           pathParts.every(part => part.trim() !== '');
  }
}

// Create singleton instance with default Bizconekt configuration
let policyRouterInstance: PolicyRouter | null = null;

/**
 * Get the singleton PolicyRouter instance with Bizconekt-specific rules
 * @returns PolicyRouter instance
 */
export function getPolicyRouter(): PolicyRouter {
  if (!policyRouterInstance) {
    policyRouterInstance = new PolicyRouter({
      localPrefixes: [
        'site/',
        'marketing/',
        'content/images',
        'content/video',
        'system/icons',
        'temp/',
      ],
      cloudPrefixes: [
        'users/',
        'listings/',
        'offers/',
        'events/',
        'documents/',
        'jobs/',
        'review/',
        'Cloudstock/',
      ],
      defaultProvider: 'local',
    });
  }
  return policyRouterInstance;
}

export default PolicyRouter;
