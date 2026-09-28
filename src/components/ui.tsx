import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, space, toneColors, type } from "@/lib/theme";

type Tone = "good" | "warn" | "bad" | "muted";

/** Small status pill, used for loan, application and payment states. */
export function Badge({ label, tone = "muted" }: { label: string; tone?: Tone }) {
  const palette = toneColors(tone);

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.badgeText, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

/** Standard content card. */
export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  if (onPress) {
    return (
      <View style={[styles.card, shadow.card, style]}>
        <CardPress onPress={onPress} label={accessibilityLabel}>
          {children}
        </CardPress>
      </View>
    );
  }

  return <View style={[styles.card, shadow.card, style]}>{children}</View>;
}

function CardPress({ children, onPress, label }: { children: React.ReactNode; onPress: () => void; label?: string }) {
  const { Pressable } = require("react-native") as typeof import("react-native");

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

/** Label/value row used in summaries. */
export function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.rowValueStrong]}>{value}</Text>
    </View>
  );
}

/** Icon in a tinted circle, for list rows and section headers. */
export function IconBubble({
  name,
  tone = "brand",
  size = 18,
}: {
  name: keyof typeof Ionicons.glyphMap;
  tone?: "brand" | "good" | "warn" | "bad" | "muted";
  size?: number;
}) {
  const palette =
    tone === "brand"
      ? { bg: colors.brandSoft, fg: colors.brand }
      : toneColors(tone as Exclude<Tone, "muted"> | "muted");

  return (
    <View style={[styles.bubble, { backgroundColor: palette.bg }]}>
      <Ionicons name={name} size={size} color={palette.fg} />
    </View>
  );
}

/** Primary call to action. */
export function PrimaryButton({
  label,
  onPress,
  busy,
  variant = "solid",
  icon,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  variant?: "solid" | "soft" | "outline";
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const palette = {
    solid: { bg: colors.brand, fg: "#fff", border: "transparent" },
    soft: { bg: colors.brandSoft, fg: colors.brandDark, border: "transparent" },
    outline: { bg: "transparent", fg: colors.brand, border: colors.brand },
  }[variant];

  return (
    <CardPress onPress={busy ? () => {} : onPress} label={label}>
      <View
        style={[
          styles.button,
          { backgroundColor: palette.bg, borderColor: palette.border },
          busy && styles.pressed,
        ]}
      >
        {icon ? <Ionicons name={icon} size={17} color={palette.fg} /> : null}
        <Text style={[styles.buttonLabel, { color: palette.fg }]}>{label}</Text>
      </View>
    </CardPress>
  );
}

/** Friendly empty state so a blank screen never looks broken. */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={26} color={colors.brand} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {action ? (
        <View style={styles.emptyAction}>
          <PrimaryButton label={action.label} onPress={action.onPress} icon="arrow-forward" />
        </View>
      ) : null}
    </View>
  );
}

/** Placeholder block shown while data loads. */
export function Skeleton({ height, style }: { height: number; style?: ViewStyle }) {
  return <View style={[styles.skeleton, { height }, style]} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    gap: space.sm,
  },
  pressable: { gap: space.sm },
  pressed: { opacity: 0.6 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start" },
  badgeText: { ...type.tiny, textTransform: "capitalize" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md },
  rowLabel: { ...type.small, color: colors.muted, flexShrink: 1 },
  rowValue: { ...type.smallStrong, color: colors.ink },
  rowValueStrong: { ...type.bodyStrong },
  bubble: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: space.lg,
  },
  buttonLabel: { ...type.bodyStrong },
  empty: { alignItems: "center", paddingVertical: space.xxl, paddingHorizontal: space.lg, gap: space.sm },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.sm,
  },
  emptyTitle: { ...type.heading, color: colors.ink, textAlign: "center" },
  emptyBody: { ...type.small, color: colors.muted, textAlign: "center", lineHeight: 20 },
  emptyAction: { marginTop: space.md, alignSelf: "stretch" },
  skeleton: { backgroundColor: colors.line, borderRadius: radius.md, opacity: 0.7 },
});
