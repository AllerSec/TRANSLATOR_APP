import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { SUPPORTED_LANGUAGES } from '@/constants/languages';
import NetInfo from '@react-native-community/netinfo';

export interface TranslationHistory {
  id: string;
  originalText: string;
  translatedText: string;
  fromLanguage: string;
  toLanguage: string;
  timestamp: number;
  isFavorite?: boolean;
  categoryId?: string;
}

export interface TranslationCache {
  key: string; // combination of text + fromLang + toLang
  originalText: string;
  translatedText: string;
  fromLanguage: string;
  toLanguage: string;
  timestamp: number;
}

export interface Language {
  code: string;
  name: string;
  flag?: string;
  nativeName?: string;
}

interface TranslationContextType {
  fromLanguage: Language;
  toLanguage: Language;
  history: TranslationHistory[];
  autoTranslate: boolean;
  saveToHistory: boolean;
  isOnline: boolean;
  translationCache: TranslationCache[];
  setFromLanguage: (language: Language) => void;
  setToLanguage: (language: Language) => void;
  addToHistory: (translation: Omit<TranslationHistory, 'id' | 'timestamp'>) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
  setAutoTranslate: (enabled: boolean) => void;
  setSaveToHistory: (enabled: boolean) => void;
  toggleFavorite: (id: string) => void;
  setCategory: (id: string, categoryId: string) => void;
  getCachedTranslation: (text: string, fromLang: string, toLang: string) => string | null;
  addToCache: (text: string, translation: string, fromLang: string, toLang: string) => void;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

const useStorage = () => {
  const getItem = useCallback(async (key: string): Promise<string | null> => {
    try {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  }, []);

  const setItem = useCallback(async (key: string, value: string): Promise<void> => {
    try {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Storage set error:', error);
    }
  }, []);

  const removeItem = useCallback(async (key: string): Promise<void> => {
    try {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Storage remove error:', error);
    }
  }, []);

  return { getItem, setItem, removeItem };
};

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [fromLanguage, setFromLanguageState] = useState<Language>(SUPPORTED_LANGUAGES[0]);
  const [toLanguage, setToLanguageState] = useState<Language>(SUPPORTED_LANGUAGES[2]);
  const [history, setHistory] = useState<TranslationHistory[]>([]);
  const [autoTranslate, setAutoTranslateState] = useState(true);
  const [saveToHistory, setSaveToHistoryState] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [translationCache, setTranslationCache] = useState<TranslationCache[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const storage = useStorage();

  // Monitor network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });

    return () => unsubscribe();
  }, []);

  const loadSettings = useCallback(async () => {
    console.log('🔄 Loading settings from storage...');
    try {
      const [settingsData, historyData, cacheData] = await Promise.all([
        storage.getItem('translation_settings'),
        storage.getItem('translation_history'),
        storage.getItem('translation_cache'),
      ]);

      if (settingsData) {
        try {
          const settings = JSON.parse(settingsData);
          if (settings && typeof settings === 'object') {
            console.log('✅ Loading saved settings:', {
              from: settings.fromLanguage?.name,
              to: settings.toLanguage?.name,
            });
            setFromLanguageState(settings.fromLanguage || SUPPORTED_LANGUAGES[0]);
            setToLanguageState(settings.toLanguage || SUPPORTED_LANGUAGES[2]);
            setAutoTranslateState(settings.autoTranslate ?? true);
            setSaveToHistoryState(settings.saveToHistory ?? true);
            console.log('✅ Settings loaded and applied');
          }
        } catch (parseError) {
          console.error('❌ Failed to parse settings, clearing corrupted data:', parseError);
          await storage.removeItem('translation_settings');
        }
      } else {
        console.log('ℹ️ No saved settings found, using defaults');
      }

      if (historyData) {
        try {
          const parsedHistory = JSON.parse(historyData);
          if (Array.isArray(parsedHistory)) {
            setHistory(parsedHistory);
          }
        } catch (parseError) {
          console.error('Failed to parse history, clearing corrupted data:', parseError);
          await storage.removeItem('translation_history');
        }
      }

      if (cacheData) {
        try {
          const parsedCache = JSON.parse(cacheData);
          if (Array.isArray(parsedCache)) {
            // Keep only recent cache (last 7 days)
            const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
            const recentCache = parsedCache.filter((item: TranslationCache) => item.timestamp > sevenDaysAgo);
            setTranslationCache(recentCache);
          }
        } catch (parseError) {
          console.error('Failed to parse cache, clearing corrupted data:', parseError);
          await storage.removeItem('translation_cache');
        }
      }
    } catch (error) {
      console.error('❌ Failed to load settings:', error);
    } finally {
      setIsLoaded(true);
      console.log('✅ Settings loading complete');
    }
  }, [storage]);

  useEffect(() => {
    loadSettings();
  }, []);

  // Save settings whenever they change (but only after initial load)
  useEffect(() => {
    if (!isLoaded) {
      console.log('⏸️ Skipping save - settings not loaded yet');
      return;
    }

    const saveSettings = async () => {
      try {
        const settings = {
          fromLanguage,
          toLanguage,
          autoTranslate,
          saveToHistory,
        };
        console.log('💾 Saving settings:', {
          from: fromLanguage.name,
          to: toLanguage.name,
        });
        await storage.setItem('translation_settings', JSON.stringify(settings));
        console.log('✅ Settings saved successfully');
      } catch (error) {
        console.error('❌ Failed to save settings:', error);
      }
    };

    // Debounce saves by 300ms
    const timeoutId = setTimeout(() => {
      saveSettings();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [fromLanguage, toLanguage, autoTranslate, saveToHistory, storage, isLoaded]);

  const setFromLanguage = useCallback((language: Language) => {
    if (!language?.code?.trim() || !language?.name?.trim()) {
      console.warn('⚠️ Invalid language object:', language);
      return;
    }
    if (language.code.length > 10 || language.name.length > 100) {
      console.warn('⚠️ Language code or name too long:', language);
      return;
    }
    console.log('🌍 Setting FROM language:', language.name, '(', language.code, ')');
    setFromLanguageState(language);
  }, []);

  const setToLanguage = useCallback((language: Language) => {
    if (!language?.code?.trim() || !language?.name?.trim()) {
      console.warn('⚠️ Invalid language object:', language);
      return;
    }
    if (language.code.length > 10 || language.name.length > 100) {
      console.warn('⚠️ Language code or name too long:', language);
      return;
    }
    console.log('🌍 Setting TO language:', language.name, '(', language.code, ')');
    setToLanguageState(language);
  }, []);

  const addToHistory = useCallback((translation: Omit<TranslationHistory, 'id' | 'timestamp'>) => {
    if (!saveToHistory) return;
    if (!translation.originalText?.trim() || !translation.translatedText?.trim()) return;
    if (translation.originalText.length > 5000 || translation.translatedText.length > 5000) return;

    const newTranslation: TranslationHistory = {
      ...translation,
      originalText: translation.originalText.trim(),
      translatedText: translation.translatedText.trim(),
      id: Date.now().toString(),
      timestamp: Date.now(),
    };

    setHistory(prev => [newTranslation, ...prev].slice(0, 100));

    storage.setItem('translation_history', JSON.stringify([newTranslation, ...history].slice(0, 100)))
      .catch(console.error);
  }, [saveToHistory, history, storage]);

  const removeFromHistory = useCallback((id: string) => {
    if (!id?.trim()) return;
    const updatedHistory = history.filter(item => item.id !== id);
    setHistory(updatedHistory);
    storage.setItem('translation_history', JSON.stringify(updatedHistory)).catch(console.error);
  }, [history, storage]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    storage.removeItem('translation_history').catch(console.error);
  }, [storage]);

  const setAutoTranslate = useCallback((enabled: boolean) => {
    if (typeof enabled !== 'boolean') return;
    setAutoTranslateState(enabled);
  }, []);

  const setSaveToHistory = useCallback((enabled: boolean) => {
    if (typeof enabled !== 'boolean') return;
    setSaveToHistoryState(enabled);
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    if (!id?.trim()) return;
    const updatedHistory = history.map(item =>
      item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
    );
    setHistory(updatedHistory);
    storage.setItem('translation_history', JSON.stringify(updatedHistory)).catch(console.error);
  }, [history, storage]);

  const setCategory = useCallback((id: string, categoryId: string) => {
    if (!id?.trim()) return;
    const updatedHistory = history.map(item =>
      item.id === id ? { ...item, categoryId } : item
    );
    setHistory(updatedHistory);
    storage.setItem('translation_history', JSON.stringify(updatedHistory)).catch(console.error);
  }, [history, storage]);

  const getCachedTranslation = useCallback((text: string, fromLang: string, toLang: string): string | null => {
    if (!text?.trim() || !fromLang || !toLang) return null;

    const key = `${text.toLowerCase().trim()}_${fromLang}_${toLang}`;
    const cached = translationCache.find(item => item.key === key);

    if (cached) {
      // Check if cache is still fresh (less than 7 days old)
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      if (cached.timestamp > sevenDaysAgo) {
        return cached.translatedText;
      }
    }

    return null;
  }, [translationCache]);

  const addToCache = useCallback((text: string, translation: string, fromLang: string, toLang: string) => {
    if (!text?.trim() || !translation?.trim() || !fromLang || !toLang) return;
    if (text.length > 1000) return; // Don't cache very long texts

    const key = `${text.toLowerCase().trim()}_${fromLang}_${toLang}`;

    const newCacheItem: TranslationCache = {
      key,
      originalText: text.trim(),
      translatedText: translation.trim(),
      fromLanguage: fromLang,
      toLanguage: toLang,
      timestamp: Date.now(),
    };

    // Remove old cache entry if exists
    const updatedCache = translationCache.filter(item => item.key !== key);

    // Add new cache entry at the beginning and limit to 500 items
    const newCache = [newCacheItem, ...updatedCache].slice(0, 500);

    setTranslationCache(newCache);
    storage.setItem('translation_cache', JSON.stringify(newCache)).catch(console.error);
  }, [translationCache, storage]);

  const value = useMemo(() => ({
    fromLanguage,
    toLanguage,
    history,
    autoTranslate,
    saveToHistory,
    isOnline,
    translationCache,
    setFromLanguage,
    setToLanguage,
    addToHistory,
    removeFromHistory,
    clearHistory,
    setAutoTranslate,
    setSaveToHistory,
    toggleFavorite,
    setCategory,
    getCachedTranslation,
    addToCache,
  }), [
    fromLanguage,
    toLanguage,
    history,
    autoTranslate,
    saveToHistory,
    isOnline,
    translationCache,
    setFromLanguage,
    setToLanguage,
    addToHistory,
    removeFromHistory,
    clearHistory,
    setAutoTranslate,
    setSaveToHistory,
    toggleFavorite,
    setCategory,
    getCachedTranslation,
    addToCache,
  ]);

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslationStore() {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslationStore must be used within a TranslationProvider');
  }
  return context;
}