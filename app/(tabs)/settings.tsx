import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import {
  ChevronRight,
  Trash2,
  Languages,
  Globe,
  History,
  X,
} from 'lucide-react-native';
import { useTranslationStore, Language } from '@/providers/translation-provider';
import { useLanguage } from '@/providers/language-provider';
import { AppLanguageCode } from '@/constants/translations';
import { SUPPORTED_LANGUAGES } from '@/constants/languages';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const {
    fromLanguage,
    toLanguage,
    setFromLanguage,
    setToLanguage,
    saveToHistory,
    setSaveToHistory,
    history,
    clearHistory,
  } = useTranslationStore();
  const { appLanguage, setAppLanguage, availableLanguages, t } = useLanguage();
  const insets = useSafeAreaInsets();

  const [showFromLanguageModal, setShowFromLanguageModal] = useState(false);
  const [showToLanguageModal, setShowToLanguageModal] = useState(false);
  const [showAppLanguageModal, setShowAppLanguageModal] = useState(false);

  const currentAppLang = availableLanguages.find(l => l.code === appLanguage) || availableLanguages[0];

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      `Are you sure you want to delete all ${history.length} translations from your history? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            clearHistory();
            Alert.alert('Success', 'Translation history cleared');
          },
        },
      ]
    );
  };

  const renderLanguageModal = (
    visible: boolean,
    onClose: () => void,
    onSelect: (lang: Language) => void,
    currentLanguage: Language,
    title: string,
    includeAuto: boolean = true
  ) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <X color="#94a3b8" size={24} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={includeAuto ? SUPPORTED_LANGUAGES : SUPPORTED_LANGUAGES.filter(l => l.code !== 'auto')}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.languageOption,
                  currentLanguage.code === item.code && styles.selectedLanguageOption,
                ]}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text style={styles.languageFlag}>{item.flag}</Text>
                <View style={styles.languageInfo}>
                  <Text style={styles.languageOptionText}>{item.name}</Text>
                  <Text style={styles.languageNative}>{item.nativeName}</Text>
                </View>
                {currentLanguage.code === item.code && (
                  <View style={styles.selectedIndicator} />
                )}
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('settings')}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* App Language Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('appLanguage')}</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setShowAppLanguageModal(true)}
          >
            <View style={styles.settingLeft}>
              <Languages color="#10b981" size={20} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>{t('appLanguage')}</Text>
                <Text style={styles.settingValue}>
                  {currentAppLang.flag} {currentAppLang.name}
                </Text>
              </View>
            </View>
            <ChevronRight color="#9ca3af" size={20} />
          </TouchableOpacity>
        </View>

        {/* Default Languages Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('defaultLanguages')}</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setShowFromLanguageModal(true)}
          >
            <View style={styles.settingLeft}>
              <Globe color="#3b82f6" size={20} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>{t('sourceLanguage')}</Text>
                <Text style={styles.settingValue}>
                  {fromLanguage.flag} {fromLanguage.name}
                </Text>
              </View>
            </View>
            <ChevronRight color="#9ca3af" size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setShowToLanguageModal(true)}
          >
            <View style={styles.settingLeft}>
              <Languages color="#3b82f6" size={20} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>{t('targetLanguage')}</Text>
                <Text style={styles.settingValue}>
                  {toLanguage.flag} {toLanguage.name}
                </Text>
              </View>
            </View>
            <ChevronRight color="#9ca3af" size={20} />
          </TouchableOpacity>
        </View>

        {/* History Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('history')}</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <History color="#3b82f6" size={20} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>{t('saveHistory')}</Text>
                <Text style={styles.settingSubtitle}>
                  {t('keepTranslations')}
                </Text>
              </View>
            </View>
            <Switch
              value={saveToHistory}
              onValueChange={setSaveToHistory}
              trackColor={{ false: '#334155', true: '#3b82f6' }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.infoItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconPlaceholder} />
              <View style={styles.settingText}>
                <Text style={styles.settingSubtitle}>
                  {history.length} {t('translationsSaved')}
                </Text>
              </View>
            </View>
          </View>

          {history.length > 0 && (
            <TouchableOpacity
              style={[styles.settingItem, styles.dangerItem]}
              onPress={handleClearHistory}
            >
              <View style={styles.settingLeft}>
                <Trash2 color="#ef4444" size={20} />
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, styles.dangerText]}>
                    {t('clearHistory')}
                  </Text>
                  <Text style={styles.settingSubtitle}>
                    {t('deleteAllTranslations')}
                  </Text>
                </View>
              </View>
              <ChevronRight color="#9ca3af" size={20} />
            </TouchableOpacity>
          )}
        </View>

        {/* App Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('about')}</Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>{t('appTitle')}</Text>
            <Text style={styles.infoVersion}>{t('version')}</Text>
            <Text style={styles.infoDescription}>
              {t('aboutDescription')}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Language Selection Modals */}
      {renderLanguageModal(
        showFromLanguageModal,
        () => setShowFromLanguageModal(false),
        setFromLanguage,
        fromLanguage,
        'Select Source Language',
        true
      )}

      {renderLanguageModal(
        showToLanguageModal,
        () => setShowToLanguageModal(false),
        setToLanguage,
        toLanguage,
        'Select Target Language',
        false
      )}

      {/* App Language Modal */}
      <Modal visible={showAppLanguageModal} transparent animationType="slide" onRequestClose={() => setShowAppLanguageModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select App Language</Text>
              <TouchableOpacity onPress={() => setShowAppLanguageModal(false)}>
                <X color="#94a3b8" size={24} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={availableLanguages}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.languageOption,
                    appLanguage === item.code && styles.selectedLanguageOption,
                  ]}
                  onPress={async () => {
                    try {
                      // Close modal first to prevent re-render issues
                      setShowAppLanguageModal(false);

                      // Wait a tiny bit for modal animation
                      await new Promise(resolve => setTimeout(resolve, 100));

                      // Then change language
                      await setAppLanguage(item.code as AppLanguageCode);
                    } catch (error) {
                      console.error('Error changing language:', error);
                    }
                  }}
                >
                  <Text style={styles.languageFlag}>{item.flag}</Text>
                  <View style={styles.languageInfo}>
                    <Text style={styles.languageOptionText}>{item.name}</Text>
                  </View>
                  {appLanguage === item.code && (
                    <View style={styles.selectedIndicator} />
                  )}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e2e8f0',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
  },
  settingValue: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  iconPlaceholder: {
    width: 20,
  },
  dangerItem: {
    borderColor: '#7f1d1d',
    backgroundColor: '#1e1b1b',
  },
  dangerText: {
    color: '#ef4444',
  },
  infoCard: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 4,
  },
  infoVersion: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
    marginBottom: 12,
  },
  infoDescription: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  selectedLanguageOption: {
    backgroundColor: '#1e3a8a',
    borderColor: '#3b82f6',
  },
  languageFlag: {
    fontSize: 28,
    marginRight: 12,
  },
  languageInfo: {
    flex: 1,
  },
  languageOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 2,
  },
  languageNative: {
    fontSize: 14,
    color: '#94a3b8',
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
});
