import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { WalletProvider } from "@/context/WalletContext";
import { FinanceProvider } from "@/context/FinanceContext";
import { useNotifications } from "@/hooks/useNotifications";
import { useTransactionIntent } from "@/hooks/useTransactionIntent";
import { QuickTransactionModal } from "@/components/QuickTransactionModal";
import { HeaderActions } from "@/components/HeaderActions";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function NotificationGate() {
  useNotifications();
  return null;
}

function TransactionIntentGate() {
  const { intent, clearIntent } = useTransactionIntent();
  return (
    <QuickTransactionModal
      intent={intent}
      onDismiss={clearIntent}
    />
  );
}

function RootLayoutNav() {
  const { theme } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace("/(auth)/login");
      }
    }
  }, [isAuthenticated, isLoading]);

  return (
    <>
      <TransactionIntentGate />
      <Stack screenOptions={{
        headerBackTitle: "Voltar",
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.background },
      }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="transaction/[id]" options={{ title: 'Transação', presentation: 'formSheet', sheetAllowedDetents: [0.75, 1], sheetGrabberVisible: true }} />
        <Stack.Screen name="transaction/add" options={{ title: 'Nova Transação', presentation: 'formSheet', sheetAllowedDetents: [0.9, 1], sheetGrabberVisible: true }} />
        <Stack.Screen name="account/[id]" options={{ title: 'Conta', headerRight: () => <HeaderActions /> }} />
        <Stack.Screen name="account/add" options={{ title: 'Nova Conta', presentation: 'formSheet', sheetAllowedDetents: [0.8, 1], sheetGrabberVisible: true }} />
        <Stack.Screen name="investment/[id]" options={{ title: 'Ativo', headerRight: () => <HeaderActions /> }} />
        <Stack.Screen name="investment/add" options={{ title: 'Novo Ativo', presentation: 'formSheet', sheetAllowedDetents: [0.8, 1], sheetGrabberVisible: true }} />
        <Stack.Screen name="goal/[id]" options={{ title: 'Meta', headerRight: () => <HeaderActions /> }} />
        <Stack.Screen name="goal/add" options={{ title: 'Nova Meta', presentation: 'formSheet', sheetAllowedDetents: [0.75, 1], sheetGrabberVisible: true }} />
        <Stack.Screen name="card/[id]" options={{ title: 'Cartão de Crédito', headerBackTitle: 'Voltar', headerRight: () => <HeaderActions /> }} />
        <Stack.Screen name="card/add" options={{ title: 'Novo Cartão', presentation: 'formSheet', sheetAllowedDetents: [0.85, 1], sheetGrabberVisible: true }} />
        <Stack.Screen name="chat" options={{ title: 'Assistente IA', headerShown: true, headerRight: () => <HeaderActions /> }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              <WalletProvider>
                <FinanceProvider>
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <KeyboardProvider>
                      <NotificationGate />
                      <RootLayoutNav />
                    </KeyboardProvider>
                  </GestureHandlerRootView>
                </FinanceProvider>
              </WalletProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
