import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { TranslationProvider } from "@/providers/translation-provider";
import { LanguageProvider } from "@/providers/language-provider";
import Toast from 'react-native-toast-message';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TranslationProvider>
          <Stack screenOptions={{ headerBackTitle: "Back" }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="camera"
              options={{
                headerShown: false,
                presentation: "fullScreenModal",
              }}
            />
            <Stack.Screen
              name="translate-result"
              options={{
                headerShown: false,
                presentation: "modal",
              }}
            />
            <Stack.Screen
              name="language-selector"
              options={{
                headerShown: false,
                presentation: "modal",
              }}
            />
            <Stack.Screen name="modal" options={{ presentation: "modal" }} />
          </Stack>
          <Toast />
        </TranslationProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}