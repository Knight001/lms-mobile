import * as React from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "@/session";
import { titleCase } from "@/lib/format";
import { Card, PrimaryButton, Skeleton } from "@/components/ui";
import { ScreenHeader } from "@/shell";
import { colors, radius, space, type } from "@/lib/theme";
import type { LoanProduct } from "@/api/types";

/** Apply for a loan: pick a product, choose an amount and term, submit. */
export function ApplyScreen({ onDone }: { onDone: () => void }) {
  const { client } = useSession();
  const [products, setProducts] = React.useState<LoanProduct[] | null>(null);
  const [selected, setSelected] = React.useState<LoanProduct | null>(null);
  const [amount, setAmount] = React.useState("");
  const [term, setTerm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [reference, setReference] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    client
      .products()
      .then((rows) => {
        if (!active || rows.length === 0) return;
        setProducts(rows);
        setSelected(rows[0]);
        setAmount(String(rows[0].min_amount));
        setTerm(String(rows[0].min_term_months));
      })
      .catch((caught: unknown) =>
        active && setError(caught instanceof Error ? caught.message : "Could not load products."),
      );
    return () => {
      active = false;
    };
  }, [client]);

  const choose = (product: LoanProduct) => {
    setSelected(product);
    setAmount(String(product.min_amount));
    setTerm(String(product.min_term_months));
    setError(null);
  };

  const submit = async () => {
    if (!selected || busy) return;

    const value = Number(amount);
    const months = Number(term);

    if (!Number.isFinite(value) || value < selected.min_amount || value > selected.max_amount) {
      return setError(
        `Enter an amount between ${selected.min_amount.toLocaleString()} and ${selected.max_amount.toLocaleString()} ${selected.currency}.`,
      );
    }
    if (!Number.isFinite(months) || months < selected.min_term_months || months > selected.max_term_months) {
      return setError(
        `Choose a term between ${selected.min_term_months} and ${selected.max_term_months} months.`,
      );
    }

    setBusy(true);
    setError(null);

    try {
      const application = await client.apply({
        loan_product_id: selected.id,
        requested_amount: value,
        requested_term_months: months,
        currency: selected.currency,
      });
      setReference(application.application_number ?? application.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your application was not submitted.");
    } finally {
      setBusy(false);
    }
  };

  if (reference) {
    return (
      <SafeAreaView style={styles.screen} edges={["bottom"]}>
        <ScreenHeader title="Application" subtitle="Submitted" />
        <View style={styles.doneWrap}>
          <View style={styles.doneIcon}>
            <Ionicons name="checkmark" size={32} color="#fff" />
          </View>
          <Text style={styles.doneTitle}>Application received</Text>
          <Text style={styles.doneBody}>
            Keep this reference for your records. We will be in touch once it has been assessed.
          </Text>
          <View style={styles.reference}>
            <Text style={styles.referenceLabel}>Reference</Text>
            <Text style={styles.referenceValue}>{reference}</Text>
          </View>
          <PrimaryButton label="Back to my account" onPress={onDone} icon="arrow-forward" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScreenHeader title="Apply for a loan" subtitle="It takes about a minute" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error ? (
          <View style={styles.error}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.bad} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {!products ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.brand} />
            <Skeleton height={104} style={{ marginTop: space.lg }} />
            <Skeleton height={104} style={{ marginTop: space.md }} />
          </View>
        ) : null}

        {products?.map((product) => {
          const active = selected?.id === product.id;

          return (
            <Card
              key={product.id}
              onPress={() => choose(product)}
              style={active ? styles.productSelected : undefined}
              accessibilityLabel={product.name}
            >
              <View style={styles.productTop}>
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active ? <View style={styles.radioDot} /> : null}
                </View>
                <View style={styles.grow}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productMeta}>
                    {product.interest_rate}% {titleCase(product.interest_method)} ·{" "}
                    {product.min_term_months}–{product.max_term_months} months
                  </Text>
                </View>
              </View>

              <View style={styles.productRange}>
                <Ionicons name="cash-outline" size={14} color={colors.muted} />
                <Text style={styles.productRangeText}>
                  {product.min_amount.toLocaleString()} – {product.max_amount.toLocaleString()}{" "}
                  {product.currency}
                </Text>
              </View>
            </Card>
          );
        })}

        {selected ? (
          <Card style={styles.formCard}>
            <Text style={styles.formTitle}>Your application</Text>

            <Text style={styles.label}>Amount ({selected.currency})</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholderTextColor={colors.faint}
            />
            <Text style={styles.hint}>
              Between {selected.min_amount.toLocaleString()} and {selected.max_amount.toLocaleString()}.
            </Text>

            <Text style={styles.label}>Term (months)</Text>
            <TextInput
              style={styles.input}
              value={term}
              onChangeText={setTerm}
              keyboardType="number-pad"
              placeholderTextColor={colors.faint}
            />
            <Text style={styles.hint}>
              {selected.min_term_months} to {selected.max_term_months} months.
            </Text>

            <PrimaryButton
              label={busy ? "Submitting…" : "Submit application"}
              onPress={submit}
              busy={busy}
              icon="send-outline"
            />
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  grow: { flex: 1 },
  loading: { marginTop: space.lg },
  error: { flexDirection: "row", gap: space.sm, backgroundColor: colors.badSoft, padding: space.md, borderRadius: radius.md },
  errorText: { ...type.small, color: colors.bad, flexShrink: 1 },

  productSelected: { borderColor: colors.brand, borderWidth: 2 },
  productTop: { flexDirection: "row", alignItems: "center", gap: space.md },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { borderColor: colors.brand },
  radioDot: { width: 10, height: 10, borderRadius: radius.pill, backgroundColor: colors.brand },
  productName: { ...type.bodyStrong, color: colors.ink },
  productMeta: { ...type.small, color: colors.muted, marginTop: 1 },
  productRange: { flexDirection: "row", alignItems: "center", gap: 6 },
  productRangeText: { ...type.small, color: colors.muted },

  formCard: { gap: 2 },
  formTitle: { ...type.heading, color: colors.ink, marginBottom: space.sm },
  label: { ...type.smallStrong, color: colors.ink, marginTop: space.md, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: 13,
    fontSize: 17,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  hint: { ...type.small, color: colors.muted, marginTop: 4 },

  doneWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.xl, gap: space.md },
  doneIcon: {
    width: 68,
    height: 68,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.sm,
  },
  doneTitle: { ...type.title, color: colors.ink, textAlign: "center" },
  doneBody: { ...type.small, color: colors.muted, textAlign: "center", lineHeight: 20 },
  reference: {
    alignSelf: "stretch",
    backgroundColor: colors.brandTint,
    borderRadius: radius.md,
    padding: space.lg,
    alignItems: "center",
    gap: 4,
    marginVertical: space.md,
  },
  referenceLabel: { ...type.tiny, color: colors.muted, textTransform: "uppercase" },
  referenceValue: { ...type.heading, color: colors.brandDark },
});
