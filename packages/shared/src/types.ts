// Card Types
export type CardRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'champion';
export type CardType = 'troop' | 'spell' | 'building';

export interface Card {
  id: string;
  name: string;
  elixir: number;
  rarity: CardRarity;
  type: CardType;
  arena: number;
  description?: string;
  iconUrl?: string;
  // Role tags for deck building
  roles: CardRole[];
}

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

// Arena Types
export interface Arena {
  id: number;
  name: string;
  trophyMin: number;
  trophyMax: number;
  iconUrl?: string;
}

// Trophy Road Types
export interface TrophyRoadTier {
  arena: number;
  trophies: number;
  reward?: string;
}

// Deck Types
export interface Deck {
  cards: Card[];
  averageElixir: number;
  shareLink?: string;
}

export interface DeckSlot {
  index: number;
  card: Card | null;
}

// Player Card Level (for autofill)
export interface PlayerCardLevel {
  cardId: string;
  level: number; // 1-14
}

// API Request/Response Types
export interface AutofillRequest {
  currentCards: string[]; // Array of card IDs already in deck (0-7)
  playerCardLevels?: PlayerCardLevel[]; // Optional player card levels
  preferredArena?: number; // Only use cards unlocked at or before this arena
  targetElixir?: number; // Target average elixir (default 3.5)
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
  deck: string[]; // Final 8 card IDs
  explanations: AutofillExplanation[];
  alternatives: Record<string, AlternativeSuggestion[]>; // cardId -> alternatives
  averageElixir: number;
}

export interface MetaCardsResponse {
  cards: Card[];
}

export interface MetaArenasResponse {
  arenas: Arena[];
}

// Top Decks Types
export interface TopDeck {
  id: string;
  cards: string[]; // 8 card IDs
  winRate: number;
  usageRate: number;
  averageElixir: number;
  trophyRange: {
    min: number;
    max: number;
  };
}

export interface TopDecksRequest {
  arenaId?: number;
  trophyMin?: number;
  trophyMax?: number;
}

export interface TopDecksResponse {
  decks: TopDeck[];
}

// Deck Link Parsing
export interface ParsedDeckLink {
  cards: string[];
  isValid: boolean;
  error?: string;
}

// Settings Types
export interface AppSettings {
  playerTag?: string;
  preferredArena: number;
  theme: 'light' | 'dark' | 'system';
}
