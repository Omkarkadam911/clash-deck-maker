import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store';
import { Arena } from '../../types';

export default function SettingsScreen() {
  const settings = useStore((state) => state.settings);
  const arenas = useStore((state) => state.arenas);
  const updateSettings = useStore((state) => state.updateSettings);
  const clearDeck = useStore((state) => state.clearDeck);

  const [apiUrl, setApiUrl] = useState(settings.apiUrl);
  const [isArenaPickerVisible, setArenaPickerVisible] = useState(false);

  const selectedArena = arenas.find((a) => a.id === settings.preferredArena);

  const handleApiUrlSave = () => {
    if (!apiUrl.trim()) {
      Alert.alert('Error', 'API URL cannot be empty');
      return;
    }
    updateSettings({ apiUrl: apiUrl.trim() });
    Alert.alert('Saved', 'API URL has been updated');
  };

  const handleArenaSelect = (arena: Arena) => {
    updateSettings({ preferredArena: arena.id });
    setArenaPickerVisible(false);
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Data',
      'This will clear your current deck. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearDeck();
            Alert.alert('Cleared', 'All data has been cleared');
          },
        },
      ]
    );
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'This will reset all settings to default. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            updateSettings({
              preferredArena: 15,
              theme: 'system',
              apiUrl: 'http://localhost:3001',
            });
            setApiUrl('http://localhost:3001');
            Alert.alert('Reset', 'Settings have been reset to defaults');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Arena Setting */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Deck Building</Text>

        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => setArenaPickerVisible(!isArenaPickerVisible)}
        >
          <View style={styles.settingInfo}>
            <Ionicons name="trophy" size={24} color="#ffc107" />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Preferred Arena</Text>
              <Text style={styles.settingValue}>
                {selectedArena?.name || 'Not set'}
              </Text>
            </View>
          </View>
          <Ionicons
            name={isArenaPickerVisible ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#8b8b8b"
          />
        </TouchableOpacity>

        {isArenaPickerVisible && (
          <View style={styles.arenaPicker}>
            <ScrollView style={styles.arenaList} nestedScrollEnabled>
              {arenas
                .filter((a) => a.trophyMin > 0)
                .map((arena) => (
                  <TouchableOpacity
                    key={arena.id}
                    style={[
                      styles.arenaOption,
                      arena.id === settings.preferredArena && styles.arenaOptionSelected,
                    ]}
                    onPress={() => handleArenaSelect(arena)}
                  >
                    <Text
                      style={[
                        styles.arenaOptionText,
                        arena.id === settings.preferredArena && styles.arenaOptionTextSelected,
                      ]}
                    >
                      {arena.name}
                    </Text>
                    <Text style={styles.arenaTrophies}>
                      {arena.trophyMin.toLocaleString()}+ trophies
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Theme Setting */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>

        <View style={styles.themeOptions}>
          {(['light', 'dark', 'system'] as const).map((theme) => (
            <TouchableOpacity
              key={theme}
              style={[
                styles.themeOption,
                settings.theme === theme && styles.themeOptionSelected,
              ]}
              onPress={() => updateSettings({ theme })}
            >
              <Ionicons
                name={
                  theme === 'light'
                    ? 'sunny'
                    : theme === 'dark'
                    ? 'moon'
                    : 'phone-portrait'
                }
                size={24}
                color={settings.theme === theme ? '#e94560' : '#8b8b8b'}
              />
              <Text
                style={[
                  styles.themeOptionText,
                  settings.theme === theme && styles.themeOptionTextSelected,
                ]}
              >
                {theme.charAt(0).toUpperCase() + theme.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* API Setting */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Developer</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="server" size={24} color="#4caf50" />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>API URL</Text>
            </View>
          </View>
        </View>

        <View style={styles.apiInputContainer}>
          <TextInput
            style={styles.apiInput}
            value={apiUrl}
            onChangeText={setApiUrl}
            placeholder="http://localhost:3001"
            placeholderTextColor="#666"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.saveButton} onPress={handleApiUrlSave}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.apiHint}>
          The backend server URL. Default is http://localhost:3001 for development.
        </Text>
      </View>

      {/* Data Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>

        <TouchableOpacity style={styles.dangerButton} onPress={handleClearAll}>
          <Ionicons name="trash" size={20} color="#e94560" />
          <Text style={styles.dangerButtonText}>Clear Current Deck</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dangerButton} onPress={handleResetSettings}>
          <Ionicons name="refresh" size={20} color="#e94560" />
          <Text style={styles.dangerButtonText}>Reset All Settings</Text>
        </TouchableOpacity>
      </View>

      {/* About */}
      <View style={[styles.section, styles.aboutSection]}>
        <Text style={styles.sectionTitle}>About</Text>

        <View style={styles.aboutItem}>
          <Text style={styles.aboutLabel}>Version</Text>
          <Text style={styles.aboutValue}>1.0.0</Text>
        </View>

        <View style={styles.aboutItem}>
          <Text style={styles.aboutLabel}>Built with</Text>
          <Text style={styles.aboutValue}>React Native + Expo</Text>
        </View>

        <View style={styles.disclaimerBox}>
          <Ionicons name="information-circle" size={20} color="#ffc107" />
          <Text style={styles.disclaimerText}>
            This app is not affiliated with, endorsed, sponsored, or specifically approved by
            Supercell and Supercell is not responsible for it.
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
  section: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8b8b8b',
    textTransform: 'uppercase',
    marginBottom: 15,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 15,
    borderRadius: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 4,
  },
  settingValue: {
    fontSize: 14,
    color: '#8b8b8b',
  },
  arenaPicker: {
    marginTop: 10,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    overflow: 'hidden',
  },
  arenaList: {
    maxHeight: 250,
  },
  arenaOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  arenaOptionSelected: {
    backgroundColor: '#0f3460',
  },
  arenaOptionText: {
    fontSize: 15,
    color: '#fff',
  },
  arenaOptionTextSelected: {
    fontWeight: 'bold',
    color: '#e94560',
  },
  arenaTrophies: {
    fontSize: 12,
    color: '#8b8b8b',
  },
  themeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeOptionSelected: {
    borderColor: '#e94560',
  },
  themeOptionText: {
    marginTop: 8,
    fontSize: 13,
    color: '#8b8b8b',
  },
  themeOptionTextSelected: {
    color: '#e94560',
    fontWeight: 'bold',
  },
  apiInputContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  apiInput: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  apiHint: {
    marginTop: 10,
    fontSize: 12,
    color: '#666',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    padding: 15,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    marginBottom: 10,
  },
  dangerButtonText: {
    fontSize: 16,
    color: '#e94560',
  },
  aboutSection: {
    borderBottomWidth: 0,
    paddingBottom: 40,
  },
  aboutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    marginBottom: 10,
  },
  aboutLabel: {
    fontSize: 15,
    color: '#8b8b8b',
  },
  aboutValue: {
    fontSize: 15,
    color: '#fff',
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 15,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    marginTop: 10,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#8b8b8b',
    lineHeight: 18,
  },
});
