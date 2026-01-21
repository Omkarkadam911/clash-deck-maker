import { create } from 'zustand';
import { Card, Arena, TopDeck, AppSettings, AutofillResponse, OptimizeResponse } from '../types';
import api from '../services/api';

interface DeckBuilderState {
  // Data
  cards: Card[];
  arenas: Arena[];
  topDecks: TopDeck[];

  // Deck builder
  currentDeck: Card[];
  lastAutofillResult: AutofillResponse | null;
  lastOptimizeResult: OptimizeResponse | null;

  // Settings
  settings: AppSettings;

  // Loading states
  isLoadingCards: boolean;
  isLoadingArenas: boolean;
  isLoadingTopDecks: boolean;
  isAutofilling: boolean;
  isOptimizing: boolean;

  // Error states
  error: string | null;

  // Actions
  loadCards: () => Promise<void>;
  loadArenas: () => Promise<void>;
  loadTopDecks: (arenaId?: number) => Promise<void>;

  addCardToDeck: (card: Card) => void;
  removeCardFromDeck: (cardId: string) => void;
  clearDeck: () => void;
  setDeck: (cards: Card[]) => void;

  autofillDeck: () => Promise<void>;
  optimizeDeck: (maxSwaps?: number) => Promise<void>;
  applyOptimization: () => void;
  importDeckFromLink: (link: string) => Promise<void>;

  updateSettings: (settings: Partial<AppSettings>) => void;
  clearError: () => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  preferredArena: 15, // Legendary Arena
  theme: 'system',
  apiUrl: 'http://localhost:3001',
};

export const useStore = create<DeckBuilderState>((set, get) => ({
  // Initial state
  cards: [],
  arenas: [],
  topDecks: [],
  currentDeck: [],
  lastAutofillResult: null,
  lastOptimizeResult: null,
  settings: DEFAULT_SETTINGS,
  isLoadingCards: false,
  isLoadingArenas: false,
  isLoadingTopDecks: false,
  isAutofilling: false,
  isOptimizing: false,
  error: null,

  // Load cards from API
  loadCards: async () => {
    set({ isLoadingCards: true, error: null });
    try {
      const cards = await api.getCards();
      set({ cards, isLoadingCards: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load cards',
        isLoadingCards: false,
      });
    }
  },

  // Load arenas from API
  loadArenas: async () => {
    set({ isLoadingArenas: true, error: null });
    try {
      const arenas = await api.getArenas();
      set({ arenas, isLoadingArenas: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load arenas',
        isLoadingArenas: false,
      });
    }
  },

  // Load top decks from API
  loadTopDecks: async (arenaId?: number) => {
    set({ isLoadingTopDecks: true, error: null });
    try {
      const topDecks = await api.getTopDecks(arenaId !== undefined ? { arenaId } : undefined);
      set({ topDecks, isLoadingTopDecks: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load top decks',
        isLoadingTopDecks: false,
      });
    }
  },

  // Deck builder actions
  addCardToDeck: (card: Card) => {
    const { currentDeck } = get();
    if (currentDeck.length >= 8) return;
    if (currentDeck.some((c) => c.id === card.id)) return;
    set({ currentDeck: [...currentDeck, card] });
  },

  removeCardFromDeck: (cardId: string) => {
    const { currentDeck } = get();
    set({ currentDeck: currentDeck.filter((c) => c.id !== cardId) });
  },

  clearDeck: () => {
    set({ currentDeck: [], lastAutofillResult: null, lastOptimizeResult: null });
  },

  setDeck: (cards: Card[]) => {
    set({ currentDeck: cards.slice(0, 8), lastAutofillResult: null, lastOptimizeResult: null });
  },

  // Autofill deck
  autofillDeck: async () => {
    const { currentDeck, settings, cards } = get();
    if (currentDeck.length >= 8) return;

    set({ isAutofilling: true, error: null });
    try {
      const result = await api.autofillDeck({
        currentCards: currentDeck.map((c) => c.id),
        preferredArena: settings.preferredArena,
      });

      // Convert card IDs to Card objects
      const filledDeck = result.deck
        .map((id) => cards.find((c) => c.id === id) || result.cardDetails?.find((c) => c.id === id))
        .filter((c): c is Card => c !== undefined);

      set({
        currentDeck: filledDeck,
        lastAutofillResult: result,
        isAutofilling: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to autofill deck',
        isAutofilling: false,
      });
    }
  },

  // Optimize deck
  optimizeDeck: async (maxSwaps: number = 3) => {
    const { currentDeck, cards } = get();
    if (currentDeck.length !== 8) {
      set({ error: 'Deck must have 8 cards to optimize' });
      return;
    }

    set({ isOptimizing: true, error: null, lastOptimizeResult: null });
    try {
      const result = await api.optimizeDeck({
        deck: currentDeck.map((c) => c.id),
        maxSwaps,
      });

      set({
        lastOptimizeResult: result,
        isOptimizing: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to optimize deck',
        isOptimizing: false,
      });
    }
  },

  // Apply optimization result to current deck
  applyOptimization: () => {
    const { lastOptimizeResult, cards } = get();
    if (!lastOptimizeResult) return;

    // Convert optimized deck IDs to Card objects
    const optimizedDeck = lastOptimizeResult.optimizedDeck
      .map((id) => cards.find((c) => c.id === id) || lastOptimizeResult.cardDetails?.find((c) => c.id === id))
      .filter((c): c is Card => c !== undefined);

    if (optimizedDeck.length === 8) {
      set({
        currentDeck: optimizedDeck,
        lastOptimizeResult: null,
        lastAutofillResult: null,
      });
    }
  },

  // Import deck from link
  importDeckFromLink: async (link: string) => {
    const { cards } = get();
    set({ error: null });

    try {
      const result = await api.parseDeckLink(link);

      if (!result.isValid) {
        throw new Error(result.error || 'Invalid deck link');
      }

      // Convert card IDs to Card objects
      const importedDeck = result.cards
        .map((id) => cards.find((c) => c.id === id) || result.cardDetails?.find((c) => c.id === id))
        .filter((c): c is Card => c !== undefined);

      if (importedDeck.length !== 8) {
        throw new Error('Could not resolve all cards from link');
      }

      set({ currentDeck: importedDeck, lastAutofillResult: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to import deck',
      });
      throw error;
    }
  },

  // Settings
  updateSettings: (newSettings: Partial<AppSettings>) => {
    const { settings } = get();
    const updated = { ...settings, ...newSettings };
    set({ settings: updated });

    // Update API base URL if changed
    if (newSettings.apiUrl) {
      api.setBaseUrl(newSettings.apiUrl);
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Selectors
export const selectCardsByArena = (state: DeckBuilderState, arenaId: number) =>
  state.cards.filter((card) => card.arena <= arenaId);

export const selectDeckAverageElixir = (state: DeckBuilderState) => {
  const { currentDeck } = state;
  if (currentDeck.length === 0) return 0;
  const total = currentDeck.reduce((sum, card) => sum + card.elixir, 0);
  return Math.round((total / currentDeck.length) * 10) / 10;
};

export const selectDeckShareLink = (state: DeckBuilderState) => {
  const { currentDeck } = state;
  if (currentDeck.length !== 8) return null;
  const cardIds = currentDeck.map((c) => c.id).join(';');
  return `https://link.clashroyale.com/deck/en?deck=${cardIds}`;
};
