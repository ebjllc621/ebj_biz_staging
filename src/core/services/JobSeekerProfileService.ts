/**
 * JobSeekerProfileService - Job Seeker Profile Management Service
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ and @features/ aliases
 * - Error handling: BizError-based custom errors
 * - Build Map v2.1 ENHANCED patterns
 *
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 * @tier STANDARD
 * @phase Jobs Phase 4 - Platform Growth & Future Features
 * @reference src/features/profile/services/ProfileService.ts - Profile pattern
 */

import { DatabaseService, getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { DbResult } from '@core/types/db';
import { bigIntToNumber, safeJsonParse } from '@core/utils/bigint';
import type { JobSeekerProfileRow } from '@core/types/db-rows';
import type {
  JobSeekerProfile,
  CreateJobSeekerProfileInput,
  UpdateJobSeekerProfileInput,
  EmploymentPreferences
} from '@features/jobs/types';

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class JobSeekerProfileService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // ==========================================================================
  // PROFILE RETRIEVAL
  // ==========================================================================

  /**
   * Get job seeker profile by user ID
   */
  async getProfileByUserId(userId: number): Promise<JobSeekerProfile | null> {
    const query = `
      SELECT *
      FROM job_seeker_profiles
      WHERE user_id = ?
      LIMIT 1
    `;

    const result: DbResult<JobSeekerProfileRow> = await this.db.query(query, [userId]);
    const row = result.rows[0];

    return row ? this.mapRowToProfile(row) : null;
  }

  /**
   * Get job seeker profile by ID
   */
  async getProfileById(profileId: number): Promise<JobSeekerProfile | null> {
    const query = `
      SELECT *
      FROM job_seeker_profiles
      WHERE id = ?
      LIMIT 1
    `;

    const result: DbResult<JobSeekerProfileRow> = await this.db.query(query, [profileId]);
    const row = result.rows[0];

    return row ? this.mapRowToProfile(row) : null;
  }

  /**
   * Get discoverable profiles for candidate matching
   */
  async getDiscoverableProfiles(filters: {
    experience_level?: string;
    skills?: string[];
    location?: { city?: string; state?: string };
    limit?: number;
  }): Promise<JobSeekerProfile[]> {
    const conditions: string[] = ['is_discoverable = 1', 'is_actively_looking = 1'];
    const params: unknown[] = [];

    if (filters.experience_level) {
      conditions.push('experience_level = ?');
      params.push(filters.experience_level);
    }

    if (filters.skills && filters.skills.length > 0) {
      // MariaDB JSON_OVERLAPS for skill matching
      conditions.push('JSON_OVERLAPS(skills, CAST(? AS JSON))');
      params.push(JSON.stringify(filters.skills));
    }

    if (filters.location?.city) {
      conditions.push('JSON_SEARCH(employment_preferences, "one", ?, NULL, "$.locations[*].city") IS NOT NULL');
      params.push(filters.location.city);
    }

    if (filters.location?.state) {
      conditions.push('JSON_SEARCH(employment_preferences, "one", ?, NULL, "$.locations[*].state") IS NOT NULL');
      params.push(filters.location.state);
    }

    const limit = filters.limit || 50;
    params.push(limit);

    const query = `
      SELECT *
      FROM job_seeker_profiles
      WHERE ${conditions.join(' AND ')}
      ORDER BY updated_at DESC
      LIMIT ?
    `;

    const result: DbResult<JobSeekerProfileRow> = await this.db.query(query, params);
    return result.rows.map(row => this.mapRowToProfile(row));
  }

  // ==========================================================================
  // PROFILE MUTATIONS
  // ==========================================================================

  /**
   * Create job seeker profile
   */
  async createProfile(userId: number, input: CreateJobSeekerProfileInput): Promise<JobSeekerProfile> {
    // Check if profile already exists
    const existing = await this.getProfileByUserId(userId);
    if (existing) {
      throw new BizError({
        code: 'PROFILE_ALREADY_EXISTS',
        message: 'Job seeker profile already exists for this user'
      });
    }

    const query = `
      INSERT INTO job_seeker_profiles (
        user_id, headline, bio, skills, experience_level,
        years_experience, resume_file_url, employment_preferences,
        availability_date, is_actively_looking, is_discoverable,
        preferred_job_categories, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const params = [
      userId,
      input.headline || null,
      input.bio || null,
      input.skills ? JSON.stringify(input.skills) : null,
      input.experience_level || 'entry',
      input.years_experience || null,
      input.resume_file_url || null,
      input.employment_preferences ? JSON.stringify(input.employment_preferences) : null,
      input.availability_date || null,
      input.is_actively_looking ? 1 : 0,
      input.is_discoverable ? 1 : 0,
      input.preferred_job_categories ? JSON.stringify(input.preferred_job_categories) : null
    ];

    const result = await this.db.query(query, params);
    const insertId = bigIntToNumber(result.insertId);

    const profile = await this.getProfileById(insertId);
    if (!profile) {
      throw new BizError({
        code: 'PROFILE_CREATION_FAILED',
        message: 'Failed to retrieve created profile'
      });
    }

    return profile;
  }

  /**
   * Update job seeker profile
   */
  async updateProfile(userId: number, input: UpdateJobSeekerProfileInput): Promise<JobSeekerProfile> {
    const profile = await this.getProfileByUserId(userId);
    if (!profile) {
      throw new BizError({
        code: 'PROFILE_NOT_FOUND',
        message: 'Job seeker profile not found',
      });
    }

    const updates: string[] = [];
    const params: unknown[] = [];

    if (input.headline !== undefined) {
      updates.push('headline = ?');
      params.push(input.headline);
    }

    if (input.bio !== undefined) {
      updates.push('bio = ?');
      params.push(input.bio);
    }

    if (input.skills !== undefined) {
      updates.push('skills = ?');
      params.push(input.skills ? JSON.stringify(input.skills) : null);
    }

    if (input.experience_level !== undefined) {
      updates.push('experience_level = ?');
      params.push(input.experience_level);
    }

    if (input.years_experience !== undefined) {
      updates.push('years_experience = ?');
      params.push(input.years_experience);
    }

    if (input.resume_file_url !== undefined) {
      updates.push('resume_file_url = ?');
      params.push(input.resume_file_url);
      if (input.resume_file_url) {
        updates.push('resume_updated_at = NOW()');
      }
    }

    if (input.employment_preferences !== undefined) {
      updates.push('employment_preferences = ?');
      params.push(input.employment_preferences ? JSON.stringify(input.employment_preferences) : null);
    }

    if (input.availability_date !== undefined) {
      updates.push('availability_date = ?');
      params.push(input.availability_date);
    }

    if (input.is_actively_looking !== undefined) {
      updates.push('is_actively_looking = ?');
      params.push(input.is_actively_looking ? 1 : 0);
    }

    if (input.is_discoverable !== undefined) {
      updates.push('is_discoverable = ?');
      params.push(input.is_discoverable ? 1 : 0);
    }

    if (input.preferred_job_categories !== undefined) {
      updates.push('preferred_job_categories = ?');
      params.push(input.preferred_job_categories ? JSON.stringify(input.preferred_job_categories) : null);
    }

    if (updates.length === 0) {
      return profile;
    }

    updates.push('updated_at = NOW()');
    params.push(userId);

    const query = `
      UPDATE job_seeker_profiles
      SET ${updates.join(', ')}
      WHERE user_id = ?
    `;

    await this.db.query(query, params);

    const updatedProfile = await this.getProfileByUserId(userId);
    if (!updatedProfile) {
      throw new BizError({
        code: 'PROFILE_UPDATE_FAILED',
        message: 'Failed to retrieve updated profile'
      });
    }

    return updatedProfile;
  }

  /**
   * Delete job seeker profile
   */
  async deleteProfile(userId: number): Promise<void> {
    const profile = await this.getProfileByUserId(userId);
    if (!profile) {
      throw new BizError({
        code: 'PROFILE_NOT_FOUND',
        message: 'Job seeker profile not found',
      });
    }

    const query = 'DELETE FROM job_seeker_profiles WHERE user_id = ?';
    await this.db.query(query, [userId]);
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Map database row to JobSeekerProfile interface
   */
  private mapRowToProfile(row: JobSeekerProfileRow): JobSeekerProfile {
    return {
      id: row.id,
      user_id: row.user_id,
      headline: row.headline,
      bio: row.bio,
      skills: row.skills ? safeJsonParse<string[]>(row.skills, []) : null,
      experience_level: row.experience_level,
      years_experience: row.years_experience,
      resume_file_url: row.resume_file_url,
      resume_updated_at: row.resume_updated_at ? new Date(row.resume_updated_at) : null,
      employment_preferences: row.employment_preferences
        ? safeJsonParse<EmploymentPreferences | null>(row.employment_preferences, null)
        : null,
      availability_date: row.availability_date ? new Date(row.availability_date) : null,
      is_actively_looking: Boolean(row.is_actively_looking),
      is_discoverable: Boolean(row.is_discoverable),
      preferred_job_categories: row.preferred_job_categories
        ? safeJsonParse<number[]>(row.preferred_job_categories, [])
        : null,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }
}

// ============================================================================
// SERVICE REGISTRY
// ============================================================================

let serviceInstance: JobSeekerProfileService | null = null;

export function getJobSeekerProfileService(): JobSeekerProfileService {
  if (!serviceInstance) {
    const db = getDatabaseService();
    serviceInstance = new JobSeekerProfileService(db);
  }
  return serviceInstance;
}
