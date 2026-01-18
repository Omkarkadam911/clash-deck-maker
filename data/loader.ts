import type { Card, Arena, TopDeck, CardRole } from '../packages/shared/src/types';
import cardsData from './cards.json';
import arenasData from './arenas.json';
import topDecksData from './top_decks.json';

// Type definitions for raw JSON data
interface RawCard {
  id: string;
  name: string;
  elixir: number;
  rarity: string;
  type: string;
  arena: number;
  roles: string[];
  description?: string;
  iconUrl?: string;
}

interface RawArena {
  id: number;
  name: string;
  trophyMin: number;
  trophyMax: number;
  iconUrl?: string;
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

// Data maps
let cardById: Map<string, Card> = new Map();
let cardsByArena: Map<number, Card[]> = new Map();
let arenaById: Map<number, Arena> = new Map();
let allCards: Card[] = [];
let allArenas: Arena[] = [];
let allTopDecks: TopDeck[] = [];

// Initialize data
export function initializeData(): void {
  // Load cards
  allCards = (cardsData.cards as RawCard[]).map((raw): Card => ({
    id: raw.id,
    name: raw.name,
    elixir: raw.elixir,
    rarity: raw.rarity as Card['rarity'],
    type: raw.type as Card['type'],
    arena: raw.arena,
    description: raw.description,
    iconUrl: raw.iconUrl || getCardIconUrl(raw.id),
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
    iconUrl: raw.iconUrl,
  }));

  // Build arenaById map
  arenaById = new Map(allArenas.map((arena) => [arena.id, arena]));

  // Load top decks
  allTopDecks = (topDecksData.decks as RawTopDeck[]).map((raw): TopDeck => ({
    id: raw.id,
    cards: raw.cards,
    winRate: raw.winRate,
    usageRate: raw.usageRate,
    averageElixir: raw.averageElixir,
    trophyRange: raw.trophyRange,
  }));
}

// Helper to generate card icon URL from RoyaleAPI CDN
function getCardIconUrl(cardId: string): string {
  return `https://cdn.royaleapi.com/static/img/cards-150/${cardId}.png`;
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

export function getArenaByTrophies(trophies: number): Arena | undefined {
  for (const arena of allArenas) {
    if (trophies >= arena.trophyMin && trophies <= arena.trophyMax) {
      return arena;
    }
  }
  return undefined;
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

export function getCardsByType(type: Card['type'], cards?: Card[]): Card[] {
  const sourceCards = cards || allCards;
  return sourceCards.filter((card) => card.type === type);
}

export function getCardsByRarity(rarity: Card['rarity'], cards?: Card[]): Card[] {
  const sourceCards = cards || allCards;
  return sourceCards.filter((card) => card.rarity === rarity);
}

export function getCardsByElixirRange(minElixir: number, maxElixir: number, cards?: Card[]): Card[] {
  const sourceCards = cards || allCards;
  return sourceCards.filter((card) => card.elixir >= minElixir && card.elixir <= maxElixir);
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
