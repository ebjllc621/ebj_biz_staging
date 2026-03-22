import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { DbResult } from '@core/types/db';
import { bigIntToNumber } from '@core/utils/bigint';
import {
  RecommendedConnection,
  MutualConnectionSample,
  RecommendationWeights,
  RecommendationOptions,
  RecommendationFeedback,
  UserRecommendationPreferences,
  UpdateRecommendationPreferencesInput,
  DEFAULT_RECOMMENDATION_WEIGHTS,
  RecommendationPresetProfile,
  PRESET_PROFILES
} from '../types';
import { ProfileVisibilitySettings } from '@features/profile/types';

/**
 * RecommendationService
 *
 * Handles connection recommendation logic including:
 * - Multi-factor scoring algorithm
 * - Mutual connection analysis
 * - User feedback tracking
 * - Dismissed user filtering
 */
export class RecommendationService {
  private db: DatabaseService;

  /**
   * Goal theme keywords for alignment detection
   * @phase Phase 8A
   */
  private readonly GOAL_THEMES = [
    'startup', 'entrepreneur', 'business', 'career', 'mentor',
    'learn', 'grow', 'networking', 'collaborate', 'investment',
    'skills', 'leadership', 'management', 'creative', 'technical',
    'innovation', 'consulting', 'freelance', 'remote', 'team'
  ] as const;

  /**
   * Hobby keywords for alignment detection
   * @phase Phase 8B
   */
  private readonly HOBBY_KEYWORDS = [
    'reading', 'writing', 'music', 'sports', 'travel', 'cooking',
    'photography', 'gaming', 'hiking', 'fitness', 'yoga', 'running',
    'cycling', 'swimming', 'dancing', 'painting', 'drawing', 'crafts',
    'gardening', 'movies', 'theater', 'camping', 'fishing', 'golf',
    'tennis', 'basketball', 'soccer', 'football', 'baseball', 'volleyball',
    'meditation', 'coding', 'technology', 'investing', 'woodworking'
  ] as const;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  /**
   * Get connection recommendations for a user
   *
   * @param userId - The user to generate recommendations for
   * @param options - Filtering and pagination options
   * @param customWeights - Optional custom weights (if not provided, user preferences or defaults are used)
   * @returns Array of recommended connections with scores
   */
  async getConnectionRecommendations(
    userId: number,
    options: RecommendationOptions = {},
    customWeights?: RecommendationWeights
  ): Promise<{ recommendations: RecommendedConnection[]; total: number }> {
    try {
      // Get user preferences for weights and threshold
      const userPrefs = await this.getUserPreferences(userId);
      const weights = customWeights || userPrefs.weights;

      const {
        limit = 10,
        offset = 0,
        minScore = userPrefs.minScoreThreshold, // Use user's threshold as default
        industry,
        location
      } = options;

      // Get dismissed user IDs to exclude
      const dismissedIds = await this.getDismissedUserIds(userId);

      // Build candidate query with filters
      // GOVERNANCE: user_connection table uses sender_user_id/receiver_user_id columns
      let whereConditions = [
        'u.id != ?',
        'u.id NOT IN (SELECT receiver_user_id FROM user_connection WHERE sender_user_id = ? AND status = "connected")',
        'u.id NOT IN (SELECT sender_user_id FROM user_connection WHERE receiver_user_id = ? AND status = "connected")',
        'u.id NOT IN (SELECT receiver_user_id FROM connection_request WHERE sender_user_id = ? AND status = "pending")',
        'u.id NOT IN (SELECT sender_user_id FROM connection_request WHERE receiver_user_id = ? AND status = "pending")'
      ];

      const params: any[] = [userId, userId, userId, userId, userId];

      // Exclude dismissed users
      if (dismissedIds.length > 0) {
        whereConditions.push(`u.id NOT IN (${dismissedIds.map(() => '?').join(',')})`);
        params.push(...dismissedIds);
      }

      // Add industry filter if provided (uses occupation from users table)
      if (industry) {
        whereConditions.push('u.occupation = ?');
        params.push(industry);
      }

      // Add location filter if provided (uses city from users table)
      if (location) {
        whereConditions.push('u.city = ?');
        params.push(location);
      }

      // Query candidate users
      // GOVERNANCE: Profile data is in users table directly (no user_profiles table)
      // GOVERNANCE: Use connection_request_tracking for reputation_score (user_reputation table doesn't exist)
      // Column mappings: headline->occupation, industry->occupation, location->city
      const candidatesQuery = `
        SELECT
          u.id,
          u.username,
          u.display_name,
          u.avatar_url,
          u.occupation as headline,
          u.occupation as industry,
          u.city as location,
          50 as profile_completeness,
          COALESCE(crt.reputation_score, 50) as reputation_score
        FROM users u
        LEFT JOIN connection_request_tracking crt ON u.id = crt.user_id
        WHERE ${whereConditions.join(' AND ')}
        LIMIT 100
      `;

      const candidatesResult: DbResult<any> = await this.db.query(candidatesQuery, params);
      const candidates = candidatesResult.rows || [];

      // Calculate scores for each candidate
      const scoredRecommendations: RecommendedConnection[] = [];

      for (const candidate of candidates) {
        const scoreResult = await this.calculateRecommendationScore(
          userId,
          candidate.id,
          weights
        );

        // Only include if meets minimum score
        if (scoreResult.totalScore >= minScore) {
          // Get mutual connection data
          const mutualData = await this.getMutualConnectionData(userId, candidate.id);

          // Generate reason list
          const reasons = this.generateReasons(mutualData.count, candidate, scoreResult.metadata);

          scoredRecommendations.push({
            userId: candidate.id,
            username: candidate.username,
            displayName: candidate.display_name,
            avatarUrl: candidate.avatar_url,
            avatarBgColor: null,
            headline: candidate.headline,
            industry: candidate.industry,
            location: candidate.location,
            score: Math.round(scoreResult.totalScore * 100) / 100, // Round to 2 decimals
            mutualConnectionCount: mutualData.count,
            mutualConnections: mutualData.sample,
            reasons
          });
        }
      }

      // Sort by score descending
      scoredRecommendations.sort((a, b) => b.score - a.score);

      // Apply pagination
      const total = scoredRecommendations.length;
      const paginatedResults = scoredRecommendations.slice(offset, offset + limit);

      return {
        recommendations: paginatedResults,
        total
      };
    } catch (error) {
      throw new BizError({
        code: 'RECOMMENDATION_ERROR',
        message: 'Failed to get connection recommendations',
        context: { userId, options, originalError: error }
      });
    }
  }

  /**
   * Parse skills JSON safely (handles mariadb auto-parsing)
   * @phase Phase 8A
   */
  private parseSkillsJson(skills: string | string[] | null): string[] {
    if (!skills) return [];
    if (Array.isArray(skills)) return skills;
    try {
      const parsed = JSON.parse(skills);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Parse visibility settings safely (handles mariadb auto-parsing)
   * @phase Phase 8A
   */
  private parseVisibilitySettings(
    settings: string | ProfileVisibilitySettings | null
  ): ProfileVisibilitySettings | null {
    if (!settings) return null;
    if (typeof settings === 'object') return settings as ProfileVisibilitySettings;
    try {
      return JSON.parse(settings) as ProfileVisibilitySettings;
    } catch {
      return null;
    }
  }

  /**
   * Extract keywords from goals text
   * @phase Phase 8A
   */
  private extractGoalKeywords(goals: string): string[] {
    return goals
      .toLowerCase()
      .split(/[\s,;.!?]+/)
      .map(w => w.trim())
      .filter(w => w.length > 3);
  }

  /**
   * Extract hobby keywords from hobbies text
   * @phase Phase 8B
   */
  private extractHobbyKeywords(hobbies: string): string[] {
    return hobbies
      .toLowerCase()
      .split(/[\s,;.!?]+/)
      .map(w => w.trim())
      .filter(w => w.length > 0);
  }

  /**
   * Normalize education institution name for matching
   * @phase Phase 8C
   */
  private normalizeEducationName(name: string | null): string {
    if (!name) return '';
    return name
      .trim()
      .toLowerCase()
      .replace(/^the\s+/i, '') // Remove leading "The"
      .replace(/\buniversity\b/gi, 'univ')
      .replace(/\bcollege\b/gi, 'coll')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract field of study from degree string
   * @phase Phase 8C
   */
  private extractFieldOfStudy(degree: string | null): string | null {
    if (!degree) return null;

    // Common degree types to strip
    const degreeTypes = ['BACHELOR', 'MASTER', 'DOCTORATE', 'PHD', 'MBA', 'BA', 'BS', 'MA', 'MS'];

    let field = degree;
    for (const type of degreeTypes) {
      field = field.replace(new RegExp(`\\b${type}\\b`, 'gi'), '');
    }

    // Remove common prepositions and articles
    field = field
      .replace(/\bof\b/gi, '')
      .replace(/\bin\b/gi, '')
      .replace(/\bscience\b/gi, '')
      .replace(/\barts\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    return field.length > 0 ? field.toLowerCase().trim() : null;
  }

  /**
   * Normalize location string for matching
   * @phase Phase 8C
   */
  private normalizeLocation(location: string | null): string {
    if (!location) return '';
    return location
      .trim()
      .toLowerCase()
      .replace(/[,\s]+/g, ' ')
      .trim();
  }

  /**
   * Calculate skills overlap score between two users
   * @phase Phase 8A
   */
  private calculateSkillsOverlap(
    userSkills: string[],
    candidateSkills: string[],
    candidateVisibility: ProfileVisibilitySettings | null,
    weight: number
  ): { score: number; matchingSkills: string[] } {
    // Privacy check: respect visibility settings
    if (candidateVisibility?.showSkills === 'hidden') {
      return { score: 0, matchingSkills: [] };
    }

    // Normalize skills for comparison (lowercase, trimmed)
    const normalizedUserSkills = new Set(
      userSkills.map(s => s.toLowerCase().trim()).filter(s => s.length > 0)
    );
    const normalizedCandidateSkills = new Set(
      candidateSkills.map(s => s.toLowerCase().trim()).filter(s => s.length > 0)
    );

    // Find matching skills
    const matchingSkills: string[] = [];
    for (const skill of normalizedUserSkills) {
      if (normalizedCandidateSkills.has(skill)) {
        // Use original casing from candidate
        const originalSkill = candidateSkills.find(
          s => s.toLowerCase().trim() === skill
        );
        if (originalSkill) matchingSkills.push(originalSkill);
      }
    }

    // Score: 2 points per matching skill, max weight points
    const score = Math.min(matchingSkills.length * 2, weight);

    return { score, matchingSkills };
  }

  /**
   * Calculate goals alignment score between two users
   * @phase Phase 8A
   */
  private calculateGoalsAlignment(
    userGoals: string | null,
    candidateGoals: string | null,
    candidateVisibility: ProfileVisibilitySettings | null,
    weight: number
  ): { score: number; matchingThemes: string[] } {
    // Privacy check: respect visibility settings
    if (candidateVisibility?.showGoals === false) {
      return { score: 0, matchingThemes: [] };
    }

    // Handle null/empty goals
    if (!userGoals?.trim() || !candidateGoals?.trim()) {
      return { score: 0, matchingThemes: [] };
    }

    // Extract keywords from goals text
    const userKeywords = this.extractGoalKeywords(userGoals);
    const candidateKeywords = this.extractGoalKeywords(candidateGoals);

    // Find matching themes
    const matchingThemes: string[] = [];
    for (const theme of this.GOAL_THEMES) {
      const userHas = userKeywords.some(k => k.includes(theme));
      const candidateHas = candidateKeywords.some(k => k.includes(theme));
      if (userHas && candidateHas) {
        matchingThemes.push(theme);
      }
    }

    // Score: 2 points per matching theme, max weight points
    const score = Math.min(matchingThemes.length * 2, weight);

    return { score, matchingThemes };
  }

  /**
   * Calculate interest category overlap score between two users
   * @phase Phase 8B
   */
  private async calculateInterestOverlap(
    userId: number,
    candidateId: number,
    candidateVisibility: ProfileVisibilitySettings | null,
    weight: number
  ): Promise<{ score: number; matchingCategories: string[] }> {
    // Privacy check: respect visibility settings
    if (candidateVisibility?.showCategoryInterests === 'hidden') {
      return { score: 0, matchingCategories: [] };
    }

    try {
      // Query matching category interests
      const interestQuery = `
        SELECT DISTINCT c.name
        FROM user_interests ui1
        JOIN user_interests ui2 ON ui1.category_id = ui2.category_id
        JOIN categories c ON ui1.category_id = c.id
        WHERE ui1.user_id = ?
          AND ui2.user_id = ?
          AND ui1.interest_type = 'category'
          AND ui2.interest_type = 'category'
          AND ui1.is_visible = 1
          AND ui2.is_visible = 1
      `;

      const result: DbResult<any> = await this.db.query(interestQuery, [userId, candidateId]);
      const matchingCategories = (result.rows || []).map(row => row.name);

      // Score: 2 points per matching category, max weight points
      const score = Math.min(matchingCategories.length * 2, weight);

      return { score, matchingCategories };
    } catch (error) {
      // Return zero score on error rather than failing
      return { score: 0, matchingCategories: [] };
    }
  }

  /**
   * Calculate hobbies alignment score between two users
   * @phase Phase 8B
   */
  private calculateHobbiesAlignment(
    userHobbies: string | null,
    candidateHobbies: string | null,
    candidateVisibility: ProfileVisibilitySettings | null,
    weight: number
  ): { score: number; matchingHobbies: string[] } {
    // Privacy check: respect visibility settings
    if (candidateVisibility?.showHobbies === 'hidden') {
      return { score: 0, matchingHobbies: [] };
    }

    // Handle null/empty hobbies
    if (!userHobbies?.trim() || !candidateHobbies?.trim()) {
      return { score: 0, matchingHobbies: [] };
    }

    // Extract keywords from hobbies text
    const userKeywords = this.extractHobbyKeywords(userHobbies);
    const candidateKeywords = this.extractHobbyKeywords(candidateHobbies);

    // Find matching hobby keywords
    const matchingHobbies: string[] = [];
    for (const hobby of this.HOBBY_KEYWORDS) {
      const userHas = userKeywords.some(k => k.includes(hobby));
      const candidateHas = candidateKeywords.some(k => k.includes(hobby));
      if (userHas && candidateHas) {
        matchingHobbies.push(hobby);
      }
    }

    // Score: 1 point per matching hobby keyword, max weight points
    const score = Math.min(matchingHobbies.length, weight);

    return { score, matchingHobbies };
  }

  /**
   * Calculate education match score between two users
   * @phase Phase 8C
   */
  private calculateEducationMatch(
    userEducation: {
      college: string | null;
      college_year: number | null;
      degree: string | null;
      high_school: string | null;
      high_school_year: number | null;
    },
    candidateEducation: {
      college: string | null;
      college_year: number | null;
      degree: string | null;
      high_school: string | null;
      high_school_year: number | null;
    },
    candidateVisibility: ProfileVisibilitySettings | null,
    weight: number
  ): { score: number; matchType: 'college' | 'high_school' | 'degree' | null; details: string | null } {
    // Privacy check: respect visibility settings
    if (candidateVisibility?.showEducation === 'hidden') {
      return { score: 0, matchType: null, details: null };
    }

    let score = 0;
    let matchType: 'college' | 'high_school' | 'degree' | null = null;
    let details: string | null = null;

    // Check college match
    if (userEducation.college && candidateEducation.college) {
      const userCollege = this.normalizeEducationName(userEducation.college);
      const candidateCollege = this.normalizeEducationName(candidateEducation.college);

      if (userCollege === candidateCollege) {
        score += 4; // Base college match
        matchType = 'college';
        details = candidateEducation.college;

        // Cohort bonus: ±2 years
        if (userEducation.college_year && candidateEducation.college_year) {
          const yearDiff = Math.abs(userEducation.college_year - candidateEducation.college_year);
          if (yearDiff <= 2) {
            score += 2;
          }
        }

        // Field of study match
        if (userEducation.degree && candidateEducation.degree) {
          const userField = this.extractFieldOfStudy(userEducation.degree);
          const candidateField = this.extractFieldOfStudy(candidateEducation.degree);

          if (userField && candidateField && userField === candidateField) {
            score += 2;
            matchType = 'degree';
          }
        }
      }
    }

    // Fallback to high school match if no college match
    if (score === 0 && userEducation.high_school && candidateEducation.high_school) {
      const userHS = this.normalizeEducationName(userEducation.high_school);
      const candidateHS = this.normalizeEducationName(candidateEducation.high_school);

      if (userHS === candidateHS) {
        score += 3; // High school match worth less than college
        matchType = 'high_school';
        details = candidateEducation.high_school;
      }
    }

    // Cap at weight
    score = Math.min(score, weight);

    return { score, matchType, details };
  }

  /**
   * Calculate hometown match score between two users
   * @phase Phase 8C
   */
  private calculateHometownMatch(
    userHometown: string | null,
    candidateHometown: string | null,
    candidateVisibility: ProfileVisibilitySettings | null,
    weight: number
  ): { score: number; matchingHometown: string | null } {
    // Privacy check: respect visibility settings
    if (candidateVisibility?.showHometown === 'hidden') {
      return { score: 0, matchingHometown: null };
    }

    // Handle null/empty hometown
    if (!userHometown || !candidateHometown) {
      return { score: 0, matchingHometown: null };
    }

    // Normalize and compare
    const normalizedUser = this.normalizeLocation(userHometown);
    const normalizedCandidate = this.normalizeLocation(candidateHometown);

    if (normalizedUser === normalizedCandidate) {
      return { score: weight, matchingHometown: candidateHometown };
    }

    return { score: 0, matchingHometown: null };
  }

  /**
   * Calculate group overlap score between two users
   * @phase Phase 8C
   */
  private async calculateGroupOverlap(
    userId: number,
    candidateId: number,
    candidateVisibility: ProfileVisibilitySettings | null,
    weight: number
  ): Promise<{ score: number; matchingGroups: string[] }> {
    // Privacy check: respect visibility settings
    if (candidateVisibility?.showGroups === 'hidden') {
      return { score: 0, matchingGroups: [] };
    }

    try {
      // Query matching groups from user_interests
      const groupQuery = `
        SELECT DISTINCT ui1.group_name
        FROM user_interests ui1
        JOIN user_interests ui2 ON ui1.group_name = ui2.group_name
        WHERE ui1.user_id = ?
          AND ui2.user_id = ?
          AND ui1.interest_type = 'group'
          AND ui2.interest_type = 'group'
          AND ui1.group_name IS NOT NULL
          AND ui2.group_name IS NOT NULL
          AND ui1.is_visible = 1
          AND ui2.is_visible = 1
      `;

      const result: DbResult<any> = await this.db.query(groupQuery, [userId, candidateId]);
      const matchingGroups = (result.rows || []).map(row => row.group_name);

      // Score: 1 point per matching group, max weight points
      const score = Math.min(matchingGroups.length, weight);

      return { score, matchingGroups };
    } catch (error) {
      // Return zero score on error rather than failing
      return { score: 0, matchingGroups: [] };
    }
  }

  /**
   * Calculate recommendation score for a candidate user
   * Uses weighted multi-factor algorithm
   *
   * @param userId - The user requesting recommendations
   * @param candidateId - The candidate to score
   * @param weights - Scoring weights to use (defaults provided if not specified)
   * @returns Score and metadata for reason generation
   * @phase Phase 8A - Extended with skills and goals metadata
   * @phase Phase 8B - Extended with interests and hobbies metadata
   * @phase Phase 8C - Extended with education, hometown, and groups metadata
   */
  private async calculateRecommendationScore(
    userId: number,
    candidateId: number,
    weights: RecommendationWeights = DEFAULT_RECOMMENDATION_WEIGHTS
  ): Promise<{
    totalScore: number;
    metadata: {
      matchingSkills: string[];
      matchingGoalThemes: string[];
      matchingCategories: string[];
      matchingHobbies: string[];
      educationMatch?: { matchType: 'college' | 'high_school' | 'degree' | null; details: string | null };
      matchingHometown?: string | null;
      matchingGroups: string[];
    };
  }> {
    let totalScore = 0;
    const metadata: {
      matchingSkills: string[];
      matchingGoalThemes: string[];
      matchingCategories: string[];
      matchingHobbies: string[];
      educationMatch?: { matchType: 'college' | 'high_school' | 'degree' | null; details: string | null };
      matchingHometown?: string | null;
      matchingGroups: string[];
    } = {
      matchingSkills: [],
      matchingGoalThemes: [],
      matchingCategories: [],
      matchingHobbies: [],
      matchingGroups: []
    };

    // Factor 1: Mutual Connections (0-35 points)
    // GOVERNANCE: user_connection uses sender_user_id/receiver_user_id, status='connected'
    // Find users connected to BOTH userId and candidateId
    const mutualConnectionsQuery = `
      SELECT COUNT(DISTINCT mutual_user) as count
      FROM (
        SELECT CASE WHEN uc1.sender_user_id = ? THEN uc1.receiver_user_id ELSE uc1.sender_user_id END as mutual_user
        FROM user_connection uc1
        WHERE (uc1.sender_user_id = ? OR uc1.receiver_user_id = ?)
          AND uc1.status = 'connected'
      ) AS user_connections
      WHERE mutual_user IN (
        SELECT CASE WHEN uc2.sender_user_id = ? THEN uc2.receiver_user_id ELSE uc2.sender_user_id END
        FROM user_connection uc2
        WHERE (uc2.sender_user_id = ? OR uc2.receiver_user_id = ?)
          AND uc2.status = 'connected'
      )
    `;
    const mutualResult: DbResult<any> = await this.db.query(mutualConnectionsQuery, [userId, userId, userId, candidateId, candidateId, candidateId]);
    const mutualCount = bigIntToNumber(mutualResult.rows?.[0]?.count || 0);
    const mutualScore = Math.min(mutualCount * 5, weights.mutualConnections);
    totalScore += mutualScore;

    // Factor 2: Industry Match (0-20 points)
    // GOVERNANCE: Profile data is in users table directly - use occupation for industry matching
    const industryQuery = `
      SELECT
        u1.occupation as user_industry,
        u2.occupation as candidate_industry
      FROM users u1
      CROSS JOIN users u2
      WHERE u1.id = ? AND u2.id = ?
    `;
    const industryResult: DbResult<any> = await this.db.query(industryQuery, [userId, candidateId]);
    const industryMatch = industryResult.rows?.[0];
    if (industryMatch?.user_industry && industryMatch?.candidate_industry) {
      if (industryMatch.user_industry === industryMatch.candidate_industry) {
        totalScore += weights.industryMatch;
      }
    }

    // Factor 3: Location Proximity (0-15 points)
    // GOVERNANCE: Profile data is in users table directly - use city for location matching
    const locationQuery = `
      SELECT
        u1.city as user_location,
        u2.city as candidate_location
      FROM users u1
      CROSS JOIN users u2
      WHERE u1.id = ? AND u2.id = ?
    `;
    const locationResult: DbResult<any> = await this.db.query(locationQuery, [userId, candidateId]);
    const locationMatch = locationResult.rows?.[0];
    if (locationMatch?.user_location && locationMatch?.candidate_location) {
      if (locationMatch.user_location === locationMatch.candidate_location) {
        totalScore += weights.location;
      }
    }

    // Factor 4: Engagement Activity (0-10 points)
    // GOVERNANCE: DB inventory verified - reviews exists, user_bookmarks exists (not bookmarks), appointments doesn't exist
    // Score based on recent activity (reviews, bookmarks)
    const engagementQuery = `
      SELECT
        (SELECT COUNT(*) FROM reviews WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)) as recent_reviews,
        (SELECT COUNT(*) FROM user_bookmarks WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)) as recent_bookmarks
    `;
    const engagementResult: DbResult<any> = await this.db.query(engagementQuery, [candidateId, candidateId]);
    const engagement = engagementResult.rows?.[0];
    const activityScore = Math.min(
      (bigIntToNumber(engagement?.recent_reviews || 0) +
       bigIntToNumber(engagement?.recent_bookmarks || 0)) * 0.5,
      weights.engagement
    );
    totalScore += activityScore;

    // Factor 5: Reputation Score (0-10 points)
    // GOVERNANCE: Use connection_request_tracking for reputation_score (user_reputation table doesn't exist)
    const reputationQuery = `
      SELECT reputation_score FROM connection_request_tracking WHERE user_id = ?
    `;
    const reputationResult: DbResult<any> = await this.db.query(reputationQuery, [candidateId]);
    const reputationScore = reputationResult.rows?.[0]?.reputation_score || 50; // Default 50 (neutral)
    // Normalize reputation (0-100 scale in connection_request_tracking) to weight
    const normalizedReputation = Math.min((reputationScore / 100) * weights.reputation, weights.reputation);
    totalScore += normalizedReputation;

    // Factor 6: Profile Completeness (0-10 points)
    // GOVERNANCE: No user_profiles table - calculate completeness from users table fields
    const profileQuery = `
      SELECT
        bio, occupation, city, avatar_url
      FROM users WHERE id = ?
    `;
    const profileResult: DbResult<any> = await this.db.query(profileQuery, [candidateId]);
    const profile = profileResult.rows?.[0];
    // Calculate completeness based on filled fields (25% each)
    let completeness = 0;
    if (profile?.bio) completeness += 25;
    if (profile?.occupation) completeness += 25;
    if (profile?.city) completeness += 25;
    if (profile?.avatar_url) completeness += 25;
    // Completeness is 0-100, scale to weight
    const completenessScore = (completeness / 100) * weights.profileCompleteness;
    totalScore += completenessScore;

    // Factor 7: Skills Overlap (0-10 points)
    // @phase Phase 8A
    const skillsQuery = `
      SELECT
        u1.skills as user_skills,
        u2.skills as candidate_skills,
        u2.visibility_settings as candidate_visibility
      FROM users u1
      CROSS JOIN users u2
      WHERE u1.id = ? AND u2.id = ?
    `;
    const skillsResult: DbResult<any> = await this.db.query(skillsQuery, [userId, candidateId]);
    const skillsData = skillsResult.rows?.[0];

    if (skillsData) {
      // Parse skills JSON (mariadb may auto-parse)
      const userSkills = this.parseSkillsJson(skillsData.user_skills);
      const candidateSkills = this.parseSkillsJson(skillsData.candidate_skills);
      const candidateVisibility = this.parseVisibilitySettings(skillsData.candidate_visibility);

      const skillsScoreData = this.calculateSkillsOverlap(
        userSkills,
        candidateSkills,
        candidateVisibility,
        weights.skillsOverlap
      );
      totalScore += skillsScoreData.score;
      metadata.matchingSkills = skillsScoreData.matchingSkills;
    }

    // Factor 8: Goals Alignment (0-7 points)
    // @phase Phase 8A
    const goalsQuery = `
      SELECT
        u1.goals as user_goals,
        u2.goals as candidate_goals,
        u2.visibility_settings as candidate_visibility
      FROM users u1
      CROSS JOIN users u2
      WHERE u1.id = ? AND u2.id = ?
    `;
    const goalsResult: DbResult<any> = await this.db.query(goalsQuery, [userId, candidateId]);
    const goalsData = goalsResult.rows?.[0];

    if (goalsData) {
      const candidateVisibility = this.parseVisibilitySettings(goalsData.candidate_visibility);

      const goalsScoreData = this.calculateGoalsAlignment(
        goalsData.user_goals,
        goalsData.candidate_goals,
        candidateVisibility,
        weights.goalsAlignment
      );
      totalScore += goalsScoreData.score;
      metadata.matchingGoalThemes = goalsScoreData.matchingThemes;
    }

    // Factor 9: Interest Category Overlap (0-10 points)
    // @phase Phase 8B
    const interestVisibilityQuery = `
      SELECT visibility_settings FROM users WHERE id = ?
    `;
    const interestVisibilityResult: DbResult<any> = await this.db.query(interestVisibilityQuery, [candidateId]);
    const candidateVisibilityForInterests = this.parseVisibilitySettings(
      interestVisibilityResult.rows?.[0]?.visibility_settings
    );

    const interestScoreData = await this.calculateInterestOverlap(
      userId,
      candidateId,
      candidateVisibilityForInterests,
      weights.interestOverlap
    );
    totalScore += interestScoreData.score;
    metadata.matchingCategories = interestScoreData.matchingCategories;

    // Factor 10: Hobbies Alignment (0-5 points)
    // @phase Phase 8B
    const hobbiesQuery = `
      SELECT
        u1.hobbies as user_hobbies,
        u2.hobbies as candidate_hobbies,
        u2.visibility_settings as candidate_visibility
      FROM users u1
      CROSS JOIN users u2
      WHERE u1.id = ? AND u2.id = ?
    `;
    const hobbiesResult: DbResult<any> = await this.db.query(hobbiesQuery, [userId, candidateId]);
    const hobbiesData = hobbiesResult.rows?.[0];

    if (hobbiesData) {
      const candidateVisibility = this.parseVisibilitySettings(hobbiesData.candidate_visibility);

      const hobbiesScoreData = this.calculateHobbiesAlignment(
        hobbiesData.user_hobbies,
        hobbiesData.candidate_hobbies,
        candidateVisibility,
        weights.hobbiesAlignment
      );
      totalScore += hobbiesScoreData.score;
      metadata.matchingHobbies = hobbiesScoreData.matchingHobbies;
    }

    // Factor 11: Education Match (0-8 points)
    // @phase Phase 8C
    const educationQuery = `
      SELECT
        u1.college as user_college,
        u1.college_year as user_college_year,
        u1.degree as user_degree,
        u1.high_school as user_high_school,
        u1.high_school_year as user_high_school_year,
        u2.college as candidate_college,
        u2.college_year as candidate_college_year,
        u2.degree as candidate_degree,
        u2.high_school as candidate_high_school,
        u2.high_school_year as candidate_high_school_year,
        u2.visibility_settings as candidate_visibility
      FROM users u1
      CROSS JOIN users u2
      WHERE u1.id = ? AND u2.id = ?
    `;
    const educationResult: DbResult<any> = await this.db.query(educationQuery, [userId, candidateId]);
    const educationData = educationResult.rows?.[0];

    if (educationData) {
      const candidateVisibility = this.parseVisibilitySettings(educationData.candidate_visibility);

      const educationScoreData = this.calculateEducationMatch(
        {
          college: educationData.user_college,
          college_year: educationData.user_college_year,
          degree: educationData.user_degree,
          high_school: educationData.user_high_school,
          high_school_year: educationData.user_high_school_year
        },
        {
          college: educationData.candidate_college,
          college_year: educationData.candidate_college_year,
          degree: educationData.candidate_degree,
          high_school: educationData.candidate_high_school,
          high_school_year: educationData.candidate_high_school_year
        },
        candidateVisibility,
        weights.educationMatch
      );
      totalScore += educationScoreData.score;
      metadata.educationMatch = {
        matchType: educationScoreData.matchType,
        details: educationScoreData.details
      };
    }

    // Factor 12: Hometown Match (0-4 points)
    // @phase Phase 8C
    const hometownQuery = `
      SELECT
        u1.hometown as user_hometown,
        u2.hometown as candidate_hometown,
        u2.visibility_settings as candidate_visibility
      FROM users u1
      CROSS JOIN users u2
      WHERE u1.id = ? AND u2.id = ?
    `;
    const hometownResult: DbResult<any> = await this.db.query(hometownQuery, [userId, candidateId]);
    const hometownData = hometownResult.rows?.[0];

    if (hometownData) {
      const candidateVisibility = this.parseVisibilitySettings(hometownData.candidate_visibility);

      const hometownScoreData = this.calculateHometownMatch(
        hometownData.user_hometown,
        hometownData.candidate_hometown,
        candidateVisibility,
        weights.hometownMatch
      );
      totalScore += hometownScoreData.score;
      metadata.matchingHometown = hometownScoreData.matchingHometown;
    }

    // Factor 13: Group Overlap (0-3 points)
    // @phase Phase 8C
    const groupVisibilityQuery = `
      SELECT visibility_settings FROM users WHERE id = ?
    `;
    const groupVisibilityResult: DbResult<any> = await this.db.query(groupVisibilityQuery, [candidateId]);
    const candidateVisibilityForGroups = this.parseVisibilitySettings(
      groupVisibilityResult.rows?.[0]?.visibility_settings
    );

    const groupScoreData = await this.calculateGroupOverlap(
      userId,
      candidateId,
      candidateVisibilityForGroups,
      weights.groupOverlap
    );
    totalScore += groupScoreData.score;
    metadata.matchingGroups = groupScoreData.matchingGroups;

    // Factor 14: Connection Group Overlap (0-5 points)
    // @phase Phase 9 - User-created connection groups (higher trust signal)
    const connectionGroupScoreData = await this.calculateConnectionGroupOverlap(
      userId,
      candidateId,
      weights.connectionGroupOverlap
    );
    totalScore += connectionGroupScoreData.score;
    if (connectionGroupScoreData.data) {
      (metadata as Record<string, unknown>).connectionGroupData = connectionGroupScoreData.data;
    }

    return { totalScore, metadata };
  }

  /**
   * Calculate connection group overlap score between two users
   * Uses ConnectionGroupService.calculateGroupRecommendationScore()
   * @phase Phase 9 - Connection Groups Integration
   */
  private async calculateConnectionGroupOverlap(
    userId: number,
    candidateId: number,
    weight: number
  ): Promise<{ score: number; data: import('../types/groups').ConnectionGroupRecommendationData | null }> {
    try {
      // Import dynamically to avoid circular dependencies
      const { getConnectionGroupService } = await import('@core/services/ServiceRegistry');
      const connectionGroupService = getConnectionGroupService();

      return await connectionGroupService.calculateGroupRecommendationScore(
        userId,
        candidateId,
        weight
      );
    } catch (error) {
      // Return zero score on error rather than failing
      return { score: 0, data: null };
    }
  }

  /**
   * Record user feedback on a recommendation
   *
   * @param feedback - Feedback data including action and optional reason
   */
  async recordFeedback(feedback: RecommendationFeedback): Promise<void> {
    try {
      const {
        user_id,
        recommended_user_id,
        action,
        not_interested_reason,
        other_reason
      } = feedback;

      // Use UPSERT pattern to handle duplicate feedback gracefully
      // If user already gave feedback on this recommendation, update it
      const upsertQuery = `
        INSERT INTO recommendation_feedback (
          user_id,
          recommended_user_id,
          action,
          not_interested_reason,
          other_reason,
          created_at
        ) VALUES (?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          action = VALUES(action),
          not_interested_reason = VALUES(not_interested_reason),
          other_reason = VALUES(other_reason),
          created_at = NOW()
      `;

      await this.db.query(upsertQuery, [
        user_id,
        recommended_user_id,
        action,
        not_interested_reason || null,
        other_reason || null
      ]);
    } catch (error) {
      throw new BizError({
        code: 'FEEDBACK_ERROR',
        message: 'Failed to record recommendation feedback',
        context: { feedback, originalError: error }
      });
    }
  }

  /**
   * Get mutual connection data between two users
   *
   * @param userIdA - First user
   * @param userIdB - Second user
   * @returns Count and sample of mutual connections
   */
  private async getMutualConnectionData(
    userIdA: number,
    userIdB: number
  ): Promise<{ count: number; sample: MutualConnectionSample[] }> {
    try {
      // Get mutual connections with details
      // GOVERNANCE: user_connection uses sender_user_id/receiver_user_id, status='connected'
      const mutualQuery = `
        SELECT DISTINCT
          u.id,
          u.username,
          u.display_name,
          u.avatar_url
        FROM users u
        WHERE u.id IN (
          SELECT CASE WHEN uc1.sender_user_id = ? THEN uc1.receiver_user_id ELSE uc1.sender_user_id END
          FROM user_connection uc1
          WHERE (uc1.sender_user_id = ? OR uc1.receiver_user_id = ?)
            AND uc1.status = 'connected'
        )
        AND u.id IN (
          SELECT CASE WHEN uc2.sender_user_id = ? THEN uc2.receiver_user_id ELSE uc2.sender_user_id END
          FROM user_connection uc2
          WHERE (uc2.sender_user_id = ? OR uc2.receiver_user_id = ?)
            AND uc2.status = 'connected'
        )
        LIMIT 3
      `;

      const mutualResult: DbResult<any> = await this.db.query(mutualQuery, [userIdA, userIdA, userIdA, userIdB, userIdB, userIdB]);
      const sample: MutualConnectionSample[] = (mutualResult.rows || []).map(row => ({
        userId: row.id,
        username: row.username,
        displayName: row.display_name,
        avatarUrl: row.avatar_url
      }));

      // Get total count
      // GOVERNANCE: user_connection uses sender_user_id/receiver_user_id, status='connected'
      const countQuery = `
        SELECT COUNT(DISTINCT mutual_user) as count
        FROM (
          SELECT CASE WHEN uc1.sender_user_id = ? THEN uc1.receiver_user_id ELSE uc1.sender_user_id END as mutual_user
          FROM user_connection uc1
          WHERE (uc1.sender_user_id = ? OR uc1.receiver_user_id = ?)
            AND uc1.status = 'connected'
        ) AS user_connections
        WHERE mutual_user IN (
          SELECT CASE WHEN uc2.sender_user_id = ? THEN uc2.receiver_user_id ELSE uc2.sender_user_id END
          FROM user_connection uc2
          WHERE (uc2.sender_user_id = ? OR uc2.receiver_user_id = ?)
            AND uc2.status = 'connected'
        )
      `;

      const countResult: DbResult<any> = await this.db.query(countQuery, [userIdA, userIdA, userIdA, userIdB, userIdB, userIdB]);
      const count = bigIntToNumber(countResult.rows?.[0]?.count || 0);

      return { count, sample };
    } catch (error) {
      // Return empty data on error rather than failing the whole recommendation
      return { count: 0, sample: [] };
    }
  }

  /**
   * Get list of user IDs that have been dismissed
   *
   * @param userId - The user who dismissed recommendations
   * @returns Array of dismissed user IDs
   */
  private async getDismissedUserIds(userId: number): Promise<number[]> {
    try {
      const dismissedQuery = `
        SELECT recommended_user_id
        FROM recommendation_feedback
        WHERE user_id = ? AND action = 'dismissed'
      `;

      const result: DbResult<any> = await this.db.query(dismissedQuery, [userId]);
      return (result.rows || []).map(row => row.recommended_user_id);
    } catch (error) {
      // Return empty array on error rather than failing
      return [];
    }
  }

  /**
   * Generate list of reasons for recommendation
   *
   * @param mutualCount - Number of mutual connections
   * @param candidate - Candidate user data
   * @param metadata - Match metadata from scoring
   * @returns Array of reason strings (max 3, prioritized)
   * @phase Phase 8A - Added skills and goals reasons
   * @phase Phase 8B - Added interests and hobbies reasons (Priority 1)
   * @phase Phase 8C - Added education, hometown, and groups reasons (Priority 1)
   * @phase Phase 9 - Added connection group reasons (highest priority)
   */
  private generateReasons(
    mutualCount: number,
    candidate: any,
    metadata: {
      matchingSkills: string[];
      matchingGoalThemes: string[];
      matchingCategories: string[];
      matchingHobbies: string[];
      educationMatch?: { matchType: 'college' | 'high_school' | 'degree' | null; details: string | null };
      matchingHometown?: string | null;
      matchingGroups: string[];
      connectionGroupData?: import('../types/groups').ConnectionGroupRecommendationData;
    } = {
      matchingSkills: [],
      matchingGoalThemes: [],
      matchingCategories: [],
      matchingHobbies: [],
      matchingGroups: []
    }
  ): string[] {
    const reasons: string[] = [];

    // Priority 0 (HIGHEST): Connection Groups - Curator-attributed recommendations
    // @phase Phase 9 - Connection Groups have highest trust signal
    if (metadata.connectionGroupData?.primaryGroup && reasons.length < 3) {
      const { curatorUsername, groupName } = metadata.connectionGroupData.primaryGroup;
      reasons.push(`You're both in ${curatorUsername}'s "${groupName}" group`);
    }

    // Priority 1: Education (highest - strong personal connection)
    if (metadata.educationMatch?.matchType && metadata.educationMatch?.details) {
      if (metadata.educationMatch.matchType === 'college') {
        reasons.push(`You both attended ${metadata.educationMatch.details}`);
      } else if (metadata.educationMatch.matchType === 'degree') {
        reasons.push(`You both studied the same field at ${metadata.educationMatch.details}`);
      } else if (metadata.educationMatch.matchType === 'high_school') {
        reasons.push(`You both went to ${metadata.educationMatch.details}`);
      }
    }

    // Priority 2: Hometown
    if (metadata.matchingHometown && reasons.length < 3) {
      reasons.push(`You're both from ${metadata.matchingHometown}`);
    }

    // Priority 3: Groups (user_interests groups, not connection_groups)
    if (metadata.matchingGroups.length > 0 && reasons.length < 3) {
      const groupsToShow = metadata.matchingGroups.slice(0, 2);
      if (metadata.matchingGroups.length > 2) {
        reasons.push(`You're both members of ${groupsToShow.join(', ')} and ${metadata.matchingGroups.length - 2} more`);
      } else if (metadata.matchingGroups.length === 1) {
        reasons.push(`You're both members of ${groupsToShow[0]}`);
      } else {
        reasons.push(`You're both members of ${groupsToShow.join(' and ')}`);
      }
    }

    // Priority 4: Personal connection (interests/hobbies) - Phase 8B
    if (metadata.matchingCategories.length > 0 && reasons.length < 3) {
      const categoriesToShow = metadata.matchingCategories.slice(0, 2);
      if (metadata.matchingCategories.length > 2) {
        reasons.push(`Shared interests in ${categoriesToShow.join(', ')} and ${metadata.matchingCategories.length - 2} more`);
      } else {
        reasons.push(`Shared interests in ${categoriesToShow.join(' and ')}`);
      }
    }

    if (metadata.matchingHobbies.length > 0 && reasons.length < 3) {
      const hobbiesToShow = metadata.matchingHobbies.slice(0, 2);
      if (metadata.matchingHobbies.length > 2) {
        reasons.push(`Similar hobbies: ${hobbiesToShow.join(', ')} and ${metadata.matchingHobbies.length - 2} more`);
      } else {
        reasons.push(`Similar hobbies: ${hobbiesToShow.join(' and ')}`);
      }
    }

    // Priority 5: Professional alignment (skills/goals) - Phase 8A
    if (metadata.matchingSkills.length > 0 && reasons.length < 3) {
      const skillsToShow = metadata.matchingSkills.slice(0, 3);
      if (metadata.matchingSkills.length > 3) {
        reasons.push(`You share skills in ${skillsToShow.join(', ')} and ${metadata.matchingSkills.length - 3} more`);
      } else {
        reasons.push(`You share skills in ${skillsToShow.join(', ')}`);
      }
    }

    if (metadata.matchingGoalThemes.length > 0 && reasons.length < 3) {
      const themesToShow = metadata.matchingGoalThemes.slice(0, 2);
      reasons.push(`Similar goals around ${themesToShow.join(' and ')}`);
    }

    // Priority 6: Network
    if (mutualCount > 0 && reasons.length < 3) {
      reasons.push(`${mutualCount} mutual connection${mutualCount > 1 ? 's' : ''}`);
    }

    // Priority 7: Industry/Location
    if (candidate.industry && reasons.length < 3) {
      reasons.push(`Works in ${candidate.industry}`);
    }

    if (candidate.location && reasons.length < 3) {
      reasons.push(`Based in ${candidate.location}`);
    }

    // Fallback
    if (reasons.length === 0) {
      reasons.push('Recommended for you');
    }

    // Limit to 3 reasons
    return reasons.slice(0, 3);
  }

  /**
   * Get user's recommendation preferences
   * Returns defaults if user has no stored preferences
   *
   * @param userId - The user to get preferences for
   * @returns User's preferences with weights and threshold
   * @phase Phase 8A - Extended with skills/goals weights
   * @phase Phase 8B - Extended with interests/hobbies weights
   * @phase Phase 8C - Extended with education/hometown/groups weights
   * @phase Phase 8D - Extended with preset profile
   */
  async getUserPreferences(userId: number): Promise<UserRecommendationPreferences> {
    try {
      const query = `
        SELECT
          user_id,
          weight_mutual_connections,
          weight_industry_match,
          weight_location,
          weight_engagement,
          weight_reputation,
          weight_profile_completeness,
          weight_skills_overlap,
          weight_goals_alignment,
          weight_interest_overlap,
          weight_hobbies_alignment,
          weight_education_match,
          weight_hometown_match,
          weight_group_overlap,
          min_score_threshold,
          preset_profile,
          updated_at
        FROM user_recommendation_preferences
        WHERE user_id = ?
      `;

      const result: DbResult<any> = await this.db.query(query, [userId]);

      if (result.rows && result.rows.length > 0) {
        const row = result.rows[0];
        return {
          userId: row.user_id,
          weights: {
            mutualConnections: row.weight_mutual_connections ?? 15,
            industryMatch: row.weight_industry_match ?? 8,
            location: row.weight_location ?? 15,
            engagement: row.weight_engagement ?? 6,
            reputation: row.weight_reputation ?? 5,
            profileCompleteness: row.weight_profile_completeness ?? 6,
            skillsOverlap: row.weight_skills_overlap ?? 8,
            goalsAlignment: row.weight_goals_alignment ?? 7,
            interestOverlap: row.weight_interest_overlap ?? 10,
            hobbiesAlignment: row.weight_hobbies_alignment ?? 5,
            educationMatch: row.weight_education_match ?? 8,
            hometownMatch: row.weight_hometown_match ?? 4,
            groupOverlap: row.weight_group_overlap ?? 3,
            connectionGroupOverlap: row.weight_connection_group_overlap ?? 5  // Phase 9 - Connection groups
          },
          minScoreThreshold: row.min_score_threshold ?? 15,
          presetProfile: row.preset_profile ?? 'balanced',
          updatedAt: row.updated_at
        };
      }

      // Return defaults if no preferences stored
      return {
        userId,
        weights: { ...DEFAULT_RECOMMENDATION_WEIGHTS },
        minScoreThreshold: 15,
        presetProfile: 'balanced',
        updatedAt: null
      };
    } catch (error) {
      throw new BizError({
        code: 'PREFERENCES_ERROR',
        message: 'Failed to get recommendation preferences',
        context: { userId, originalError: error }
      });
    }
  }

  /**
   * Apply a preset profile to user's preferences
   *
   * @param userId - User ID
   * @param presetId - Preset profile to apply
   * @returns Updated preferences
   *
   * @phase Phase 8D
   */
  async applyPreset(
    userId: number,
    presetId: RecommendationPresetProfile
  ): Promise<UserRecommendationPreferences> {
    const preset = PRESET_PROFILES[presetId];
    if (!preset) {
      throw BizError.badRequest(`Invalid preset profile: ${presetId}`);
    }

    // Update with preset weights
    const upsertQuery = `
      INSERT INTO user_recommendation_preferences (
        user_id,
        weight_mutual_connections,
        weight_industry_match,
        weight_location,
        weight_engagement,
        weight_reputation,
        weight_profile_completeness,
        weight_skills_overlap,
        weight_goals_alignment,
        weight_interest_overlap,
        weight_hobbies_alignment,
        weight_education_match,
        weight_hometown_match,
        weight_group_overlap,
        preset_profile,
        last_preset_change,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        weight_mutual_connections = VALUES(weight_mutual_connections),
        weight_industry_match = VALUES(weight_industry_match),
        weight_location = VALUES(weight_location),
        weight_engagement = VALUES(weight_engagement),
        weight_reputation = VALUES(weight_reputation),
        weight_profile_completeness = VALUES(weight_profile_completeness),
        weight_skills_overlap = VALUES(weight_skills_overlap),
        weight_goals_alignment = VALUES(weight_goals_alignment),
        weight_interest_overlap = VALUES(weight_interest_overlap),
        weight_hobbies_alignment = VALUES(weight_hobbies_alignment),
        weight_education_match = VALUES(weight_education_match),
        weight_hometown_match = VALUES(weight_hometown_match),
        weight_group_overlap = VALUES(weight_group_overlap),
        preset_profile = VALUES(preset_profile),
        last_preset_change = NOW(),
        updated_at = NOW()
    `;

    const weights = preset.weights;
    await this.db.query(upsertQuery, [
      userId,
      weights.mutualConnections,
      weights.industryMatch,
      weights.location,
      weights.engagement,
      weights.reputation,
      weights.profileCompleteness,
      weights.skillsOverlap,
      weights.goalsAlignment,
      weights.interestOverlap,
      weights.hobbiesAlignment,
      weights.educationMatch,
      weights.hometownMatch,
      weights.groupOverlap,
      presetId
    ]);

    return this.getUserPreferences(userId);
  }

  /**
   * Helper to compare two weight objects
   * @phase Phase 8D
   */
  private weightsMatch(a: RecommendationWeights, b: RecommendationWeights): boolean {
    return (
      a.mutualConnections === b.mutualConnections &&
      a.industryMatch === b.industryMatch &&
      a.location === b.location &&
      a.engagement === b.engagement &&
      a.reputation === b.reputation &&
      a.profileCompleteness === b.profileCompleteness &&
      a.skillsOverlap === b.skillsOverlap &&
      a.goalsAlignment === b.goalsAlignment &&
      a.interestOverlap === b.interestOverlap &&
      a.hobbiesAlignment === b.hobbiesAlignment &&
      a.educationMatch === b.educationMatch &&
      a.hometownMatch === b.hometownMatch &&
      a.groupOverlap === b.groupOverlap
    );
  }

  /**
   * Update user's recommendation preferences
   * Creates new record if none exists (upsert)
   *
   * @param userId - The user to update preferences for
   * @param input - Partial weights and/or threshold to update
   * @returns Updated preferences
   * @phase Phase 8D - Updated to clear preset on custom weight changes
   */
  async updateUserPreferences(
    userId: number,
    input: UpdateRecommendationPreferencesInput
  ): Promise<UserRecommendationPreferences> {
    try {
      // Get current preferences to merge with updates
      const current = await this.getUserPreferences(userId);

      // Merge weights if provided
      const newWeights = input.weights
        ? { ...current.weights, ...input.weights }
        : current.weights;

      // Validate weights sum to 100
      const totalWeight =
        newWeights.mutualConnections +
        newWeights.industryMatch +
        newWeights.location +
        newWeights.engagement +
        newWeights.reputation +
        newWeights.profileCompleteness +
        newWeights.skillsOverlap +
        newWeights.goalsAlignment +
        newWeights.interestOverlap +
        newWeights.hobbiesAlignment +
        newWeights.educationMatch +
        newWeights.hometownMatch +
        newWeights.groupOverlap;

      if (totalWeight !== 100) {
        throw BizError.badRequest(`Weights must sum to 100, got ${totalWeight}`);
      }

      // Validate individual weights are 0-100
      const weightValues = Object.values(newWeights);
      for (const w of weightValues) {
        if (w < 0 || w > 100) {
          throw BizError.badRequest('Each weight must be between 0 and 100');
        }
      }

      // Validate threshold
      const newThreshold = input.minScoreThreshold ?? current.minScoreThreshold;
      if (newThreshold < 0 || newThreshold > 100) {
        throw BizError.badRequest('Min score threshold must be between 0 and 100');
      }

      // Determine if this is a custom change (clears preset)
      // Compare new weights to all presets to see if it matches any
      let matchingPreset: RecommendationPresetProfile | null = null;
      for (const [presetId, preset] of Object.entries(PRESET_PROFILES)) {
        if (this.weightsMatch(newWeights, preset.weights)) {
          matchingPreset = presetId as RecommendationPresetProfile;
          break;
        }
      }

      // Upsert preferences with preset cleared if custom
      const upsertQuery = `
        INSERT INTO user_recommendation_preferences (
          user_id,
          weight_mutual_connections,
          weight_industry_match,
          weight_location,
          weight_engagement,
          weight_reputation,
          weight_profile_completeness,
          weight_skills_overlap,
          weight_goals_alignment,
          weight_interest_overlap,
          weight_hobbies_alignment,
          weight_education_match,
          weight_hometown_match,
          weight_group_overlap,
          min_score_threshold,
          preset_profile,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          weight_mutual_connections = VALUES(weight_mutual_connections),
          weight_industry_match = VALUES(weight_industry_match),
          weight_location = VALUES(weight_location),
          weight_engagement = VALUES(weight_engagement),
          weight_reputation = VALUES(weight_reputation),
          weight_profile_completeness = VALUES(weight_profile_completeness),
          weight_skills_overlap = VALUES(weight_skills_overlap),
          weight_goals_alignment = VALUES(weight_goals_alignment),
          weight_interest_overlap = VALUES(weight_interest_overlap),
          weight_hobbies_alignment = VALUES(weight_hobbies_alignment),
          weight_education_match = VALUES(weight_education_match),
          weight_hometown_match = VALUES(weight_hometown_match),
          weight_group_overlap = VALUES(weight_group_overlap),
          min_score_threshold = VALUES(min_score_threshold),
          preset_profile = VALUES(preset_profile),
          updated_at = NOW()
      `;

      await this.db.query(upsertQuery, [
        userId,
        newWeights.mutualConnections,
        newWeights.industryMatch,
        newWeights.location,
        newWeights.engagement,
        newWeights.reputation,
        newWeights.profileCompleteness,
        newWeights.skillsOverlap,
        newWeights.goalsAlignment,
        newWeights.interestOverlap,
        newWeights.hobbiesAlignment,
        newWeights.educationMatch,
        newWeights.hometownMatch,
        newWeights.groupOverlap,
        newThreshold,
        matchingPreset  // null if custom, preset ID if matches
      ]);

      // Return updated preferences
      return this.getUserPreferences(userId);
    } catch (error) {
      if (error instanceof BizError) {
        throw error;
      }
      throw new BizError({
        code: 'PREFERENCES_UPDATE_ERROR',
        message: 'Failed to update recommendation preferences',
        context: { userId, input, originalError: error }
      });
    }
  }

  /**
   * Reset user's preferences to defaults
   * Deletes the stored preferences row
   *
   * @param userId - The user to reset preferences for
   * @phase Phase 8D - Updated to return preset profile
   */
  async resetUserPreferences(userId: number): Promise<UserRecommendationPreferences> {
    try {
      await this.db.query(
        'DELETE FROM user_recommendation_preferences WHERE user_id = ?',
        [userId]
      );

      // Return defaults
      return {
        userId,
        weights: { ...DEFAULT_RECOMMENDATION_WEIGHTS },
        minScoreThreshold: 0,
        presetProfile: 'balanced',
        updatedAt: null
      };
    } catch (error) {
      throw new BizError({
        code: 'PREFERENCES_RESET_ERROR',
        message: 'Failed to reset recommendation preferences',
        context: { userId, originalError: error }
      });
    }
  }

  /**
   * Shutdown service and cleanup resources
   */
  async shutdown(): Promise<void> {
    // No persistent connections to close
    // Service is stateless and relies on DatabaseService for connections
  }
}
