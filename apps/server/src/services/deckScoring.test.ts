import {
  scoreDeck,
  calculateCoverageScore,
  calculateCurveScore,
  calculateRoleScore,
  calculateLevelFitScore,
  getMissingRoles,
  isDeckValid,
  DEFAULT_SCORING_CONFIG,
  PlayerCardLevel,
} from './deckScoring';
import { getCardsById } from '../data/loader';

describe('Deck Scoring Engine', () => {
  // Classic Hog 2.6 deck
  const hog26Deck = [
    '26000021', // Hog Rider (win condition)
    '26000014', // Musketeer (air targeting, tank killer)
    '26000030', // Ice Spirit (cycle)
    '26000010', // Skeletons (cycle, swarm)
    '28000000', // Fireball (big spell)
    '28000011', // The Log (small spell)
    '27000000', // Cannon (tank killer)
    '26000038', // Ice Golem (tank, cycle)
  ];

  // Incomplete deck missing key roles
  const incompleteDeck = [
    '26000000', // Knight
    '26000001', // Archers
    '26000010', // Skeletons
  ];

  describe('calculateCoverageScore', () => {
    it('should give high score for deck with all required roles', () => {
      const cards = getCardsById(hog26Deck);
      const coverage = calculateCoverageScore(cards);

      expect(coverage.total).toBe(100);
      expect(coverage.hasWinCondition).toBe(true);
      expect(coverage.hasSmallSpell).toBe(true);
      expect(coverage.hasBigSpell).toBe(true);
      expect(coverage.hasAirTargeting).toBe(true);
      expect(coverage.hasTankKiller).toBe(true);
      expect(coverage.missingRoles).toHaveLength(0);
    });

    it('should identify missing roles', () => {
      const cards = getCardsById(incompleteDeck);
      const coverage = calculateCoverageScore(cards);

      expect(coverage.total).toBeLessThan(100);
      expect(coverage.missingRoles.length).toBeGreaterThan(0);
      expect(coverage.hasWinCondition).toBe(false);
    });

    it('should return 0 for empty deck', () => {
      const coverage = calculateCoverageScore([]);

      expect(coverage.total).toBe(0);
      expect(coverage.missingRoles).toHaveLength(5);
    });
  });

  describe('calculateCurveScore', () => {
    it('should give high score for balanced elixir curve', () => {
      const cards = getCardsById(hog26Deck);
      const curve = calculateCurveScore(cards);

      expect(curve.averageElixir).toBeCloseTo(2.6, 1);
      expect(curve.isInRange).toBe(true);
      expect(curve.cycleCardCount).toBeGreaterThan(0);
      expect(curve.total).toBeGreaterThan(50);
    });

    it('should penalize heavy decks', () => {
      // Create a heavy deck simulation
      const heavyDeck = [
        '26000003', // Giant (5)
        '26000017', // P.E.K.K.A (7)
        '26000028', // Golem (8)
        '26000016', // Prince (5)
        '28000001', // Rocket (6)
        '28000000', // Fireball (4)
        '26000014', // Musketeer (4)
        '26000008', // Valkyrie (4)
      ];
      const cards = getCardsById(heavyDeck);
      const curve = calculateCurveScore(cards);

      expect(curve.averageElixir).toBeGreaterThan(4.3);
      expect(curve.isInRange).toBe(false);
      expect(curve.heavyCardCount).toBeGreaterThanOrEqual(1); // At least some heavy cards
    });

    it('should return 0 for empty deck', () => {
      const curve = calculateCurveScore([]);

      expect(curve.total).toBe(0);
      expect(curve.averageElixir).toBe(0);
    });
  });

  describe('calculateRoleScore', () => {
    it('should give bonus for role diversity', () => {
      const cards = getCardsById(hog26Deck);
      const role = calculateRoleScore(cards);

      expect(role.total).toBeGreaterThan(0);
      expect(role.roleDistribution.size).toBeGreaterThan(0);
      expect(role.synergyBonus).toBeGreaterThan(0);
    });

    it('should track role distribution', () => {
      const cards = getCardsById(hog26Deck);
      const role = calculateRoleScore(cards);

      // Hog 2.6 has multiple cycle cards
      expect(role.roleDistribution.get('cycle')).toBeGreaterThanOrEqual(1);
    });
  });

  describe('calculateLevelFitScore', () => {
    it('should return neutral score when no levels provided', () => {
      const cards = getCardsById(hog26Deck);
      const levelFit = calculateLevelFitScore(cards);

      expect(levelFit.total).toBe(50);
      expect(levelFit.averageLevel).toBe(0);
    });

    it('should give high score for maxed cards', () => {
      const cards = getCardsById(hog26Deck);
      const playerLevels: PlayerCardLevel[] = hog26Deck.map((id) => ({
        cardId: id,
        level: 14,
      }));

      const levelFit = calculateLevelFitScore(cards, playerLevels);

      expect(levelFit.total).toBeGreaterThan(50);
      expect(levelFit.averageLevel).toBe(14);
      expect(levelFit.underleveledCount).toBe(0);
    });

    it('should penalize underleveled cards', () => {
      const cards = getCardsById(hog26Deck);
      const playerLevels: PlayerCardLevel[] = hog26Deck.map((id) => ({
        cardId: id,
        level: 5, // Very underleveled
      }));

      const levelFit = calculateLevelFitScore(cards, playerLevels);

      expect(levelFit.total).toBeLessThan(50);
      expect(levelFit.underleveledCount).toBe(8);
    });
  });

  describe('scoreDeck', () => {
    it('should return overall score combining all components', () => {
      const score = scoreDeck(hog26Deck);

      expect(score.overall).toBeGreaterThan(0);
      expect(score.overall).toBeLessThanOrEqual(100);
      expect(score.coverage).toBeDefined();
      expect(score.curve).toBeDefined();
      expect(score.role).toBeDefined();
      expect(score.levelFit).toBeDefined();
    });

    it('should give complete deck higher score than incomplete', () => {
      const completeScore = scoreDeck(hog26Deck);
      const incompleteScore = scoreDeck(incompleteDeck);

      expect(completeScore.overall).toBeGreaterThan(incompleteScore.overall);
    });

    it('should incorporate player levels when provided', () => {
      const playerLevels: PlayerCardLevel[] = hog26Deck.map((id) => ({
        cardId: id,
        level: 14,
      }));

      const scoreWithLevels = scoreDeck(hog26Deck, playerLevels);
      const scoreWithoutLevels = scoreDeck(hog26Deck);

      expect(scoreWithLevels.levelFit.total).toBeGreaterThan(
        scoreWithoutLevels.levelFit.total
      );
    });

    it('should respect custom scoring config', () => {
      const config = {
        ...DEFAULT_SCORING_CONFIG,
        weights: {
          coverage: 1.0,
          curve: 0,
          role: 0,
          levelFit: 0,
        },
      };

      const score = scoreDeck(hog26Deck, undefined, config);

      // With only coverage weighted, score should equal coverage score
      expect(score.overall).toBeCloseTo(score.coverage.total, 1);
    });
  });

  describe('getMissingRoles', () => {
    it('should return empty array for complete deck', () => {
      const missing = getMissingRoles(hog26Deck);
      expect(missing).toHaveLength(0);
    });

    it('should identify missing roles', () => {
      const missing = getMissingRoles(incompleteDeck);
      expect(missing.length).toBeGreaterThan(0);
      expect(missing).toContain('win_condition');
    });
  });

  describe('isDeckValid', () => {
    it('should return true for valid 8-card deck with all roles', () => {
      expect(isDeckValid(hog26Deck)).toBe(true);
    });

    it('should return false for incomplete deck', () => {
      expect(isDeckValid(incompleteDeck)).toBe(false);
    });

    it('should return false for deck with missing roles', () => {
      const deckMissingWinCon = [
        '26000000', // Knight
        '26000001', // Archers
        '26000010', // Skeletons
        '26000005', // Minions
        '28000000', // Fireball
        '28000008', // Zap
        '27000000', // Cannon
        '26000013', // Bomber
      ];
      expect(isDeckValid(deckMissingWinCon)).toBe(false);
    });
  });
});
