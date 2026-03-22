/**
 * RecommendationService Phase 8C Tests
 * Education, Hometown, and Groups matching
 *
 * @tier STANDARD
 * @phase Phase 8C
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RecommendationService } from '../RecommendationService';
import { DatabaseService } from '@core/services/DatabaseService';
import { DEFAULT_RECOMMENDATION_WEIGHTS } from '../../types';

// Mock DatabaseService
vi.mock('@core/services/DatabaseService');

describe('RecommendationService - Phase 8C (Education, Hometown, Groups)', () => {
  let service: RecommendationService;
  let mockDb: DatabaseService;

  beforeEach(() => {
    mockDb = new DatabaseService() as any;
    service = new RecommendationService(mockDb);
  });

  describe('DEFAULT_RECOMMENDATION_WEIGHTS - Phase 8C', () => {
    it('should have 13 factors totaling 100 points', () => {
      const total = Object.values(DEFAULT_RECOMMENDATION_WEIGHTS).reduce((sum, val) => sum + val, 0);
      expect(total).toBe(100);
    });

    it('should include education, hometown, and group weights', () => {
      expect(DEFAULT_RECOMMENDATION_WEIGHTS.educationMatch).toBe(8);
      expect(DEFAULT_RECOMMENDATION_WEIGHTS.hometownMatch).toBe(4);
      expect(DEFAULT_RECOMMENDATION_WEIGHTS.groupOverlap).toBe(3);
    });

    it('should have proper distribution across categories', () => {
      const {
        mutualConnections, engagement, reputation, profileCompleteness,
        industryMatch, skillsOverlap, goalsAlignment,
        interestOverlap, hobbiesAlignment, educationMatch, hometownMatch, groupOverlap,
        location
      } = DEFAULT_RECOMMENDATION_WEIGHTS;

      // Network & Activity: 32 points
      const networkActivity = mutualConnections + engagement + reputation + profileCompleteness;
      expect(networkActivity).toBe(32);

      // Professional Alignment: 23 points
      const professional = industryMatch + skillsOverlap + goalsAlignment;
      expect(professional).toBe(23);

      // Personal Connection: 30 points
      const personal = interestOverlap + hobbiesAlignment + educationMatch + hometownMatch + groupOverlap;
      expect(personal).toBe(30);

      // Context: 15 points
      expect(location).toBe(15);
    });
  });

  describe('Education Matching', () => {
    it('should score 4 points for same college', async () => {
      const userEd = {
        college: 'Stanford University',
        college_year: null,
        degree: null,
        high_school: null,
        high_school_year: null
      };
      const candidateEd = {
        college: 'Stanford University',
        college_year: null,
        degree: null,
        high_school: null,
        high_school_year: null
      };

      // Access private method via type assertion
      const result = (service as any).calculateEducationMatch(
        userEd,
        candidateEd,
        null,
        8
      );

      expect(result.score).toBe(4);
      expect(result.matchType).toBe('college');
      expect(result.details).toBe('Stanford University');
    });

    it('should give +2 bonus for same cohort (±2 years)', async () => {
      const userEd = {
        college: 'Stanford University',
        college_year: 2020,
        degree: null,
        high_school: null,
        high_school_year: null
      };
      const candidateEd = {
        college: 'Stanford University',
        college_year: 2021,
        degree: null,
        high_school: null,
        high_school_year: null
      };

      const result = (service as any).calculateEducationMatch(
        userEd,
        candidateEd,
        null,
        8
      );

      expect(result.score).toBe(6); // 4 base + 2 cohort
      expect(result.matchType).toBe('college');
    });

    it('should give +2 for same field of study', async () => {
      const userEd = {
        college: 'Stanford University',
        college_year: null,
        degree: 'Bachelor of Science in Computer Science',
        high_school: null,
        high_school_year: null
      };
      const candidateEd = {
        college: 'Stanford University',
        college_year: null,
        degree: 'BS Computer Science',
        high_school: null,
        high_school_year: null
      };

      const result = (service as any).calculateEducationMatch(
        userEd,
        candidateEd,
        null,
        8
      );

      expect(result.score).toBe(6); // 4 base + 2 field
      expect(result.matchType).toBe('degree');
    });

    it('should cap score at weight (8 points max)', async () => {
      const userEd = {
        college: 'Stanford University',
        college_year: 2020,
        degree: 'BS Computer Science',
        high_school: null,
        high_school_year: null
      };
      const candidateEd = {
        college: 'Stanford University',
        college_year: 2020,
        degree: 'BS Computer Science',
        high_school: null,
        high_school_year: null
      };

      const result = (service as any).calculateEducationMatch(
        userEd,
        candidateEd,
        null,
        8
      );

      expect(result.score).toBe(8); // Would be 10 but capped at 8
      expect(result.matchType).toBe('degree');
    });

    it('should fall back to high school match if no college match', async () => {
      const userEd = {
        college: null,
        college_year: null,
        degree: null,
        high_school: 'Lincoln High School',
        high_school_year: null
      };
      const candidateEd = {
        college: null,
        college_year: null,
        degree: null,
        high_school: 'Lincoln High School',
        high_school_year: null
      };

      const result = (service as any).calculateEducationMatch(
        userEd,
        candidateEd,
        null,
        8
      );

      expect(result.score).toBe(3);
      expect(result.matchType).toBe('high_school');
      expect(result.details).toBe('Lincoln High School');
    });

    it('should respect privacy settings (showEducation hidden)', async () => {
      const userEd = {
        college: 'Stanford University',
        college_year: null,
        degree: null,
        high_school: null,
        high_school_year: null
      };
      const candidateEd = {
        college: 'Stanford University',
        college_year: null,
        degree: null,
        high_school: null,
        high_school_year: null
      };

      const result = (service as any).calculateEducationMatch(
        userEd,
        candidateEd,
        { showEducation: 'hidden' },
        8
      );

      expect(result.score).toBe(0);
      expect(result.matchType).toBe(null);
    });

    it('should normalize education names (case, "The", "University")', async () => {
      const userEd = {
        college: 'The University of California',
        college_year: null,
        degree: null,
        high_school: null,
        high_school_year: null
      };
      const candidateEd = {
        college: 'university of california',
        college_year: null,
        degree: null,
        high_school: null,
        high_school_year: null
      };

      const result = (service as any).calculateEducationMatch(
        userEd,
        candidateEd,
        null,
        8
      );

      expect(result.score).toBe(4);
      expect(result.matchType).toBe('college');
    });
  });

  describe('Hometown Matching', () => {
    it('should score full weight for exact hometown match', async () => {
      const result = (service as any).calculateHometownMatch(
        'San Francisco, CA',
        'San Francisco, CA',
        null,
        4
      );

      expect(result.score).toBe(4);
      expect(result.matchingHometown).toBe('San Francisco, CA');
    });

    it('should normalize locations for comparison', async () => {
      const result = (service as any).calculateHometownMatch(
        'San Francisco,  CA',
        'san francisco ca',
        null,
        4
      );

      expect(result.score).toBe(4);
      expect(result.matchingHometown).toBe('san francisco ca');
    });

    it('should respect privacy settings (showHometown hidden)', async () => {
      const result = (service as any).calculateHometownMatch(
        'San Francisco, CA',
        'San Francisco, CA',
        { showHometown: 'hidden' },
        4
      );

      expect(result.score).toBe(0);
      expect(result.matchingHometown).toBe(null);
    });

    it('should return 0 for different hometowns', async () => {
      const result = (service as any).calculateHometownMatch(
        'San Francisco, CA',
        'New York, NY',
        null,
        4
      );

      expect(result.score).toBe(0);
      expect(result.matchingHometown).toBe(null);
    });

    it('should handle null hometowns', async () => {
      const result = (service as any).calculateHometownMatch(
        null,
        'San Francisco, CA',
        null,
        4
      );

      expect(result.score).toBe(0);
      expect(result.matchingHometown).toBe(null);
    });
  });

  describe('Group Overlap', () => {
    it('should score 1 point per matching group', async () => {
      mockDb.query = vi.fn().mockResolvedValue({
        rows: [
          { group_name: 'Tech Entrepreneurs' },
          { group_name: 'SF Founders' }
        ]
      });

      const result = await (service as any).calculateGroupOverlap(
        1,
        2,
        null,
        3
      );

      expect(result.score).toBe(2); // 2 matching groups
      expect(result.matchingGroups).toEqual(['Tech Entrepreneurs', 'SF Founders']);
    });

    it('should cap score at weight', async () => {
      mockDb.query = vi.fn().mockResolvedValue({
        rows: [
          { group_name: 'Group 1' },
          { group_name: 'Group 2' },
          { group_name: 'Group 3' },
          { group_name: 'Group 4' }
        ]
      });

      const result = await (service as any).calculateGroupOverlap(
        1,
        2,
        null,
        3
      );

      expect(result.score).toBe(3); // Capped at weight
      expect(result.matchingGroups.length).toBe(4);
    });

    it('should respect privacy settings (showGroups hidden)', async () => {
      const result = await (service as any).calculateGroupOverlap(
        1,
        2,
        { showGroups: 'hidden' },
        3
      );

      expect(result.score).toBe(0);
      expect(result.matchingGroups).toEqual([]);
    });

    it('should handle no matching groups', async () => {
      mockDb.query = vi.fn().mockResolvedValue({
        rows: []
      });

      const result = await (service as any).calculateGroupOverlap(
        1,
        2,
        null,
        3
      );

      expect(result.score).toBe(0);
      expect(result.matchingGroups).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      mockDb.query = vi.fn().mockRejectedValue(new Error('DB error'));

      const result = await (service as any).calculateGroupOverlap(
        1,
        2,
        null,
        3
      );

      expect(result.score).toBe(0);
      expect(result.matchingGroups).toEqual([]);
    });
  });

  describe('Reason Generation - Phase 8C Priority', () => {
    it('should prioritize education reasons (Priority 1)', () => {
      const reasons = (service as any).generateReasons(0, {}, {
        matchingSkills: [],
        matchingGoalThemes: [],
        matchingCategories: [],
        matchingHobbies: [],
        educationMatch: { matchType: 'college', details: 'Stanford University' },
        matchingHometown: null,
        matchingGroups: []
      });

      expect(reasons[0]).toBe('You both attended Stanford University');
    });

    it('should prioritize hometown reasons (Priority 2)', () => {
      const reasons = (service as any).generateReasons(0, {}, {
        matchingSkills: [],
        matchingGoalThemes: [],
        matchingCategories: [],
        matchingHobbies: [],
        educationMatch: null,
        matchingHometown: 'San Francisco, CA',
        matchingGroups: []
      });

      expect(reasons[0]).toBe("You're both from San Francisco, CA");
    });

    it('should prioritize group reasons (Priority 3)', () => {
      const reasons = (service as any).generateReasons(0, {}, {
        matchingSkills: [],
        matchingGoalThemes: [],
        matchingCategories: [],
        matchingHobbies: [],
        educationMatch: null,
        matchingHometown: null,
        matchingGroups: ['Tech Entrepreneurs', 'SF Founders']
      });

      expect(reasons[0]).toBe("You're both members of Tech Entrepreneurs and SF Founders");
    });

    it('should show interests/hobbies after education/hometown/groups', () => {
      const reasons = (service as any).generateReasons(0, {}, {
        matchingSkills: [],
        matchingGoalThemes: [],
        matchingCategories: ['Technology', 'Business'],
        matchingHobbies: ['hiking', 'reading'],
        educationMatch: { matchType: 'college', details: 'Stanford University' },
        matchingHometown: 'San Francisco, CA',
        matchingGroups: ['Tech Entrepreneurs']
      });

      expect(reasons[0]).toContain('Stanford University');
      expect(reasons[1]).toContain('San Francisco, CA');
      expect(reasons[2]).toContain('Tech Entrepreneurs');
      // Interests/hobbies would be 4th/5th but we limit to 3
    });

    it('should limit to 3 reasons max', () => {
      const reasons = (service as any).generateReasons(5, { industry: 'Tech', location: 'SF' }, {
        matchingSkills: ['JavaScript', 'Python'],
        matchingGoalThemes: ['startup', 'entrepreneur'],
        matchingCategories: ['Technology'],
        matchingHobbies: ['hiking'],
        educationMatch: { matchType: 'college', details: 'Stanford' },
        matchingHometown: 'SF',
        matchingGroups: ['Tech']
      });

      expect(reasons.length).toBe(3);
    });
  });

  describe('User Preferences - Phase 8C', () => {
    it('should include 13 weight columns in getUserPreferences query', async () => {
      const mockQuery = vi.fn().mockResolvedValue({
        rows: [{
          user_id: 1,
          weight_mutual_connections: 15,
          weight_industry_match: 8,
          weight_location: 15,
          weight_engagement: 6,
          weight_reputation: 5,
          weight_profile_completeness: 6,
          weight_skills_overlap: 8,
          weight_goals_alignment: 7,
          weight_interest_overlap: 10,
          weight_hobbies_alignment: 5,
          weight_education_match: 8,
          weight_hometown_match: 4,
          weight_group_overlap: 3,
          min_score_threshold: 0,
          updated_at: null
        }]
      });
      mockDb.query = mockQuery;

      const prefs = await service.getUserPreferences(1);

      expect(prefs.weights.educationMatch).toBe(8);
      expect(prefs.weights.hometownMatch).toBe(4);
      expect(prefs.weights.groupOverlap).toBe(3);
    });

    it('should validate 13 factors sum to 100 in updateUserPreferences', async () => {
      mockDb.query = vi.fn().mockResolvedValue({
        rows: [{
          user_id: 1,
          weight_mutual_connections: 15,
          weight_industry_match: 8,
          weight_location: 15,
          weight_engagement: 6,
          weight_reputation: 5,
          weight_profile_completeness: 6,
          weight_skills_overlap: 8,
          weight_goals_alignment: 7,
          weight_interest_overlap: 10,
          weight_hobbies_alignment: 5,
          weight_education_match: 8,
          weight_hometown_match: 4,
          weight_group_overlap: 3,
          min_score_threshold: 0,
          updated_at: null
        }]
      });

      await expect(
        service.updateUserPreferences(1, {
          weights: { educationMatch: 20 } // Would make total > 100
        })
      ).rejects.toThrow('Weights must sum to 100');
    });
  });
});
