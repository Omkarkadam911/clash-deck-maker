import { Card, Arena, TopDeck, AutofillRequest, AutofillResponse } from '../types';

// Use localhost for development - update for production
const API_BASE_URL = __DEV__
  ? 'http://localhost:3001'
  : 'https://api.example.com';

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getCards(): Promise<Card[]> {
    const data = await this.fetch<{ cards: Card[] }>('/meta/cards');
    return data.cards;
  }

  async getArenas(): Promise<Arena[]> {
    const data = await this.fetch<{ arenas: Arena[] }>('/meta/arenas');
    return data.arenas;
  }

  async getTopDecks(params?: {
    arenaId?: number;
    trophyMin?: number;
    trophyMax?: number;
  }): Promise<TopDeck[]> {
    let endpoint = '/meta/top-decks';
    const searchParams = new URLSearchParams();

    if (params?.arenaId !== undefined) {
      searchParams.set('arenaId', params.arenaId.toString());
    }
    if (params?.trophyMin !== undefined) {
      searchParams.set('trophyMin', params.trophyMin.toString());
    }
    if (params?.trophyMax !== undefined) {
      searchParams.set('trophyMax', params.trophyMax.toString());
    }

    const queryString = searchParams.toString();
    if (queryString) {
      endpoint += `?${queryString}`;
    }

    const data = await this.fetch<{ decks: TopDeck[] }>(endpoint);
    return data.decks;
  }

  async autofillDeck(request: AutofillRequest): Promise<AutofillResponse> {
    return this.fetch<AutofillResponse>('/deck/autofill', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async validateDeck(cards: string[]): Promise<{
    isValid: boolean;
    issues: string[];
    averageElixir: number;
    cardDetails: Card[];
  }> {
    return this.fetch('/deck/validate', {
      method: 'POST',
      body: JSON.stringify({ cards }),
    });
  }

  async parseDeckLink(link: string): Promise<{
    isValid: boolean;
    cards: string[];
    cardDetails: Card[];
    averageElixir: number;
    error?: string;
  }> {
    const encodedLink = encodeURIComponent(link);
    return this.fetch(`/deck/parse?link=${encodedLink}`);
  }
}

export const api = new ApiService();
export default api;
