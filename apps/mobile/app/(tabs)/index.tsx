import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore, selectDeckAverageElixir } from '../../store';

export default function HomeScreen() {
  const currentDeck = useStore((state) => state.currentDeck);
  const cards = useStore((state) => state.cards);
  const isLoadingCards = useStore((state) => state.isLoadingCards);
  const avgElixir = useStore(selectDeckAverageElixir);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Clash Deck Builder</Text>
        <Text style={styles.subtitle}>Build the perfect deck</Text>
      </View>

      {/* Current Deck Preview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Deck</Text>
        {currentDeck.length > 0 ? (
          <View style={styles.deckPreview}>
            <View style={styles.deckGrid}>
              {currentDeck.map((card) => (
                <View key={card.id} style={styles.cardSlot}>
                  <Image
                    source={{ uri: card.iconUrl }}
                    style={styles.cardImage}
                    resizeMode="contain"
                  />
                  <View style={styles.elixirBadge}>
                    <Text style={styles.elixirText}>{card.elixir}</Text>
                  </View>
                </View>
              ))}
              {Array.from({ length: 8 - currentDeck.length }).map((_, i) => (
                <View key={`empty-${i}`} style={[styles.cardSlot, styles.emptySlot]}>
                  <Ionicons name="add" size={24} color="#666" />
                </View>
              ))}
            </View>
            <View style={styles.deckStats}>
              <Text style={styles.statText}>
                Cards: {currentDeck.length}/8
              </Text>
              <Text style={styles.statText}>
                Avg Elixir: {avgElixir || '-'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.emptyDeck}>
            <Ionicons name="layers-outline" size={48} color="#666" />
            <Text style={styles.emptyText}>No deck built yet</Text>
            <Link href="/deck-builder" asChild>
              <TouchableOpacity style={styles.primaryButton}>
                <Text style={styles.buttonText}>Start Building</Text>
              </TouchableOpacity>
            </Link>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <Link href="/deck-builder" asChild>
            <TouchableOpacity style={styles.actionCard}>
              <Ionicons name="construct" size={32} color="#e94560" />
              <Text style={styles.actionTitle}>Deck Builder</Text>
              <Text style={styles.actionSubtitle}>Create your deck</Text>
            </TouchableOpacity>
          </Link>
          <Link href="/top-decks" asChild>
            <TouchableOpacity style={styles.actionCard}>
              <Ionicons name="trophy" size={32} color="#ffc107" />
              <Text style={styles.actionTitle}>Top Decks</Text>
              <Text style={styles.actionSubtitle}>Meta decks</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Card Collection</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {isLoadingCards ? '...' : cards.length}
            </Text>
            <Text style={styles.statLabel}>Total Cards</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {isLoadingCards ? '...' : cards.filter((c) => c.rarity === 'legendary').length}
            </Text>
            <Text style={styles.statLabel}>Legendaries</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {isLoadingCards ? '...' : cards.filter((c) => c.rarity === 'champion').length}
            </Text>
            <Text style={styles.statLabel}>Champions</Text>
          </View>
        </View>
      </View>

      {/* Tips */}
      <View style={[styles.section, styles.tipsSection]}>
        <Text style={styles.sectionTitle}>Deck Building Tips</Text>
        <View style={styles.tipCard}>
          <Ionicons name="bulb" size={20} color="#ffc107" />
          <Text style={styles.tipText}>
            A balanced deck should have a win condition, spells, and air defense
          </Text>
        </View>
        <View style={styles.tipCard}>
          <Ionicons name="bulb" size={20} color="#ffc107" />
          <Text style={styles.tipText}>
            Aim for an average elixir cost between 2.6 and 4.3
          </Text>
        </View>
        <View style={styles.tipCard}>
          <Ionicons name="bulb" size={20} color="#ffc107" />
          <Text style={styles.tipText}>
            Include at least one tank killer to handle heavy decks
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16213e',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#8b8b8b',
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  deckPreview: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 15,
  },
  deckGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardSlot: {
    width: '23%',
    aspectRatio: 0.75,
    backgroundColor: '#0f3460',
    borderRadius: 8,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  emptySlot: {
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  cardImage: {
    width: '90%',
    height: '90%',
  },
  elixirBadge: {
    position: 'absolute',
    top: 2,
    left: 2,
    backgroundColor: '#9c27b0',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  elixirText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deckStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  statText: {
    color: '#8b8b8b',
    fontSize: 14,
  },
  emptyDeck: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: '#8b8b8b',
    fontSize: 16,
    marginTop: 10,
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#e94560',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  actionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  actionSubtitle: {
    color: '#8b8b8b',
    fontSize: 12,
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '31%',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  statNumber: {
    color: '#e94560',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#8b8b8b',
    fontSize: 12,
    marginTop: 5,
  },
  tipsSection: {
    paddingBottom: 30,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  tipText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
});
