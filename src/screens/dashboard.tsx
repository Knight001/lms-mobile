import * as React from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "@/session";
import { formatDate, formatMajor, formatMoney, statusTone, titleCase } from "@/lib/format";
import { Badge, Card, EmptyState, PrimaryButton, Row, Skeleton } from "@/components/ui";
import { colors, radius, shadow, space, type } from "@/lib/theme";
import type { AccountSummary, Loan } from "@/api/types";

export function DashboardScreen({
  customerName,
  onOpenLoan,
  onApply,
  onSeeLoans,
  onSeeStatement,
}: {
  customerName: string;
  onOpenLoan: (id: string) => void;
  onApply: () => void;
  onSeeLoans: () => void;
  onSeeStatement: () => void;
}) {
  const { client } = useSession();
  const [account, setAccount] = React.useState<AccountSummary | null>(null);
  const [loans, setLoans] = React.useState<Loan[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  const firstName = customerName.split(" ")[0];

  const load = React.useCallback(async () => {
    try {
      const [summary, loanList] = await Promise.all([client.account(), client.loans()]);
      setAccount(summary);
      setLoans(loanList);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load your account.");
    }
  }, [client]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={colors.brand}
          />
        }
      >
        <View>
          <Text style={styles.greeting}>{firstName ? `Hi, ${firstName}` : "Welcome"}</Text>
          <Text style={styles.greetingSub}>Here is where you stand today.</Text>
        </View>

        {error ? (
          <View style={styles.error}>
            <Ionicons name="cloud-offline-outline" size={17} color={colors.bad} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {!account ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.brand} />
            <Skeleton height={150} style={{ marginTop: space.lg }} />
            <Skeleton height={82} style={{ marginTop: space.md }} />
            <Skeleton height={82} style={{ marginTop: space.md }} />
          </View>
        ) : (
          <>
            <View style={[styles.balance, shadow.raised]}>
              <View style={styles.balanceTop}>
                <Text style={styles.balanceLabel}>Total balance owed</Text>
                <View style={styles.balanceChip}>
                  <Ionicons name="trending-down-outline" size={13} color="#fff" />
                  <Text style={styles.balanceChipText}>Live</Text>
                </View>
              </View>

              <Text style={styles.balanceValue}>{account.account.balance}</Text>

              {account.next_payment ? (
                <View style={styles.nextDue}>
                  <View style={styles.nextDueIcon}>
                    <Ionicons
                      name={account.next_payment.overdue ? "alert-circle" : "calendar-outline"}
                      size={17}
                      color={account.next_payment.overdue ? "#fff" : colors.brandDark}
                    />
                  </View>
                  <View style={styles.grow}>
                    <Text style={[styles.nextDueTitle, account.next_payment.overdue && { color: "#fff" }]}>
                      Next payment {formatMoney(account.next_payment.amount_minor, account.currency)}
                    </Text>
                    <Text style={[styles.nextDueSub, account.next_payment.overdue && { color: "rgba(255,255,255,0.85)" }]}>
                      {account.next_payment.due_date
                        ? `Due ${formatDate(account.next_payment.due_date)}`
                        : "No date set"}
                      {account.next_payment.overdue ? " · overdue" : ""}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.nextDue}>
                  <View style={styles.nextDueIcon}>
                    <Ionicons name="checkmark-circle-outline" size={17} color={colors.brandDark} />
                  </View>
                  <Text style={styles.nextDueTitle}>Nothing due — you are all clear.</Text>
                </View>
              )}
            </View>

            <View style={styles.statGrid}>
              <StatCard
                icon="card-outline"
                label="Principal"
                value={formatMoney(account.totals.principal_outstanding, account.currency)}
              />
              <StatCard
                icon="pie-chart-outline"
                label="Interest & fees"
                value={formatMoney(
                  account.totals.interest_outstanding +
                    account.totals.fees_outstanding +
                    account.totals.penalties_outstanding,
                  account.currency,
                )}
              />
              <StatCard
                icon="checkmark-done-outline"
                label="Paid to date"
                value={formatMoney(account.totals.paid_to_date, account.currency)}
                tone="good"
              />
              <StatCard
                icon="albums-outline"
                label="Active loans"
                value={String(account.counts.loans)}
              />
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your loans</Text>
              {loans.length > 0 ? (
                <Text style={styles.sectionAction} onPress={onSeeLoans}>
                  See all
                </Text>
              ) : null}
            </View>

            {loans.length === 0 ? (
              <Card>
                <EmptyState
                  icon="wallet-outline"
                  title="No loans yet"
                  body="Apply for a loan and track it, with every repayment and receipt, right here in the app."
                  action={{ label: "Apply for a loan", onPress: onApply }}
                />
              </Card>
            ) : (
              loans.slice(0, 3).map((loan) => (
                <Card
                  key={loan.id}
                  onPress={() => onOpenLoan(loan.id)}
                  accessibilityLabel={`Open ${loan.loan_number}`}
                >
                  <View style={styles.loanTop}>
                    <View style={styles.loanIcon}>
                      <Ionicons name="wallet" size={17} color={colors.brand} />
                    </View>
                    <View style={styles.grow}>
                      <Text style={styles.loanNumber}>{loan.loan_number}</Text>
                      <Text style={styles.loanMeta}>
                        {titleCase(loan.interest_method)} · {loan.term_months} months
                      </Text>
                    </View>
                    <Badge label={titleCase(loan.status)} tone={statusTone(loan.status)} />
                  </View>

                  <View style={styles.loanFooter}>
                    <View>
                      <Text style={styles.loanFooterLabel}>Outstanding</Text>
                      <Text style={styles.loanFooterValue}>
                        {formatMajor(loan.outstanding_principal, loan.currency)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={17} color={colors.faint} />
                  </View>
                </Card>
              ))
            )}

            <Card onPress={onSeeStatement} accessibilityLabel="Open your statement">
              <View style={styles.statementRow}>
                <View style={styles.statementIcon}>
                  <Ionicons name="receipt-outline" size={18} color={colors.brand} />
                </View>
                <View style={styles.grow}>
                  <Text style={styles.statementTitle}>Account statement</Text>
                  <Text style={styles.statementSub}>Every movement, with printable PDF</Text>
                </View>
                <Ionicons name="open-outline" size={17} color={colors.faint} />
              </View>
            </Card>

            <PrimaryButton label="Apply for another loan" onPress={onApply} variant="soft" icon="add-circle-outline" />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone = "brand",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tone?: "brand" | "good";
}) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={16} color={tone === "good" ? colors.good : colors.brand} />
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  grow: { flex: 1 },

  greeting: { ...type.display, color: colors.ink },
  greetingSub: { ...type.small, color: colors.muted, marginTop: 2 },

  error: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.badSoft,
    padding: space.md,
    borderRadius: radius.md,
  },
  errorText: { ...type.small, color: colors.bad, flexShrink: 1 },

  loading: { marginTop: space.lg },

  balance: { backgroundColor: colors.brand, borderRadius: radius.xl, padding: space.xl, gap: space.md },
  balanceTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  balanceLabel: { ...type.small, color: "rgba(255,255,255,0.85)" },
  balanceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  balanceChipText: { ...type.tiny, color: "#fff" },
  balanceValue: { ...type.display, color: "#fff", fontSize: 36 },
  nextDue: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: "#fff",
    borderRadius: radius.md,
    padding: space.md,
  },
  nextDueIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  nextDueTitle: { ...type.bodyStrong, color: colors.ink },
  nextDueSub: { ...type.small, color: colors.muted, marginTop: 1 },

  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  statCard: {
    flexGrow: 1,
    flexBasis: "46%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    gap: 6,
  },
  statValue: { ...type.title, color: colors.ink },
  statLabel: { ...type.small, color: colors.muted },

  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: space.sm },
  sectionTitle: { ...type.heading, color: colors.ink },
  sectionAction: { ...type.smallStrong, color: colors.brand },

  loanTop: { flexDirection: "row", alignItems: "center", gap: space.md },
  loanIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  loanNumber: { ...type.bodyStrong, color: colors.ink },
  loanMeta: { ...type.small, color: colors.muted, marginTop: 1 },
  loanFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: space.md,
  },
  loanFooterLabel: { ...type.tiny, color: colors.muted, textTransform: "uppercase" },
  loanFooterValue: { ...type.bodyStrong, color: colors.ink, marginTop: 2 },

  statementRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  statementIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
  },
  statementTitle: { ...type.bodyStrong, color: colors.ink },
  statementSub: { ...type.small, color: colors.muted, marginTop: 1 },
});
