import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  TextInput,
} from 'react-native';
import { X, Search, ArrowUpDown } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTranslationStore } from '@/providers/translation-provider';
import { SUPPORTED_LANGUAGES } from '@/constants/languages';

export default function LanguageSelectorScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSelectingFrom, setIsSelectingFrom] = useState(true);
  const { fromLanguage, toLanguage, setFromLanguage, setToLanguage } = useTranslationStore();

  const filteredLanguages = SUPPORTED_LANGUAGES.filter(lang =>
    lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lang.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLanguageSelect = (language: typeof SUPPORTED_LANGUAGES[0]) => {
    console.log('🎯 Language selected:', language.name, 'for', isSelectingFrom ? 'FROM' : 'TO');

    if (isSelectingFrom) {
      console.log('📝 Calling setFromLanguage with:', language);
      setFromLanguage(language);
    } else {
      // Don't allow auto-detect for target language
      if (language.code === 'auto') {
        console.warn('⚠️ Auto-detect not allowed for target language');
        return;
      }
      console.log('📝 Calling setToLanguage with:', language);
      setToLanguage(language);
    }

    // Delay to ensure context update propagates before navigation
    setTimeout(() => {
      console.log('⬅️ Navigating back after language change');
      router.back();
    }, 100);
  };

  const handleSwapLanguages = () => {
    if (fromLanguage.code === 'auto' || toLanguage.code === 'auto') {
      return;
    }
    const temp = fromLanguage;
    setFromLanguage(toLanguage);
    setToLanguage(temp);
  };

  const renderLanguageItem = ({ item }: { item: typeof SUPPORTED_LANGUAGES[0] }) => {
    const isSelected = isSelectingFrom
      ? item.code === fromLanguage.code
      : item.code === toLanguage.code;

    return (
      <TouchableOpacity
        style={[styles.languageItem, isSelected && styles.selectedLanguageItem]}
        onPress={() => handleLanguageSelect(item)}
      >
        <Text style={styles.languageFlag}>{item.flag}</Text>
        <View style={styles.languageInfo}>
          <Text style={[styles.languageName, isSelected && styles.selectedLanguageName]}>
            {item.name}
          </Text>
          <Text style={[styles.languageCode, isSelected && styles.selectedLanguageCode]}>
            {item.nativeName || item.name}
          </Text>
        </View>
        {isSelected && <View style={styles.selectedIndicator} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <X color="#e2e8f0" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Language</Text>
        <TouchableOpacity style={styles.headerButton} onPress={handleSwapLanguages}>
          <ArrowUpDown color="#3b82f6" size={24} />
        </TouchableOpacity>
      </View>

      {/* Language Direction Selector */}
      <View style={styles.directionSelector}>
        <TouchableOpacity
          style={[styles.directionButton, isSelectingFrom && styles.activeDirectionButton]}
          onPress={() => setIsSelectingFrom(true)}
        >
          <Text style={[styles.directionText, isSelectingFrom && styles.activeDirectionText]}>
            From: {fromLanguage.name}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.directionButton, !isSelectingFrom && styles.activeDirectionButton]}
          onPress={() => setIsSelectingFrom(false)}
        >
          <Text style={[styles.directionText, !isSelectingFrom && styles.activeDirectionText]}>
            To: {toLanguage.name}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search color="#64748b" size={20} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search languages..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#64748b"
        />
      </View>

      {/* Languages List */}
      <FlatList
        data={filteredLanguages}
        renderItem={renderLanguageItem}
        keyExtractor={(item) => item.code}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  directionSelector: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  directionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeDirectionButton: {
    backgroundColor: '#3b82f6',
  },
  directionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  activeDirectionText: {
    color: '#ffffff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#e2e8f0',
    marginLeft: 12,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  languageFlag: {
    fontSize: 28,
  },
  selectedLanguageItem: {
    backgroundColor: '#1e3a8a',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#e2e8f0',
    marginBottom: 2,
  },
  selectedLanguageName: {
    color: '#60a5fa',
    fontWeight: '600',
  },
  languageCode: {
    fontSize: 14,
    color: '#94a3b8',
  },
  selectedLanguageCode: {
    color: '#60a5fa',
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
});