import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, Image, Languages, History, Sparkles, TrendingUp, Star, WifiOff } from 'lucide-react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useTranslationStore } from '@/providers/translation-provider';
import { useLanguage } from '@/providers/language-provider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TranslateScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const { fromLanguage, toLanguage, history, isOnline, translationCache } = useTranslationStore();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const recentTranslations = history.slice(0, 3);
  const favoriteTranslations = history.filter(t => t.isFavorite).slice(0, 3);

  // Log whenever languages change to verify reactivity
  useEffect(() => {
    console.log('🔄 TranslateScreen: Languages updated', {
      from: fromLanguage.name,
      to: toLanguage.name,
    });
  }, [fromLanguage, toLanguage]);

  const handleCameraTranslate = async () => {
    router.push('/camera');
  };

  const handlePhotoTranslate = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        console.log('Photo library permission is required to select images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
        base64: false, // We'll get base64 after editing
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;

        // Navigate to camera screen with the selected image for cropping
        router.push({
          pathname: '/camera',
          params: { fromGallery: 'true', imageUri }
        });
      }
    } catch (error) {
      console.error('Photo picker error:', error);
      console.log('Failed to select photo. Please try again.');
      setIsLoading(false);
    }
  };


  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={['#1e3a8a', '#3b82f6']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.title}>{t('appTitle')}</Text>
          <Text style={styles.subtitle}>{t('appSubtitle')}</Text>
        </View>
      </LinearGradient>

      {/* Offline Indicator */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <WifiOff color="#fbbf24" size={16} />
          <Text style={styles.offlineText}>
            Offline Mode - {translationCache.length} translations cached
          </Text>
        </View>
      )}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <TouchableOpacity
          style={styles.languageSelector}
          onPress={() => router.push('/language-selector')}
        >
          <View style={styles.languageText}>
            <View style={styles.languageItem}>
              <Text style={styles.languageFlag}>{fromLanguage.flag}</Text>
              <Text style={styles.languageFrom}>{fromLanguage.name}</Text>
            </View>
            <Text style={styles.languageArrow}>→</Text>
            <View style={styles.languageItem}>
              <Text style={styles.languageFlag}>{toLanguage.flag}</Text>
              <Text style={styles.languageTo}>{toLanguage.name}</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[styles.optionCard, styles.primaryCard]}
            onPress={handleCameraTranslate}
            disabled={isLoading}
          >
            <LinearGradient
              colors={['#1e3a8a', '#3b82f6']}
              style={styles.cardGradient}
            >
              <Camera color="#ffffff" size={32} />
              <Text style={styles.primaryCardTitle}>{t('camera')}</Text>
              <Text style={styles.primaryCardSubtitle}>
                {t('cameraSubtitle')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionCard, styles.secondaryCard]}
            onPress={handlePhotoTranslate}
            disabled={isLoading}
          >
            <Image color="#3b82f6" size={28} />
            <Text style={styles.secondaryCardTitle}>{t('uploadPhoto')}</Text>
            <Text style={styles.secondaryCardSubtitle}>
              {t('uploadPhotoSubtitle')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <TrendingUp color="#10b981" size={24} />
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{history.length}</Text>
              <Text style={styles.statLabel}>{t('translations')}</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Sparkles color="#fbbf24" size={24} />
            <View style={styles.statContent}>
              <Text style={styles.statValue}>AI</Text>
              <Text style={styles.statLabel}>{t('aiPowered')}</Text>
            </View>
          </View>
        </View>

        {/* Recent Translations */}
        {recentTranslations.length > 0 && (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <History color="#3b82f6" size={20} />
              <Text style={styles.recentTitle}>{t('recentTranslations')}</Text>
            </View>
            {recentTranslations.map((translation) => (
              <TouchableOpacity
                key={translation.id}
                style={styles.recentItem}
                onPress={() => {
                  // Could navigate to a detailed view
                }}
              >
                <View style={styles.recentTextContainer}>
                  <Text style={styles.recentOriginal} numberOfLines={1}>
                    {translation.originalText}
                  </Text>
                  <Text style={styles.recentTranslated} numberOfLines={1}>
                    {translation.translatedText}
                  </Text>
                </View>
                <Text style={styles.recentLanguages}>
                  {translation.fromLanguage} → {translation.toLanguage}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => router.push('/(tabs)/history')}
            >
              <Text style={styles.viewAllText}>{t('viewAllHistory')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Favorite Translations */}
        {favoriteTranslations.length > 0 && (
          <View style={styles.favoritesSection}>
            <View style={styles.favoritesHeader}>
              <Star color="#fbbf24" size={20} fill="#fbbf24" />
              <Text style={styles.favoritesTitle}>{t('favorites')}</Text>
            </View>
            {favoriteTranslations.map((translation) => (
              <TouchableOpacity
                key={translation.id}
                style={styles.favoriteItem}
                onPress={() => {
                  // Could navigate to a detailed view
                }}
              >
                <View style={styles.favoriteTextContainer}>
                  <Text style={styles.favoriteOriginal} numberOfLines={1}>
                    {translation.originalText}
                  </Text>
                  <Text style={styles.favoriteTranslated} numberOfLines={1}>
                    {translation.translatedText}
                  </Text>
                </View>
                <Star color="#fbbf24" size={16} fill="#fbbf24" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.featuresContainer}>
          <View style={styles.featuresHeader}>
            <Sparkles color="#fbbf24" size={20} />
            <Text style={styles.featuresTitle}>{t('aiFeatures')}</Text>
          </View>
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <View style={styles.featureDot} />
              <Text style={styles.featureText}>{t('contextAware')}</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureDot} />
              <Text style={styles.featureText}>{t('ocrCorrection')}</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureDot} />
              <Text style={styles.featureText}>{t('multipleAlternatives')}</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureDot} />
              <Text style={styles.featureText}>{t('languagesSupported')}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Loading Overlay */}
      {isLoading && (
        <Modal
          visible={isLoading}
          transparent
          animationType="fade"
        >
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContent}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Loading image...</Text>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#e2e8f0',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  languageText: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'space-between',
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languageFlag: {
    fontSize: 24,
  },
  languageFrom: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  languageArrow: {
    fontSize: 18,
    color: '#64748b',
    marginHorizontal: 12,
  },
  languageTo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  optionsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  optionCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  primaryCard: {
    height: 180,
  },
  secondaryCard: {
    backgroundColor: '#1e293b',
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardGradient: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 12,
    marginBottom: 8,
  },
  primaryCardSubtitle: {
    fontSize: 14,
    color: '#e2e8f0',
    textAlign: 'center',
    lineHeight: 20,
  },
  secondaryCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0',
    marginTop: 12,
    marginBottom: 8,
  },
  secondaryCardSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e2e8f0',
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#334155',
    marginHorizontal: 16,
  },
  recentSection: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  recentItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  recentTextContainer: {
    marginBottom: 6,
  },
  recentOriginal: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
  recentTranslated: {
    fontSize: 14,
    color: '#e2e8f0',
    fontWeight: '500',
  },
  recentLanguages: {
    fontSize: 12,
    color: '#64748b',
  },
  viewAllButton: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  favoritesSection: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  favoritesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  favoritesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  favoriteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  favoriteTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  favoriteOriginal: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
  favoriteTranslated: {
    fontSize: 14,
    color: '#e2e8f0',
    fontWeight: '500',
  },
  featuresContainer: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  featuresHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3b82f6',
    marginRight: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1b16',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#fbbf24',
  },
  offlineText: {
    fontSize: 14,
    color: '#fbbf24',
    fontWeight: '600',
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    backgroundColor: '#1e293b',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  loadingText: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
});