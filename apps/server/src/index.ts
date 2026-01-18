import express, { Request, Response } from 'express';
import cors from 'cors';
import {
  getAllCards,
  getAllArenas,
  getAllTopDecks,
  getTopDecksByArena,
  getTopDecksByTrophyRange,
  getCardsById,
  calculateAverageElixir,
} from './data/loader';
import { autofillDeck, validateDeck, AutofillRequest } from './autofill';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GET /meta/cards - Get all cards
app.get('/meta/cards', (_req: Request, res: Response) => {
  try {
    const cards = getAllCards();
    res.json({ cards });
  } catch (error) {
    console.error('Error fetching cards:', error);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// GET /meta/arenas - Get all arenas
app.get('/meta/arenas', (_req: Request, res: Response) => {
  try {
    const arenas = getAllArenas();
    res.json({ arenas });
  } catch (error) {
    console.error('Error fetching arenas:', error);
    res.status(500).json({ error: 'Failed to fetch arenas' });
  }
});

// GET /meta/top-decks - Get top decks with optional filters
app.get('/meta/top-decks', (req: Request, res: Response) => {
  try {
    const arenaId = req.query.arenaId ? parseInt(req.query.arenaId as string) : undefined;
    const trophyMin = req.query.trophyMin ? parseInt(req.query.trophyMin as string) : undefined;
    const trophyMax = req.query.trophyMax ? parseInt(req.query.trophyMax as string) : undefined;

    let decks;
    if (arenaId !== undefined) {
      decks = getTopDecksByArena(arenaId);
    } else if (trophyMin !== undefined || trophyMax !== undefined) {
      decks = getTopDecksByTrophyRange(trophyMin, trophyMax);
    } else {
      decks = getAllTopDecks();
    }

    // Enrich decks with card details
    const enrichedDecks = decks.map((deck) => {
      const cards = getCardsById(deck.cards);
      return {
        ...deck,
        cardDetails: cards,
      };
    });

    res.json({ decks: enrichedDecks });
  } catch (error) {
    console.error('Error fetching top decks:', error);
    res.status(500).json({ error: 'Failed to fetch top decks' });
  }
});

// POST /deck/autofill - Autofill a deck
app.post('/deck/autofill', (req: Request, res: Response) => {
  try {
    const body = req.body as Partial<AutofillRequest>;

    // Validate request
    if (!body.currentCards || !Array.isArray(body.currentCards)) {
      res.status(400).json({ error: 'currentCards must be an array' });
      return;
    }

    if (body.currentCards.length > 7) {
      res.status(400).json({ error: 'currentCards must have at most 7 cards' });
      return;
    }

    // Check for duplicates
    const uniqueCards = new Set(body.currentCards);
    if (uniqueCards.size !== body.currentCards.length) {
      res.status(400).json({ error: 'currentCards contains duplicates' });
      return;
    }

    const request: AutofillRequest = {
      currentCards: body.currentCards,
      playerCardLevels: body.playerCardLevels,
      preferredArena: body.preferredArena,
      targetElixir: body.targetElixir,
    };

    const result = autofillDeck(request);

    // Enrich with card details
    const cardDetails = getCardsById(result.deck);

    res.json({
      ...result,
      cardDetails,
    });
  } catch (error) {
    console.error('Error in autofill:', error);
    res.status(500).json({ error: 'Failed to autofill deck' });
  }
});

// POST /deck/validate - Validate a deck
app.post('/deck/validate', (req: Request, res: Response) => {
  try {
    const { cards } = req.body;

    if (!cards || !Array.isArray(cards)) {
      res.status(400).json({ error: 'cards must be an array' });
      return;
    }

    const result = validateDeck(cards);
    const avgElixir = calculateAverageElixir(cards);
    const cardDetails = getCardsById(cards);

    res.json({
      ...result,
      averageElixir: avgElixir,
      cardDetails,
    });
  } catch (error) {
    console.error('Error validating deck:', error);
    res.status(500).json({ error: 'Failed to validate deck' });
  }
});

// GET /deck/link/:deckLink - Parse a deck link
app.get('/deck/parse', (req: Request, res: Response) => {
  try {
    const link = req.query.link as string;

    if (!link) {
      res.status(400).json({ error: 'link query parameter is required' });
      return;
    }

    // Parse the deck link
    const deckMatch = link.match(/deck=([0-9;]+)/);
    if (!deckMatch) {
      res.status(400).json({ error: 'Invalid deck link format', isValid: false });
      return;
    }

    const cardIds = deckMatch[1].split(';').filter(Boolean);
    if (cardIds.length !== 8) {
      res.status(400).json({
        error: `Deck has ${cardIds.length} cards, expected 8`,
        isValid: false,
      });
      return;
    }

    const cards = getCardsById(cardIds);
    if (cards.length !== 8) {
      const foundIds = new Set(cards.map((c) => c.id));
      const missingIds = cardIds.filter((id) => !foundIds.has(id));
      res.status(400).json({
        error: `Unknown card IDs: ${missingIds.join(', ')}`,
        isValid: false,
      });
      return;
    }

    res.json({
      isValid: true,
      cards: cardIds,
      cardDetails: cards,
      averageElixir: calculateAverageElixir(cardIds),
    });
  } catch (error) {
    console.error('Error parsing deck link:', error);
    res.status(500).json({ error: 'Failed to parse deck link' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  GET  /health');
  console.log('  GET  /meta/cards');
  console.log('  GET  /meta/arenas');
  console.log('  GET  /meta/top-decks');
  console.log('  POST /deck/autofill');
  console.log('  POST /deck/validate');
  console.log('  GET  /deck/parse?link=...');
});
