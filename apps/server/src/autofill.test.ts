import { autofillDeck, validateDeck, AutofillRequest } from './autofill';
import { getCardById, calculateAverageElixir } from './data/loader';

describe('Autofill Algorithm', () => {
  describe('autofillDeck', () => {
    it('should fill an empty deck with 8 cards', () => {
      const request: AutofillRequest = {
        currentCards: [],
      };

      const result = autofillDeck(request);

      expect(result.deck).toHaveLength(8);
      expect(result.explanations.length).toBeGreaterThan(0);
    });

    it('should not modify a full deck', () => {
      const request: AutofillRequest = {
        currentCards: [
          '26000021', // Hog Rider
          '26000014', // Musketeer
          '26000030', // Ice Spirit
          '26000010', // Skeletons
          '28000000', // Fireball
          '28000011', // The Log
          '27000000', // Cannon
          '26000038', // Ice Golem
        ],
      };

      const result = autofillDeck(request);

      expect(result.deck).toEqual(request.currentCards);
      expect(result.explanations).toHaveLength(0);
    });

    it('should fill remaining slots when given partial deck', () => {
      const request: AutofillRequest = {
        currentCards: [
          '26000021', // Hog Rider (win condition)
          '26000014', // Musketeer (air targeting)
        ],
      };

      const result = autofillDeck(request);

      expect(result.deck).toHaveLength(8);
      expect(result.deck).toContain('26000021');
      expect(result.deck).toContain('26000014');
      expect(result.explanations.length).toBe(6);
    });

    it('should include a win condition if missing', () => {
      const request: AutofillRequest = {
        currentCards: [
          '26000000', // Knight (tank)
          '26000001', // Archers (air targeting)
        ],
      };

      const result = autofillDeck(request);
      const cards = result.deck.map((id) => getCardById(id)!);
      const hasWinCondition = cards.some((c) => c.roles.includes('win_condition'));

      expect(hasWinCondition).toBe(true);
    });

    it('should include a small spell if missing', () => {
      const request: AutofillRequest = {
        currentCards: [
          '26000021', // Hog Rider
        ],
      };

      const result = autofillDeck(request);
      const cards = result.deck.map((id) => getCardById(id)!);
      const hasSmallSpell = cards.some((c) => c.roles.includes('small_spell'));

      expect(hasSmallSpell).toBe(true);
    });

    it('should include a big spell if missing', () => {
      const request: AutofillRequest = {
        currentCards: [
          '26000021', // Hog Rider
          '28000008', // Zap (small spell)
        ],
      };

      const result = autofillDeck(request);
      const cards = result.deck.map((id) => getCardById(id)!);
      const hasBigSpell = cards.some((c) => c.roles.includes('big_spell'));

      expect(hasBigSpell).toBe(true);
    });

    it('should include air targeting if missing', () => {
      const request: AutofillRequest = {
        currentCards: [
          '26000021', // Hog Rider
          '26000000', // Knight (no air targeting)
        ],
      };

      const result = autofillDeck(request);
      const cards = result.deck.map((id) => getCardById(id)!);
      const hasAirTargeting = cards.some((c) => c.roles.includes('air_targeting'));

      expect(hasAirTargeting).toBe(true);
    });

    it('should include a tank killer if missing', () => {
      const request: AutofillRequest = {
        currentCards: [
          '26000021', // Hog Rider
          '26000005', // Minions (air targeting, no tank killer)
        ],
      };

      const result = autofillDeck(request);
      const cards = result.deck.map((id) => getCardById(id)!);
      const hasTankKiller = cards.some((c) => c.roles.includes('tank_killer'));

      expect(hasTankKiller).toBe(true);
    });

    it('should respect arena restriction', () => {
      const request: AutofillRequest = {
        currentCards: [],
        preferredArena: 3, // Barbarian Bowl
      };

      const result = autofillDeck(request);
      const cards = result.deck.map((id) => getCardById(id)!);

      // All cards should be unlocked at or before arena 3
      for (const card of cards) {
        expect(card.arena).toBeLessThanOrEqual(3);
      }
    });

    it('should produce a deck with reasonable average elixir', () => {
      const request: AutofillRequest = {
        currentCards: [],
        targetElixir: 3.5,
      };

      const result = autofillDeck(request);

      expect(result.averageElixir).toBeGreaterThanOrEqual(2.6);
      expect(result.averageElixir).toBeLessThanOrEqual(4.3);
    });

    it('should provide alternative suggestions for added cards', () => {
      const request: AutofillRequest = {
        currentCards: [],
      };

      const result = autofillDeck(request);

      // At least some cards should have alternatives
      const cardsWithAlternatives = Object.keys(result.alternatives);
      expect(cardsWithAlternatives.length).toBeGreaterThan(0);

      // Alternatives should have up to 2 suggestions
      for (const cardId of cardsWithAlternatives) {
        expect(result.alternatives[cardId].length).toBeLessThanOrEqual(2);
      }
    });

    it('should prefer higher level cards when player levels are provided', () => {
      const request: AutofillRequest = {
        currentCards: [],
        playerCardLevels: [
          { cardId: '26000021', level: 14 }, // Hog Rider max level
          { cardId: '26000003', level: 14 }, // Giant max level
        ],
      };

      const result = autofillDeck(request);

      // At least one of the max level cards should be in the deck
      const hasMaxLevelCard = result.deck.includes('26000021') || result.deck.includes('26000003');
      expect(hasMaxLevelCard).toBe(true);
    });

    it('should not include duplicate cards', () => {
      const request: AutofillRequest = {
        currentCards: ['26000021'], // Hog Rider
      };

      const result = autofillDeck(request);
      const uniqueCards = new Set(result.deck);

      expect(uniqueCards.size).toBe(8);
    });
  });

  describe('validateDeck', () => {
    it('should validate a complete and balanced deck', () => {
      const deck = [
        '26000021', // Hog Rider (win condition)
        '26000014', // Musketeer (air targeting, tank killer)
        '26000030', // Ice Spirit (cycle)
        '26000010', // Skeletons (cycle, swarm)
        '28000000', // Fireball (big spell)
        '28000011', // The Log (small spell)
        '27000000', // Cannon (tank killer)
        '26000038', // Ice Golem (tank, cycle)
      ];

      const result = validateDeck(deck);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should report missing win condition', () => {
      const deck = [
        '26000000', // Knight
        '26000001', // Archers
        '26000010', // Skeletons
        '26000005', // Minions
        '28000000', // Fireball
        '28000008', // Zap
        '27000000', // Cannon
        '26000013', // Bomber
      ];

      const result = validateDeck(deck);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Deck lacks a win condition');
    });

    it('should report wrong card count', () => {
      const deck = [
        '26000021', // Hog Rider
        '26000014', // Musketeer
      ];

      const result = validateDeck(deck);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Deck has 2 cards, needs exactly 8');
    });

    it('should report missing spells', () => {
      const deck = [
        '26000021', // Hog Rider
        '26000014', // Musketeer
        '26000030', // Ice Spirit
        '26000010', // Skeletons
        '26000000', // Knight
        '26000001', // Archers
        '27000000', // Cannon
        '26000038', // Ice Golem
      ];

      const result = validateDeck(deck);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Deck lacks a small spell');
      expect(result.issues).toContain('Deck lacks a big spell');
    });
  });

  describe('calculateAverageElixir', () => {
    it('should calculate correct average for Hog 2.6', () => {
      const deck = [
        '26000021', // Hog Rider (4)
        '26000014', // Musketeer (4)
        '26000030', // Ice Spirit (1)
        '26000010', // Skeletons (1)
        '28000000', // Fireball (4)
        '28000011', // The Log (2)
        '27000000', // Cannon (3)
        '26000038', // Ice Golem (2)
      ];

      const avgElixir = calculateAverageElixir(deck);

      // 4+4+1+1+4+2+3+2 = 21 / 8 = 2.625, rounded to 2.6
      expect(avgElixir).toBe(2.6);
    });

    it('should return 0 for empty deck', () => {
      const avgElixir = calculateAverageElixir([]);
      expect(avgElixir).toBe(0);
    });
  });
});
