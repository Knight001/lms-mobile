import * as React from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useSession } from "@/session";
import { formatDate, titleCase } from "@/lib/format";
import { Badge, Card, EmptyState, PrimaryButton, Row, Skeleton } from "@/components/ui";
import { ScreenHeader } from "@/shell";
import { colors, radius, space, type } from "@/lib/theme";
import { shareBytes } from "@/lib/documents";
import type { CustomerDocument } from "@/api/types";
import type { SelfServiceClient } from "@/api/client";

/** Opens a document the customer uploaded, whatever its type. */
async function openUploaded(client: SelfServiceClient, document: CustomerDocument): Promise<void> {
  try {
    await shareBytes(
      client.documentFile(`/v1/customer/documents/${document.id}`),
      document.filename,
      document.mime_type ?? "application/octet-stream",
    );
  } catch (caught) {
    Alert.alert(
      "Could not open",
      caught instanceof Error ? caught.message : "That file could not be opened.",
    );
  }
}

const DOCUMENT_TYPES = [
  { value: "id_document", label: "ID document" },
  { value: "proof_of_address", label: "Proof of address" },
  { value: "payslip", label: "Payslip" },
  { value: "bank_statement", label: "Bank statement" },
  { value: "other", label: "Something else" },
];

type Section = "details" | "documents" | "password";

export function ProfileScreen({ onBack }: { onBack: () => void }) {
  const [section, setSection] = React.useState<Section>("details");

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScreenHeader title="My profile" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.segmented}>
          {([
            ["details", "Details"],
            ["documents", "Documents"],
            ["password", "Password"],
          ] as Array<[Section, string]>).map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => setSection(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: section === key }}
              style={[styles.segment, section === key && styles.segmentActive]}
            >
              <Text style={[styles.segmentLabel, section === key && styles.segmentLabelActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {section === "details" && <DetailsSection />}
        {section === "documents" && <DocumentsSection />}
        {section === "password" && <PasswordSection />}
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailsSection() {
  const { customer, adopt, client } = useSession();
  const [firstName, setFirstName] = React.useState(customer?.first_name ?? "");
  const [lastName, setLastName] = React.useState(customer?.last_name ?? "");
  const [phone, setPhone] = React.useState(customer?.phone ?? "");
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<{ tone: "good" | "bad"; text: string } | null>(null);

  const save = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const updated = await client.updateProfile({ first_name: firstName, last_name: lastName, phone });
      adopt(updated);
      setNotice({ tone: "good", text: "Your details have been updated." });
    } catch (caught) {
      setNotice({ tone: "bad", text: caught instanceof Error ? caught.message : "Could not save." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={22} color={colors.brand} />
        </View>
        <View style={styles.grow}>
          <Text style={styles.identityName}>{customer?.business_name || customer?.full_name}</Text>
          <Text style={styles.identityMeta}>
            {customer?.customer_number ?? "—"} · {customer?.email ?? "No email"}
          </Text>
        </View>
        <Badge
          label={titleCase(customer?.kyc_status)}
          tone={customer?.kyc_status === "verified" ? "good" : "warn"}
        />
      </View>

      {notice ? (
        <View style={[styles.notice, notice.tone === "good" ? styles.noticeGood : styles.noticeBad]}>
          <Ionicons
            name={notice.tone === "good" ? "checkmark-circle" : "alert-circle"}
            size={15}
            color={notice.tone === "good" ? colors.good : colors.bad}
          />
          <Text style={[styles.noticeText, { color: notice.tone === "good" ? colors.good : colors.bad }]}>
            {notice.text}
          </Text>
        </View>
      ) : null}

      <Text style={styles.label}>First name</Text>
      <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholderTextColor={colors.faint} />

      <Text style={styles.label}>Last name</Text>
      <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholderTextColor={colors.faint} />

      <Text style={styles.label}>Mobile number</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholderTextColor={colors.faint}
      />
      <Text style={styles.hint}>Used for repayment reminders and one-time codes.</Text>

      <View style={styles.actions}>
        <PrimaryButton label={busy ? "Saving…" : "Save changes"} onPress={save} busy={busy} icon="save-outline" />
      </View>
    </Card>
  );
}

function DocumentsSection() {
  const { client } = useSession();
  const [documents, setDocuments] = React.useState<CustomerDocument[] | null>(null);
  const [type, setType] = React.useState("id_document");
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<{ tone: "good" | "bad"; text: string } | null>(null);

  const load = React.useCallback(() => {
    client
      .documents()
      .then(setDocuments)
      .catch(() => setDocuments([]));
  }, [client]);

  React.useEffect(load, [load]);

  const pick = async () => {
    if (busy) return;

    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      copyToCacheDirectory: true,
      multiple: false,
    });

    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;

    setBusy(true);
    setNotice(null);

    try {
      await client.uploadDocument(type, {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType ?? "application/octet-stream",
      });
      setNotice({ tone: "good", text: "Uploaded. Our team will review it shortly." });
      load();
    } catch (caught) {
      setNotice({ tone: "bad", text: caught instanceof Error ? caught.message : "The upload failed." });
    } finally {
      setBusy(false);
    }
  };

  const remove = (document: CustomerDocument) => {
    Alert.alert("Remove document", `Remove ${document.filename}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await client.deleteDocument(document.id);
            setNotice({ tone: "good", text: "Document removed." });
            load();
          } catch (caught) {
            setNotice({ tone: "bad", text: caught instanceof Error ? caught.message : "Could not remove it." });
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.stack}>
      <Card>
        <Text style={styles.cardTitle}>Upload a document</Text>
        <Text style={styles.hint}>
          We need these before approving a loan. JPG, PNG or PDF, up to 8 MB.
        </Text>

        <Text style={styles.label}>What is it?</Text>
        <View style={styles.chips}>
          {DOCUMENT_TYPES.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setType(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: type === option.value }}
              style={[styles.chip, type === option.value && styles.chipActive]}
            >
              <Text style={[styles.chipLabel, type === option.value && styles.chipLabelActive]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {notice ? (
          <View style={[styles.notice, notice.tone === "good" ? styles.noticeGood : styles.noticeBad]}>
            <Ionicons
              name={notice.tone === "good" ? "checkmark-circle" : "alert-circle"}
              size={15}
              color={notice.tone === "good" ? colors.good : colors.bad}
            />
            <Text style={[styles.noticeText, { color: notice.tone === "good" ? colors.good : colors.bad }]}>
              {notice.text}
            </Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <PrimaryButton
            label={busy ? "Uploading…" : "Choose a file"}
            onPress={pick}
            busy={busy}
            icon="cloud-upload-outline"
          />
        </View>
      </Card>

      <Text style={styles.cardTitle}>Your documents</Text>

      {documents === null ? (
        <Skeleton height={90} />
      ) : documents.length === 0 ? (
        <Card>
          <EmptyState
            icon="document-text-outline"
            title="Nothing uploaded yet"
            body="Attach your ID and proof of address to speed up any application."
          />
        </Card>
      ) : (
        documents.map((document) => (
          <Card key={document.id}>
            <View style={styles.docTop}>
              <View style={styles.docIcon}>
                <Ionicons name="document-text" size={17} color={colors.brand} />
              </View>
              <View style={styles.grow}>
                <Text style={styles.docName} numberOfLines={1}>
                  {document.filename}
                </Text>
                <Text style={styles.docMeta}>
                  {titleCase(document.type)} · {formatDate(document.created_at)}
                </Text>
              </View>
              <Badge
                label={titleCase(document.verification_status)}
                tone={
                  document.verification_status === "verified"
                    ? "good"
                    : document.verification_status === "rejected"
                      ? "bad"
                      : "warn"
                }
              />
            </View>

            <View style={styles.docActions}>
              <View style={styles.grow}>
                <PrimaryButton
                  label="Open"
                  variant="soft"
                  onPress={() => void openUploaded(client, document)}
                />
              </View>
              {document.verification_status === "pending" ? (
                <View style={styles.grow}>
                  <PrimaryButton label="Remove" variant="outline" onPress={() => remove(document)} />
                </View>
              ) : null}
            </View>
          </Card>
        ))
      )}
    </View>
  );
}

function PasswordSection() {
  const { client } = useSession();
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<{ tone: "good" | "bad"; text: string } | null>(null);

  const submit = async () => {
    if (next.length < 8) return setNotice({ tone: "bad", text: "Use at least 8 characters." });
    if (next !== confirm) return setNotice({ tone: "bad", text: "The two passwords do not match." });
    if (next === current) {
      return setNotice({ tone: "bad", text: "Choose a password different from your current one." });
    }

    setBusy(true);
    setNotice(null);

    try {
      await client.changePassword({
        current_password: current,
        password: next,
        password_confirmation: confirm,
      });
      setCurrent("");
      setNext("");
      setConfirm("");
      setNotice({ tone: "good", text: "Password changed. Other devices stay signed in." });
    } catch (caught) {
      setNotice({
        tone: "bad",
        text: caught instanceof Error ? caught.message : "Could not change your password.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Text style={styles.cardTitle}>Change your password</Text>

      {notice ? (
        <View style={[styles.notice, notice.tone === "good" ? styles.noticeGood : styles.noticeBad]}>
          <Ionicons
            name={notice.tone === "good" ? "checkmark-circle" : "alert-circle"}
            size={15}
            color={notice.tone === "good" ? colors.good : colors.bad}
          />
          <Text style={[styles.noticeText, { color: notice.tone === "good" ? colors.good : colors.bad }]}>
            {notice.text}
          </Text>
        </View>
      ) : null}

      <Text style={styles.label}>Current password</Text>
      <TextInput
        style={styles.input}
        value={current}
        onChangeText={setCurrent}
        secureTextEntry
        placeholderTextColor={colors.faint}
      />

      <Text style={styles.label}>New password</Text>
      <TextInput
        style={styles.input}
        value={next}
        onChangeText={setNext}
        secureTextEntry
        placeholderTextColor={colors.faint}
      />
      <Text style={styles.hint}>At least 8 characters.</Text>

      <Text style={styles.label}>Confirm new password</Text>
      <TextInput
        style={styles.input}
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        placeholderTextColor={colors.faint}
      />

      <View style={styles.actions}>
        <PrimaryButton
          label={busy ? "Changing…" : "Change password"}
          onPress={submit}
          busy={busy}
          icon="lock-closed-outline"
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  stack: { gap: space.md },
  grow: { flex: 1 },
  cardTitle: { ...type.heading, color: colors.ink, marginBottom: space.xs },

  segmented: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 3,
  },
  segment: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: radius.sm },
  segmentActive: { backgroundColor: colors.brandSoft },
  segmentLabel: { ...type.small, color: colors.muted, fontWeight: "600" },
  segmentLabelActive: { color: colors.brandDark },

  identity: { flexDirection: "row", alignItems: "center", gap: space.md },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  identityName: { ...type.bodyStrong, color: colors.ink },
  identityMeta: { ...type.small, color: colors.muted, marginTop: 1 },

  notice: { flexDirection: "row", alignItems: "center", gap: space.sm, padding: space.md, borderRadius: radius.md },
  noticeGood: { backgroundColor: colors.goodSoft },
  noticeBad: { backgroundColor: colors.badSoft },
  noticeText: { ...type.small, flexShrink: 1 },

  label: { ...type.smallStrong, color: colors.ink, marginTop: space.md, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  hint: { ...type.small, color: colors.muted, marginTop: 4 },
  actions: { marginTop: space.lg },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 7,
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  chipLabel: { ...type.small, color: colors.muted },
  chipLabelActive: { color: colors.brandDark, fontWeight: "700" },

  docTop: { flexDirection: "row", alignItems: "center", gap: space.md },
  docIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  docName: { ...type.bodyStrong, color: colors.ink },
  docMeta: { ...type.small, color: colors.muted, marginTop: 1 },
  docActions: { flexDirection: "row", gap: space.sm, marginTop: space.sm },
});
