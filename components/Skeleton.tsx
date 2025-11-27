import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const Skeleton = ({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 1000 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(opacity.value, [0.3, 1], [0.3, 0.7]),
  }));

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius },
        animatedStyle,
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#334155',
  },
});

export const TranslationSkeleton = () => {
  return (
    <View style={styles.container}>
      {/* Image Skeleton */}
      <Skeleton height={200} borderRadius={16} style={{ marginBottom: 20 }} />

      {/* Detected Text Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Skeleton width={120} height={16} />
          <Skeleton width={40} height={40} borderRadius={8} />
        </View>
        <Skeleton height={16} style={{ marginBottom: 8 }} />
        <Skeleton height={16} width="80%" style={{ marginBottom: 8 }} />
        <Skeleton height={16} width="90%" />
      </View>

      {/* Translation Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Skeleton width={100} height={16} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Skeleton width={40} height={40} borderRadius={8} />
            <Skeleton width={40} height={40} borderRadius={8} />
          </View>
        </View>
        <Skeleton height={16} style={{ marginBottom: 8 }} />
        <Skeleton height={16} width="85%" style={{ marginBottom: 8 }} />
        <Skeleton height={16} width="75%" />
      </View>

      {/* AI Insights Button */}
      <Skeleton height={80} borderRadius={16} style={{ marginTop: 16 }} />
    </View>
  );
};

const cardStyles = StyleSheet.create({
  container: {
    padding: 20,
  },
  card: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
});

Object.assign(styles, cardStyles);

// Professional Loading Overlay Component
export const ProcessingOverlay = ({ visible }: { visible: boolean }) => {
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    if (visible) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 1500 }),
        -1,
        false
      );
      opacity.value = withRepeat(
        withTiming(1, { duration: 1000 }),
        -1,
        true
      );
    }
  }, [visible]);

  const animatedSpinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <View style={loadingStyles.overlay}>
      <View style={loadingStyles.container}>
        <Animated.View style={[loadingStyles.spinner, animatedSpinnerStyle]}>
          <View style={loadingStyles.spinnerRing} />
        </Animated.View>
        <View style={loadingStyles.textContainer}>
          <Text style={loadingStyles.title}>Processing Image</Text>
          <Animated.Text style={[loadingStyles.subtitle, animatedTextStyle]}>
            AI is analyzing your image...
          </Animated.Text>
        </View>
      </View>
    </View>
  );
};

const loadingStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 14, 39, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  container: {
    alignItems: 'center',
    gap: 24,
  },
  spinner: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#334155',
    borderTopColor: '#3b82f6',
    borderRightColor: '#3b82f6',
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
});
