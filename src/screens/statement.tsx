import * as React from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "@/session";
import { formatDate, formatMoney, titleCase } from "@/lib/format";
import { Badge, Card, EmptyState, PrimaryButton, Row, Skeleton } from "@/components/ui";
import { ScreenHeader } from "@/shell";
import { colors, radius, shadow, space, type } from "@/lib/theme";
import { saveDocument } from "@/lib/documents";
import type { Statement } from "@/api/types";

export function StatementScreen() {
  const { client } = useSession();
  const [statement, setStatement] = React.useState<Statement | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    client
      .statement()
      .then((data) => active && setStatement(data))
      .catch((caught: unknown) =>
        active && setError(caught instanceof Error ? caught.message : "Could not load your statement."),
      );
    return () => {
      active = false;
    };
  }, [client]);

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScreenHeader title="Statement" subtitle="Your account, line by line" />
      <ScrollView contentContainerStyle={styles.content}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {note ? (
          <View style={styles.note}>
            <Ionicons name="checkmark-circle" size={16} color={colors.brand} />
            <Text style={styles.noteText}>{note}</Text>
          </View>
        ) : null}

        {!statement ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.brand} />
            <Skeleton height={130} style={{ marginTop: space.lg }} />
            <Skeleton height={90} style={{ marginTop: space.md }} />
          </View>
        ) : (
          <>
            <View style={[styles.summary, shadow.card]}>
              <Text style={styles.summaryLabel}>Closing balance</Text>
              <Text style={styles.summaryValue}>{statement.closing_balance}</Text>
              <Text style={styles.summarySub}>
                {statement.account.code} · {statement.lines.length} movement
                {statement.lines.length === 1 ? "" : "s"}
              </Text>

              <View style={styles.summaryActions}>
                <PrimaryButton
                  label={busy ? "Preparing…" : "Save or print statement"}
                  icon="download-outline"
                  busy={busy}
                  onPress={async () => {
                    setBusy(true);
                    setNote(null);
                    try {
                      await saveDocument(client, "/v1/customer/documents/statement", "Statement.pdf");
                      setNote("Statement ready — share or print it.");
                    } catch (caught) {
                      setError(caught instanceof Error ? caught.message : "The statement could not be produced.");
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              </View>
            </View>

            <Text style={styles.sectionTitle}>Movements</Text>

            {statement.lines.length === 0 ? (
              <Card>
                <EmptyState
                  icon="receipt-outline"
                  title="Nothing to show"
                  body="Once money moves on your account it will be listed here with a running balance."
                />
              </Card>
            ) : (
              statement.lines.map((line) => (
                <Card key={line.entry_id}>
                  <View style={styles.lineTop}>
                    <View style={styles.grow}>
                      <Text style={styles.lineTitle}>{line.description || titleCase(line.type)}</Text>
                      <Text style={styles.lineSub}>
                        {formatDate(line.date)} · {line.transaction_number}
                      </Text>
                    </View>
                    <Text style={styles.lineBalance}>{formatMoney(line.balance_minor, statement.currency)}</Text>
                  </View>

                  {line.debit_minor || line.credit_minor ? (
                    <View style={styles.lineAmounts}>
                      {line.debit_minor ? (
                        <Text style={styles.debit}>Charged {formatMoney(line.debit_minor, statement.currency)}</Text>
                      ) : null}
                      {line.credit_minor ? (
                        <Text style={styles.credit}>Paid {formatMoney(line.credit_minor, statement.currency)}</Text>
                      ) : null}
                    </View>
                  ) : null}
                </Card>
              ))
            )}

            {statement.open_loans.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Open loans</Text>
                {statement.open_loans.map((loan) => (
                  <Card key={loan.id}>
                    <Row label={loan.loan_number} value={formatMoney(loan.outstanding_minor, statement.currency)} strong />
                    <Text style={styles.lineSub}>{titleCase(loan.status)}</Text>
                  </Card>
                ))}
              </>
            ) : null}

            <Text style={styles.footnote}>A balance in your favour means you owe the lender.</Text>
          </>
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
  note: { flexDirection: "row", alignItems: "center", gap: space.sm, backgroundColor: colors.brandSoft, padding: space.md, borderRadius: radius.md },
  noteText: { ...type.small, color: colors.brandDark, flexShrink: 1 },

  summary: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: space.xl, gap: 2 },
  summaryLabel: { ...type.small, color: colors.muted },
  summaryValue: { ...type.display, color: colors.ink },
  summarySub: { ...type.small, color: colors.muted, marginTop: 2 },
  summaryActions: { marginTop: space.lg },

  sectionTitle: { ...type.heading, color: colors.ink, marginTop: space.sm },
  lineTop: { flexDirection: "row", alignItems: "flex-start", gap: space.md },
  lineTitle: { ...type.bodyStrong, color: colors.ink },
  lineSub: { ...type.small, color: colors.muted, marginTop: 2 },
  lineBalance: { ...type.bodyStrong, color: colors.ink },
  lineAmounts: { flexDirection: "row", gap: space.md, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: space.sm },
  debit: { ...type.small, color: colors.bad },
  credit: { ...type.small, color: colors.good },
  footnote: { ...type.small, color: colors.muted, textAlign: "center", marginTop: space.md },
});
