import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, APP_LANGUAGES, AppLanguageCode } from '@/constants/translations';

interface LanguageContextType {
  appLanguage: AppLanguageCode;
  setAppLanguage: (lang: AppLanguageCode) => Promise<void>;
  t: (key: string) => string;
  availableLanguages: typeof APP_LANGUAGES;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'app_language';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [appLanguage, setAppLanguageState] = useState<AppLanguageCode>('en');
  const [isLoading, setIsLoading] = useState(true);

  // Load language on mount - only runs ONCE
  useEffect(() => {
    let isMounted = true;

    const loadLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);

        if (isMounted && saved && translations[saved as AppLanguageCode]) {
          setAppLanguageState(saved as AppLanguageCode);
          console.log('Language loaded from storage:', saved);
        }
      } catch (error) {
        console.error('Error loading language:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadLanguage();

    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - runs only once on mount

  // Change language and persist
  const setAppLanguage = useCallback(async (lang: AppLanguageCode) => {
    try {
      console.log('Changing language to:', lang);

      // Update state first for immediate UI update
      setAppLanguageState(lang);

      // Then persist to storage
      await AsyncStorage.setItem(STORAGE_KEY, lang);

      console.log('Language changed and saved successfully:', lang);
    } catch (error) {
      console.error('Error saving language:', error);
      // Revert on error
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved && translations[saved as AppLanguageCode]) {
        setAppLanguageState(saved as AppLanguageCode);
      }
    }
  }, []); // No dependencies - function is stable

  // Translation function
  const t = useCallback((key: string): string => {
    const langTranslations = translations[appLanguage] || translations.en;
    return (langTranslations as any)[key] || key;
  }, [appLanguage]);

  // Don't render children until language is loaded
  if (isLoading) {
    return null; // or a loading screen
  }

  return (
    <LanguageContext.Provider value={{
      appLanguage,
      setAppLanguage,
      t,
      availableLanguages: APP_LANGUAGES,
      isLoading,
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
