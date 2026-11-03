import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { colors, fontSize, spacing } from '../../lib/theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    setError('');
    setLoading(true);

    const { error: authError } = await signIn(email.trim(), password);

    if (authError) {
      setError(authError);
    }

    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
      enabled={Platform.OS !== 'web'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          {Platform.OS === 'web' ? (
            // Web: the still gold shield (no video).
            <Image source={{ uri: '/fbf-shield-intro.jpg' }} style={styles.webPoster} resizeMode="cover" accessibilityLabel="Forged by Freedom" />
          ) : (
            <Image source={require('../../assets/fbf-shield.png')} style={styles.logo} resizeMode="contain" />
          )}
          <Text style={styles.subtitle}>Client Portal</Text>
          <View style={styles.partner} accessibilityRole="text" accessibilityLabel="Team Yarbro Partner and Trained Athlete">
            <View style={styles.partnerRule} />
            <Text style={styles.partnerText}>
              TEAM YARBRO PARTNER <Text style={styles.partnerDot}>·</Text> TRAINED ATHLETE
            </Text>
            <View style={styles.partnerRule} />
          </View>
        </View>

        <View style={styles.form}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            containerStyle={styles.inputContainer}
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            containerStyle={styles.inputContainer}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            style={styles.button}
          />

          <TouchableOpacity
            onPress={() => Linking.openURL('https://forgedbyfreedom.net/wp-login.php?action=lostpassword')}
            style={styles.forgotLink}
          >
            <Text style={styles.forgotText}>Forgot your password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Linking.openURL('https://forgedbyfreedom.net/programs/')}
            style={styles.createAccountLink}
          >
            <Text style={styles.createAccountText}>New client? <Text style={styles.createAccountHighlight}>Join here</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  webPoster: { width: '100%', maxWidth: 440, aspectRatio: 16 / 9, borderRadius: 16, marginBottom: spacing.sm },
  logo: {
    width: 230,
    height: 216,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  partner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  partnerRule: {
    flex: 1,
    maxWidth: 40,
    height: 1,
    backgroundColor: colors.borderAccent,
  },
  partnerText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: colors.accentText,
    textAlign: 'center',
  },
  partnerDot: {
    color: colors.textTertiary,
  },
  form: {
    gap: spacing.lg,
  },
  inputContainer: {
    marginBottom: spacing.sm,
  },
  error: {
    color: colors.red,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.md,
  },
  forgotLink: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  forgotText: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: '600',
  },
  createAccountLink: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  createAccountText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  createAccountHighlight: {
    color: colors.accent,
    fontWeight: '600',
  },
});
