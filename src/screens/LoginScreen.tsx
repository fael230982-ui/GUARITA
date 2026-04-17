import { useEffect, useRef, useState } from "react";
import { Alert, Image, Keyboard, KeyboardAvoidingView, KeyboardEvent, Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import { apiClient } from "../api/client";
import { branding } from "../branding/config";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { colors } from "../theme";
import { AuthSession } from "../types";
import { isValidEmail } from "../utils/display";
import { canAccessGuardApp, setPermissionsMatrix } from "../utils/permissions";
import { loadLastEmail, loadPermissionsMatrixCache, saveLastEmail, savePermissionsMatrixCache } from "../utils/storage";

type Props = {
  onLogin: (session: AuthSession) => void;
};

export function LoginScreen({ onLogin }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [autofilledEmail, setAutofilledEmail] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const emailInvalid = Boolean(email.trim() && !isValidEmail(email.trim()));
  const canSubmit = Boolean(email.trim() && password && !emailInvalid);

  useEffect(() => {
    async function hydrateLastEmail() {
      const lastEmail = await loadLastEmail();
      if (lastEmail) {
        setEmail(lastEmail);
        setAutofilledEmail(true);
      }
    }

    void hydrateLastEmail();
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, (event: KeyboardEvent) => {
      setKeyboardInset(Math.max(event.endCoordinates.height - 28, 0));
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      if (focusTimerRef.current) {
        clearTimeout(focusTimerRef.current);
      }
    };
  }, []);

  function scrollAfterKeyboard() {
    if (focusTimerRef.current) {
      clearTimeout(focusTimerRef.current);
    }

    focusTimerRef.current = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 120, animated: true });
    }, Platform.OS === "ios" ? 180 : 260);
  }

  async function submit() {
    setSubmitAttempted(true);

    if (!email || !password) {
      Alert.alert("Login", "Informe e-mail e senha.");
      return;
    }

    if (emailInvalid) {
      Alert.alert("Login", "Confira o e-mail antes de entrar.");
      return;
    }

    try {
      setLoading(true);
      const session = await apiClient.login(email.trim().toLowerCase(), password);
      apiClient.setToken(session.token);
      let enrichedSession = session;
      try {
        const me = await apiClient.getMe();
        enrichedSession = {
          ...session,
          ...me,
          token: session.token
        };
      } catch {
        // Keep login payload when profile enrichment is unavailable.
      }
      try {
        const matrix = await apiClient.listPermissionsMatrix();
        setPermissionsMatrix(matrix);
        await savePermissionsMatrixCache(matrix);
      } catch {
        const cached = await loadPermissionsMatrixCache();
        if (cached?.data?.length) {
          setPermissionsMatrix(cached.data);
        }
      }
      if (!canAccessGuardApp(enrichedSession)) {
        Alert.alert("Acesso bloqueado", "Este usuário não tem permissão para usar este app.");
        return;
      }
      await saveLastEmail(email.trim());
      onLogin(enrichedSession);
    } catch (error) {
      Alert.alert("Não foi possível entrar", error instanceof Error ? error.message : "Falha no login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={24} style={styles.screen}>
      <ScrollView ref={scrollRef} contentContainerStyle={[styles.content, { paddingBottom: 140 + keyboardInset }]} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
        <View style={styles.main}>
          <View style={styles.brand}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{branding.operationalBadgeText}</Text>
            </View>
            <View style={styles.titleRow}>
              <Image source={branding.logos.primary} style={styles.companyLogo} resizeMode="contain" />
              <Text style={styles.logo}>{branding.appShortName}</Text>
            </View>
            <Text style={styles.subtitle}>{branding.loginSubtitle}</Text>
          </View>

          <View style={styles.form}>
            <TextField
              label="E-mail"
              required
              value={email}
              onChangeText={(value) => {
                setAutofilledEmail(false);
                setEmail(value.trim().toLowerCase());
              }}
              placeholder="porteiro@condominio.com"
              keyboardType="email-address"
              autoCapitalize="none"
              onFocus={scrollAfterKeyboard}
              onSubmitEditing={submit}
              returnKeyType="next"
              helperText="Use o mesmo acesso do sistema."
              errorText={
                submitAttempted && !email.trim()
                  ? "Informe o e-mail para continuar."
                  : emailInvalid
                    ? "E-mail com formato inválido."
                    : undefined
              }
            />
            {autofilledEmail ? <Text style={styles.formHint}>Último e-mail usado neste aparelho.</Text> : null}
            <TextField
              label="Senha"
              required
              value={password}
              onChangeText={setPassword}
              placeholder="Senha"
              secureTextEntry
              canToggleSecureText
              autoCapitalize="none"
              onFocus={scrollAfterKeyboard}
              onSubmitEditing={submit}
              returnKeyType="go"
              helperText="O acesso segue as permissões do seu perfil."
              errorText={submitAttempted && !password ? "Informe a senha para entrar." : undefined}
            />
            <Button loading={loading} disabled={!canSubmit} onPress={submit}>
              Entrar
            </Button>
          </View>
        </View>

        {branding.showDeveloperSignature ? (
          <View style={styles.developerWrap}>
            <Text style={styles.developer}>
              {branding.developerSignaturePrefix}
              {branding.developerSignatureName}
            </Text>
            <Image source={branding.logos.developer} style={styles.developerLogo} resizeMode="contain" />
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 140
  },
  main: {
    flex: 1,
    justifyContent: "center"
  },
  brand: {
    alignItems: "center",
    gap: 8,
    marginBottom: 28
  },
  badge: {
    backgroundColor: "#E8F1FB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  badgeText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900"
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    marginBottom: 10
  },
  companyLogo: {
    height: 42,
    width: 78
  },
  developerLogo: {
    height: 96,
    maxWidth: 340,
    width: "92%"
  },
  logo: {
    color: colors.primaryDark,
    fontSize: 40,
    fontWeight: "900",
    textAlign: "center"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 22,
    textAlign: "justify"
  },
  form: {
    gap: 14
  },
  formHint: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: -4,
    textAlign: "justify"
  },
  developerWrap: {
    alignItems: "center",
    gap: 6,
    marginTop: 18
  },
  developer: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center"
  }
});


