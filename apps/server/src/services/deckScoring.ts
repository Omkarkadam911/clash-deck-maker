import {
  Card,
  CardRole,
  getCardsById,
  calculateAverageElixir,
} from '../data/loader';

// Player card level information
export interface PlayerCardLevel {
  cardId: string;
  level: number;
}

// Individual score components
export interface CoverageScore {
  total: number;
  hasWinCondition: boolean;
  hasSmallSpell: boolean;
  hasBigSpell: boolean;
  hasAirTargeting: boolean;
  hasTankKiller: boolean;
  missingRoles: CardRole[];
}

export interface CurveScore {
  total: number;
  averageElixir: number;
  isInRange: boolean;
  distanceFromTarget: number;
  cycleCardCount: number;
  heavyCardCount: number;
}

export interface RoleScore {
  total: number;
  roleDistribution: Map<CardRole, number>;
  versatilityScore: number;
  synergyBonus: number;
}

export interface LevelFitScore {
  total: number;
  averageLevel: number;
  levelVariance: number;
  underleveledCount: number;
}

// Complete deck score
export interface DeckScore {
  overall: number;
  coverage: CoverageScore;
  curve: CurveScore;
  role: RoleScore;
  levelFit: LevelFitScore;
}

// Scoring configuration
export interface ScoringConfig {
  targetElixir: number;
  minElixir: number;
  maxElixir: number;
  weights: {
    coverage: number;
    curve: number;
    role: number;
    levelFit: number;
  };
}

// Default scoring configuration
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  targetElixir: 3.5,
  minElixir: 2.6,
  maxElixir: 4.3,
  weights: {
    coverage: 0.35,
    curve: 0.25,
    role: 0.25,
    levelFit: 0.15,
  },
};

// Required roles for a complete deck
const REQUIRED_ROLES: CardRole[] = [
  'win_condition',
  'small_spell',
  'big_spell',
  'air_targeting',
  'tank_killer',
];

/**
 * Calculate coverage score - how well the deck covers required roles
 */
export function calculateCoverageScore(cards: Card[]): CoverageScore {
  const rolePresence = {
    hasWinCondition: cards.some((c) => c.roles.includes('win_condition')),
    hasSmallSpell: cards.some((c) => c.roles.includes('small_spell')),
    hasBigSpell: cards.some((c) => c.roles.includes('big_spell')),
    hasAirTargeting: cards.some((c) => c.roles.includes('air_targeting')),
    hasTankKiller: cards.some((c) => c.roles.includes('tank_killer')),
  };

  const missingRoles: CardRole[] = [];
  if (!rolePresence.hasWinCondition) missingRoles.push('win_condition');
  if (!rolePresence.hasSmallSpell) missingRoles.push('small_spell');
  if (!rolePresence.hasBigSpell) missingRoles.push('big_spell');
  if (!rolePresence.hasAirTargeting) missingRoles.push('air_targeting');
  if (!rolePresence.hasTankKiller) missingRoles.push('tank_killer');

  // Score: 20 points per covered role (max 100)
  const coveredCount = REQUIRED_ROLES.length - missingRoles.length;
  const total = (coveredCount / REQUIRED_ROLES.length) * 100;

  return {
    total,
    ...rolePresence,
    missingRoles,
  };
}

/**
 * Calculate curve score - elixir distribution and cycle ability
 */
export function calculateCurveScore(
  cards: Card[],
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): CurveScore {
  if (cards.length === 0) {
    return {
      total: 0,
      averageElixir: 0,
      isInRange: false,
      distanceFromTarget: config.targetElixir,
      cycleCardCount: 0,
      heavyCardCount: 0,
    };
  }

  const totalElixir = cards.reduce((sum, card) => sum + card.elixir, 0);
  const averageElixir = Math.round((totalElixir / cards.length) * 10) / 10;

  const isInRange = averageElixir >= config.minElixir && averageElixir <= config.maxElixir;
  const distanceFromTarget = Math.abs(averageElixir - config.targetElixir);

  // Count cycle cards (1-3 elixir) and heavy cards (6+ elixir)
  const cycleCardCount = cards.filter((c) => c.elixir <= 3).length;
  const heavyCardCount = cards.filter((c) => c.elixir >= 6).length;

  // Base score from being in range
  let total = isInRange ? 60 : 30;

  // Bonus/penalty for distance from target (max ±20)
  const distancePenalty = Math.min(distanceFromTarget * 10, 20);
  total -= distancePenalty;

  // Cycle bonus: having 2-4 cycle cards is ideal (max +20)
  if (cycleCardCount >= 2 && cycleCardCount <= 4) {
    total += 20;
  } else if (cycleCardCount === 1 || cycleCardCount === 5) {
    total += 10;
  }

  // Heavy card penalty: more than 2 heavy cards hurts consistency
  if (heavyCardCount > 2) {
    total -= (heavyCardCount - 2) * 5;
  }

  return {
    total: Math.max(0, Math.min(100, total)),
    averageElixir,
    isInRange,
    distanceFromTarget,
    cycleCardCount,
    heavyCardCount,
  };
}

/**
 * Calculate role score - role diversity and synergies
 */
export function calculateRoleScore(cards: Card[]): RoleScore {
  const roleDistribution = new Map<CardRole, number>();

  // Count roles
  for (const card of cards) {
    for (const role of card.roles) {
      roleDistribution.set(role, (roleDistribution.get(role) || 0) + 1);
    }
  }

  // Versatility: cards that fill multiple roles
  const multiRoleCards = cards.filter((c) => c.roles.length > 1);
  const versatilityScore = (multiRoleCards.length / Math.max(cards.length, 1)) * 30;

  // Synergy bonuses for common combinations
  let synergyBonus = 0;

  // Tank + support synergy
  const hasTank = cards.some((c) => c.roles.includes('tank'));
  const hasSupport = cards.some((c) => c.roles.includes('support'));
  if (hasTank && hasSupport) synergyBonus += 10;

  // Swarm + anti-air synergy (bait potential)
  const hasSwarm = cards.some((c) => c.roles.includes('swarm'));
  const hasAntiSwarm = cards.some((c) => c.roles.includes('anti_swarm'));
  if (hasSwarm && hasAntiSwarm) synergyBonus += 5;

  // Win condition + small spell (cycle support)
  const hasWinCon = cards.some((c) => c.roles.includes('win_condition'));
  const hasSmallSpell = cards.some((c) => c.roles.includes('small_spell'));
  if (hasWinCon && hasSmallSpell) synergyBonus += 10;

  // Role diversity score (having different roles is good)
  const uniqueRoleCount = roleDistribution.size;
  const diversityScore = Math.min(uniqueRoleCount * 5, 35);

  const total = Math.min(100, diversityScore + versatilityScore + synergyBonus);

  return {
    total,
    roleDistribution,
    versatilityScore,
    synergyBonus,
  };
}

/**
 * Calculate level fit score - how well player levels match the deck
 */
export function calculateLevelFitScore(
  cards: Card[],
  playerLevels?: PlayerCardLevel[]
): LevelFitScore {
  if (!playerLevels || playerLevels.length === 0 || cards.length === 0) {
    return {
      total: 50, // Neutral score when no level data
      averageLevel: 0,
      levelVariance: 0,
      underleveledCount: 0,
    };
  }

  const levelMap = new Map(playerLevels.map((p) => [p.cardId, p.level]));
  const cardLevels: number[] = [];
  let underleveledCount = 0;

  for (const card of cards) {
    const level = levelMap.get(card.id) || 1;
    cardLevels.push(level);

    // Consider a card underleveled if below level 11 (tournament standard)
    if (level < 11) {
      underleveledCount++;
    }
  }

  const averageLevel = cardLevels.reduce((a, b) => a + b, 0) / cardLevels.length;

  // Calculate variance
  const variance =
    cardLevels.reduce((sum, level) => sum + Math.pow(level - averageLevel, 2), 0) /
    cardLevels.length;
  const levelVariance = Math.sqrt(variance);

  // Score components
  // Higher average level is better (max 50 points for level 14)
  const levelScore = (averageLevel / 14) * 50;

  // Lower variance is better (max 30 points for variance < 1)
  const varianceScore = Math.max(0, 30 - levelVariance * 10);

  // Penalty for underleveled cards (max -20)
  const underleveledPenalty = Math.min(underleveledCount * 5, 20);

  const total = Math.max(0, Math.min(100, levelScore + varianceScore - underleveledPenalty));

  return {
    total,
    averageLevel: Math.round(averageLevel * 10) / 10,
    levelVariance: Math.round(levelVariance * 10) / 10,
    underleveledCount,
  };
}

/**
 * Main scoring function - calculates complete deck score
 */
export function scoreDeck(
  cardIds: string[],
  playerLevels?: PlayerCardLevel[],
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): DeckScore {
  const cards = getCardsById(cardIds);

  const coverage = calculateCoverageScore(cards);
  const curve = calculateCurveScore(cards, config);
  const role = calculateRoleScore(cards);
  const levelFit = calculateLevelFitScore(cards, playerLevels);

  // Weighted overall score
  const overall =
    coverage.total * config.weights.coverage +
    curve.total * config.weights.curve +
    role.total * config.weights.role +
    levelFit.total * config.weights.levelFit;

  return {
    overall: Math.round(overall * 10) / 10,
    coverage,
    curve,
    role,
    levelFit,
  };
}

/**
 * Score a single card addition to an existing deck
 */
export function scoreCardAddition(
  currentDeckIds: string[],
  candidateCard: Card,
  playerLevels?: PlayerCardLevel[],
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): { score: number; improvesScore: boolean; delta: number } {
  const currentScore = scoreDeck(currentDeckIds, playerLevels, config);
  const newDeckIds = [...currentDeckIds, candidateCard.id];
  const newScore = scoreDeck(newDeckIds, playerLevels, config);

  const delta = newScore.overall - currentScore.overall;

  return {
    score: newScore.overall,
    improvesScore: delta > 0,
    delta,
  };
}

/**
 * Get missing roles from a deck
 */
export function getMissingRoles(cardIds: string[]): CardRole[] {
  const cards = getCardsById(cardIds);
  const coverage = calculateCoverageScore(cards);
  return coverage.missingRoles;
}

/**
 * Check if a deck is valid (has all required elements)
 */
export function isDeckValid(cardIds: string[]): boolean {
  if (cardIds.length !== 8) return false;
  const cards = getCardsById(cardIds);
  const coverage = calculateCoverageScore(cards);
  return coverage.missingRoles.length === 0;
}
