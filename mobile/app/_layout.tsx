import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { ArticleReaderModal } from '@/components/ArticleReaderModal';
import { Colors, Fonts } from '@/constants/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  anchor: '(tabs)',
};

const queryClient = new QueryClient();

export default function RootLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const palette = Colors[colorScheme];

  const [showSplash, setShowSplash] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 420,
        useNativeDriver: true,
      }).start(() => {
        setShowSplash(false);
      });
    }, 1350);

    return () => clearTimeout(timer);
  }, [fadeAnim]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <View style={styles.rootContainer}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
          <ArticleReaderModal />

          {showSplash && (
            <Animated.View
              style={[
                styles.splashOverlay,
                {
                  backgroundColor: palette.background,
                  opacity: fadeAnim,
                },
              ]}
              pointerEvents="auto"
            >
              <View style={[styles.splashTopRule, { backgroundColor: palette.accent }]} />
              <Text style={[styles.splashEyebrow, { color: palette.accent }]}>
                AI EDITORIAL MAGAZINE & MARKET REPORT
              </Text>
              <Text style={[styles.splashTitle, { color: palette.text }]}>
                Headline Briefing
              </Text>
              <View style={[styles.splashBottomRule, { backgroundColor: palette.border }]} />
              <Text style={[styles.splashSubtitle, { color: palette.subtext }]}>
                세상의 흐름과 증시 모멘텀을 한눈에
              </Text>
            </Animated.View>
          )}
        </View>
        <StatusBar style="auto" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  splashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  splashTopRule: {
    width: 44,
    height: 3,
    borderRadius: 2,
    marginBottom: 16,
  },
  splashEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.2,
    marginBottom: 10,
  },
  splashTitle: {
    fontFamily: Fonts?.serif,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  splashBottomRule: {
    width: 120,
    height: 1,
    marginTop: 16,
    marginBottom: 14,
  },
  splashSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
});
