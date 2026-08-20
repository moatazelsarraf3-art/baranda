// Polyfill for DOMException in Hermes (Safe ES5 Syntax)
if (typeof global.DOMException === "undefined") {
  const DOMExceptionPolyfill = function (this: any, message?: string, name?: string) {
    this.message = message || "";
    this.name = name || "DOMException";
  };
  DOMExceptionPolyfill.prototype = Object.create(Error.prototype);
  DOMExceptionPolyfill.prototype.constructor = DOMExceptionPolyfill;

  Object.defineProperty(globalThis, "DOMException", {
    value: DOMExceptionPolyfill,
    writable: true,
    configurable: true,
  });
}
import { useState, useCallback, useEffect } from "react";
import { Stack } from "expo-router";
import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { applyPersistedRTLAtStartup } from "../lib/hooks/useLanguage";
import { usePushNotifications } from "../lib/hooks/usePushNotifications";
import { ErrorBoundary } from "../components/shared/ErrorBoundary";

SplashScreen.preventAutoHideAsync().catch(() => {
  /* no-op if already hidden */
});

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  usePushNotifications();

  useEffect(() => {
    applyPersistedRTLAtStartup().finally(() => {
      setIsReady(true);
    });
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (isReady) {
      await SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="live" options={{ presentation: "fullScreenModal" }} />
              <Stack.Screen name="property/[id]" options={{ presentation: "modal" }} />
              <Stack.Screen name="seller/[id]" options={{ presentation: "modal" }} />
              <Stack.Screen name="chat" options={{ presentation: "modal" }} />
              <Stack.Screen name="publish" options={{ presentation: "modal" }} />
              <Stack.Screen name="coming-soon" options={{ presentation: "modal" }} />
              <Stack.Screen name="settings" options={{ presentation: "modal" }} />
              <Stack.Screen name="admin" />
              <Stack.Screen
                name="+not-found"
                options={{ headerShown: true, title: "Not Found" }}
              />
            </Stack>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}