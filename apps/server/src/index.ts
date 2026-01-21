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
import { scoreDeck, PlayerCardLevel } from './services/deckScoring';
import { suggestCardSwaps } from './services/deckCandidates';

// Environment variables (set via .env file locally or Render dashboard)
const CLASH_ROYALE_API_KEY = process.env.CLASH_ROYALE_API_KEY;

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

// POST /deck/optimize - Optimize an existing deck
app.post('/deck/optimize', (req: Request, res: Response) => {
  try {
    const { deck, maxSwaps = 3, playerCardLevels } = req.body as {
      deck: string[];
      maxSwaps?: number;
      playerCardLevels?: PlayerCardLevel[];
    };

    // Validate request
    if (!deck || !Array.isArray(deck)) {
      res.status(400).json({ error: 'deck must be an array' });
      return;
    }

    if (deck.length !== 8) {
      res.status(400).json({ error: 'deck must have exactly 8 cards' });
      return;
    }

    // Check for duplicates
    const uniqueCards = new Set(deck);
    if (uniqueCards.size !== deck.length) {
      res.status(400).json({ error: 'deck contains duplicates' });
      return;
    }

    // Validate all cards exist
    const cardDetails = getCardsById(deck);
    if (cardDetails.length !== 8) {
      res.status(400).json({ error: 'deck contains invalid card IDs' });
      return;
    }

    // Get current score
    const currentScore = scoreDeck(deck, playerCardLevels);

    // Get swap suggestions
    const swapSuggestions = suggestCardSwaps(deck, {
      playerLevels: playerCardLevels,
    });

    // Apply top swaps to create optimized deck
    const swapsToApply = swapSuggestions.slice(0, maxSwaps);
    let optimizedDeck = [...deck];
    const swapPlan: Array<{
      remove: { cardId: string; cardName: string };
      add: { cardId: string; cardName: string };
      reason: string;
      scoreDelta: number;
    }> = [];

    for (const swap of swapsToApply) {
      const removeIndex = optimizedDeck.indexOf(swap.removeCard);
      if (removeIndex !== -1) {
        const removeCard = getCardsById([swap.removeCard])[0];
        const addCard = getCardsById([swap.addCard])[0];

        optimizedDeck[removeIndex] = swap.addCard;
        swapPlan.push({
          remove: { cardId: swap.removeCard, cardName: removeCard?.name || 'Unknown' },
          add: { cardId: swap.addCard, cardName: addCard?.name || 'Unknown' },
          reason: swap.reason,
          scoreDelta: swap.improvement,
        });
      }
    }

    // Get final score
    const optimizedScore = scoreDeck(optimizedDeck, playerCardLevels);
    const optimizedCardDetails = getCardsById(optimizedDeck);

    res.json({
      originalDeck: deck,
      optimizedDeck,
      swapPlan,
      scores: {
        before: {
          overall: currentScore.overall,
          coverage: currentScore.coverage.total,
          curve: currentScore.curve.total,
          role: currentScore.role.total,
          levelFit: currentScore.levelFit.total,
        },
        after: {
          overall: optimizedScore.overall,
          coverage: optimizedScore.coverage.total,
          curve: optimizedScore.curve.total,
          role: optimizedScore.role.total,
          levelFit: optimizedScore.levelFit.total,
        },
        improvement: optimizedScore.overall - currentScore.overall,
      },
      analysis: {
        missingRoles: currentScore.coverage.missingRoles,
        averageElixir: {
          before: currentScore.curve.averageElixir,
          after: optimizedScore.curve.averageElixir,
        },
        isOptimal: swapSuggestions.length === 0,
      },
      cardDetails: optimizedCardDetails,
    });
  } catch (error) {
    console.error('Error optimizing deck:', error);
    res.status(500).json({ error: 'Failed to optimize deck' });
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
  console.log('  POST /deck/optimize');
  console.log('  GET  /deck/parse?link=...');
  if (process.env.CLASH_ROYALE_API_KEY) {
    console.log('  Clash Royale API: Configured ✓');
  }
});
