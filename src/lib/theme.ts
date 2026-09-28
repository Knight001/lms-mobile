/**
 * Design tokens for the customer app.
 *
 * Kept in one place so the screens stay visually consistent, and so light/dark
 * can be introduced later by swapping this object rather than editing styles.
 */
export const colors = {
  brand: "#0f766e",
  brandDark: "#115e59",
  brandSoft: "#ccfbf1",
  brandTint: "#f0fdfa",

  ink: "#0f172a",
  inkSoft: "#334155",
  muted: "#64748b",
  faint: "#94a3b8",

  surface: "#ffffff",
  canvas: "#f6f8fa",
  line: "#e6eaef",

  good: "#15803d",
  goodSoft: "#dcfce7",
  warn: "#b45309",
  warnSoft: "#fef3c7",
  bad: "#b91c1c",
  badSoft: "#fee2e2",
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const shadow = {
  card: {
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  raised: {
    shadowColor: "#0f172a",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

export const type = {
  display: { fontSize: 32, fontWeight: "700" as const, letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: "700" as const, letterSpacing: -0.3 },
  heading: { fontSize: 17, fontWeight: "700" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  bodyStrong: { fontSize: 15, fontWeight: "600" as const },
  small: { fontSize: 13, fontWeight: "400" as const },
  smallStrong: { fontSize: 13, fontWeight: "600" as const },
  tiny: { fontSize: 11, fontWeight: "600" as const, letterSpacing: 0.3 },
  mono: { fontSize: 12, fontWeight: "500" as const, fontFamily: "monospace" as const },
} as const;

export function toneColors(tone: "good" | "warn" | "bad" | "muted") {
  switch (tone) {
    case "good":
      return { bg: colors.goodSoft, fg: colors.good };
    case "warn":
      return { bg: colors.warnSoft, fg: colors.warn };
    case "bad":
      return { bg: colors.badSoft, fg: colors.bad };
    default:
      return { bg: "#f1f5f9", fg: colors.muted };
  }
}
