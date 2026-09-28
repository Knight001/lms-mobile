import * as React from "react";
import { ActivityIndicator, StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider, useSession } from "@/session";
import { SignInScreen } from "@/screens/sign-in";
import { AppShell } from "@/shell";

/**
 * FinLend customer app.
 *
 * Runs from the same self-service API as the web portal. The two are deployed
 * separately and share nothing but the generated OpenAPI types.
 */
export default function App() {
  return (
    // SafeAreaProvider must wrap everything: without it the insets are reported
    // as zero and content hides under a notch or the home indicator.
    <SafeAreaProvider>
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" />
        <SessionProvider>
          <Gate />
        </SessionProvider>
      </View>
    </SafeAreaProvider>
  );
}

/** Decides between the sign-in screen and the app, with a splash while restoring a session. */
function Gate() {
  const { customer, loading } = useSession();

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color="#0f766e" size="large" />
      </View>
    );
  }

  return customer ? <AppShell /> : <SignInScreen />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8fafc" },
  splash: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" },
});
