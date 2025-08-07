import React from 'react';
import {
  View,
  Text,
  StatusBar,
  useColorScheme,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';

import * as particleConnect from '@particle-network/rn-connect';
import {ParticleProvider, useParticle} from './ParticleProvider';
import {WalletType} from '@particle-network/rn-connect';
import {
  LoginType,
  SocialLoginPrompt,
  SupportAuthType,
} from '@particle-network/rn-base';

// --- tiny theme ---
const useTheme = () => {
  const isDark = useColorScheme() === 'dark';
  const palette = {
    bg: isDark ? '#0B0F14' : '#F5F7FB',
    card: isDark ? '#131A22' : '#FFFFFF',
    cardBorder: isDark ? '#1F2937' : '#E5E7EB',
    text: isDark ? '#E5E7EB' : '#0B1220',
    textMuted: isDark ? '#9CA3AF' : '#4B5563',
    divider: isDark ? '#1F2937' : '#E5E7EB',

    primary: '#2F80ED',
    danger: '#E45858',
    secondary: isDark ? '#1F2937' : '#EEF2F7', // filled neutral
    ghostBorder: isDark ? '#374151' : '#D1D5DB',
    badgeBg: isDark ? '#0F766E' : '#DCFCE7',
    badgeText: isDark ? '#A7F3D0' : '#065F46',
  };
  return {isDark, palette};
};

const Button = ({
  title,
  onPress,
  disabled,
  variant = 'primary',
}: {
  title: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}) => {
  const {palette} = useTheme();

  const baseStyle = [
    styles.btn,
    variant === 'primary' && {
      backgroundColor: palette.primary,
      borderColor: palette.primary,
    },
    variant === 'secondary' && {
      backgroundColor: palette.secondary,
      borderColor: palette.cardBorder,
    },
    variant === 'danger' && {
      backgroundColor: palette.danger,
      borderColor: palette.danger,
    },
    variant === 'ghost' && {
      backgroundColor: 'transparent',
      borderColor: palette.ghostBorder,
    },
    disabled && styles.btn_disabled,
  ];

  const labelStyle = [
    styles.btn_label,
    (variant === 'primary' || variant === 'danger') && {color: '#FFFFFF'},
    variant === 'secondary' && {color: '#0B1220'},
    variant === 'ghost' && {color: palette.text},
    disabled && {opacity: 0.9},
  ];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({pressed}) => [
        baseStyle,
        pressed && !disabled && styles.btn_pressed,
      ]}>
      <Text style={labelStyle}>{title}</Text>
    </Pressable>
  );
};

const Row = ({label, value}: {label: string; value?: string | null}) => {
  const {palette} = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.row_label, {color: palette.textMuted}]}>
        {label}
      </Text>
      <Text style={[styles.row_value, {color: palette.text}]} numberOfLines={1}>
        {value || '—'}
      </Text>
    </View>
  );
};

function shorten(addr: string, head = 6, tail = 4) {
  if (!addr) {
    return '—';
  }
  if (addr.length <= head + tail) {
    return addr;
  }
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

const Content = () => {
  const {isDark, palette} = useTheme();
  const bg = {backgroundColor: palette.bg};

  const {
    connect,
    sendCode,
    signMessage,
    currentChain,
    switchToSubnet,
    switchToCChain,
    particleUserInfo,
    activeWalletType,
    activeAddress,
    isLoading,
  } = useParticle();

  // --- NEW: signature state ---
  const [lastSig, setLastSig] = React.useState<string | null>(null);
  const [sigErr, setSigErr] = React.useState<string | null>(null);

  // --- actions ---
  const onSendEmailCode = async () => {
    try {
      const ok = await sendCode('dev@example.com');
      console.log('Email code sent:', ok);
    } catch (e) {
      console.log('sendCode error:', e);
    }
  };

  const onLoginAuthCore = async () => {
    try {
      await connect(WalletType.AuthCore, {
        loginType: LoginType.Google,
        supportAuthType: [SupportAuthType.Google],
        socialLoginPrompt: SocialLoginPrompt.Consent,
      });
    } catch (e) {
      console.log('connect error:', e);
    }
  };

  const onLogout = async () => {
    const publicAddress = activeAddress;
    const walletType = activeWalletType!;
    if (publicAddress === undefined) {
      console.log('publicAddress is underfined, you need connect');
      return;
    }
    const result = await particleConnect.disconnect(walletType, publicAddress!);
    console.log('disconnect result:', result);
  };

  const onSign = async () => {
    try {
      setLastSig(null);
      setSigErr(null);
      if (activeAddress === null) {
        console.log('Connect first');
        return;
      }
      const sig = await signMessage('GM, Particle!');
      setLastSig(sig ?? null);
      console.log('Signature:', sig);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      setSigErr(msg);
      console.log('sign error:', e);
    }
  };

  return (
    <View style={[styles.screen, bg]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, {color: palette.text}]}>
          Particle RN Demo
        </Text>

        <View
          style={[
            styles.card,
            {backgroundColor: palette.card, borderColor: palette.cardBorder},
          ]}>
          <View style={styles.card_header}>
            <Text style={[styles.card_title, {color: palette.text}]}>
              Session
            </Text>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: palette.badgeBg,
                  borderColor: palette.cardBorder,
                },
              ]}>
              <Text style={[styles.badge_text, {color: palette.badgeText}]}>
                {currentChain?.name} #{currentChain?.id}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, {backgroundColor: palette.divider}]} />

          <Row
            label="Chain"
            value={`${currentChain?.name} (#${currentChain?.id})`}
          />
          <Row label="Wallet Type" value={activeWalletType ?? '—'} />
          <Row
            label="Address"
            value={activeAddress ? shorten(activeAddress) : '—'}
          />
          <Row label="User" value={particleUserInfo?.name ?? '—'} />
          <Row label="Email" value={particleUserInfo?.google_email ?? '—'} />
        </View>

        <View style={styles.actions}>
          {!activeAddress ? (
            <Button
              title="Log in with AuthCore (Google)"
              onPress={onLoginAuthCore}
              variant="primary"
              disabled={isLoading}
            />
          ) : (
            <Button
              title="Logout"
              onPress={onLogout}
              variant="danger"
              disabled={isLoading}
            />
          )}

          <Button
            title="Sign Message"
            onPress={onSign}
            variant="primary"
            disabled={!activeAddress || isLoading}
          />

          {/* --- NEW: signature output box --- */}
          {lastSig && (
            <View
              style={[
                styles.codeBox,
                // eslint-disable-next-line react-native/no-inline-styles
                {
                  backgroundColor: isDark ? '#0E141B' : '#F9FAFB',
                  borderColor: palette.cardBorder,
                },
              ]}>
              <Text style={[styles.codeTitle, {color: palette.textMuted}]}>
                Last signature
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Text
                  selectable
                  numberOfLines={1}
                  style={[styles.mono, {color: palette.text}]}>
                  {lastSig}
                </Text>
              </ScrollView>
            </View>
          )}

          {sigErr && (
            <Text style={[styles.errorText, {color: palette.danger}]}>
              Sign failed: {sigErr}
            </Text>
          )}

          <View style={styles.switchRow}>
            <Button
              title="Switch to Subnet"
              onPress={() => {
                switchToSubnet();
              }}
              variant="ghost"
              disabled={isLoading}
            />
            <Button
              title="Switch to Mainnet"
              onPress={() => {
                switchToCChain();
              }}
              variant="ghost"
              disabled={isLoading}
            />
          </View>

          {isLoading && (
            <View style={styles.loading}>
              <ActivityIndicator />
              <Text style={[styles.loading_text, {color: palette.textMuted}]}>
                Working…
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

function App(): React.JSX.Element {
  return (
    <ParticleProvider>
      <Content />
    </ParticleProvider>
  );
}

export default App;

// ---- styles ----
const styles = StyleSheet.create({
  screen: {flex: 1},
  container: {padding: 16, gap: 16},

  title: {fontSize: 22, fontWeight: '800', textAlign: 'center'},

  card: {
    borderRadius: 14,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    // subtle shadow (Android uses elevation)
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: {width: 0, height: 4},
    shadowRadius: 10,
    elevation: 2,
  },
  card_header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  card_title: {fontWeight: '700', fontSize: 16},
  divider: {height: 1, marginVertical: 8, borderRadius: 1},

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badge_text: {fontSize: 12, fontWeight: '700'},

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
  },
  row_label: {fontSize: 14},
  row_value: {flex: 1, textAlign: 'right', fontWeight: '700', fontSize: 14},

  actions: {gap: 12},

  btn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  btn_disabled: {opacity: 0.6},
  btn_pressed: {opacity: 0.9},
  btn_label: {fontWeight: '800'},

  switchRow: {flexDirection: 'row', gap: 12, justifyContent: 'space-between'},

  loading: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    alignSelf: 'center',
  },
  loading_text: {},

  // --- NEW styles for signature box ---
  mono: {
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
    fontSize: 12,
  },
  codeBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  codeTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  errorText: {
    textAlign: 'center',
    fontWeight: '600',
  },
});
