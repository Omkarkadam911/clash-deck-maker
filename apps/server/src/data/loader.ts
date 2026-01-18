import cardsData from './cards.json';
import arenasData from './arenas.json';
import topDecksData from './top_decks.json';

// Type definitions
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
  winRate: number;
  usageRate: number;
  averageElixir: number;
  trophyRange: {
    min: number;
    max: number;
  };
}

// Raw JSON types
interface RawCard {
  id: string;
  name: string;
  elixir: number;
  rarity: string;
  type: string;
  arena: number;
  roles: string[];
}

interface RawArena {
  id: number;
  name: string;
  trophyMin: number;
  trophyMax: number;
}

interface RawTopDeck {
  id: string;
  name?: string;
  cards: string[];
  winRate: number;
  usageRate: number;
  averageElixir: number;
  trophyRange: {
    min: number;
    max: number;
  };
}

// Data storage
let cardById: Map<string, Card> = new Map();
let cardsByArena: Map<number, Card[]> = new Map();
let arenaById: Map<number, Arena> = new Map();
let allCards: Card[] = [];
let allArenas: Arena[] = [];
let allTopDecks: TopDeck[] = [];

// Helper to generate card icon URL
function getCardIconUrl(cardId: string): string {
  return `https://cdn.royaleapi.com/static/img/cards-150/${cardId}.png`;
}

// Initialize data
export function initializeData(): void {
  // Load cards
  allCards = (cardsData.cards as RawCard[]).map((raw): Card => ({
    id: raw.id,
    name: raw.name,
    elixir: raw.elixir,
    rarity: raw.rarity as CardRarity,
    type: raw.type as CardType,
    arena: raw.arena,
    iconUrl: getCardIconUrl(raw.id),
    roles: raw.roles as CardRole[],
  }));

  // Build cardById map
  cardById = new Map(allCards.map((card) => [card.id, card]));

  // Build cardsByArena map
  cardsByArena = new Map();
  for (const card of allCards) {
    if (!cardsByArena.has(card.arena)) {
      cardsByArena.set(card.arena, []);
    }
    cardsByArena.get(card.arena)!.push(card);
  }

  // Load arenas
  allArenas = (arenasData.arenas as RawArena[]).map((raw): Arena => ({
    id: raw.id,
    name: raw.name,
    trophyMin: raw.trophyMin,
    trophyMax: raw.trophyMax,
  }));

  // Build arenaById map
  arenaById = new Map(allArenas.map((arena) => [arena.id, arena]));

  // Load top decks
  allTopDecks = (topDecksData.decks as RawTopDeck[]).map((raw): TopDeck => ({
    id: raw.id,
    name: raw.name,
    cards: raw.cards,
    winRate: raw.winRate,
    usageRate: raw.usageRate,
    averageElixir: raw.averageElixir,
    trophyRange: raw.trophyRange,
  }));

  console.log(`Loaded ${allCards.length} cards, ${allArenas.length} arenas, ${allTopDecks.length} top decks`);
}

// Getters
export function getCardById(id: string): Card | undefined {
  return cardById.get(id);
}

export function getCardsById(ids: string[]): Card[] {
  return ids.map((id) => cardById.get(id)).filter((c): c is Card => c !== undefined);
}

export function getAllCards(): Card[] {
  return [...allCards];
}

export function getCardsByArena(arenaId: number): Card[] {
  return cardsByArena.get(arenaId) || [];
}

export function getCardsUnlockedByArena(maxArenaId: number): Card[] {
  const cards: Card[] = [];
  for (let i = 0; i <= maxArenaId; i++) {
    const arenaCards = cardsByArena.get(i);
    if (arenaCards) {
      cards.push(...arenaCards);
    }
  }
  return cards;
}

export function getArenaById(id: number): Arena | undefined {
  return arenaById.get(id);
}

export function getAllArenas(): Arena[] {
  return [...allArenas];
}

export function getAllTopDecks(): TopDeck[] {
  return [...allTopDecks];
}

export function getTopDecksByTrophyRange(minTrophies?: number, maxTrophies?: number): TopDeck[] {
  return allTopDecks.filter((deck) => {
    if (minTrophies !== undefined && deck.trophyRange.max < minTrophies) {
      return false;
    }
    if (maxTrophies !== undefined && deck.trophyRange.min > maxTrophies) {
      return false;
    }
    return true;
  });
}

export function getTopDecksByArena(arenaId: number): TopDeck[] {
  const arena = getArenaById(arenaId);
  if (!arena) return allTopDecks;
  return getTopDecksByTrophyRange(arena.trophyMin, arena.trophyMax);
}

// Card filtering utilities
export function getCardsByRole(role: CardRole, cards?: Card[]): Card[] {
  const sourceCards = cards || allCards;
  return sourceCards.filter((card) => card.roles.includes(role));
}

export function getCardsByType(type: CardType, cards?: Card[]): Card[] {
  const sourceCards = cards || allCards;
  return sourceCards.filter((card) => card.type === type);
}

export function getCardsByRarity(rarity: CardRarity, cards?: Card[]): Card[] {
  const sourceCards = cards || allCards;
  return sourceCards.filter((card) => card.rarity === rarity);
}

// Calculate average elixir for a deck
export function calculateAverageElixir(cardIds: string[]): number {
  const cards = getCardsById(cardIds);
  if (cards.length === 0) return 0;
  const totalElixir = cards.reduce((sum, card) => sum + card.elixir, 0);
  return Math.round((totalElixir / cards.length) * 10) / 10;
}

// Initialize on import
initializeData();
