import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Trash2, Copy, Search, X, Star, Download, FileText, Volume2 } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Speech from 'expo-speech';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { useTranslationStore } from '@/providers/translation-provider';
import { useLanguage } from '@/providers/language-provider';
import * as Clipboard from 'expo-clipboard';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { PREDEFINED_CATEGORIES } from '@/constants/categories';

export default function HistoryScreen() {
  const { history, clearHistory, removeFromHistory, toggleFavorite } = useTranslationStore();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [speakingItemId, setSpeakingItemId] = useState<string | null>(null);

  const handleCopy = async (text: string) => {
    if (!text?.trim()) return;
    try {
      await Clipboard.setStringAsync(text);
      Toast.show({
        type: 'success',
        text1: t('copied'),
        text2: t('translationCopied'),
        position: 'bottom',
        visibilityTime: 2000,
      });
    } catch (error) {
      console.error('Copy error:', error);
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('failedToCopyText'),
        position: 'bottom',
      });
    }
  };


  const handleDelete = (id: string) => {
    removeFromHistory(id);
    Toast.show({
      type: 'success',
      text1: t('deleted'),
      text2: t('translationRemoved'),
      position: 'bottom',
      visibilityTime: 2000,
    });
  };

  const handleClearAll = () => {
    Alert.alert(
      t('clearHistoryTitle'),
      t('clearHistoryMessage'),
      [
        {
          text: t('cancel'),
          style: 'cancel',
        },
        {
          text: t('clearAll'),
          style: 'destructive',
          onPress: () => {
            clearHistory();
            Toast.show({
              type: 'success',
              text1: t('historyCleared'),
              text2: t('allTranslationsDeleted'),
              position: 'bottom',
              visibilityTime: 2000,
            });
          },
        },
      ]
    );
  };

  const exportToCSV = async () => {
    try {
      if (history.length === 0) {
        Toast.show({
          type: 'info',
          text1: t('noData'),
          text2: t('noTranslationsToExport'),
          position: 'bottom',
        });
        return;
      }

      // Create CSV header
      let csv = 'Original Text,Translated Text,From Language,To Language,Date,Favorite,Category\n';

      // Add data rows
      history.forEach(item => {
        const category = PREDEFINED_CATEGORIES.find(c => c.id === item.categoryId);
        const date = new Date(item.timestamp).toLocaleDateString();
        const favorite = item.isFavorite ? 'Yes' : 'No';
        const categoryName = category ? category.name : '';

        // Escape quotes and commas in text
        const escapeCSV = (text: string) => {
          if (!text) return '';
          return `"${text.replace(/"/g, '""')}"`;
        };

        csv += `${escapeCSV(item.originalText)},${escapeCSV(item.translatedText)},${item.fromLanguage},${item.toLanguage},${date},${favorite},${categoryName}\n`;
      });

      // Save file
      const fileName = `translations_${Date.now()}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Share file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
        Toast.show({
          type: 'success',
          text1: t('exported'),
          text2: t('csvFileCreated'),
          position: 'bottom',
          visibilityTime: 2000,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: t('error'),
          text2: t('sharingNotAvailable'),
          position: 'bottom',
        });
      }

      setShowExportModal(false);
    } catch (error) {
      console.error('CSV export error:', error);
      Toast.show({
        type: 'error',
        text1: t('exportFailed'),
        text2: t('failedToExportCSV'),
        position: 'bottom',
      });
    }
  };

  const exportToJSON = async () => {
    try {
      if (history.length === 0) {
        Toast.show({
          type: 'info',
          text1: t('noData'),
          text2: t('noTranslationsToExport'),
          position: 'bottom',
        });
        return;
      }

      // Create JSON with formatted data
      const exportData = {
        exportDate: new Date().toISOString(),
        totalTranslations: history.length,
        translations: history.map(item => {
          const category = PREDEFINED_CATEGORIES.find(c => c.id === item.categoryId);
          return {
            id: item.id,
            originalText: item.originalText,
            translatedText: item.translatedText,
            fromLanguage: item.fromLanguage,
            toLanguage: item.toLanguage,
            timestamp: item.timestamp,
            date: new Date(item.timestamp).toISOString(),
            isFavorite: item.isFavorite || false,
            category: category ? {
              id: category.id,
              name: category.name,
              icon: category.icon,
            } : null,
          };
        }),
      };

      const json = JSON.stringify(exportData, null, 2);

      // Save file
      const fileName = `translations_${Date.now()}.json`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Share file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
        Toast.show({
          type: 'success',
          text1: t('exported'),
          text2: t('jsonFileCreated'),
          position: 'bottom',
          visibilityTime: 2000,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: t('error'),
          text2: t('sharingNotAvailable'),
          position: 'bottom',
        });
      }

      setShowExportModal(false);
    } catch (error) {
      console.error('JSON export error:', error);
      Toast.show({
        type: 'error',
        text1: t('exportFailed'),
        text2: t('failedToExportJSON'),
        position: 'bottom',
      });
    }
  };

  const handleSpeak = async (text: string, language: string, itemId: string) => {
    try {
      if (speakingItemId === itemId) {
        await Speech.stop();
        setSpeakingItemId(null);
        return;
      }

      // Stop any current speech
      if (speakingItemId) {
        await Speech.stop();
      }

      setSpeakingItemId(itemId);

      // Import Audio to set audio mode
      const { Audio } = await import('expo-av');
      // Set audio mode to use speaker instead of earpiece
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false, // Use speaker, not earpiece
      });

      // Map language names to language codes for Speech API
      const languageCodeMap: { [key: string]: string } = {
        'English': 'en',
        'Spanish': 'es',
        'French': 'fr',
        'German': 'de',
        'Italian': 'it',
        'Portuguese': 'pt',
        'Russian': 'ru',
        'Japanese': 'ja',
        'Chinese': 'zh',
        'Korean': 'ko',
        'Arabic': 'ar',
        'Hindi': 'hi',
        'Dutch': 'nl',
        'Swedish': 'sv',
        'Polish': 'pl',
        'Turkish': 'tr',
        'Greek': 'el',
        'Czech': 'cs',
        'Danish': 'da',
        'Finnish': 'fi',
        'Norwegian': 'no',
        'Thai': 'th',
        'Vietnamese': 'vi',
        'Indonesian': 'id',
        'Malay': 'ms',
        'Hebrew': 'he',
      };

      const languageCode = languageCodeMap[language] || 'en';

      await Speech.speak(text, {
        language: languageCode,
        pitch: 1.0,
        rate: 0.9,
        onDone: () => setSpeakingItemId(null),
        onStopped: () => setSpeakingItemId(null),
        onError: () => {
          setSpeakingItemId(null);
          Toast.show({
            type: 'error',
            text1: t('error'),
            text2: t('failedToPlayAudio'),
            position: 'bottom',
          });
        },
      });
    } catch (error) {
      console.error('Speech error:', error);
      setSpeakingItemId(null);
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('textToSpeechNotAvailable'),
        position: 'bottom',
      });
    }
  };

  // Filter history based on search query and favorites
  const filteredHistory = useMemo(() => {
    let filtered = history;

    // Filter by favorites
    if (showOnlyFavorites) {
      filtered = filtered.filter(item => item.isFavorite);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.originalText.toLowerCase().includes(query) ||
        item.translatedText.toLowerCase().includes(query) ||
        item.fromLanguage.toLowerCase().includes(query) ||
        item.toLanguage.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [history, searchQuery, showOnlyFavorites]);

  const renderRightActions = (itemId: string) => {
    return (
      <TouchableOpacity
        style={styles.swipeDeleteButton}
        onPress={() => handleDelete(itemId)}
      >
        <Trash2 color="#ffffff" size={24} />
        <Text style={styles.swipeDeleteText}>{t('delete')}</Text>
      </TouchableOpacity>
    );
  };

  const renderHistoryItem = ({ item }: { item: any }) => {
    const category = PREDEFINED_CATEGORIES.find(c => c.id === item.categoryId);

    return (
      <Animated.View
        entering={FadeInRight.duration(400)}
        exiting={FadeOutLeft.duration(300)}
      >
        <Swipeable
          renderRightActions={() => renderRightActions(item.id)}
          overshootRight={false}
        >
          <View style={styles.historyItem}>
            <View style={styles.translationContent}>
              <View style={styles.textSection}>
                <View style={styles.headerRow}>
                  <Text style={styles.languageLabel}>
                    {item.fromLanguage} → {item.toLanguage}
                  </Text>
                  {category && (
                    <View style={[styles.categoryBadge, { backgroundColor: category.color + '20', borderColor: category.color }]}>
                      <Text style={styles.categoryIcon}>{category.icon}</Text>
                      <Text style={[styles.categoryName, { color: category.color }]}>{category.name}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.originalText}>{item.originalText}</Text>
                <Text style={styles.translatedText}>{item.translatedText}</Text>
              </View>
              <Text style={styles.timestamp}>
                {new Date(item.timestamp).toLocaleDateString()}
              </Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => toggleFavorite(item.id)}
              >
                <Star
                  color={item.isFavorite ? "#fbbf24" : "#64748b"}
                  size={18}
                  fill={item.isFavorite ? "#fbbf24" : "transparent"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleSpeak(item.translatedText, item.toLanguage, item.id)}
              >
                <Volume2
                  color={speakingItemId === item.id ? "#10b981" : "#3b82f6"}
                  size={18}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleCopy(item.translatedText)}
              >
                <Copy color="#3b82f6" size={18} />
              </TouchableOpacity>
            </View>
          </View>
        </Swipeable>
      </Animated.View>
    );
  };

  if (history.length === 0) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.container}>
          <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <Text style={styles.title}>{t('translationHistory')}</Text>
          </View>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>{t('noTranslations')}</Text>
            <Text style={styles.emptySubtitle}>
              {t('translationsWillAppear')}
            </Text>
          </View>
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>{t('translationHistory')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.filterButton, showOnlyFavorites && styles.filterButtonActive]}
            onPress={() => setShowOnlyFavorites(!showOnlyFavorites)}
          >
            <Star
              color={showOnlyFavorites ? "#fbbf24" : "#94a3b8"}
              size={18}
              fill={showOnlyFavorites ? "#fbbf24" : "transparent"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={() => setShowExportModal(true)}
          >
            <Download color="#10b981" size={18} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearButton} onPress={handleClearAll}>
            <Text style={styles.clearButtonText}>{t('clearAll')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search color="#64748b" size={20} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('searchTranslations')}
          placeholderTextColor="#64748b"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X color="#64748b" size={20} />
          </TouchableOpacity>
        )}
      </View>

      {filteredHistory.length === 0 && searchQuery.length > 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>{t('noResultsFound')}</Text>
          <Text style={styles.emptySubtitle}>
            {t('tryDifferentKeywords')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredHistory}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Export Modal */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('exportTranslations')}</Text>
              <TouchableOpacity onPress={() => setShowExportModal(false)}>
                <X color="#94a3b8" size={24} />
              </TouchableOpacity>
            </View>

            <Text style={styles.exportDescription}>
              {t('chooseExportFormat')}
            </Text>

            <View style={styles.exportOptions}>
              <TouchableOpacity
                style={styles.exportOption}
                onPress={exportToCSV}
              >
                <FileText color="#10b981" size={32} />
                <Text style={styles.exportOptionTitle}>{t('exportAsCSV')}</Text>
                <Text style={styles.exportOptionDescription}>
                  {t('compatibleWithExcel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.exportOption}
                onPress={exportToJSON}
              >
                <FileText color="#3b82f6" size={32} />
                <Text style={styles.exportOptionTitle}>{t('exportAsJSON')}</Text>
                <Text style={styles.exportOptionDescription}>
                  {t('structuredDataFormat')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e2e8f0',
    flexShrink: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexShrink: 0,
  },
  filterButton: {
    padding: 10,
    backgroundColor: '#334155',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterButtonActive: {
    backgroundColor: '#1e293b',
    borderColor: '#fbbf24',
  },
  exportButton: {
    padding: 10,
    backgroundColor: '#334155',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ef4444',
    borderRadius: 8,
  },
  clearButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#e2e8f0',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  historyItem: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  translationContent: {
    marginBottom: 12,
  },
  textSection: {
    marginBottom: 8,
  },
  languageLabel: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
    marginBottom: 8,
  },
  originalText: {
    fontSize: 16,
    color: '#e2e8f0',
    marginBottom: 8,
    lineHeight: 22,
  },
  translatedText: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '500',
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 12,
    color: '#64748b',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  deleteButton: {
    backgroundColor: '#450a0a',
  },
  swipeDeleteButton: {
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    borderRadius: 16,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  swipeDeleteText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  categoryFilterLabel: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
  },
  categoryFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  categoryFilterIcon: {
    fontSize: 14,
  },
  categoryFilterName: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e2e8f0',
  },
  exportDescription: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 20,
    lineHeight: 20,
  },
  exportOptions: {
    gap: 12,
  },
  exportOption: {
    backgroundColor: '#0f172a',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#334155',
  },
  exportOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
    marginTop: 12,
    marginBottom: 4,
  },
  exportOptionDescription: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
});