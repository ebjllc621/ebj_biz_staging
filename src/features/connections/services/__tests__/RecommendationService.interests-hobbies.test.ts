/**
 * RecommendationService - Phase 8B Tests
 * Tests for interest category overlap and hobbies alignment scoring
 *
 * @see docs/components/connections/phases/PHASE_8B_BRAIN_PLAN.md
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RecommendationService } from '../RecommendationService';
import { DatabaseService } from '@core/services/DatabaseService';

describe('RecommendationService - Phase 8B (Interests & Hobbies)', () => {
  let service: RecommendationService;
  let mockDb: DatabaseService;

  beforeEach(() => {
    mockDb = {
      query: vi.fn()
    } as any;

    service = new RecommendationService(mockDb);
  });

  describe('calculateInterestOverlap', () => {
    it('should calculate score based on matching categories (2 points per category)', async () => {
      // Mock query result with 3 matching categories
      (mockDb.query as any).mockResolvedValueOnce({
        rows: [
          { name: 'Technology' },
          { name: 'Business' },
          { name: 'Marketing' }
        ]
      });

      const result = await (service as any).calculateInterestOverlap(
        1,
        2,
        null,
        10 // weight
      );

      expect(result.score).toBe(6); // 3 categories * 2 points
      expect(result.matchingCategories).toEqual(['Technology', 'Business', 'Marketing']);
    });

    it('should cap score at weight maximum', async () => {
      // Mock query result with 10 matching categories (would be 20 points)
      (mockDb.query as any).mockResolvedValueOnce({
        rows: Array.from({ length: 10 }, (_, i) => ({ name: `Category${i}` }))
      });

      const result = await (service as any).calculateInterestOverlap(
        1,
        2,
        null,
        10 // weight cap
      );

      expect(result.score).toBe(10); // Capped at weight
      expect(result.matchingCategories).toHaveLength(10);
    });

    it('should return 0 if candidate has hidden category interests', async () => {
      const result = await (service as any).calculateInterestOverlap(
        1,
        2,
        { showCategoryInterests: 'hidden' },
        10
      );

      expect(result.score).toBe(0);
      expect(result.matchingCategories).toEqual([]);
      expect(mockDb.query).not.toHaveBeenCalled(); // Privacy check bypasses query
    });

    it('should handle empty result gracefully', async () => {
      (mockDb.query as any).mockResolvedValueOnce({
        rows: []
      });

      const result = await (service as any).calculateInterestOverlap(
        1,
        2,
        null,
        10
      );

      expect(result.score).toBe(0);
      expect(result.matchingCategories).toEqual([]);
    });

    it('should handle query errors gracefully', async () => {
      (mockDb.query as any).mockRejectedValueOnce(new Error('DB error'));

      const result = await (service as any).calculateInterestOverlap(
        1,
        2,
        null,
        10
      );

      expect(result.score).toBe(0);
      expect(result.matchingCategories).toEqual([]);
    });
  });

  describe('calculateHobbiesAlignment', () => {
    it('should calculate score based on matching hobby keywords (1 point per hobby)', () => {
      const userHobbies = 'I enjoy reading, hiking, and photography';
      const candidateHobbies = 'Love reading books, hiking trails, and cooking';

      const result = (service as any).calculateHobbiesAlignment(
        userHobbies,
        candidateHobbies,
        null,
        5 // weight
      );

      expect(result.score).toBe(2); // 'reading' and 'hiking' match
      expect(result.matchingHobbies).toEqual(['reading', 'hiking']);
    });

    it('should be case-insensitive', () => {
      const userHobbies = 'READING and HIKING';
      const candidateHobbies = 'reading and hiking';

      const result = (service as any).calculateHobbiesAlignment(
        userHobbies,
        candidateHobbies,
        null,
        5
      );

      expect(result.score).toBe(2);
      expect(result.matchingHobbies).toEqual(['reading', 'hiking']);
    });

    it('should cap score at weight maximum', () => {
      // User has many matching hobbies
      const userHobbies = 'reading, writing, music, sports, travel, cooking, photography, gaming';
      const candidateHobbies = 'reading, writing, music, sports, travel, cooking, photography, gaming';

      const result = (service as any).calculateHobbiesAlignment(
        userHobbies,
        candidateHobbies,
        null,
        5 // weight cap
      );

      expect(result.score).toBe(5); // Capped at weight
      expect(result.matchingHobbies.length).toBeGreaterThan(5);
    });

    it('should return 0 if candidate has hidden hobbies', () => {
      const result = (service as any).calculateHobbiesAlignment(
        'reading, hiking',
        'reading, hiking',
        { showHobbies: 'hidden' },
        5
      );

      expect(result.score).toBe(0);
      expect(result.matchingHobbies).toEqual([]);
    });

    it('should handle null hobbies', () => {
      const result = (service as any).calculateHobbiesAlignment(
        null,
        'reading, hiking',
        null,
        5
      );

      expect(result.score).toBe(0);
      expect(result.matchingHobbies).toEqual([]);
    });

    it('should handle empty hobbies strings', () => {
      const result = (service as any).calculateHobbiesAlignment(
        '',
        '   ',
        null,
        5
      );

      expect(result.score).toBe(0);
      expect(result.matchingHobbies).toEqual([]);
    });
  });

  describe('generateReasons - Phase 8B Priority', () => {
    it('should prioritize personal connection (interests/hobbies) first', () => {
      const reasons = (service as any).generateReasons(
        5, // mutual connections
        { industry: 'Technology', location: 'NYC' },
        {
          matchingSkills: ['JavaScript', 'React'],
          matchingGoalThemes: ['startup', 'entrepreneur'],
          matchingCategories: ['Technology', 'Business'],
          matchingHobbies: ['reading', 'hiking']
        }
      );

      // First reason should be interests (Priority 1)
      expect(reasons[0]).toContain('Shared interests');
      expect(reasons[0]).toContain('Technology');

      // Second reason should be hobbies (Priority 1)
      expect(reasons[1]).toContain('Similar hobbies');
      expect(reasons[1]).toContain('reading');

      // Third reason should be skills (Priority 2)
      expect(reasons[2]).toContain('share skills');
    });

    it('should show professional alignment when no personal connection', () => {
      const reasons = (service as any).generateReasons(
        5,
        { industry: 'Technology', location: 'NYC' },
        {
          matchingSkills: ['JavaScript', 'React'],
          matchingGoalThemes: ['startup'],
          matchingCategories: [],
          matchingHobbies: []
        }
      );

      expect(reasons[0]).toContain('share skills');
      expect(reasons[1]).toContain('Similar goals');
    });

    it('should limit to 3 reasons', () => {
      const reasons = (service as any).generateReasons(
        10,
        { industry: 'Technology', location: 'NYC' },
        {
          matchingSkills: ['JavaScript', 'React', 'Node.js'],
          matchingGoalThemes: ['startup', 'business'],
          matchingCategories: ['Technology', 'Business', 'Marketing'],
          matchingHobbies: ['reading', 'hiking', 'cooking']
        }
      );

      expect(reasons).toHaveLength(3);
    });

    it('should show "and X more" for many matches', () => {
      const reasons = (service as any).generateReasons(
        0,
        {},
        {
          matchingSkills: [],
          matchingGoalThemes: [],
          matchingCategories: ['Tech', 'Business', 'Marketing', 'Sales'],
          matchingHobbies: ['reading', 'hiking', 'cooking', 'music']
        }
      );

      expect(reasons[0]).toContain('and 2 more');
      expect(reasons[1]).toContain('and 2 more');
    });
  });

  describe('getUserPreferences - Phase 8B', () => {
    it('should include new weight columns in query', async () => {
      (mockDb.query as any).mockResolvedValueOnce({
        rows: [
          {
            user_id: 1,
            weight_mutual_connections: 17,
            weight_industry_match: 9,
            weight_location: 2,
            weight_engagement: 7,
            weight_reputation: 6,
            weight_profile_completeness: 5,
            weight_skills_overlap: 9,
            weight_goals_alignment: 7,
            weight_interest_overlap: 10,
            weight_hobbies_alignment: 5,
            min_score_threshold: 0,
            updated_at: new Date()
          }
        ]
      });

      const result = await service.getUserPreferences(1);

      expect(result.weights.interestOverlap).toBe(10);
      expect(result.weights.hobbiesAlignment).toBe(5);

      // Verify query includes new columns
      const queryCall = (mockDb.query as any).mock.calls[0][0];
      expect(queryCall).toContain('weight_interest_overlap');
      expect(queryCall).toContain('weight_hobbies_alignment');
    });

    it('should return Phase 8B defaults if no preferences stored', async () => {
      (mockDb.query as any).mockResolvedValueOnce({
        rows: []
      });

      const result = await service.getUserPreferences(1);

      expect(result.weights.interestOverlap).toBe(10);
      expect(result.weights.hobbiesAlignment).toBe(5);
      expect(result.weights.mutualConnections).toBe(17); // Rebalanced
      expect(result.weights.skillsOverlap).toBe(9); // Rebalanced
      expect(result.weights.location).toBe(25); // Increased to balance to 100
    });
  });

  describe('updateUserPreferences - Phase 8B', () => {
    beforeEach(() => {
      // Mock getUserPreferences to return defaults
      (mockDb.query as any).mockResolvedValue({
        rows: []
      });
    });

    it('should validate 10 factors sum to 100', async () => {
      await expect(
        service.updateUserPreferences(1, {
          weights: {
            mutualConnections: 20,
            industryMatch: 10,
            location: 5,
            engagement: 10,
            reputation: 10,
            profileCompleteness: 10,
            skillsOverlap: 10,
            goalsAlignment: 10,
            interestOverlap: 10,
            hobbiesAlignment: 10
            // Sum = 105 (invalid)
          }
        })
      ).rejects.toThrow('Weights must sum to 100');
    });

    it('should accept valid 10-factor weights', async () => {
      (mockDb.query as any)
        .mockResolvedValueOnce({ rows: [] }) // getUserPreferences
        .mockResolvedValueOnce({ rows: [] }) // upsert
        .mockResolvedValueOnce({ // getUserPreferences after update
          rows: [
            {
              user_id: 1,
              weight_mutual_connections: 17,
              weight_industry_match: 9,
              weight_location: 25,
              weight_engagement: 7,
              weight_reputation: 6,
              weight_profile_completeness: 5,
              weight_skills_overlap: 9,
              weight_goals_alignment: 7,
              weight_interest_overlap: 10,
              weight_hobbies_alignment: 5,
              min_score_threshold: 0,
              updated_at: new Date()
            }
          ]
        });

      const result = await service.updateUserPreferences(1, {
        weights: {
          mutualConnections: 17,
          industryMatch: 9,
          location: 25,
          engagement: 7,
          reputation: 6,
          profileCompleteness: 5,
          skillsOverlap: 9,
          goalsAlignment: 7,
          interestOverlap: 10,
          hobbiesAlignment: 5
          // Sum = 100 (valid)
        }
      });

      expect(result.weights.interestOverlap).toBe(10);
      expect(result.weights.hobbiesAlignment).toBe(5);
    });

    it('should include new columns in upsert query', async () => {
      const validWeights = {
        mutualConnections: 17,
        industryMatch: 9,
        location: 25,
        engagement: 7,
        reputation: 6,
        profileCompleteness: 5,
        skillsOverlap: 9,
        goalsAlignment: 7,
        interestOverlap: 10,
        hobbiesAlignment: 5
      };

      (mockDb.query as any)
        .mockResolvedValueOnce({ rows: [] }) // getUserPreferences
        .mockResolvedValueOnce({ rows: [] }) // upsert
        .mockResolvedValueOnce({ // getUserPreferences after update
          rows: [
            {
              user_id: 1,
              ...Object.entries(validWeights).reduce((acc, [key, value]) => {
                const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                acc[`weight_${snakeKey}`] = value;
                return acc;
              }, {} as any),
              min_score_threshold: 0,
              updated_at: new Date()
            }
          ]
        });

      await service.updateUserPreferences(1, {
        weights: validWeights
      });

      // Find the upsert query call (second call)
      const upsertCall = (mockDb.query as any).mock.calls[1];
      const queryString = upsertCall[0];
      const params = upsertCall[1];

      expect(queryString).toContain('weight_interest_overlap');
      expect(queryString).toContain('weight_hobbies_alignment');
      expect(params).toContain(10); // interestOverlap
      expect(params).toContain(5);  // hobbiesAlignment
    });
  });
});
