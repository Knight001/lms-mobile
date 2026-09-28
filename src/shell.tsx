import * as React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { DashboardScreen } from "@/screens/dashboard";
import { LoansScreen, LoanDetailScreen } from "@/screens/loans";
import { StatementScreen } from "@/screens/statement";
import { ApplyScreen } from "@/screens/apply";
import { ProfileScreen } from "@/screens/profile";
import { useSession } from "@/session";
import { colors, radius, shadow, space, type } from "@/lib/theme";

type Tab = "home" | "loans" | "statement" | "apply";

const TABS: Array<{ id: Tab; label: string; icon: keyof typeof Ionicons.glyphMap; active: keyof typeof Ionicons.glyphMap }> = [
  { id: "home", label: "Home", icon: "home-outline", active: "home" },
  { id: "loans", label: "Loans", icon: "wallet-outline", active: "wallet" },
  { id: "statement", label: "Statement", icon: "receipt-outline", active: "receipt" },
  { id: "apply", label: "Apply", icon: "add-circle-outline", active: "add-circle" },
];

/**
 * App shell: a top bar, the current screen, and a bottom tab bar.
 *
 * The tab bar lives outside the screens' own SafeAreaView, so it applies the
 * bottom inset itself. Without that, gesture-navigation phones draw the home
 * indicator straight over the tabs.
 */
export function AppShell() {
  const { signOut, customer } = useSession();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = React.useState<Tab>("home");
  const [loanId, setLoanId] = React.useState<string | null>(null);
  const [showProfile, setShowProfile] = React.useState(false);

  if (showProfile) {
    return <ProfileScreen onBack={() => setShowProfile(false)} />;
  }

  if (loanId) {
    return <LoanDetailScreen loanId={loanId} onBack={() => setLoanId(null)} />;
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.topBar} edges={["top"]}>
        <View style={styles.topBarInner}>
          <View style={styles.brandMark}>
            <Ionicons name="shield-checkmark" size={16} color="#fff" />
          </View>
          <Text style={styles.brandName}>FinLend</Text>
          <View style={styles.grow} />
          <Pressable
            onPress={() => setShowProfile(true)}
            accessibilityRole="button"
            accessibilityLabel="My profile"
            hitSlop={10}
            style={styles.iconButton}
          >
            <Ionicons name="person-circle-outline" size={20} color={colors.muted} />
          </Pressable>
          <Pressable
            onPress={() => void signOut()}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            hitSlop={10}
            style={styles.iconButton}
          >
            <Ionicons name="log-out-outline" size={19} color={colors.muted} />
          </Pressable>
        </View>
      </SafeAreaView>

      <View style={styles.body}>
        {tab === "home" && (
          <DashboardScreen
            customerName={customer?.business_name || customer?.full_name || ""}
            onOpenLoan={setLoanId}
            onApply={() => setTab("apply")}
            onSeeLoans={() => setTab("loans")}
            onSeeStatement={() => setTab("statement")}
          />
        )}
        {tab === "loans" && <LoansScreen onOpenLoan={setLoanId} />}
        {tab === "statement" && <StatementScreen />}
        {tab === "apply" && <ApplyScreen onDone={() => setTab("home")} />}
      </View>

      <View
        style={[
          styles.tabBar,
          shadow.raised,
          // The gesture bar / home button sits in this area on modern phones.
          { paddingBottom: Math.max(insets.bottom, space.sm) },
        ]}
      >
        {TABS.map((item) => {
          const active = tab === item.id;

          return (
            <Pressable
              key={item.id}
              onPress={() => setTab(item.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={item.label}
              style={styles.tab}
            >
              <View style={[styles.tabIconWrap, active && styles.tabIconWrapActive]}>
                <Ionicons
                  name={active ? item.active : item.icon}
                  size={21}
                  color={active ? colors.brand : colors.faint}
                />
              </View>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Header used inside the pushed loan detail screen. */
export function ScreenHeader({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack?: () => void }) {
  return (
    <SafeAreaView style={styles.topBar} edges={["top"]}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={10} accessibilityRole="button" style={styles.backButton}>
          <Ionicons name="chevron-back" size={20} color={colors.ink} />
        </Pressable>
      ) : null}
      <View style={styles.grow}>
        <Text style={styles.screenTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.screenSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  body: { flex: 1 },
  grow: { flex: 1 },

  topBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  topBarInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: Platform.OS === "ios" ? space.md : space.sm,
  },
  brandMark: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: { ...type.bodyStrong, color: colors.ink, letterSpacing: -0.2 },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.canvas,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.canvas,
    marginRight: space.sm,
  },
  screenTitle: { ...type.title, color: colors.ink },
  screenSubtitle: { ...type.small, color: colors.muted },

  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: space.sm,
    paddingHorizontal: space.sm,
  },
  tab: { flex: 1, alignItems: "center", gap: 2 },
  tabIconWrap: {
    width: 46,
    height: 28,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconWrapActive: { backgroundColor: colors.brandSoft },
  tabLabel: { ...type.tiny, color: colors.faint, textTransform: "none" },
  tabLabelActive: { color: colors.brand, fontWeight: "700" },
});
