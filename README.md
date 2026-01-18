# Clash Royale Deck Builder

A cross-platform mobile app for building and sharing Clash Royale decks, built with React Native (Expo) and a Node.js backend.

## Features

- **Deck Builder**: Build custom decks with a visual card picker
- **Auto-fill Algorithm**: Intelligently completes your deck based on meta rules
- **Import/Export**: Share decks via official Clash Royale links
- **Top Decks**: Browse meta decks filtered by trophy range
- **Card Collection**: Browse all cards with filtering by type, rarity, and arena

## Project Structure

```
clash-royale-deck-builder/
├── apps/
│   ├── mobile/          # Expo React Native app
│   │   ├── app/         # Expo Router screens
│   │   ├── services/    # API client
│   │   ├── store/       # Zustand state management
│   │   └── types/       # TypeScript types
│   └── server/          # Express.js backend
│       └── src/
│           ├── data/    # JSON data files
│           ├── autofill.ts    # Deck autofill algorithm
│           └── index.ts       # Express server
├── packages/
│   └── shared/          # Shared types and validation
└── data/                # Source JSON data files
```

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your mobile device (for testing)

## Getting Started

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install server dependencies
cd apps/server
npm install

# Install mobile dependencies
cd ../mobile
npm install
```

### 2. Start the Backend Server

```bash
cd apps/server
npm run dev
```

The server will start at `http://localhost:3001`

**Available Endpoints:**
- `GET /health` - Health check
- `GET /meta/cards` - Get all cards
- `GET /meta/arenas` - Get all arenas
- `GET /meta/top-decks` - Get top decks (with optional filters)
- `POST /deck/autofill` - Autofill a deck
- `POST /deck/validate` - Validate a deck
- `GET /deck/parse?link=...` - Parse a deck link

### 3. Start the Mobile App

```bash
cd apps/mobile
npm start
# or
expo start
```

Scan the QR code with Expo Go app on your device.

**Note:** If running on a physical device, update the API URL in Settings to point to your computer's IP address (e.g., `http://192.168.1.100:3001`).

## API Configuration

For development on a physical device:

1. Find your computer's local IP address
2. Open the app Settings tab
3. Update the API URL to `http://<your-ip>:3001`
4. Tap Save

## Running Tests

```bash
cd apps/server
npm test
```

## Auto-fill Algorithm

The deck autofill algorithm follows these rules:

1. **Win Condition**: At least 1 card that can deal tower damage
2. **Small Spell**: At least 1 cheap spell (Zap, Log, Arrows, etc.)
3. **Big Spell**: At least 1 heavy spell (Fireball, Poison, Rocket, etc.)
4. **Air Targeting**: At least 1 unit that can hit air troops
5. **Tank Killer**: At least 1 card for dealing with tanks
6. **Average Elixir**: Target between 2.6 and 4.3

The algorithm also:
- Prefers higher-level cards when player levels are provided
- Considers card synergies and roles
- Provides alternative suggestions for each added card

## Tech Stack

**Mobile:**
- React Native with Expo
- TypeScript
- Expo Router (file-based routing)
- Zustand (state management)
- Expo Clipboard & Sharing

**Backend:**
- Node.js with Express
- TypeScript
- Jest (testing)

## Data Sources

Card and arena data is based on the RoyaleAPI cr-api-data format:
- `cards.json` - All cards with elixir, rarity, arena unlock, and roles
- `arenas.json` - Arena definitions with trophy thresholds
- `top_decks.json` - Meta deck data (replaceable with live API)

## Future Improvements

- [ ] Connect to official Clash Royale API for player card levels
- [ ] Add deck statistics and win rates from live data
- [ ] Implement deck recommendation based on owned cards
- [ ] Add card upgrade priority suggestions
- [ ] Support for seasonal meta changes

## Disclaimer

This app is not affiliated with, endorsed, sponsored, or specifically approved by Supercell and Supercell is not responsible for it. For more information see Supercell's Fan Content Policy.

## License

MIT
