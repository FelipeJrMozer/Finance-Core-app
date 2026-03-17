import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Linking,
  Platform, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';

interface StepProps {
  number: number;
  title: string;
  description: string;
  action?: { label: string; onPress: () => void };
  done?: boolean;
}

function Step({ number, title, description, action, done }: StepProps) {
  const { theme, colors } = useTheme();
  return (
    <View style={[styles.step, { backgroundColor: theme.surface, borderColor: done ? colors.success : theme.border }]}>
      <View style={[styles.stepNum, {
        backgroundColor: done ? `${colors.success}20` : `${colors.primary}15`,
        borderColor: done ? colors.success : colors.primary,
      }]}>
        {done
          ? <Feather name="check" size={14} color={colors.success} />
          : <Text style={[styles.stepNumText, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>{number}</Text>
        }
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.stepTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>{title}</Text>
        <Text style={[styles.stepDesc, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>{description}</Text>
        {action && (
          <Pressable
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={action.onPress}
          >
            <Text style={[styles.actionText, { fontFamily: 'Inter_600SemiBold' }]}>{action.label}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function NotificationAccessScreen() {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [buildDone, setBuildDone] = useState(false);
  const [notifDone, setNotifDone] = useState(false);
  const [smsDone, setSmsDone] = useState(false);

  const openNotificationAccess = () => {
    if (Platform.OS === 'android') {
      Linking.openSettings().catch(() =>
        Alert.alert('Ação necessária', 'Abra: Configurações → Apps → Acesso especial → Acesso a notificações → Finance Core')
      );
    } else {
      Alert.alert(
        'iOS não suportado',
        'O iOS não permite que apps de terceiros leiam notificações de outros apps. Esta funcionalidade está disponível apenas no Android.'
      );
    }
  };

  const openSmsPermission = () => {
    if (Platform.OS === 'android') {
      Linking.openSettings().catch(() =>
        Alert.alert('Ação necessária', 'Abra: Configurações → Apps → Finance Core → Permissões → SMS')
      );
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
    >
      {/* Header banner */}
      <View style={[styles.heroBanner, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}25` }]}>
        <Feather name="bell" size={32} color={colors.primary} />
        <Text style={[styles.heroTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
          Detecção Automática de Transações
        </Text>
        <Text style={[styles.heroDesc, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
          Com o APK personalizado instalado, o Finance Core monitora notificações de todos os seus apps bancários e SMS em tempo real — sem precisar abrir o app.
        </Text>
      </View>

      {/* iOS warning */}
      {Platform.OS === 'ios' && (
        <View style={[styles.warnBanner, { backgroundColor: `${colors.warning}15`, borderColor: `${colors.warning}30` }]}>
          <Feather name="alert-triangle" size={16} color={colors.warning} />
          <Text style={[styles.warnText, { color: colors.warning, fontFamily: 'Inter_400Regular' }]}>
            O iOS não permite leitura de notificações de outros apps por razões de segurança. Esta funcionalidade é exclusiva do Android.
          </Text>
        </View>
      )}

      <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
        PASSO A PASSO PARA ATIVAR
      </Text>

      <Step
        number={1}
        title="Instale o APK personalizado"
        description="Para ler notificações de outros apps, o Finance Core precisa de um build personalizado (não o Expo Go). Você receberá um arquivo .apk para instalar diretamente no celular."
        done={buildDone}
        action={{
          label: buildDone ? '✓ APK instalado' : 'Já instalei o APK',
          onPress: () => setBuildDone(true),
        }}
      />

      <Step
        number={2}
        title="Ative o Acesso a Notificações"
        description="No Android: Configurações → Apps → Acesso especial de apps → Acesso a notificações → ative Finance Core. Isso permite ler qualquer notificação que aparecer na barra de status."
        done={notifDone}
        action={{
          label: Platform.OS === 'android' ? 'Abrir Configurações' : 'Passo para Android',
          onPress: () => {
            openNotificationAccess();
            setTimeout(() => setNotifDone(true), 3000);
          },
        }}
      />

      <Step
        number={3}
        title="Permita leitura de SMS"
        description="Vá em Configurações → Apps → Finance Core → Permissões → SMS e ative 'Ler mensagens'. Isso permite capturar alertas bancários por SMS."
        done={smsDone}
        action={{
          label: Platform.OS === 'android' ? 'Abrir Configurações' : 'Passo para Android',
          onPress: () => {
            openSmsPermission();
            setTimeout(() => setSmsDone(true), 3000);
          },
        }}
      />

      {/* How it works */}
      <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium', marginTop: 24 }]}>
        COMO FUNCIONA
      </Text>

      {[
        { icon: 'eye', title: 'Monitoramento contínuo', desc: 'O serviço em segundo plano verifica cada notificação recebida de qualquer app bancário instalado.' },
        { icon: 'dollar-sign', title: 'Detecção de valores', desc: 'Quando detecta padrões como "R$ 47,90", "compra aprovada", "PIX recebido" etc., dispara um alerta.' },
        { icon: 'bell', title: 'Notificação Finance Core', desc: 'Você recebe uma notificação do nosso app com o botão "Registrar Transação".' },
        { icon: 'zap', title: 'Formulário pré-preenchido', desc: 'Ao tocar na notificação, o app abre com valor, tipo e categoria já sugeridos pela IA.' },
        { icon: 'check-circle', title: 'Você confirma', desc: 'Revise os dados em segundos e confirme. A transação é registrada automaticamente.' },
      ].map((item, i) => (
        <View key={i} style={[styles.howItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.howIcon, { backgroundColor: `${colors.primary}15` }]}>
            <Feather name={item.icon as any} size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.howTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>{item.title}</Text>
            <Text style={[styles.howDesc, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>{item.desc}</Text>
          </View>
        </View>
      ))}

      {/* Banks */}
      <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium', marginTop: 24 }]}>
        APPS MONITORADOS AUTOMATICAMENTE
      </Text>
      <View style={[styles.banksGrid, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {[
          'Nubank', 'Itaú', 'Bradesco', 'Santander',
          'Banco do Brasil', 'Caixa', 'Inter', 'C6 Bank',
          'PicPay', 'Mercado Pago', 'PagSeguro', 'XP',
          'BTG Pactual', 'Sicredi', 'Stone', '+ qualquer SMS bancário',
        ].map((bank) => (
          <View key={bank} style={[styles.bankChip, { backgroundColor: `${colors.primary}10` }]}>
            <Text style={[styles.bankChipText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>{bank}</Text>
          </View>
        ))}
      </View>

      {/* Privacy note */}
      <View style={[styles.privacyBox, { backgroundColor: `${colors.success}10`, borderColor: `${colors.success}25` }]}>
        <Feather name="shield" size={16} color={colors.success} />
        <Text style={[styles.privacyText, { color: colors.success, fontFamily: 'Inter_400Regular' }]}>
          Privacidade: nenhum dado é enviado para servidores externos. Todo o processamento é feito localmente no seu celular.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heroBanner: { borderRadius: 14, borderWidth: 1, padding: 20, alignItems: 'center', marginBottom: 20, gap: 8 },
  heroTitle: { fontSize: 18, textAlign: 'center' },
  heroDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  warnBanner: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 16, alignItems: 'flex-start' },
  warnText: { flex: 1, fontSize: 13, lineHeight: 18 },
  sectionLabel: { fontSize: 11, letterSpacing: 0.5, marginBottom: 10 },
  step: { flexDirection: 'row', gap: 12, borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  stepNum: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  stepNumText: { fontSize: 13 },
  stepTitle: { fontSize: 15, marginBottom: 4 },
  stepDesc: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  actionBtn: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  actionText: { fontSize: 13, color: '#fff' },
  howItem: { flexDirection: 'row', gap: 12, borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 8 },
  howIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  howTitle: { fontSize: 14, marginBottom: 2 },
  howDesc: { fontSize: 13, lineHeight: 18 },
  banksGrid: { borderRadius: 12, borderWidth: 1, padding: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  bankChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  bankChipText: { fontSize: 12 },
  privacyBox: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'flex-start' },
  privacyText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
