import type { AutofillRequest, TopDecksRequest, AppSettings } from './types';

export function validateAutofillRequest(data: unknown): data is AutofillRequest {
  if (typeof data !== 'object' || data === null) return false;

  const obj = data as Record<string, unknown>;

  // currentCards must be an array of strings with 0-7 items
  if (!Array.isArray(obj.currentCards)) return false;
  if (obj.currentCards.length > 7) return false;
  if (!obj.currentCards.every((c) => typeof c === 'string')) return false;

  // playerCardLevels is optional but must be valid if present
  if (obj.playerCardLevels !== undefined) {
    if (!Array.isArray(obj.playerCardLevels)) return false;
    for (const level of obj.playerCardLevels) {
      if (typeof level !== 'object' || level === null) return false;
      const l = level as Record<string, unknown>;
      if (typeof l.cardId !== 'string') return false;
      if (typeof l.level !== 'number' || l.level < 1 || l.level > 14) return false;
    }
  }

  // preferredArena is optional number
  if (obj.preferredArena !== undefined && typeof obj.preferredArena !== 'number') {
    return false;
  }

  // targetElixir is optional number
  if (obj.targetElixir !== undefined && typeof obj.targetElixir !== 'number') {
    return false;
  }

  return true;
}

export function validateTopDecksRequest(data: unknown): data is TopDecksRequest {
  if (typeof data !== 'object' || data === null) return false;

  const obj = data as Record<string, unknown>;

  if (obj.arenaId !== undefined && typeof obj.arenaId !== 'number') return false;
  if (obj.trophyMin !== undefined && typeof obj.trophyMin !== 'number') return false;
  if (obj.trophyMax !== undefined && typeof obj.trophyMax !== 'number') return false;

  return true;
}

export function validateAppSettings(data: unknown): data is Partial<AppSettings> {
  if (typeof data !== 'object' || data === null) return false;

  const obj = data as Record<string, unknown>;

  if (obj.playerTag !== undefined && typeof obj.playerTag !== 'string') return false;
  if (obj.preferredArena !== undefined && typeof obj.preferredArena !== 'number') return false;
  if (obj.theme !== undefined && !['light', 'dark', 'system'].includes(obj.theme as string)) {
    return false;
  }

  return true;
}

// Deck link validation and parsing
const DECK_LINK_REGEX = /link\.clashroyale\.com\/(?:\?clashroyale:\/\/)?copyDeck\?deck=([0-9;]+)/;

export function parseDeckLink(link: string): { cards: string[]; isValid: boolean; error?: string } {
  try {
    const match = link.match(DECK_LINK_REGEX);
    if (!match) {
      // Try alternate format
      const altMatch = link.match(/deck=([0-9;]+)/);
      if (!altMatch) {
        return { cards: [], isValid: false, error: 'Invalid deck link format' };
      }
      const cardIds = altMatch[1].split(';').filter(Boolean);
      if (cardIds.length !== 8) {
        return { cards: [], isValid: false, error: 'Deck must contain exactly 8 cards' };
      }
      return { cards: cardIds, isValid: true };
    }

    const cardIds = match[1].split(';').filter(Boolean);
    if (cardIds.length !== 8) {
      return { cards: [], isValid: false, error: 'Deck must contain exactly 8 cards' };
    }

    return { cards: cardIds, isValid: true };
  } catch {
    return { cards: [], isValid: false, error: 'Failed to parse deck link' };
  }
}

export function generateDeckLink(cardIds: string[]): string {
  if (cardIds.length !== 8) {
    throw new Error('Deck must contain exactly 8 cards');
  }
  return `https://link.clashroyale.com/deck/en?deck=${cardIds.join(';')}`;
}
