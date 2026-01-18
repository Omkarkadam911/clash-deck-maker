import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useStore } from '../../store';
import { TopDeck, Arena, Card } from '../../types';

export default function TopDecksScreen() {
  const arenas = useStore((state) => state.arenas);
  const topDecks = useStore((state) => state.topDecks);
  const cards = useStore((state) => state.cards);
  const isLoadingTopDecks = useStore((state) => state.isLoadingTopDecks);
  const loadTopDecks = useStore((state) => state.loadTopDecks);
  const setDeck = useStore((state) => state.setDeck);

  const [selectedArena, setSelectedArena] = useState<number | null>(null);
  const [expandedDeck, setExpandedDeck] = useState<string | null>(null);

  useEffect(() => {
    loadTopDecks(selectedArena ?? undefined);
  }, [selectedArena, loadTopDecks]);

  const handleRefresh = useCallback(() => {
    loadTopDecks(selectedArena ?? undefined);
  }, [selectedArena, loadTopDecks]);

  const getCardDetails = (cardIds: string[]): Card[] => {
    return cardIds
      .map((id) => cards.find((c) => c.id === id))
      .filter((c): c is Card => c !== undefined);
  };

  const copyDeck = async (deck: TopDeck) => {
    const shareLink = `https://link.clashroyale.com/deck/en?deck=${deck.cards.join(';')}`;
    await Clipboard.setStringAsync(shareLink);
    Alert.alert('Copied!', 'Deck link copied to clipboard');
  };

  const useDeck = (deck: TopDeck) => {
    const deckCards = deck.cardDetails || getCardDetails(deck.cards);
    setDeck(deckCards);
    Alert.alert('Deck Loaded', 'The deck has been loaded into your Deck Builder');
  };

  const renderArenaFilter = (arena: Arena) => {
    const isSelected = selectedArena === arena.id;
    return (
      <TouchableOpacity
        key={arena.id}
        style={[styles.arenaChip, isSelected && styles.arenaChipSelected]}
        onPress={() => setSelectedArena(isSelected ? null : arena.id)}
      >
        <Text style={[styles.arenaChipText, isSelected && styles.arenaChipTextSelected]}>
          {arena.name}
        </Text>
        {isSelected && (
          <Text style={styles.arenaTrophies}>
            {arena.trophyMin}+
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderDeckItem = ({ item }: { item: TopDeck }) => {
    const deckCards = item.cardDetails || getCardDetails(item.cards);
    const isExpanded = expandedDeck === item.id;

    return (
      <TouchableOpacity
        style={styles.deckCard}
        onPress={() => setExpandedDeck(isExpanded ? null : item.id)}
        activeOpacity={0.8}
      >
        <View style={styles.deckHeader}>
          <View>
            <Text style={styles.deckName}>{item.name || 'Meta Deck'}</Text>
            <View style={styles.deckStats}>
              <View style={styles.statBadge}>
                <Ionicons name="trophy" size={12} color="#ffc107" />
                <Text style={styles.statValue}>{item.winRate}%</Text>
              </View>
              <View style={styles.statBadge}>
                <Ionicons name="people" size={12} color="#2196f3" />
                <Text style={styles.statValue}>{item.usageRate}%</Text>
              </View>
              <View style={styles.statBadge}>
                <Ionicons name="water" size={12} color="#9c27b0" />
                <Text style={styles.statValue}>{item.averageElixir}</Text>
              </View>
            </View>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={24}
            color="#8b8b8b"
          />
        </View>

        {/* Card Grid */}
        <View style={styles.cardGrid}>
          {deckCards.map((card) => (
            <View key={card.id} style={styles.cardSlot}>
              <Image
                source={{ uri: card.iconUrl }}
                style={styles.cardImage}
                resizeMode="contain"
              />
              <View style={[styles.elixirBadge, { backgroundColor: getRarityColor(card.rarity) }]}>
                <Text style={styles.elixirText}>{card.elixir}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Expanded Actions */}
        {isExpanded && (
          <View style={styles.deckActions}>
            <View style={styles.trophyRange}>
              <Ionicons name="flag" size={14} color="#8b8b8b" />
              <Text style={styles.trophyRangeText}>
                {item.trophyRange.min.toLocaleString()} - {item.trophyRange.max.toLocaleString()} trophies
              </Text>
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.copyButton]}
                onPress={() => copyDeck(item)}
              >
                <Ionicons name="copy" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Copy Link</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.useButton]}
                onPress={() => useDeck(item)}
              >
                <Ionicons name="add-circle" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Use Deck</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Filter relevant arenas for display (5000+ trophies typically)
  const relevantArenas = arenas.filter((a) => a.trophyMin >= 3000);

  return (
    <View style={styles.container}>
      {/* Arena Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Filter by Trophy Range</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.arenaFilters}
        >
          <TouchableOpacity
            style={[styles.arenaChip, selectedArena === null && styles.arenaChipSelected]}
            onPress={() => setSelectedArena(null)}
          >
            <Text style={[styles.arenaChipText, selectedArena === null && styles.arenaChipTextSelected]}>
              All Arenas
            </Text>
          </TouchableOpacity>
          {relevantArenas.map(renderArenaFilter)}
        </ScrollView>
      </View>

      {/* Deck List */}
      <FlatList
        data={topDecks}
        renderItem={renderDeckItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.deckList}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingTopDecks}
            onRefresh={handleRefresh}
            tintColor="#e94560"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search" size={48} color="#666" />
            <Text style={styles.emptyText}>
              {isLoadingTopDecks ? 'Loading decks...' : 'No decks found for this filter'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

function getRarityColor(rarity: string): string {
  const colors: Record<string, string> = {
    common: '#8bc34a',
    rare: '#ff9800',
    epic: '#9c27b0',
    legendary: '#ffc107',
    champion: '#e91e63',
  };
  return colors[rarity] || '#666';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16213e',
  },
  filterSection: {
    padding: 15,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  filterLabel: {
    color: '#8b8b8b',
    fontSize: 12,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  arenaFilters: {
    flexDirection: 'row',
    gap: 10,
  },
  arenaChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#0f3460',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  arenaChipSelected: {
    backgroundColor: '#e94560',
  },
  arenaChipText: {
    color: '#fff',
    fontSize: 13,
  },
  arenaChipTextSelected: {
    fontWeight: 'bold',
  },
  arenaTrophies: {
    color: '#fff',
    fontSize: 11,
    opacity: 0.8,
  },
  deckList: {
    padding: 15,
  },
  deckCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  deckHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  deckName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  deckStats: {
    flexDirection: 'row',
    gap: 10,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0f3460',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statValue: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardSlot: {
    width: '23%',
    aspectRatio: 0.75,
    backgroundColor: '#0f3460',
    borderRadius: 8,
    marginBottom: 6,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cardImage: {
    width: '85%',
    height: '85%',
  },
  elixirBadge: {
    position: 'absolute',
    top: 2,
    left: 2,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  elixirText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  deckActions: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#0f3460',
  },
  trophyRange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  trophyRangeText: {
    color: '#8b8b8b',
    fontSize: 13,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  copyButton: {
    backgroundColor: '#0f3460',
  },
  useButton: {
    backgroundColor: '#e94560',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#8b8b8b',
    fontSize: 16,
    marginTop: 15,
    textAlign: 'center',
  },
});
