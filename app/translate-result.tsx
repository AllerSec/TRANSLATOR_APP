import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { X, Copy, RotateCcw, Languages, ChevronDown, Sparkles, AlertCircle, CheckCircle, Edit, Check, Volume2 } from 'lucide-react-native';
import * as Speech from 'expo-speech';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslationStore, Language } from '@/providers/translation-provider';
import { useLanguage } from '@/providers/language-provider';
import { SUPPORTED_LANGUAGES } from '@/constants/languages';
import * as Clipboard from 'expo-clipboard';
import { Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import { TranslationSkeleton, ProcessingOverlay } from '@/components/Skeleton';

export default function TranslateResultScreen() {
  const { imageUri, base64 } = useLocalSearchParams<{ imageUri: string; base64: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);
  const [detectedText, setDetectedText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [error, setError] = useState('');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // AI Features
  const [contextInfo, setContextInfo] = useState<{
    type: string;
    icon: string;
    tone: string;
  } | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<number>(0);
  const [translationConfidence, setTranslationConfidence] = useState<number>(0);
  const [corrections, setCorrections] = useState<{original: string; corrected: string}[]>([]);
  const [translationAlternatives, setTranslationAlternatives] = useState<{
    label: string;
    text: string;
    description: string;
  }[]>([]);
  const [showAIInsights, setShowAIInsights] = useState(false);

  const { fromLanguage, toLanguage, addToHistory } = useTranslationStore();
  const { t } = useLanguage();
  const [currentToLanguage, setCurrentToLanguage] = useState<Language>(toLanguage);

  // Sync currentToLanguage with context when it changes (important for when user changes language before taking photo)
  useEffect(() => {
    console.log('🔄 translate-result: Syncing toLanguage from context:', toLanguage.name);
    setCurrentToLanguage(toLanguage);
  }, [toLanguage]);

  useEffect(() => {
    console.log('🖼️ translate-result: Processing image with languages:', {
      from: fromLanguage.name,
      to: currentToLanguage.name,
    });
    if (base64) {
      processImage();
    }
  }, [base64]);

  const processImage = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Optimize base64 image if it's too large
      let optimizedBase64 = base64;
      if (base64 && base64.length > 500000) { // If larger than ~500KB
        try {
          const ImageManipulator = await import('expo-image-manipulator');
          const manipulated = await ImageManipulator.manipulateAsync(
            imageUri,
            [{ resize: { width: 800 } }], // Further reduce to 800px for very large images
            { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
          );
          optimizedBase64 = manipulated.base64 || base64;
        } catch (error) {
          console.log('Additional optimization failed:', error);
        }
      }

      // Step 1: Enhanced OCR with context detection and error correction
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const ocrResponse = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analyze this image and extract the text. Return a JSON object with this structure:
{
  "text": "the extracted text",
  "corrected_text": "corrected version if there are obvious OCR errors, otherwise same as text",
  "confidence": 85,
  "context_type": "menu|document|chat|sign|technical|business|casual|other",
  "context_icon": "🍽️|📄|💬|🪧|💻|💼|😊|📝",
  "tone": "formal|informal|technical|casual",
  "has_corrections": false,
  "corrections": []
}

If corrections were made, include them in "corrections" as array of {"original": "wrng", "corrected": "wrong"}.
If no text found, return {"text": "NO_TEXT_FOUND", "confidence": 0}`,
                },
                {
                  type: 'image',
                  image: optimizedBase64,
                },
              ],
            },
          ],
        }),
      });

      clearTimeout(timeout);

      if (!ocrResponse.ok) {
        throw new Error('Failed to extract text from image');
      }

      const ocrData = await ocrResponse.json();
      let ocrResult;

      try {
        // Try to parse JSON response
        const jsonMatch = ocrData.completion.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          ocrResult = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback to simple text extraction
          ocrResult = {
            text: ocrData.completion.trim(),
            corrected_text: ocrData.completion.trim(),
            confidence: 75,
            context_type: 'other',
            context_icon: '📝',
            tone: 'casual',
            has_corrections: false,
            corrections: []
          };
        }
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        // Fallback
        ocrResult = {
          text: ocrData.completion.trim(),
          corrected_text: ocrData.completion.trim(),
          confidence: 75,
          context_type: 'other',
          context_icon: '📝',
          tone: 'casual',
          has_corrections: false,
          corrections: []
        };
      }

      const extractedText = ocrResult.corrected_text || ocrResult.text;

      if (!extractedText || extractedText === 'NO_TEXT_FOUND' || extractedText.length < 2) {
        setError('No readable text was detected in the image. Please try with a clearer image.');
        return;
      }

      // Set AI analysis data
      setDetectedText(extractedText);
      setOcrConfidence(ocrResult.confidence || 75);
      setContextInfo({
        type: ocrResult.context_type || 'other',
        icon: ocrResult.context_icon || '📝',
        tone: ocrResult.tone || 'casual'
      });

      if (ocrResult.has_corrections && ocrResult.corrections && ocrResult.corrections.length > 0) {
        setCorrections(ocrResult.corrections);
      }

      // Step 2: Enhanced translation with alternatives
      const translateController = new AbortController();
      const translateTimeout = setTimeout(() => translateController.abort(), 60000);

      const translateResponse = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: translateController.signal,
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Translate the following text from ${fromLanguage.name} to ${currentToLanguage.name}.

Return a JSON object with this structure:
{
  "primary": "most natural translation",
  "alternatives": [
    {"label": "Formal", "text": "formal version", "description": "Professional/formal register"},
    {"label": "Literal", "text": "word-by-word translation", "description": "Direct translation"}
  ],
  "confidence": 90,
  "explanation": "Brief explanation of translation choices if relevant"
}

Text to translate:
${extractedText}`,
            },
          ],
        }),
      });

      clearTimeout(translateTimeout);

      if (!translateResponse.ok) {
        throw new Error('Translation failed');
      }

      const translateData = await translateResponse.json();
      let translateResult;

      try {
        const jsonMatch = translateData.completion.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          translateResult = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback to simple translation
          translateResult = {
            primary: translateData.completion.trim(),
            alternatives: [],
            confidence: 85,
            explanation: ''
          };
        }
      } catch (parseError) {
        console.error('Translation JSON parse error:', parseError);
        translateResult = {
          primary: translateData.completion.trim(),
          alternatives: [],
          confidence: 85,
          explanation: ''
        };
      }

      const translation = translateResult.primary;
      setTranslatedText(translation);
      setTranslationConfidence(translateResult.confidence || 85);

      if (translateResult.alternatives && translateResult.alternatives.length > 0) {
        setTranslationAlternatives(translateResult.alternatives);
      }

      // Add to history
      addToHistory({
        originalText: extractedText,
        translatedText: translation,
        fromLanguage: fromLanguage.name,
        toLanguage: currentToLanguage.name,
      });

    } catch (error) {
      console.error('Translation error:', error);
      setError('Failed to process the image. Please check your internet connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Toast.show({
        type: 'success',
        text1: t('copied'),
        text2: t('textCopiedToClipboard'),
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


  const handleSpeak = async (text: string, language: string) => {
    try {
      console.log('🔊 Attempting to speak:', text.substring(0, 50), 'Language:', language);

      if (isSpeaking) {
        console.log('⏸️ Stopping speech');
        await Speech.stop();
        setIsSpeaking(false);
        return;
      }

      setIsSpeaking(true);

      // Import Audio to set audio mode
      const { Audio } = await import('expo-av');
      console.log('📱 Setting audio mode for speaker');

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
        'Chinese (Simplified)': 'zh',
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
        'Čeština': 'cs',
        'Deutsch': 'de',
        'Español': 'es',
        'Français': 'fr',
      };

      const languageCode = languageCodeMap[language] || 'en';
      console.log('🌍 Using language code:', languageCode);

      // Check if Speech is available
      const available = await Speech.isSpeakingAsync();
      console.log('🎤 Speech API available:', !available);

      await Speech.speak(text, {
        language: languageCode,
        pitch: 1.0,
        rate: 0.9,
        onStart: () => {
          console.log('▶️ Speech started');
        },
        onDone: () => {
          console.log('✅ Speech done');
          setIsSpeaking(false);
        },
        onStopped: () => {
          console.log('⏹️ Speech stopped');
          setIsSpeaking(false);
        },
        onError: (error) => {
          console.error('❌ Speech error:', error);
          setIsSpeaking(false);
          Toast.show({
            type: 'error',
            text1: t('error'),
            text2: t('failedToPlayAudio'),
            position: 'bottom',
          });
        },
      });

      console.log('🎵 Speech.speak called successfully');
    } catch (error) {
      console.error('💥 Speech error:', error);
      setIsSpeaking(false);
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('textToSpeechNotAvailable'),
        position: 'bottom',
      });
    }
  };

  const handleEditText = () => {
    setEditedText(detectedText);
    setIsEditingText(true);
  };

  const handleCancelEdit = () => {
    setIsEditingText(false);
    setEditedText('');
  };

  const handleSaveAndRetranslate = async () => {
    if (!editedText.trim()) return;

    setIsEditingText(false);
    setDetectedText(editedText);
    setIsTranslating(true);
    setTranslatedText('');

    try {
      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Translate the following text from ${fromLanguage.name} to ${toLanguage.name}. Return a JSON with: {"translation": "the translated text", "alternatives": [{"label": "Formal", "text": "formal version", "description": "why"}, {"label": "Casual", "text": "casual version", "description": "why"}], "confidence": 90}. The translation:\n\n${editedText}`,
          }],
        }),
      });

      const data = await response.json();
      let translation = editedText;

      if (data.response) {
        const jsonMatch = data.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          translation = result.translation || editedText;
          setTranslationConfidence(result.confidence || 85);
          if (result.alternatives && Array.isArray(result.alternatives)) {
            setTranslationAlternatives(result.alternatives);
          }
        } else {
          translation = data.response.trim();
        }
      }

      setTranslatedText(translation);

      // Add to history
      addToHistory({
        originalText: editedText,
        translatedText: translation,
        fromLanguage: fromLanguage.name,
        toLanguage: toLanguage.name,
      });
    } catch (error) {
      console.error('Translation error:', error);
      setError('Failed to translate text');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleRetry = () => {
    processImage();
  };

  const handleLanguageChange = async (newLanguage: Language) => {
    try {
      setIsTranslating(true);
      setShowLanguageModal(false);
      setCurrentToLanguage(newLanguage);

      // Translate the already detected text to the new language with alternatives
      const translateResponse = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Translate the following text from ${fromLanguage.name} to ${newLanguage.name}.

Return a JSON object with this structure:
{
  "primary": "most natural translation",
  "alternatives": [
    {"label": "Formal", "text": "formal version", "description": "Professional/formal register"},
    {"label": "Literal", "text": "word-by-word translation", "description": "Direct translation"}
  ],
  "confidence": 90,
  "explanation": "Brief explanation of translation choices if relevant"
}

Text to translate:
${detectedText}`,
            },
          ],
        }),
      });

      if (!translateResponse.ok) {
        throw new Error('Translation failed');
      }

      const translateData = await translateResponse.json();
      let translateResult;

      try {
        const jsonMatch = translateData.completion.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          translateResult = JSON.parse(jsonMatch[0]);
        } else {
          translateResult = {
            primary: translateData.completion.trim(),
            alternatives: [],
            confidence: 85,
            explanation: ''
          };
        }
      } catch (parseError) {
        console.error('Translation JSON parse error:', parseError);
        translateResult = {
          primary: translateData.completion.trim(),
          alternatives: [],
          confidence: 85,
          explanation: ''
        };
      }

      const translation = translateResult.primary;
      setTranslatedText(translation);
      setTranslationConfidence(translateResult.confidence || 85);

      if (translateResult.alternatives && translateResult.alternatives.length > 0) {
        setTranslationAlternatives(translateResult.alternatives);
      } else {
        setTranslationAlternatives([]);
      }

      // Add to history
      addToHistory({
        originalText: detectedText,
        translatedText: translation,
        fromLanguage: fromLanguage.name,
        toLanguage: newLanguage.name,
      });

    } catch (error) {
      console.error('Translation error:', error);
      Toast.show({
        type: 'error',
        text1: t('translationError'),
        text2: t('failedToTranslate'),
        position: 'bottom',
      });
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => {
          // Clear the navigation stack and go back to main screen
          router.dismissAll();
          router.replace('/(tabs)/translate');
        }}>
          <X color="#e2e8f0" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('translationResult')}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image Preview */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            contentFit="contain"
          />
        </View>

        {/* Language Indicator */}
        <TouchableOpacity
          style={styles.languageIndicator}
          onPress={() => setShowLanguageModal(true)}
          disabled={isLoading || isTranslating}
        >
          <Text style={styles.languageText}>
            {fromLanguage.name} → {currentToLanguage.name}
          </Text>
          <ChevronDown color="#ffffff" size={20} style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        {/* Loading State */}
        {isLoading && <TranslationSkeleton />}

        {/* Error State */}
        {error && !isLoading && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>{t('processingFailed')}</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <RotateCcw color="#3b82f6" size={20} />
              <Text style={styles.retryButtonText}>{t('tryAgain')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Results */}
        {!isLoading && !error && detectedText && (
          <View style={styles.resultsContainer}>
            {/* Detected Text */}
            <Animated.View
              entering={FadeInUp.duration(600).delay(100)}
              style={styles.textCard}
            >
              <View style={styles.textHeader}>
                <Text style={styles.textLabel}>{t('detectedText')}</Text>
                <View style={styles.actionButtons}>
                  {!isEditingText ? (
                    <>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleEditText}
                      >
                        <Edit color="#6366f1" size={18} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleCopy(detectedText)}
                      >
                        <Copy color="#6366f1" size={18} />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleCancelEdit}
                      >
                        <X color="#ef4444" size={18} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.saveButton]}
                        onPress={handleSaveAndRetranslate}
                      >
                        <Check color="#10b981" size={18} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
              {isEditingText ? (
                <TextInput
                  style={styles.detectedTextInput}
                  value={editedText}
                  onChangeText={setEditedText}
                  multiline
                  autoFocus
                  placeholder={t('editDetectedText')}
                  placeholderTextColor="#64748b"
                />
              ) : (
                <Text style={styles.detectedText}>{detectedText}</Text>
              )}
              {isEditingText && (
                <Text style={styles.editHint}>
                  Edit the text and tap ✓ to retranslate
                </Text>
              )}
            </Animated.View>

            {/* Translated Text */}
            {translatedText && (
              <Animated.View
                entering={FadeInUp.duration(600).delay(200)}
                style={styles.textCard}
              >
                <View style={styles.textHeader}>
                  <Text style={styles.textLabel}>{t('translation')}</Text>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleSpeak(translatedText, currentToLanguage.name)}
                    >
                      <Volume2 color={isSpeaking ? "#10b981" : "#3b82f6"} size={18} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleCopy(translatedText)}
                    >
                      <Copy color="#3b82f6" size={18} />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.translatedText}>{translatedText}</Text>

                {/* Confidence Indicators */}
                <View style={styles.confidenceContainer}>
                  <View style={styles.confidenceItem}>
                    <Text style={styles.confidenceLabel}>{t('ocrQuality')}</Text>
                    <View style={styles.confidenceBar}>
                      <View style={[styles.confidenceFill, { width: `${ocrConfidence}%`, backgroundColor: ocrConfidence > 80 ? '#10b981' : ocrConfidence > 60 ? '#fbbf24' : '#ef4444' }]} />
                    </View>
                    <Text style={styles.confidenceValue}>{ocrConfidence}%</Text>
                  </View>
                  <View style={styles.confidenceItem}>
                    <Text style={styles.confidenceLabel}>{t('translationQuality')}</Text>
                    <View style={styles.confidenceBar}>
                      <View style={[styles.confidenceFill, { width: `${translationConfidence}%`, backgroundColor: translationConfidence > 80 ? '#10b981' : translationConfidence > 60 ? '#fbbf24' : '#ef4444' }]} />
                    </View>
                    <Text style={styles.confidenceValue}>{translationConfidence}%</Text>
                  </View>
                </View>
              </Animated.View>
            )}

            {/* AI Insights Button */}
            {translatedText && (
              <Animated.View entering={FadeInUp.duration(600).delay(300)}>
                <TouchableOpacity
                  style={styles.aiInsightsButton}
                  onPress={() => setShowAIInsights(true)}
                >
                  <Sparkles color="#fbbf24" size={20} />
                  <Text style={styles.aiInsightsButtonText}>{t('aiInsights')}</Text>
                  <Text style={styles.aiInsightsSubtext}>
                    {t('viewAlternatives')}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* AI Context Detection - Now below translation */}
            {contextInfo && (
              <Animated.View
                entering={FadeInUp.duration(600).delay(400)}
                style={[styles.contextBadge, { marginTop: 16 }]}
              >
                <Text style={styles.contextIcon}>{contextInfo.icon}</Text>
                <View style={styles.contextTextContainer}>
                  <Text style={styles.contextType}>
                    {contextInfo.type.charAt(0).toUpperCase() + contextInfo.type.slice(1)}
                  </Text>
                  <Text style={styles.contextTone}>
                    {contextInfo.tone} tone
                  </Text>
                </View>
                <View style={styles.aiPoweredBadge}>
                  <Sparkles color="#fbbf24" size={14} />
                  <Text style={styles.aiPoweredText}>AI</Text>
                </View>
              </Animated.View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('selectTargetLanguage')}</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <X color="#94a3b8" size={24} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={SUPPORTED_LANGUAGES.filter(lang => lang.code !== 'auto')}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.languageOption,
                    currentToLanguage.code === item.code && styles.selectedLanguageOption,
                  ]}
                  onPress={() => handleLanguageChange(item)}
                >
                  <Text style={styles.languageFlag}>{item.flag}</Text>
                  <View style={styles.languageInfo}>
                    <Text style={styles.languageOptionText}>{item.name}</Text>
                    <Text style={styles.languageNative}>{item.nativeName}</Text>
                  </View>
                  {currentToLanguage.code === item.code && (
                    <View style={styles.selectedIndicator} />
                  )}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {/* Re-translating Indicator */}
      {isTranslating && (
        <View style={styles.translatingOverlay}>
          <View style={styles.translatingContent}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.translatingText}>{t('translatingTo')} {currentToLanguage.name}...</Text>
          </View>
        </View>
      )}

      {/* AI Insights Modal */}
      <Modal
        visible={showAIInsights}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAIInsights(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View style={styles.aiModalTitleContainer}>
                <Sparkles color="#fbbf24" size={24} />
                <Text style={styles.modalTitle}>{t('aiInsights')}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAIInsights(false)}>
                <X color="#94a3b8" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Context Info */}
              {contextInfo && (
                <View style={styles.insightSection}>
                  <Text style={styles.insightSectionTitle}>📊 {t('contextAnalysis')}</Text>
                  <View style={styles.insightCard}>
                    <View style={styles.insightRow}>
                      <Text style={styles.insightLabel}>{t('type')}:</Text>
                      <Text style={styles.insightValue}>
                        {contextInfo.icon} {contextInfo.type}
                      </Text>
                    </View>
                    <View style={styles.insightRow}>
                      <Text style={styles.insightLabel}>{t('tone')}:</Text>
                      <Text style={styles.insightValue}>{contextInfo.tone}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Confidence Scores */}
              <View style={styles.insightSection}>
                <Text style={styles.insightSectionTitle}>🎯 {t('qualityScores')}</Text>
                <View style={styles.insightCard}>
                  <View style={styles.insightRow}>
                    <Text style={styles.insightLabel}>{t('ocrAccuracy')}:</Text>
                    <Text style={[styles.insightValue, { color: ocrConfidence > 80 ? '#10b981' : ocrConfidence > 60 ? '#fbbf24' : '#ef4444' }]}>
                      {ocrConfidence}%
                    </Text>
                  </View>
                  <View style={styles.insightRow}>
                    <Text style={styles.insightLabel}>{t('translationQuality')}:</Text>
                    <Text style={[styles.insightValue, { color: translationConfidence > 80 ? '#10b981' : translationConfidence > 60 ? '#fbbf24' : '#ef4444' }]}>
                      {translationConfidence}%
                    </Text>
                  </View>
                  {(ocrConfidence < 80 || translationConfidence < 80) && (
                    <View style={styles.warningBox}>
                      <AlertCircle color="#fbbf24" size={16} />
                      <Text style={styles.warningText}>
                        Lower confidence - consider retaking photo or manual review
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Translation Alternatives */}
              {translationAlternatives.length > 0 && (
                <View style={styles.insightSection}>
                  <Text style={styles.insightSectionTitle}>🔄 Alternative Translations</Text>
                  {translationAlternatives.map((alt, index) => (
                    <View key={index} style={styles.alternativeCard}>
                      <View style={styles.alternativeHeader}>
                        <Text style={styles.alternativeLabel}>{alt.label}</Text>
                        <TouchableOpacity
                          style={styles.useAlternativeButton}
                          onPress={() => {
                            setTranslatedText(alt.text);
                            setShowAIInsights(false);
                          }}
                        >
                          <Text style={styles.useAlternativeText}>Use</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.alternativeText}>{alt.text}</Text>
                      <Text style={styles.alternativeDescription}>{alt.description}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Corrections Made */}
              {corrections.length > 0 && (
                <View style={styles.insightSection}>
                  <Text style={styles.insightSectionTitle}>✨ Smart Corrections</Text>
                  <View style={styles.insightCard}>
                    {corrections.map((correction, index) => (
                      <View key={index} style={styles.correctionInsightItem}>
                        <Text style={styles.correctionInsightOriginal}>{correction.original}</Text>
                        <Text style={styles.correctionInsightArrow}>→</Text>
                        <Text style={styles.correctionInsightCorrected}>{correction.corrected}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Professional Processing Overlay */}
      <ProcessingOverlay visible={isLoading} />
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 16,
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  imageContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  languageIndicator: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  languageText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 16,
  },
  errorContainer: {
    backgroundColor: '#1e293b',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  resultsContainer: {
    gap: 16,
    paddingBottom: 20,
  },
  textCard: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  textHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  textLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  saveButton: {
    backgroundColor: '#064e3b',
  },
  detectedText: {
    fontSize: 16,
    color: '#e2e8f0',
    lineHeight: 24,
  },
  detectedTextInput: {
    fontSize: 16,
    color: '#e2e8f0',
    lineHeight: 24,
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  editHint: {
    fontSize: 12,
    color: '#3b82f6',
    marginTop: 8,
    fontStyle: 'italic',
  },
  translatedText: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '500',
    lineHeight: 24,
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
  translatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  translatingContent: {
    backgroundColor: '#1e293b',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  translatingText: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  // AI Features Styles
  contextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  contextIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  contextTextContainer: {
    flex: 1,
  },
  contextType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 2,
  },
  contextTone: {
    fontSize: 14,
    color: '#94a3b8',
  },
  aiPoweredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1b16',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  aiPoweredText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fbbf24',
  },
  confidenceContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 12,
  },
  confidenceItem: {
    gap: 4,
  },
  confidenceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 4,
  },
  confidenceBar: {
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 3,
  },
  confidenceValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e2e8f0',
    marginTop: 4,
  },
  aiInsightsButton: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  aiInsightsButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fbbf24',
    marginTop: 8,
  },
  aiInsightsSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  aiModalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  insightSection: {
    marginBottom: 24,
  },
  insightSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 12,
  },
  insightCard: {
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  insightLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  insightValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1b16',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#fbbf24',
    flex: 1,
  },
  alternativeCard: {
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  alternativeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alternativeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3b82f6',
  },
  useAlternativeButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  useAlternativeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  alternativeText: {
    fontSize: 16,
    color: '#e2e8f0',
    marginBottom: 8,
    lineHeight: 22,
  },
  alternativeDescription: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  correctionInsightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 8,
    flexWrap: 'wrap',
  },
  correctionInsightOriginal: {
    fontSize: 14,
    color: '#ef4444',
    textDecorationLine: 'line-through',
    flexShrink: 1,
  },
  correctionInsightArrow: {
    fontSize: 14,
    color: '#94a3b8',
  },
  correctionInsightCorrected: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
    flexShrink: 1,
  },
});