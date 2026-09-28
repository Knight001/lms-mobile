import * as React from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "@/session";
import { formatDate, formatMajor, statusTone, titleCase } from "@/lib/format";
import { Badge, Card, EmptyState, PrimaryButton, Row, Skeleton } from "@/components/ui";
import { ScreenHeader } from "@/shell";
import { colors, radius, shadow, space, type } from "@/lib/theme";
import { saveOrReport } from "@/lib/documents";
import type { Loan, LoanSchedule } from "@/api/types";

export function LoansScreen({ onOpenLoan }: { onOpenLoan: (id: string) => void }) {
  const { client } = useSession();
  const [loans, setLoans] = React.useState<Loan[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    client
      .loans()
      .then((rows) => active && setLoans(rows))
      .catch((caught: unknown) =>
        active && setError(caught instanceof Error ? caught.message : "Could not load your loans."),
      );
    return () => {
      active = false;
    };
  }, [client]);

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScreenHeader title="My loans" subtitle="Every loan on your account" />
      <ScrollView contentContainerStyle={styles.content}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!loans && !error ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.brand} />
            <Skeleton height={110} style={{ marginTop: space.lg }} />
            <Skeleton height={110} style={{ marginTop: space.md }} />
          </View>
        ) : null}

        {loans?.length === 0 ? (
          <Card>
            <EmptyState
              icon="wallet-outline"
              title="No loans yet"
              body="When you take a loan it will appear here with its schedule and balance."
            />
          </Card>
        ) : null}

        {loans?.map((loan) => {
          const outstanding =
            loan.outstanding_principal + loan.outstanding_interest + loan.outstanding_fees + loan.outstanding_penalty;

          return (
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
                    {titleCase(loan.interest_method)} at {loan.interest_rate}% · {loan.term_months} months
                  </Text>
                </View>
                <Badge label={titleCase(loan.status)} tone={statusTone(loan.status)} />
              </View>

              <View style={styles.amountRow}>
                <View>
                  <Text style={styles.amountLabel}>Balance</Text>
                  <Text style={styles.amountValue}>{formatMajor(outstanding, loan.currency)}</Text>
                </View>
                <View style={styles.amountRight}>
                  <Text style={styles.amountLabel}>Matures</Text>
                  <Text style={styles.amountSmall}>{formatDate(loan.maturity_date)}</Text>
                </View>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

export function LoanDetailScreen({ loanId, onBack }: { loanId: string; onBack: () => void }) {
  const { client } = useSession();
  const [loan, setLoan] = React.useState<Loan | null>(null);
  const [schedule, setSchedule] = React.useState<LoanSchedule | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const refresh = React.useCallback(async () => {
    const [detail, sched] = await Promise.all([
      client.loan(loanId),
      client.loanSchedule(loanId).catch(() => null),
    ]);
    setLoan(detail);
    setSchedule(sched);
  }, [client, loanId]);

  React.useEffect(() => {
    let active = true;
    refresh()
      .catch((caught: unknown) =>
        active && setError(caught instanceof Error ? caught.message : "Could not load this loan."),
      )
      .finally(() => active && setBusy(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  const outstanding = loan
    ? loan.outstanding_principal + loan.outstanding_interest + loan.outstanding_fees + loan.outstanding_penalty
    : 0;

  const repay = () => {
    Alert.prompt?.(
      "Make a repayment",
      `Outstanding ${formatMajor(outstanding, loan?.currency)}`,
      async (amount) => {
        if (!amount) return;
        try {
          await client.repay(loanId, {
            amount: Number(amount),
            currency: loan?.currency ?? "USD",
            payment_method: "mobile_money",
          });
          await refresh();
        } catch (caught) {
          Alert.alert("Payment not recorded", caught instanceof Error ? caught.message : "Please try again.");
        }
      },
      "plain-text",
      "",
      "decimal-pad",
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScreenHeader title={loan?.loan_number ?? "Loan"} subtitle={loan ? titleCase(loan.status) : undefined} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={[styles.balance, shadow.raised]}>
          <Text style={styles.balanceLabel}>Balance outstanding</Text>
          <Text style={styles.balanceValue}>{formatMajor(outstanding, loan?.currency)}</Text>

          <View style={styles.actions}>
            <View style={styles.grow}>
              <PrimaryButton label="Make a repayment" onPress={repay} icon="card-outline" />
            </View>
            <View style={styles.grow}>
              <PrimaryButton
                label={busy ? "Preparing…" : "Invoice"}
                onPress={async () => {
                  setBusy(true);
                  await saveOrReport(
                    client,
                    `/v1/customer/documents/invoices/${loanId}`,
                    `Invoice ${loan?.loan_number ?? loanId}.pdf`,
                  );
                  setBusy(false);
                }}
                variant="outline"
                icon="download-outline"
              />
            </View>
          </View>
        </View>

        {loan ? (
          <Card>
            <Text style={styles.cardTitle}>Details</Text>
            <Row label="Principal" value={formatMajor(loan.principal, loan.currency)} />
            <Row label="Interest" value={formatMajor(loan.outstanding_interest, loan.currency)} />
            <Row label="Fees" value={formatMajor(loan.outstanding_fees, loan.currency)} />
            <Row label="Paid to date" value={formatMajor(loan.total_paid, loan.currency)} />
            <Row label="Disbursed" value={formatDate(loan.disbursed_at)} />
            <Row label="Matures" value={formatDate(loan.maturity_date)} strong />
          </Card>
        ) : null}

        <Text style={styles.sectionTitle}>Repayment schedule</Text>

        {schedule?.installments?.length ? (
          schedule.installments.map((row) => (
            <Card key={row.installment_number}>
              <View style={styles.installmentTop}>
                <Text style={styles.installmentNumber}>#{row.installment_number}</Text>
                <Badge label={titleCase(row.status)} tone={statusTone(row.status)} />
              </View>
              <Row label="Due" value={formatDate(row.due_date)} />
              <Row label="Instalment" value={formatMajor(row.total, loan?.currency)} />
              <Row label="Still owed" value={formatMajor(row.outstanding, loan?.currency)} strong />
            </Card>
          ))
        ) : (
          <Card>
            <EmptyState
              icon="calendar-outline"
              title="No schedule yet"
              body="The repayment schedule appears once the loan is disbursed."
            />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  grow: { flex: 1 },
  loading: { marginTop: space.lg },
  error: { backgroundColor: colors.badSoft, color: colors.bad, padding: space.md, borderRadius: radius.md, fontSize: 13 },

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
  amountRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: space.md,
  },
  amountRight: { alignItems: "flex-end" },
  amountLabel: { ...type.tiny, color: colors.muted, textTransform: "uppercase" },
  amountValue: { ...type.title, color: colors.ink, marginTop: 2 },
  amountSmall: { ...type.bodyStrong, color: colors.ink, marginTop: 2 },

  balance: { backgroundColor: colors.brand, borderRadius: radius.xl, padding: space.xl, gap: space.sm },
  balanceLabel: { ...type.small, color: "rgba(255,255,255,0.85)" },
  balanceValue: { ...type.display, color: "#fff", fontSize: 34 },
  actions: { flexDirection: "row", gap: space.md, marginTop: space.md },

  cardTitle: { ...type.heading, color: colors.ink, marginBottom: space.xs },
  sectionTitle: { ...type.heading, color: colors.ink, marginTop: space.sm },
  installmentTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  installmentNumber: { ...type.bodyStrong, color: colors.ink },
});
