import {
  Card,
  CardRole,
  getCardById,
  getCardsById,
  getCardsUnlockedByArena,
  getAllCards,
  getCardsByRole,
  calculateAverageElixir,
} from './data/loader';

export interface PlayerCardLevel {
  cardId: string;
  level: number;
}

export interface AutofillRequest {
  currentCards: string[];
  playerCardLevels?: PlayerCardLevel[];
  preferredArena?: number;
  targetElixir?: number;
}

export interface AutofillExplanation {
  cardId: string;
  reason: string;
  role: CardRole;
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
}

// Deck requirements
interface DeckRequirements {
  hasWinCondition: boolean;
  hasSmallSpell: boolean;
  hasBigSpell: boolean;
  hasAirTargeting: boolean;
  hasTankKiller: boolean;
}

const MIN_AVG_ELIXIR = 2.6;
const MAX_AVG_ELIXIR = 4.3;
const TARGET_AVG_ELIXIR = 3.5;

// Check what roles are present in the deck
function analyzeDeck(cardIds: string[]): DeckRequirements {
  const cards = getCardsById(cardIds);

  return {
    hasWinCondition: cards.some((c) => c.roles.includes('win_condition')),
    hasSmallSpell: cards.some((c) => c.roles.includes('small_spell')),
    hasBigSpell: cards.some((c) => c.roles.includes('big_spell')),
    hasAirTargeting: cards.some((c) => c.roles.includes('air_targeting')),
    hasTankKiller: cards.some((c) => c.roles.includes('tank_killer')),
  };
}

// Get missing roles from a deck
function getMissingRoles(requirements: DeckRequirements): CardRole[] {
  const missing: CardRole[] = [];
  if (!requirements.hasWinCondition) missing.push('win_condition');
  if (!requirements.hasSmallSpell) missing.push('small_spell');
  if (!requirements.hasBigSpell) missing.push('big_spell');
  if (!requirements.hasAirTargeting) missing.push('air_targeting');
  if (!requirements.hasTankKiller) missing.push('tank_killer');
  return missing;
}

// Score a card based on player levels (higher level = higher score)
function getCardLevelScore(card: Card, playerLevels?: PlayerCardLevel[]): number {
  if (!playerLevels) return 0;
  const playerCard = playerLevels.find((p) => p.cardId === card.id);
  return playerCard ? playerCard.level : 0;
}

// Calculate how adding a card affects the average elixir
function getElixirImpact(currentCards: string[], newCard: Card, targetElixir: number): number {
  const currentElixir = calculateAverageElixir(currentCards);
  const newTotal = currentCards.length > 0
    ? (currentElixir * currentCards.length + newCard.elixir) / (currentCards.length + 1)
    : newCard.elixir;

  // Return negative if moving away from target, positive if moving toward it
  const currentDistance = Math.abs(currentElixir - targetElixir);
  const newDistance = Math.abs(newTotal - targetElixir);
  return currentDistance - newDistance;
}

// Select the best card for a given role
function selectBestCardForRole(
  role: CardRole,
  availableCards: Card[],
  currentDeck: string[],
  playerLevels?: PlayerCardLevel[],
  targetElixir: number = TARGET_AVG_ELIXIR
): { card: Card; alternatives: Card[] } | null {
  // Get cards with the required role that aren't already in the deck
  const candidates = getCardsByRole(role, availableCards)
    .filter((c) => !currentDeck.includes(c.id));

  if (candidates.length === 0) return null;

  // Score each candidate
  const scored = candidates.map((card) => {
    let score = 0;

    // Player level bonus (0-14 points)
    score += getCardLevelScore(card, playerLevels);

    // Elixir impact bonus (-5 to 5 points)
    score += getElixirImpact(currentDeck, card, targetElixir) * 2;

    // Versatility bonus - cards with multiple roles are preferred
    score += (card.roles.length - 1) * 0.5;

    // Rarity adjustment (commons are easier to level)
    const rarityScores: Record<string, number> = {
      common: 2,
      rare: 1.5,
      epic: 1,
      legendary: 0.5,
      champion: 0.5,
    };
    score += rarityScores[card.rarity] || 0;

    return { card, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Return the best card and top alternatives
  const best = scored[0].card;
  const alternatives = scored.slice(1, 3).map((s) => s.card);

  return { card: best, alternatives };
}

// Fill remaining slots with support/cycle cards
function fillRemainingSlots(
  currentDeck: string[],
  availableCards: Card[],
  playerLevels?: PlayerCardLevel[],
  targetElixir: number = TARGET_AVG_ELIXIR
): { cards: Card[]; explanations: AutofillExplanation[]; alternatives: Record<string, AlternativeSuggestion[]> } {
  const slotsToFill = 8 - currentDeck.length;
  const filledCards: Card[] = [];
  const explanations: AutofillExplanation[] = [];
  const alternatives: Record<string, AlternativeSuggestion[]> = {};

  const workingDeck = [...currentDeck];

  for (let i = 0; i < slotsToFill; i++) {
    const currentAvgElixir = calculateAverageElixir(workingDeck);

    // Determine what type of card we need based on elixir
    let preferredRoles: CardRole[];
    if (currentAvgElixir > targetElixir + 0.3) {
      // Need cheaper cards
      preferredRoles = ['cycle', 'swarm', 'support'];
    } else if (currentAvgElixir < targetElixir - 0.3) {
      // Can afford more expensive cards
      preferredRoles = ['support', 'tank', 'anti_swarm'];
    } else {
      // Balanced
      preferredRoles = ['support', 'cycle', 'swarm'];
    }

    // Try each preferred role
    let selected: { card: Card; alternatives: Card[] } | null = null;
    let selectedRole: CardRole = 'support';

    for (const role of preferredRoles) {
      selected = selectBestCardForRole(role, availableCards, workingDeck, playerLevels, targetElixir);
      if (selected) {
        selectedRole = role;
        break;
      }
    }

    // Fallback: pick any available card
    if (!selected) {
      const remaining = availableCards.filter((c) => !workingDeck.includes(c.id));
      if (remaining.length > 0) {
        selected = {
          card: remaining[0],
          alternatives: remaining.slice(1, 3),
        };
        selectedRole = remaining[0].roles[0] || 'support';
      }
    }

    if (selected) {
      filledCards.push(selected.card);
      workingDeck.push(selected.card.id);

      explanations.push({
        cardId: selected.card.id,
        reason: `Added ${selected.card.name} for ${selectedRole.replace('_', ' ')} (${selected.card.elixir} elixir)`,
        role: selectedRole,
      });

      alternatives[selected.card.id] = selected.alternatives.map((alt) => ({
        cardId: alt.id,
        reason: `${alt.name} could also fulfill ${selectedRole.replace('_', ' ')} role`,
      }));
    }
  }

  return { cards: filledCards, explanations, alternatives };
}

// Main autofill function
export function autofillDeck(request: AutofillRequest): AutofillResponse {
  const { currentCards, playerCardLevels, preferredArena, targetElixir = TARGET_AVG_ELIXIR } = request;

  // Validate current cards
  if (currentCards.length >= 8) {
    return {
      deck: currentCards.slice(0, 8),
      explanations: [],
      alternatives: {},
      averageElixir: calculateAverageElixir(currentCards.slice(0, 8)),
    };
  }

  // Get available cards based on arena
  const availableCards = preferredArena !== undefined
    ? getCardsUnlockedByArena(preferredArena)
    : getAllCards();

  const workingDeck = [...currentCards];
  const explanations: AutofillExplanation[] = [];
  const alternatives: Record<string, AlternativeSuggestion[]> = {};

  // Analyze current deck requirements
  let requirements = analyzeDeck(workingDeck);
  const missingRoles = getMissingRoles(requirements);

  // Fill missing critical roles first
  for (const role of missingRoles) {
    if (workingDeck.length >= 8) break;

    const result = selectBestCardForRole(
      role,
      availableCards,
      workingDeck,
      playerCardLevels,
      targetElixir
    );

    if (result) {
      workingDeck.push(result.card.id);

      explanations.push({
        cardId: result.card.id,
        reason: `Added ${result.card.name} as ${role.replace('_', ' ')} (${result.card.elixir} elixir)`,
        role,
      });

      alternatives[result.card.id] = result.alternatives.map((alt) => ({
        cardId: alt.id,
        reason: `${alt.name} is another good ${role.replace('_', ' ')} option`,
      }));
    }
  }

  // Fill remaining slots
  if (workingDeck.length < 8) {
    const remainingResult = fillRemainingSlots(
      workingDeck,
      availableCards,
      playerCardLevels,
      targetElixir
    );

    for (const card of remainingResult.cards) {
      workingDeck.push(card.id);
    }

    explanations.push(...remainingResult.explanations);
    Object.assign(alternatives, remainingResult.alternatives);
  }

  // Calculate final average elixir
  const avgElixir = calculateAverageElixir(workingDeck);

  // Validate elixir range
  if (avgElixir < MIN_AVG_ELIXIR || avgElixir > MAX_AVG_ELIXIR) {
    console.warn(`Deck average elixir ${avgElixir} is outside recommended range (${MIN_AVG_ELIXIR}-${MAX_AVG_ELIXIR})`);
  }

  return {
    deck: workingDeck,
    explanations,
    alternatives,
    averageElixir: avgElixir,
  };
}

// Validate a deck has all required elements
export function validateDeck(cardIds: string[]): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (cardIds.length !== 8) {
    issues.push(`Deck has ${cardIds.length} cards, needs exactly 8`);
  }

  const requirements = analyzeDeck(cardIds);

  if (!requirements.hasWinCondition) {
    issues.push('Deck lacks a win condition');
  }
  if (!requirements.hasSmallSpell) {
    issues.push('Deck lacks a small spell');
  }
  if (!requirements.hasBigSpell) {
    issues.push('Deck lacks a big spell');
  }
  if (!requirements.hasAirTargeting) {
    issues.push('Deck lacks air-targeting units');
  }
  if (!requirements.hasTankKiller) {
    issues.push('Deck lacks a tank killer');
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
  };
}
