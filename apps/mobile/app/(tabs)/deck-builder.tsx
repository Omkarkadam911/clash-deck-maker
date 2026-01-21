import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useStore, selectDeckAverageElixir, selectDeckShareLink } from '../../store';
import { Card, CardType, CardRarity, SwapPlan } from '../../types';

type FilterType = 'all' | CardType;
type FilterRarity = 'all' | CardRarity;

export default function DeckBuilderScreen() {
  const cards = useStore((state) => state.cards);
  const currentDeck = useStore((state) => state.currentDeck);
  const isAutofilling = useStore((state) => state.isAutofilling);
  const isOptimizing = useStore((state) => state.isOptimizing);
  const lastAutofillResult = useStore((state) => state.lastAutofillResult);
  const lastOptimizeResult = useStore((state) => state.lastOptimizeResult);
  const error = useStore((state) => state.error);
  const settings = useStore((state) => state.settings);

  const addCardToDeck = useStore((state) => state.addCardToDeck);
  const removeCardFromDeck = useStore((state) => state.removeCardFromDeck);
  const clearDeck = useStore((state) => state.clearDeck);
  const autofillDeck = useStore((state) => state.autofillDeck);
  const optimizeDeck = useStore((state) => state.optimizeDeck);
  const applyOptimization = useStore((state) => state.applyOptimization);
  const importDeckFromLink = useStore((state) => state.importDeckFromLink);
  const clearError = useStore((state) => state.clearError);

  const avgElixir = useStore(selectDeckAverageElixir);
  const shareLink = useStore(selectDeckShareLink);

  const [isCardPickerVisible, setCardPickerVisible] = useState(false);
  const [isImportModalVisible, setImportModalVisible] = useState(false);
  const [isOptimizeModalVisible, setOptimizeModalVisible] = useState(false);
  const [importLink, setImportLink] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterRarity, setFilterRarity] = useState<FilterRarity>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter cards based on arena and filters
  const filteredCards = cards.filter((card) => {
    // Arena filter
    if (card.arena > settings.preferredArena) return false;

    // Type filter
    if (filterType !== 'all' && card.type !== filterType) return false;

    // Rarity filter
    if (filterRarity !== 'all' && card.rarity !== filterRarity) return false;

    // Search filter
    if (searchQuery && !card.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    return true;
  });

  const handleAddCard = useCallback(
    (card: Card) => {
      if (currentDeck.length >= 8) {
        Alert.alert('Deck Full', 'Your deck already has 8 cards');
        return;
      }
      if (currentDeck.some((c) => c.id === card.id)) {
        Alert.alert('Duplicate', 'This card is already in your deck');
        return;
      }
      addCardToDeck(card);
    },
    [currentDeck, addCardToDeck]
  );

  const handleAutofill = async () => {
    if (currentDeck.length >= 8) {
      Alert.alert('Deck Full', 'Your deck already has 8 cards');
      return;
    }
    await autofillDeck();
  };

  const handleOptimize = async () => {
    if (currentDeck.length !== 8) {
      Alert.alert('Incomplete Deck', 'You need 8 cards to optimize');
      return;
    }
    await optimizeDeck();
    setOptimizeModalVisible(true);
  };

  const handleApplyOptimization = () => {
    applyOptimization();
    setOptimizeModalVisible(false);
  };

  const handleImport = async () => {
    if (!importLink.trim()) {
      Alert.alert('Error', 'Please enter a deck link');
      return;
    }
    try {
      await importDeckFromLink(importLink.trim());
      setImportModalVisible(false);
      setImportLink('');
    } catch {
      Alert.alert('Import Failed', error || 'Could not import deck from link');
      clearError();
    }
  };

  const handleExport = async () => {
    if (!shareLink) {
      Alert.alert('Incomplete Deck', 'You need 8 cards to export a deck');
      return;
    }
    await Clipboard.setStringAsync(shareLink);
    Alert.alert('Copied!', 'Deck link copied to clipboard');
  };

  const handleClearDeck = () => {
    Alert.alert('Clear Deck', 'Are you sure you want to clear your deck?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearDeck },
    ]);
  };

  const renderDeckSlot = (index: number) => {
    const card = currentDeck[index];

    if (card) {
      return (
        <TouchableOpacity
          key={card.id}
          style={styles.deckSlot}
          onPress={() => removeCardFromDeck(card.id)}
        >
          <Image source={{ uri: card.iconUrl }} style={styles.cardImage} resizeMode="contain" />
          <View style={styles.elixirBadge}>
            <Text style={styles.elixirText}>{card.elixir}</Text>
          </View>
          <View style={styles.removeOverlay}>
            <Ionicons name="close-circle" size={20} color="#e94560" />
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        key={`empty-${index}`}
        style={[styles.deckSlot, styles.emptySlot]}
        onPress={() => setCardPickerVisible(true)}
      >
        <Ionicons name="add" size={24} color="#666" />
      </TouchableOpacity>
    );
  };

  const renderCardItem = ({ item }: { item: Card }) => {
    const isInDeck = currentDeck.some((c) => c.id === item.id);

    return (
      <TouchableOpacity
        style={[styles.pickerCard, isInDeck && styles.pickerCardDisabled]}
        onPress={() => !isInDeck && handleAddCard(item)}
        disabled={isInDeck}
      >
        <Image source={{ uri: item.iconUrl }} style={styles.pickerCardImage} resizeMode="contain" />
        <View style={[styles.pickerElixirBadge, { backgroundColor: getRarityColor(item.rarity) }]}>
          <Text style={styles.elixirText}>{item.elixir}</Text>
        </View>
        {isInDeck && (
          <View style={styles.inDeckOverlay}>
            <Ionicons name="checkmark-circle" size={24} color="#4caf50" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Deck Display */}
        <View style={styles.deckSection}>
          <View style={styles.deckHeader}>
            <Text style={styles.sectionTitle}>Your Deck</Text>
            <View style={styles.deckStats}>
              <Text style={styles.statText}>{currentDeck.length}/8</Text>
              <Text style={styles.statText}>Avg: {avgElixir || '-'}</Text>
            </View>
          </View>

          <View style={styles.deckGrid}>
            {Array.from({ length: 8 }).map((_, i) => renderDeckSlot(i))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.autofillButton]}
              onPress={handleAutofill}
              disabled={isAutofilling || currentDeck.length >= 8}
            >
              {isAutofilling ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="flash" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Auto-fill</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.optimizeButton]}
              onPress={handleOptimize}
              disabled={isOptimizing || currentDeck.length !== 8}
            >
              {isOptimizing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="trending-up" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Optimize</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.importButton]}
              onPress={() => setImportModalVisible(true)}
            >
              <Ionicons name="download" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Import</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.exportButton]}
              onPress={handleExport}
              disabled={currentDeck.length !== 8}
            >
              <Ionicons name="share" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Export</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.clearButton]}
              onPress={handleClearDeck}
              disabled={currentDeck.length === 0}
            >
              <Ionicons name="trash" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Autofill Explanations */}
        {lastAutofillResult && lastAutofillResult.explanations.length > 0 && (
          <View style={styles.explanationsSection}>
            <Text style={styles.sectionTitle}>Auto-fill Suggestions</Text>
            {lastAutofillResult.explanations.map((exp) => (
              <View key={exp.cardId} style={styles.explanationItem}>
                <Ionicons name="information-circle" size={16} color="#4caf50" />
                <Text style={styles.explanationText}>{exp.reason}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Add Cards Button */}
        <TouchableOpacity
          style={styles.addCardsButton}
          onPress={() => setCardPickerVisible(true)}
          disabled={currentDeck.length >= 8}
        >
          <Ionicons name="add-circle" size={24} color="#e94560" />
          <Text style={styles.addCardsText}>Add Cards</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Card Picker Modal */}
      <Modal
        visible={isCardPickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCardPickerVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Card</Text>
            <TouchableOpacity onPress={() => setCardPickerVisible(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search cards..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Filters */}
          <View style={styles.filtersContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.filterChip, filterType === 'all' && styles.filterChipActive]}
                onPress={() => setFilterType('all')}
              >
                <Text style={styles.filterChipText}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, filterType === 'troop' && styles.filterChipActive]}
                onPress={() => setFilterType('troop')}
              >
                <Text style={styles.filterChipText}>Troops</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, filterType === 'spell' && styles.filterChipActive]}
                onPress={() => setFilterType('spell')}
              >
                <Text style={styles.filterChipText}>Spells</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, filterType === 'building' && styles.filterChipActive]}
                onPress={() => setFilterType('building')}
              >
                <Text style={styles.filterChipText}>Buildings</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Rarity Filters */}
          <View style={styles.filtersContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.filterChip, filterRarity === 'all' && styles.filterChipActive]}
                onPress={() => setFilterRarity('all')}
              >
                <Text style={styles.filterChipText}>All Rarities</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  filterRarity === 'common' && styles.filterChipActive,
                  { backgroundColor: filterRarity === 'common' ? '#8bc34a' : '#333' },
                ]}
                onPress={() => setFilterRarity('common')}
              >
                <Text style={styles.filterChipText}>Common</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  filterRarity === 'rare' && styles.filterChipActive,
                  { backgroundColor: filterRarity === 'rare' ? '#ff9800' : '#333' },
                ]}
                onPress={() => setFilterRarity('rare')}
              >
                <Text style={styles.filterChipText}>Rare</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  filterRarity === 'epic' && styles.filterChipActive,
                  { backgroundColor: filterRarity === 'epic' ? '#9c27b0' : '#333' },
                ]}
                onPress={() => setFilterRarity('epic')}
              >
                <Text style={styles.filterChipText}>Epic</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  filterRarity === 'legendary' && styles.filterChipActive,
                  { backgroundColor: filterRarity === 'legendary' ? '#ffc107' : '#333' },
                ]}
                onPress={() => setFilterRarity('legendary')}
              >
                <Text style={styles.filterChipText}>Legendary</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  filterRarity === 'champion' && styles.filterChipActive,
                  { backgroundColor: filterRarity === 'champion' ? '#e91e63' : '#333' },
                ]}
                onPress={() => setFilterRarity('champion')}
              >
                <Text style={styles.filterChipText}>Champion</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Card Grid */}
          <FlatList
            data={filteredCards}
            renderItem={renderCardItem}
            keyExtractor={(item) => item.id}
            numColumns={4}
            contentContainerStyle={styles.cardGrid}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>

      {/* Optimization Results Modal */}
      <Modal
        visible={isOptimizeModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOptimizeModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Optimization Results</Text>
            <TouchableOpacity onPress={() => setOptimizeModalVisible(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.optimizeContent}>
            {lastOptimizeResult && (
              <>
                {/* Score Summary */}
                <View style={styles.scoreSection}>
                  <Text style={styles.scoreSectionTitle}>Deck Score</Text>
                  <View style={styles.scoreRow}>
                    <View style={styles.scoreBox}>
                      <Text style={styles.scoreLabel}>Before</Text>
                      <Text style={styles.scoreValue}>{lastOptimizeResult.scores.before.overall.toFixed(1)}</Text>
                    </View>
                    <View style={styles.scoreArrow}>
                      <Ionicons name="arrow-forward" size={24} color="#4caf50" />
                    </View>
                    <View style={styles.scoreBox}>
                      <Text style={styles.scoreLabel}>After</Text>
                      <Text style={[styles.scoreValue, styles.scoreImproved]}>
                        {lastOptimizeResult.scores.after.overall.toFixed(1)}
                      </Text>
                    </View>
                  </View>
                  {lastOptimizeResult.scores.improvement > 0 && (
                    <Text style={styles.improvementText}>
                      +{lastOptimizeResult.scores.improvement.toFixed(1)} improvement
                    </Text>
                  )}
                </View>

                {/* Swap Plan */}
                {lastOptimizeResult.swapPlan.length > 0 ? (
                  <View style={styles.swapSection}>
                    <Text style={styles.scoreSectionTitle}>Suggested Swaps</Text>
                    {lastOptimizeResult.swapPlan.map((swap, index) => (
                      <View key={index} style={styles.swapItem}>
                        <View style={styles.swapCards}>
                          <View style={styles.swapCard}>
                            <Text style={styles.swapCardLabel}>Remove</Text>
                            <Text style={styles.swapCardName}>{swap.remove.cardName}</Text>
                          </View>
                          <Ionicons name="swap-horizontal" size={20} color="#e94560" />
                          <View style={styles.swapCard}>
                            <Text style={styles.swapCardLabel}>Add</Text>
                            <Text style={[styles.swapCardName, styles.swapCardAdd]}>{swap.add.cardName}</Text>
                          </View>
                        </View>
                        <Text style={styles.swapReason}>{swap.reason}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.optimalSection}>
                    <Ionicons name="checkmark-circle" size={48} color="#4caf50" />
                    <Text style={styles.optimalText}>Your deck is already optimal!</Text>
                    <Text style={styles.optimalSubtext}>No improvements suggested</Text>
                  </View>
                )}

                {/* Analysis */}
                <View style={styles.analysisSection}>
                  <Text style={styles.scoreSectionTitle}>Analysis</Text>
                  <View style={styles.analysisRow}>
                    <Text style={styles.analysisLabel}>Avg Elixir:</Text>
                    <Text style={styles.analysisValue}>
                      {lastOptimizeResult.analysis.averageElixir.before} → {lastOptimizeResult.analysis.averageElixir.after}
                    </Text>
                  </View>
                  {lastOptimizeResult.analysis.missingRoles.length > 0 && (
                    <View style={styles.analysisRow}>
                      <Text style={styles.analysisLabel}>Missing Roles:</Text>
                      <Text style={styles.analysisValueWarning}>
                        {lastOptimizeResult.analysis.missingRoles.map(r => r.replace('_', ' ')).join(', ')}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Apply Button */}
                {lastOptimizeResult.swapPlan.length > 0 && (
                  <TouchableOpacity
                    style={styles.applyButton}
                    onPress={handleApplyOptimization}
                  >
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.applyButtonText}>Apply Optimization</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Import Modal */}
      <Modal
        visible={isImportModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setImportModalVisible(false)}
      >
        <View style={styles.importModalOverlay}>
          <View style={styles.importModalContent}>
            <Text style={styles.importModalTitle}>Import Deck</Text>
            <Text style={styles.importModalSubtitle}>
              Paste a Clash Royale deck link
            </Text>
            <TextInput
              style={styles.importInput}
              placeholder="https://link.clashroyale.com/deck/..."
              placeholderTextColor="#666"
              value={importLink}
              onChangeText={setImportLink}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.importModalButtons}>
              <TouchableOpacity
                style={[styles.importModalButton, styles.cancelButton]}
                onPress={() => {
                  setImportModalVisible(false);
                  setImportLink('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.importModalButton, styles.confirmButton]}
                onPress={handleImport}
              >
                <Text style={styles.confirmButtonText}>Import</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function getRarityColor(rarity: CardRarity): string {
  const colors: Record<CardRarity, string> = {
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
  scrollView: {
    flex: 1,
  },
  deckSection: {
    padding: 15,
    backgroundColor: '#1a1a2e',
    margin: 15,
    borderRadius: 12,
  },
  deckHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  deckStats: {
    flexDirection: 'row',
    gap: 15,
  },
  statText: {
    color: '#8b8b8b',
    fontSize: 14,
  },
  deckGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  deckSlot: {
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
  removeOverlay: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
  },
  actionsSection: {
    paddingHorizontal: 15,
    gap: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  autofillButton: {
    backgroundColor: '#e94560',
  },
  importButton: {
    backgroundColor: '#0f3460',
  },
  exportButton: {
    backgroundColor: '#4caf50',
  },
  clearButton: {
    backgroundColor: '#666',
  },
  optimizeButton: {
    backgroundColor: '#ff9800',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  explanationsSection: {
    padding: 15,
    marginTop: 10,
  },
  explanationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1a1a2e',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 10,
  },
  explanationText: {
    color: '#fff',
    fontSize: 13,
    flex: 1,
  },
  addCardsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    margin: 15,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    gap: 10,
  },
  addCardsText: {
    color: '#e94560',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#16213e',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#1a1a2e',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    padding: 12,
    fontSize: 16,
  },
  filtersContainer: {
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#333',
    borderRadius: 20,
    marginRight: 10,
  },
  filterChipActive: {
    backgroundColor: '#e94560',
  },
  filterChipText: {
    color: '#fff',
    fontSize: 13,
  },
  cardGrid: {
    padding: 10,
  },
  pickerCard: {
    flex: 1,
    margin: 5,
    aspectRatio: 0.75,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: '23%',
    position: 'relative',
  },
  pickerCardDisabled: {
    opacity: 0.5,
  },
  pickerCardImage: {
    width: '85%',
    height: '85%',
  },
  pickerElixirBadge: {
    position: 'absolute',
    top: 2,
    left: 2,
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inDeckOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  importModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  importModalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  importModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  importModalSubtitle: {
    fontSize: 14,
    color: '#8b8b8b',
    marginBottom: 15,
  },
  importInput: {
    backgroundColor: '#0f3460',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    marginBottom: 20,
  },
  importModalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  importModalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#333',
  },
  confirmButton: {
    backgroundColor: '#e94560',
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  // Optimization Modal Styles
  optimizeContent: {
    flex: 1,
    padding: 15,
  },
  scoreSection: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  scoreSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
  },
  scoreBox: {
    alignItems: 'center',
    backgroundColor: '#0f3460',
    padding: 15,
    borderRadius: 8,
    minWidth: 100,
  },
  scoreLabel: {
    color: '#8b8b8b',
    fontSize: 12,
    marginBottom: 5,
  },
  scoreValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  scoreImproved: {
    color: '#4caf50',
  },
  scoreArrow: {
    padding: 10,
  },
  improvementText: {
    color: '#4caf50',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
  },
  swapSection: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  swapItem: {
    backgroundColor: '#0f3460',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  swapCards: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  swapCard: {
    flex: 1,
    alignItems: 'center',
  },
  swapCardLabel: {
    color: '#8b8b8b',
    fontSize: 11,
    marginBottom: 4,
  },
  swapCardName: {
    color: '#e94560',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  swapCardAdd: {
    color: '#4caf50',
  },
  swapReason: {
    color: '#ccc',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  optimalSection: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 30,
    marginBottom: 15,
    alignItems: 'center',
  },
  optimalText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
  },
  optimalSubtext: {
    color: '#8b8b8b',
    fontSize: 14,
    marginTop: 5,
  },
  analysisSection: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  analysisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  analysisLabel: {
    color: '#8b8b8b',
    fontSize: 14,
  },
  analysisValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  analysisValueWarning: {
    color: '#ff9800',
    fontSize: 14,
    fontWeight: 'bold',
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4caf50',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 30,
    gap: 10,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
