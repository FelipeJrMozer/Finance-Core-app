import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import * as Font from "expo-font";
import { useFonts } from "expo-font";
import { Feather } from "@expo/vector-icons";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FeatherFont = require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf");
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
        <Stack.Screen name="account/[id]" options={{ title: 'Conta' }} />
        <Stack.Screen name="account/add" options={{ title: 'Nova Conta', presentation: 'formSheet', sheetAllowedDetents: [0.8, 1], sheetGrabberVisible: true }} />
        <Stack.Screen name="investment/[id]" options={{ title: 'Ativo' }} />
        <Stack.Screen name="investment/add" options={{ title: 'Novo Ativo', presentation: 'formSheet', sheetAllowedDetents: [0.8, 1], sheetGrabberVisible: true }} />
        <Stack.Screen name="goal/[id]" options={{ title: 'Meta' }} />
        <Stack.Screen name="goal/add" options={{ title: 'Nova Meta', presentation: 'formSheet', sheetAllowedDetents: [0.75, 1], sheetGrabberVisible: true }} />
        <Stack.Screen name="card/[id]" options={{ title: 'Cartão de Crédito', headerBackTitle: 'Voltar' }} />
        <Stack.Screen name="card/add" options={{ title: 'Novo Cartão', presentation: 'formSheet', sheetAllowedDetents: [0.85, 1], sheetGrabberVisible: true }} />
        <Stack.Screen name="chat" options={{ title: 'Assistente IA', headerShown: true }} />
        <Stack.Screen name="wallets/index" options={{ title: 'Carteiras' }} />
        <Stack.Screen name="wallets/add" options={{ title: 'Carteira', presentation: 'formSheet', sheetAllowedDetents: [0.85, 1], sheetGrabberVisible: true }} />
        <Stack.Screen name="transfer" options={{ title: 'Transferir', presentation: 'formSheet', sheetAllowedDetents: [0.9, 1], sheetGrabberVisible: true }} />
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
    ...Feather.font,
    Feather: FeatherFont,
  });
  const [iconsReady, setIconsReady] = React.useState(false);

  useEffect(() => {
    let cancelled = false;
    Font.loadAsync({ Feather: FeatherFont })
      .catch((e) => console.warn("[fonts] Feather load failed", e))
      .finally(() => { if (!cancelled) setIconsReady(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && iconsReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, iconsReady]);

  if ((!fontsLoaded && !fontError) || !iconsReady) return null;

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
