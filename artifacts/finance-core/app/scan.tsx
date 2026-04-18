import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Linking, Alert, Platform, ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { decodePixCode, isPixCode, extractNFeKey } from '@/utils/pixDecoder';
import { safeGet } from '@/utils/storage';

export default function ScanScreen() {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const handledRef = useRef(false);
  const [lastRaw, setLastRaw] = useState<string | null>(null);
  const [lastKind, setLastKind] = useState<'pix' | 'nfe' | 'unknown' | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  const handleBarcode = async (data: string) => {
    if (!data || handledRef.current || busy) return;
    handledRef.current = true;
    setBusy(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      // Pix BR Code
      if (isPixCode(data)) {
        const decoded = decodePixCode(data);
        if (decoded) {
          const lastAccountId = (await safeGet<string>('quickAdd:lastAccountId')) || '';
          const description = decoded.merchantName?.slice(0, 60) || 'Pagamento Pix';
          const notesParts: string[] = ['Pix recebido via QR'];
          if (decoded.merchantName) notesParts.push(`Beneficiário: ${decoded.merchantName}`);
          if (decoded.city) notesParts.push(`Cidade: ${decoded.city}`);
          if (decoded.key) notesParts.push(`Chave: ${decoded.key}`);
          if (decoded.txid) notesParts.push(`TxID: ${decoded.txid}`);

          router.replace({
            pathname: '/transaction/add',
            params: {
              type: 'expense',
              description,
              amount: decoded.amount ? decoded.amount.toFixed(2) : '',
              notes: notesParts.join('\n'),
              accountId: lastAccountId,
            },
          });
          return;
        }
      }

      // NFe key (44 digits)
      const nfe = extractNFeKey(data);
      if (nfe) {
        router.replace({
          pathname: '/transaction/add',
          params: {
            type: 'expense',
            notes: `Chave NFe: ${nfe}`,
          },
        });
        return;
      }

      // Unknown
      setLastRaw(data);
      setLastKind('unknown');
    } finally {
      setBusy(false);
      // allow retry after 1.5s
      setTimeout(() => { handledRef.current = false; }, 1500);
    }
  };

  if (!permission) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background, padding: 24 }]}>
        <Stack.Screen options={{ title: 'Escanear', headerShown: true }} />
        <Feather name="camera-off" size={48} color={theme.textTertiary} />
        <Text style={[styles.permTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
          Permissão da câmera necessária
        </Text>
        <Text style={[styles.permText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
          Para escanear códigos Pix e NFe, libere o acesso à câmera nas configurações do app.
        </Text>
        <Pressable
          onPress={async () => {
            const r = await requestPermission();
            if (!r.granted) {
              Alert.alert(
                'Permissão negada',
                'Abra as configurações do app para liberar a câmera.',
                [
                  { text: 'Cancelar' },
                  { text: 'Configurações', onPress: () => Linking.openSettings() },
                ],
              );
            }
          }}
          style={[styles.btn, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.btnText, { fontFamily: 'Inter_600SemiBold' }]}>Permitir câmera</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={(e) => handleBarcode(e.data)}
      />

      {/* Overlay */}
      <View pointerEvents="none" style={styles.overlay}>
        <View style={styles.overlayDim} />
        <View style={styles.overlayMiddle}>
          <View style={styles.overlayDim} />
          <View style={styles.frame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <View style={styles.overlayDim} />
        </View>
        <View style={[styles.overlayDim, { padding: 24, justifyContent: 'flex-end' }]}>
          <Text style={styles.tip}>Mire em um QR Code Pix ou NFe</Text>
        </View>
      </View>

      {/* Header buttons */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
          <Feather name="x" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.title}>Escanear código</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Unknown code panel */}
      {lastKind === 'unknown' && lastRaw && (
        <View style={[styles.unknownPanel, { paddingBottom: insets.bottom + 16 }]}>
          <Text style={styles.unknownTitle}>Código não reconhecido</Text>
          <Text numberOfLines={2} style={styles.unknownRaw}>{lastRaw}</Text>
          <View style={styles.unknownActions}>
            <Pressable
              onPress={async () => {
                await Clipboard.setStringAsync(lastRaw);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Copiado', 'Conteúdo copiado para a área de transferência.');
              }}
              style={[styles.btn, { backgroundColor: '#fff' }]}
            >
              <Feather name="copy" size={14} color="#000" />
              <Text style={[styles.btnText, { color: '#000', fontFamily: 'Inter_600SemiBold' }]}>Copiar</Text>
            </Pressable>
            <Pressable
              onPress={() => { setLastRaw(null); setLastKind(null); handledRef.current = false; }}
              style={[styles.btn, { backgroundColor: 'rgba(255,255,255,0.18)' }]}
            >
              <Feather name="refresh-cw" size={14} color="#fff" />
              <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>Tentar de novo</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const FRAME_SIZE = 260;

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  permTitle: { fontSize: 18, textAlign: 'center' },
  permText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12,
  },
  btnText: { color: '#000', fontSize: 14 },
  overlay: { ...StyleSheet.absoluteFillObject },
  overlayDim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  overlayMiddle: { flexDirection: 'row', height: FRAME_SIZE },
  frame: { width: FRAME_SIZE, height: FRAME_SIZE },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: '#fff' },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6 },
  tip: { color: '#fff', textAlign: 'center', fontSize: 13 },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingBottom: 8,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  title: { color: '#fff', fontSize: 15, fontWeight: Platform.OS === 'ios' ? '600' : 'bold' },
  unknownPanel: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)', padding: 16, gap: 10,
  },
  unknownTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  unknownRaw: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  unknownActions: { flexDirection: 'row', gap: 10 },
});
