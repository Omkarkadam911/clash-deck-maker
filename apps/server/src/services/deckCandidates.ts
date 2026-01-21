import {
  Card,
  CardRole,
  getCardsById,
  getCardsByRole,
  getAllCards,
  getCardsUnlockedByArena,
} from '../data/loader';
import {
  scoreDeck,
  scoreCardAddition,
  getMissingRoles,
  PlayerCardLevel,
  ScoringConfig,
  DEFAULT_SCORING_CONFIG,
  DeckScore,
} from './deckScoring';

// Candidate deck with score and metadata
export interface DeckCandidate {
  cards: string[];
  score: DeckScore;
  addedCards: AddedCardInfo[];
}

// Information about a card that was added
export interface AddedCardInfo {
  cardId: string;
  cardName: string;
  reason: string;
  role: CardRole;
  elixir: number;
  alternatives: AlternativeCard[];
}

// Alternative card suggestion
export interface AlternativeCard {
  cardId: string;
  cardName: string;
  reason: string;
  scoreDelta: number;
}

// Generation options
export interface CandidateGenerationOptions {
  maxCandidates: number;
  playerLevels?: PlayerCardLevel[];
  preferredArena?: number;
  scoringConfig?: ScoringConfig;
  diversityWeight: number; // How much to value deck diversity in candidates
}

const DEFAULT_OPTIONS: CandidateGenerationOptions = {
  maxCandidates: 5,
  diversityWeight: 0.3,
};

/**
 * Score a card for a specific role considering multiple factors
 */
function scoreCardForRole(
  card: Card,
  role: CardRole,
  currentDeck: string[],
  playerLevels?: PlayerCardLevel[],
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): number {
  let score = 0;

  // Base score from deck improvement
  const { delta } = scoreCardAddition(currentDeck, card, playerLevels, config);
  score += delta * 2;

  // Player level bonus (0-14 points)
  if (playerLevels) {
    const playerCard = playerLevels.find((p) => p.cardId === card.id);
    if (playerCard) {
      score += playerCard.level;
    }
  }

  // Versatility bonus - cards with multiple roles
  score += (card.roles.length - 1) * 2;

  // Rarity consideration (commons easier to level)
  const rarityScores: Record<string, number> = {
    common: 3,
    rare: 2,
    epic: 1,
    legendary: 0,
    champion: 0,
  };
  score += rarityScores[card.rarity] || 0;

  // Elixir efficiency for the role
  if (role === 'cycle' || role === 'small_spell') {
    score += Math.max(0, 4 - card.elixir); // Prefer cheaper for cycle/small spell
  } else if (role === 'win_condition' || role === 'tank') {
    score += card.elixir > 3 ? 2 : 0; // Win conditions usually cost more
  }

  return score;
}

/**
 * Get ranked cards for a specific role
 */
function getRankedCardsForRole(
  role: CardRole,
  availableCards: Card[],
  currentDeck: string[],
  playerLevels?: PlayerCardLevel[],
  config?: ScoringConfig,
  limit: number = 10
): Array<{ card: Card; score: number }> {
  const candidates = getCardsByRole(role, availableCards).filter(
    (c) => !currentDeck.includes(c.id)
  );

  const scored = candidates.map((card) => ({
    card,
    score: scoreCardForRole(card, role, currentDeck, playerLevels, config),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
}

/**
 * Get the best card to fill a slot based on current deck state
 */
function selectBestCard(
  availableCards: Card[],
  currentDeck: string[],
  missingRoles: CardRole[],
  playerLevels?: PlayerCardLevel[],
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): { card: Card; role: CardRole; alternatives: Array<{ card: Card; score: number }> } | null {
  // Prioritize missing required roles
  if (missingRoles.length > 0) {
    const role = missingRoles[0];
    const ranked = getRankedCardsForRole(role, availableCards, currentDeck, playerLevels, config);

    if (ranked.length > 0) {
      return {
        card: ranked[0].card,
        role,
        alternatives: ranked.slice(1, 4),
      };
    }
  }

  // If no missing roles, fill with support/cycle based on elixir needs
  const currentCards = getCardsById(currentDeck);
  const avgElixir =
    currentCards.length > 0
      ? currentCards.reduce((sum, c) => sum + c.elixir, 0) / currentCards.length
      : config.targetElixir;

  // Determine preferred roles based on current elixir
  const preferredRoles: CardRole[] =
    avgElixir > config.targetElixir + 0.3
      ? ['cycle', 'swarm', 'support']
      : avgElixir < config.targetElixir - 0.3
        ? ['support', 'tank', 'anti_swarm']
        : ['support', 'cycle', 'swarm'];

  for (const role of preferredRoles) {
    const ranked = getRankedCardsForRole(role, availableCards, currentDeck, playerLevels, config);
    if (ranked.length > 0) {
      return {
        card: ranked[0].card,
        role,
        alternatives: ranked.slice(1, 4),
      };
    }
  }

  // Fallback: any available card
  const remaining = availableCards.filter((c) => !currentDeck.includes(c.id));
  if (remaining.length > 0) {
    return {
      card: remaining[0],
      role: remaining[0].roles[0] || 'support',
      alternatives: [],
    };
  }

  return null;
}

/**
 * Generate a single deck completion
 */
function generateSingleCompletion(
  startingCards: string[],
  availableCards: Card[],
  playerLevels?: PlayerCardLevel[],
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
  excludeCards: Set<string> = new Set()
): DeckCandidate | null {
  const deck = [...startingCards];
  const addedCards: AddedCardInfo[] = [];
  const filteredAvailable = availableCards.filter((c) => !excludeCards.has(c.id));

  while (deck.length < 8) {
    const missingRoles = getMissingRoles(deck);
    const selection = selectBestCard(filteredAvailable, deck, missingRoles, playerLevels, config);

    if (!selection) break;

    deck.push(selection.card.id);
    addedCards.push({
      cardId: selection.card.id,
      cardName: selection.card.name,
      reason: `Added as ${selection.role.replace('_', ' ')}`,
      role: selection.role,
      elixir: selection.card.elixir,
      alternatives: selection.alternatives.map((alt) => ({
        cardId: alt.card.id,
        cardName: alt.card.name,
        reason: `Alternative ${selection.role.replace('_', ' ')} option`,
        scoreDelta: alt.score - (selection.alternatives[0]?.score || 0),
      })),
    });
  }

  if (deck.length !== 8) return null;

  const score = scoreDeck(deck, playerLevels, config);

  return {
    cards: deck,
    score,
    addedCards,
  };
}

/**
 * Generate multiple diverse deck candidates
 */
export function generateDeckCandidates(
  startingCards: string[],
  options: Partial<CandidateGenerationOptions> = {}
): DeckCandidate[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const config = opts.scoringConfig || DEFAULT_SCORING_CONFIG;

  // Get available cards
  const availableCards =
    opts.preferredArena !== undefined
      ? getCardsUnlockedByArena(opts.preferredArena)
      : getAllCards();

  const candidates: DeckCandidate[] = [];
  const usedFirstCards = new Set<string>();

  // Generate primary candidate (best scoring)
  const primary = generateSingleCompletion(
    startingCards,
    availableCards,
    opts.playerLevels,
    config
  );

  if (primary) {
    candidates.push(primary);

    // Track first added card for diversity
    if (primary.addedCards.length > 0) {
      usedFirstCards.add(primary.addedCards[0].cardId);
    }
  }

  // Generate diverse alternatives
  while (candidates.length < opts.maxCandidates) {
    // Exclude first cards from previous candidates to force diversity
    const excludeCards = new Set<string>();

    // Add some cards from the best candidate to exclusion to force variation
    if (candidates.length > 0) {
      const bestCandidate = candidates[0];
      const cardsToExclude = bestCandidate.addedCards
        .slice(0, Math.min(candidates.length, 3))
        .map((c) => c.cardId);

      cardsToExclude.forEach((id) => excludeCards.add(id));
    }

    // Also exclude first cards we've already used
    usedFirstCards.forEach((id) => excludeCards.add(id));

    const candidate = generateSingleCompletion(
      startingCards,
      availableCards,
      opts.playerLevels,
      config,
      excludeCards
    );

    if (candidate) {
      // Check if this candidate is sufficiently different
      const isDifferent = candidates.every((existing) => {
        const overlap = candidate.cards.filter((c) => existing.cards.includes(c)).length;
        return overlap < 7; // At least 1 different card
      });

      if (isDifferent) {
        candidates.push(candidate);
        if (candidate.addedCards.length > 0) {
          usedFirstCards.add(candidate.addedCards[0].cardId);
        }
      }
    }

    // Prevent infinite loop
    if (excludeCards.size > availableCards.length * 0.5) {
      break;
    }
  }

  // Sort by score
  candidates.sort((a, b) => b.score.overall - a.score.overall);

  return candidates.slice(0, opts.maxCandidates);
}

/**
 * Get the best single deck completion (convenience function)
 */
export function getBestDeckCompletion(
  startingCards: string[],
  options: Partial<CandidateGenerationOptions> = {}
): DeckCandidate | null {
  const candidates = generateDeckCandidates(startingCards, { ...options, maxCandidates: 1 });
  return candidates[0] || null;
}

/**
 * Generate candidates optimized for a specific goal
 */
export function generateOptimizedCandidates(
  startingCards: string[],
  optimizationGoal: 'coverage' | 'curve' | 'level_fit',
  options: Partial<CandidateGenerationOptions> = {}
): DeckCandidate[] {
  // Adjust weights based on optimization goal
  const config: ScoringConfig = {
    ...DEFAULT_SCORING_CONFIG,
    ...(options.scoringConfig || {}),
  };

  switch (optimizationGoal) {
    case 'coverage':
      config.weights = { coverage: 0.5, curve: 0.2, role: 0.2, levelFit: 0.1 };
      break;
    case 'curve':
      config.weights = { coverage: 0.25, curve: 0.45, role: 0.2, levelFit: 0.1 };
      break;
    case 'level_fit':
      config.weights = { coverage: 0.25, curve: 0.2, role: 0.15, levelFit: 0.4 };
      break;
  }

  return generateDeckCandidates(startingCards, { ...options, scoringConfig: config });
}

/**
 * Suggest card swaps to improve a complete deck
 */
export function suggestCardSwaps(
  deck: string[],
  options: Partial<CandidateGenerationOptions> = {}
): Array<{
  removeCard: string;
  addCard: string;
  scoreBefore: number;
  scoreAfter: number;
  improvement: number;
  reason: string;
}> {
  const config = options.scoringConfig || DEFAULT_SCORING_CONFIG;
  const availableCards =
    options.preferredArena !== undefined
      ? getCardsUnlockedByArena(options.preferredArena)
      : getAllCards();

  const currentScore = scoreDeck(deck, options.playerLevels, config);
  const suggestions: Array<{
    removeCard: string;
    addCard: string;
    scoreBefore: number;
    scoreAfter: number;
    improvement: number;
    reason: string;
  }> = [];

  const deckCards = getCardsById(deck);

  // Try removing each card and finding a better replacement
  for (const cardToRemove of deckCards) {
    const deckWithoutCard = deck.filter((id) => id !== cardToRemove.id);

    // Find potential replacements
    const candidates = availableCards.filter(
      (c) => !deck.includes(c.id) && c.roles.some((r) => cardToRemove.roles.includes(r))
    );

    for (const replacement of candidates.slice(0, 5)) {
      const newDeck = [...deckWithoutCard, replacement.id];
      const newScore = scoreDeck(newDeck, options.playerLevels, config);
      const improvement = newScore.overall - currentScore.overall;

      if (improvement > 1) {
        // Only suggest if meaningful improvement
        suggestions.push({
          removeCard: cardToRemove.id,
          addCard: replacement.id,
          scoreBefore: currentScore.overall,
          scoreAfter: newScore.overall,
          improvement,
          reason: `Swap ${cardToRemove.name} for ${replacement.name} (+${improvement.toFixed(1)} score)`,
        });
      }
    }
  }

  // Sort by improvement
  suggestions.sort((a, b) => b.improvement - a.improvement);

  return suggestions.slice(0, 5);
}
