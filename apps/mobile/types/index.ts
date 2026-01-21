export type CardRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'champion';
export type CardType = 'troop' | 'spell' | 'building';
export type CardRole =
  | 'win_condition'
  | 'small_spell'
  | 'big_spell'
  | 'air_targeting'
  | 'tank_killer'
  | 'tank'
  | 'swarm'
  | 'anti_swarm'
  | 'cycle'
  | 'support';

export interface Card {
  id: string;
  name: string;
  elixir: number;
  rarity: CardRarity;
  type: CardType;
  arena: number;
  roles: CardRole[];
  description?: string;
  iconUrl?: string;
}

export interface Arena {
  id: number;
  name: string;
  trophyMin: number;
  trophyMax: number;
  iconUrl?: string;
}

export interface TopDeck {
  id: string;
  name?: string;
  cards: string[];
  cardDetails?: Card[];
  winRate: number;
  usageRate: number;
  averageElixir: number;
  trophyRange: {
    min: number;
    max: number;
  };
}

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
  cardDetails?: Card[];
}

export interface AppSettings {
  playerTag?: string;
  preferredArena: number;
  theme: 'light' | 'dark' | 'system';
  apiUrl: string;
}

// Optimization types
export interface OptimizeRequest {
  deck: string[];
  maxSwaps?: number;
  playerCardLevels?: PlayerCardLevel[];
}

export interface SwapPlan {
  remove: { cardId: string; cardName: string };
  add: { cardId: string; cardName: string };
  reason: string;
  scoreDelta: number;
}

export interface DeckScores {
  overall: number;
  coverage: number;
  curve: number;
  role: number;
  levelFit: number;
}

export interface OptimizeResponse {
  originalDeck: string[];
  optimizedDeck: string[];
  swapPlan: SwapPlan[];
  scores: {
    before: DeckScores;
    after: DeckScores;
    improvement: number;
  };
  analysis: {
    missingRoles: CardRole[];
    averageElixir: {
      before: number;
      after: number;
    };
    isOptimal: boolean;
  };
  cardDetails: Card[];
}
