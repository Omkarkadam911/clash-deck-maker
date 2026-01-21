import { calculateAverageElixir } from './data/loader';
import {
  scoreDeck,
  getMissingRoles,
  PlayerCardLevel,
  DEFAULT_SCORING_CONFIG,
} from './services/deckScoring';
import {
  generateDeckCandidates,
  getBestDeckCompletion,
  DeckCandidate,
  AddedCardInfo,
} from './services/deckCandidates';

// Re-export types for backwards compatibility
export { PlayerCardLevel } from './services/deckScoring';

export interface AutofillRequest {
  currentCards: string[];
  playerCardLevels?: PlayerCardLevel[];
  preferredArena?: number;
  targetElixir?: number;
}

export interface AutofillExplanation {
  cardId: string;
  reason: string;
  role: string;
}

export interface AlternativeSuggestion {
  cardId: string;
  reason: string;
}

export interface AutofillResponse {
  deck: string[];
  explanations: AutofillExplanation[];
  alternatives: Record<string, AlternativeSuggestion[]>;
  averageElixir: number;
  score?: number;
}

// Extended response with multiple candidates
export interface AutofillResponseWithCandidates extends AutofillResponse {
  candidates: DeckCandidate[];
}

const MIN_AVG_ELIXIR = DEFAULT_SCORING_CONFIG.minElixir;
const MAX_AVG_ELIXIR = DEFAULT_SCORING_CONFIG.maxElixir;

/**
 * Convert AddedCardInfo to AutofillExplanation format
 */
function toExplanation(info: AddedCardInfo): AutofillExplanation {
  return {
    cardId: info.cardId,
    reason: `${info.reason} (${info.elixir} elixir)`,
    role: info.role,
  };
}

/**
 * Convert AddedCardInfo alternatives to AlternativeSuggestion format
 */
function toAlternatives(info: AddedCardInfo): AlternativeSuggestion[] {
  return info.alternatives.map((alt) => ({
    cardId: alt.cardId,
    reason: alt.reason,
  }));
}

/**
 * Main autofill function - fills a partial deck to 8 cards
 * Now uses the unified deck scoring engine
 */
export function autofillDeck(request: AutofillRequest): AutofillResponse {
  const { currentCards, playerCardLevels, preferredArena, targetElixir } = request;

  // Validate current cards
  if (currentCards.length >= 8) {
    return {
      deck: currentCards.slice(0, 8),
      explanations: [],
      alternatives: {},
      averageElixir: calculateAverageElixir(currentCards.slice(0, 8)),
      score: scoreDeck(currentCards.slice(0, 8), playerCardLevels).overall,
    };
  }

  // Use the deck engine to get the best completion
  const candidate = getBestDeckCompletion(currentCards, {
    playerLevels: playerCardLevels,
    preferredArena,
    scoringConfig: targetElixir
      ? { ...DEFAULT_SCORING_CONFIG, targetElixir }
      : undefined,
  });

  if (!candidate) {
    // Fallback if no candidate could be generated
    return {
      deck: currentCards,
      explanations: [],
      alternatives: {},
      averageElixir: calculateAverageElixir(currentCards),
    };
  }

  // Convert to legacy response format
  const explanations = candidate.addedCards.map(toExplanation);
  const alternatives: Record<string, AlternativeSuggestion[]> = {};

  for (const info of candidate.addedCards) {
    alternatives[info.cardId] = toAlternatives(info);
  }

  const avgElixir = calculateAverageElixir(candidate.cards);

  // Validate elixir range
  if (avgElixir < MIN_AVG_ELIXIR || avgElixir > MAX_AVG_ELIXIR) {
    console.warn(
      `Deck average elixir ${avgElixir} is outside recommended range (${MIN_AVG_ELIXIR}-${MAX_AVG_ELIXIR})`
    );
  }

  return {
    deck: candidate.cards,
    explanations,
    alternatives,
    averageElixir: avgElixir,
    score: candidate.score.overall,
  };
}

/**
 * Extended autofill that returns multiple candidate decks
 */
export function autofillDeckWithCandidates(
  request: AutofillRequest,
  maxCandidates: number = 5
): AutofillResponseWithCandidates {
  const { currentCards, playerCardLevels, preferredArena, targetElixir } = request;

  // Validate current cards
  if (currentCards.length >= 8) {
    const score = scoreDeck(currentCards.slice(0, 8), playerCardLevels);
    return {
      deck: currentCards.slice(0, 8),
      explanations: [],
      alternatives: {},
      averageElixir: calculateAverageElixir(currentCards.slice(0, 8)),
      score: score.overall,
      candidates: [
        {
          cards: currentCards.slice(0, 8),
          score,
          addedCards: [],
        },
      ],
    };
  }

  // Generate multiple candidates
  const candidates = generateDeckCandidates(currentCards, {
    maxCandidates,
    playerLevels: playerCardLevels,
    preferredArena,
    scoringConfig: targetElixir
      ? { ...DEFAULT_SCORING_CONFIG, targetElixir }
      : undefined,
  });

  if (candidates.length === 0) {
    return {
      deck: currentCards,
      explanations: [],
      alternatives: {},
      averageElixir: calculateAverageElixir(currentCards),
      candidates: [],
    };
  }

  // Use the best candidate for the primary response
  const best = candidates[0];
  const explanations = best.addedCards.map(toExplanation);
  const alternatives: Record<string, AlternativeSuggestion[]> = {};

  for (const info of best.addedCards) {
    alternatives[info.cardId] = toAlternatives(info);
  }

  return {
    deck: best.cards,
    explanations,
    alternatives,
    averageElixir: calculateAverageElixir(best.cards),
    score: best.score.overall,
    candidates,
  };
}

/**
 * Validate a deck has all required elements
 * Now uses the unified scoring engine
 */
export function validateDeck(cardIds: string[]): { isValid: boolean; issues: string[]; score?: number } {
  const issues: string[] = [];

  if (cardIds.length !== 8) {
    issues.push(`Deck has ${cardIds.length} cards, needs exactly 8`);
  }

  const score = scoreDeck(cardIds);
  const missingRoles = getMissingRoles(cardIds);

  for (const role of missingRoles) {
    issues.push(`Deck lacks a ${role.replace('_', ' ')}`);
  }

  const avgElixir = calculateAverageElixir(cardIds);
  if (avgElixir < MIN_AVG_ELIXIR) {
    issues.push(`Average elixir (${avgElixir}) is too low (min: ${MIN_AVG_ELIXIR})`);
  }
  if (avgElixir > MAX_AVG_ELIXIR) {
    issues.push(`Average elixir (${avgElixir}) is too high (max: ${MAX_AVG_ELIXIR})`);
  }

  return {
    isValid: issues.length === 0,
    issues,
    score: score.overall,
  };
}
