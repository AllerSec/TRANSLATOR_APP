import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Languages } from 'lucide-react-native';

export default function SplashScreen() {
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(30);
  const subtitleOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(20);
  const dot1Scale = useSharedValue(1);
  const dot2Scale = useSharedValue(1);
  const dot3Scale = useSharedValue(1);

  useEffect(() => {
    // Logo animation
    logoScale.value = withSpring(1, {
      damping: 10,
      stiffness: 100,
    });
    logoOpacity.value = withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });

    // Title animation
    titleOpacity.value = withDelay(
      300,
      withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      })
    );
    titleTranslateY.value = withDelay(
      300,
      withSpring(0, {
        damping: 12,
        stiffness: 90,
      })
    );

    // Subtitle animation
    subtitleOpacity.value = withDelay(
      600,
      withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      })
    );
    subtitleTranslateY.value = withDelay(
      600,
      withSpring(0, {
        damping: 12,
        stiffness: 90,
      })
    );

    // Dots animation (pulsing)
    dot1Scale.value = withDelay(
      900,
      withSequence(
        withTiming(1.3, { duration: 400 }),
        withTiming(1, { duration: 400 })
      )
    );
    dot2Scale.value = withDelay(
      1100,
      withSequence(
        withTiming(1.3, { duration: 400 }),
        withTiming(1, { duration: 400 })
      )
    );
    dot3Scale.value = withDelay(
      1300,
      withSequence(
        withTiming(1.3, { duration: 400 }),
        withTiming(1, { duration: 400 })
      )
    );

    // Navigate after animation
    const timeout = setTimeout(() => {
      router.replace('/(tabs)/translate');
    }, 2500);

    return () => clearTimeout(timeout);
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleTranslateY.value }],
  }));

  const dot1AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dot1Scale.value }],
  }));

  const dot2AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dot2Scale.value }],
  }));

  const dot3AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dot3Scale.value }],
  }));

  return (
    <LinearGradient
      colors={['#0f172a', '#1e3a8a', '#3b82f6']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <View style={styles.logoCircle}>
            <Languages color="#ffffff" size={80} strokeWidth={2} />
          </View>
        </Animated.View>

        <Animated.View style={titleAnimatedStyle}>
          <Text style={styles.title}>AI Translator</Text>
        </Animated.View>

        <Animated.View style={subtitleAnimatedStyle}>
          <Text style={styles.subtitle}>Powered by AI</Text>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <View style={styles.loadingDots}>
          <Animated.View style={[styles.dot, dot1AnimatedStyle]} />
          <Animated.View style={[styles.dot, dot2AnimatedStyle]} />
          <Animated.View style={[styles.dot, dot3AnimatedStyle]} />
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    marginBottom: 40,
  },
  logoCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  footer: {
    paddingBottom: 60,
    alignItems: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
});