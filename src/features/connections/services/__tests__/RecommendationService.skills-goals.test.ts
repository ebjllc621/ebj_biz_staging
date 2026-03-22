import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecommendationService } from '../RecommendationService';
import { DatabaseService } from '@core/services/DatabaseService';

describe('RecommendationService - Phase 8A Skills & Goals', () => {
  let service: RecommendationService;
  let mockDb: DatabaseService;

  beforeEach(() => {
    mockDb = {
      query: vi.fn()
    } as unknown as DatabaseService;
    service = new RecommendationService(mockDb);
  });

  describe('calculateSkillsOverlap', () => {
    it('should score 2 points per matching skill, max 10', () => {
      const userSkills = ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'SQL'];
      const candidateSkills = ['JavaScript', 'React', 'Node.js', 'Java'];

      // Access private method via reflection
      const result = (service as any).calculateSkillsOverlap(
        userSkills,
        candidateSkills,
        null, // no visibility restrictions
        10
      );

      expect(result.matchingSkills).toHaveLength(3);
      expect(result.matchingSkills).toContain('JavaScript');
      expect(result.matchingSkills).toContain('React');
      expect(result.matchingSkills).toContain('Node.js');
      expect(result.score).toBe(6); // 3 matches × 2 = 6
    });

    it('should cap score at weight', () => {
      const userSkills = ['A', 'B', 'C', 'D', 'E', 'F'];
      const candidateSkills = ['A', 'B', 'C', 'D', 'E', 'F'];

      const result = (service as any).calculateSkillsOverlap(
        userSkills,
        candidateSkills,
        null,
        10
      );

      expect(result.score).toBe(10); // Capped at 10
    });

    it('should return 0 when visibility is hidden', () => {
      const userSkills = ['JavaScript'];
      const candidateSkills = ['JavaScript'];
      const visibility = { showSkills: 'hidden' as const };

      const result = (service as any).calculateSkillsOverlap(
        userSkills,
        candidateSkills,
        visibility,
        10
      );

      expect(result.score).toBe(0);
      expect(result.matchingSkills).toHaveLength(0);
    });

    it('should handle case-insensitive matching', () => {
      const userSkills = ['JAVASCRIPT', 'typescript'];
      const candidateSkills = ['javascript', 'TypeScript'];

      const result = (service as any).calculateSkillsOverlap(
        userSkills,
        candidateSkills,
        null,
        10
      );

      expect(result.matchingSkills).toHaveLength(2);
      expect(result.score).toBe(4); // 2 matches × 2 = 4
    });

    it('should handle empty skill arrays', () => {
      const result = (service as any).calculateSkillsOverlap(
        [],
        [],
        null,
        10
      );

      expect(result.score).toBe(0);
      expect(result.matchingSkills).toHaveLength(0);
    });

    it('should trim and normalize skills', () => {
      const userSkills = ['  JavaScript  ', 'React'];
      const candidateSkills = ['javascript', '  React  '];

      const result = (service as any).calculateSkillsOverlap(
        userSkills,
        candidateSkills,
        null,
        10
      );

      expect(result.matchingSkills).toHaveLength(2);
      expect(result.score).toBe(4);
    });
  });

  describe('calculateGoalsAlignment', () => {
    it('should score 2 points per matching theme, max 8', () => {
      const userGoals = 'I want to grow my startup and learn leadership skills';
      const candidateGoals = 'Looking for startup opportunities and leadership development';

      const result = (service as any).calculateGoalsAlignment(
        userGoals,
        candidateGoals,
        null,
        8
      );

      expect(result.matchingThemes).toContain('startup');
      expect(result.matchingThemes).toContain('leadership');
      // 'grow' also matches, so we have grow + startup + leadership + skills
      expect(result.score).toBeGreaterThanOrEqual(4); // At least 2 themes × 2 = 4
    });

    it('should cap score at weight', () => {
      const userGoals = 'startup entrepreneur business career mentor learn grow networking collaborate';
      const candidateGoals = 'startup entrepreneur business career mentor learn grow networking collaborate';

      const result = (service as any).calculateGoalsAlignment(
        userGoals,
        candidateGoals,
        null,
        8
      );

      expect(result.score).toBe(8); // Capped at 8
    });

    it('should return 0 when showGoals is false', () => {
      const visibility = { showGoals: false };

      const result = (service as any).calculateGoalsAlignment(
        'startup',
        'startup',
        visibility,
        8
      );

      expect(result.score).toBe(0);
      expect(result.matchingThemes).toHaveLength(0);
    });

    it('should handle null goals gracefully', () => {
      const result = (service as any).calculateGoalsAlignment(
        null,
        'Looking to grow',
        null,
        8
      );

      expect(result.score).toBe(0);
      expect(result.matchingThemes).toHaveLength(0);
    });

    it('should handle empty goals gracefully', () => {
      const result = (service as any).calculateGoalsAlignment(
        '',
        'Looking to grow',
        null,
        8
      );

      expect(result.score).toBe(0);
    });

    it('should match theme keywords in goals text', () => {
      const userGoals = 'I want to collaborate on innovative technical projects';
      const candidateGoals = 'Seeking collaboration opportunities in technical innovation';

      const result = (service as any).calculateGoalsAlignment(
        userGoals,
        candidateGoals,
        null,
        8
      );

      // Keywords containing theme words should match
      expect(result.matchingThemes).toContain('technical');
      expect(result.matchingThemes.length).toBeGreaterThanOrEqual(1);
      expect(result.score).toBeGreaterThanOrEqual(2); // At least 1 theme × 2 = 2
    });
  });

  describe('generateReasons - Phase 8A', () => {
    it('should prioritize skills and goals reasons', () => {
      const metadata = {
        matchingSkills: ['JavaScript', 'React', 'TypeScript'],
        matchingGoalThemes: ['startup', 'leadership']
      };

      const reasons = (service as any).generateReasons(
        5, // mutual connections
        { industry: 'Technology', location: 'San Francisco' },
        metadata
      );

      // Skills should be first
      expect(reasons[0]).toContain('skills');
      // Goals should be second
      expect(reasons[1]).toContain('goals');
      // Max 3 reasons
      expect(reasons.length).toBeLessThanOrEqual(3);
    });

    it('should format skills list correctly when more than 3', () => {
      const metadata = {
        matchingSkills: ['JavaScript', 'React', 'TypeScript', 'Node.js', 'Python'],
        matchingGoalThemes: []
      };

      const reasons = (service as any).generateReasons(0, {}, metadata);

      expect(reasons[0]).toContain('2 more'); // Shows 3 + "and 2 more"
    });

    it('should format skills list without "more" when 3 or fewer', () => {
      const metadata = {
        matchingSkills: ['JavaScript', 'React', 'TypeScript'],
        matchingGoalThemes: []
      };

      const reasons = (service as any).generateReasons(0, {}, metadata);

      expect(reasons[0]).not.toContain('more');
      expect(reasons[0]).toContain('JavaScript');
      expect(reasons[0]).toContain('React');
      expect(reasons[0]).toContain('TypeScript');
    });

    it('should include mutual connections after professional alignment', () => {
      const metadata = {
        matchingSkills: ['JavaScript'],
        matchingGoalThemes: ['startup']
      };

      const reasons = (service as any).generateReasons(
        5,
        { industry: 'Technology' },
        metadata
      );

      // Skills first
      expect(reasons[0]).toContain('skills');
      // Goals second
      expect(reasons[1]).toContain('goals');
      // Mutual connections should not appear (limited to 3 reasons)
      expect(reasons.length).toBe(3);
    });

    it('should fallback to traditional reasons when no professional matches', () => {
      const metadata = {
        matchingSkills: [],
        matchingGoalThemes: []
      };

      const reasons = (service as any).generateReasons(
        3,
        { industry: 'Technology', location: 'San Francisco' },
        metadata
      );

      expect(reasons[0]).toContain('mutual connection');
      expect(reasons[1]).toContain('Works in');
      expect(reasons[2]).toContain('Based in');
    });

    it('should provide fallback reason when no data available', () => {
      const metadata = {
        matchingSkills: [],
        matchingGoalThemes: []
      };

      const reasons = (service as any).generateReasons(
        0,
        {},
        metadata
      );

      expect(reasons).toHaveLength(1);
      expect(reasons[0]).toBe('Recommended for you');
    });
  });

  describe('JSON parsing helpers', () => {
    it('should parse JSON skills array', () => {
      const result = (service as any).parseSkillsJson('["JavaScript", "React"]');
      expect(result).toEqual(['JavaScript', 'React']);
    });

    it('should handle already-parsed skills array', () => {
      const result = (service as any).parseSkillsJson(['JavaScript', 'React']);
      expect(result).toEqual(['JavaScript', 'React']);
    });

    it('should handle null skills', () => {
      const result = (service as any).parseSkillsJson(null);
      expect(result).toEqual([]);
    });

    it('should handle invalid JSON gracefully', () => {
      const result = (service as any).parseSkillsJson('invalid json');
      expect(result).toEqual([]);
    });

    it('should parse visibility settings JSON', () => {
      const json = '{"showSkills":"public","showGoals":true}';
      const result = (service as any).parseVisibilitySettings(json);
      expect(result).toEqual({ showSkills: 'public', showGoals: true });
    });

    it('should handle already-parsed visibility settings', () => {
      const obj = { showSkills: 'public' as const, showGoals: true };
      const result = (service as any).parseVisibilitySettings(obj);
      expect(result).toEqual(obj);
    });

    it('should handle null visibility settings', () => {
      const result = (service as any).parseVisibilitySettings(null);
      expect(result).toBeNull();
    });
  });
});
