import * as React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "@/session";
import { PrimaryButton } from "@/components/ui";
import { colors, radius, shadow, space, type } from "@/lib/theme";

/** Sign in. Shown whenever there is no stored session. */
export function SignInScreen() {
  const { signIn } = useSession();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      await signIn(email.trim(), password);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.brandMark}>
              <Ionicons name="shield-checkmark" size={20} color="#fff" />
            </View>
            <Text style={styles.brandName}>FinLend</Text>
          </View>

          <View>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Sign in to check your balance, make a repayment or download a statement.
            </Text>
          </View>

          {error ? (
            <View style={styles.error}>
              <Ionicons name="alert-circle" size={16} color={colors.bad} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={17} color={colors.faint} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                placeholder="you@example.com"
                placeholderTextColor={colors.faint}
              />
            </View>

            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={17} color={colors.faint} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="current-password"
                placeholder="Your password"
                placeholderTextColor={colors.faint}
                onSubmitEditing={submit}
                returnKeyType="go"
              />
              <Text
                onPress={() => setShowPassword((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={17}
                  color={colors.faint}
                />
              </Text>
            </View>

            <View style={styles.buttonWrap}>
              <PrimaryButton
                label={busy ? "Signing in…" : "Sign in"}
                onPress={submit}
                busy={busy}
                icon="log-in-outline"
              />
            </View>
          </View>

          <View style={styles.help}>
            <Ionicons name="help-circle-outline" size={15} color={colors.muted} />
            <Text style={styles.helpText}>
              New customer? Ask your lender for an account, then create one online.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", padding: space.xl, gap: space.xl },

  brand: { flexDirection: "row", alignItems: "center", gap: space.sm },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: { ...type.heading, color: colors.ink, letterSpacing: -0.2 },

  title: { ...type.display, color: colors.ink },
  subtitle: { ...type.small, color: colors.muted, marginTop: 6, lineHeight: 20 },

  error: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.badSoft,
    padding: space.md,
    borderRadius: radius.md,
  },
  errorText: { ...type.small, color: colors.bad, flexShrink: 1 },

  form: { gap: 2 },
  label: { ...type.smallStrong, color: colors.ink, marginBottom: 6, marginTop: space.md },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    backgroundColor: colors.surface,
  },
  input: { flex: 1, paddingVertical: 13, fontSize: 16, color: colors.ink },
  buttonWrap: { marginTop: space.xl },

  help: { flexDirection: "row", alignItems: "center", gap: space.sm, justifyContent: "center" },
  helpText: { ...type.small, color: colors.muted, flexShrink: 1 },
});
