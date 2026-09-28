/** Presentation helpers shared by the customer screens. */

export function formatMoney(minor: number | null | undefined, currency = "USD"): string {
  if (minor === null || minor === undefined || Number.isNaN(minor)) return "—";

  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}

export function formatMajor(amount: number | null | undefined, currency = "USD"): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";

  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function titleCase(value: string | null | undefined): string {
  if (!value) return "—";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function statusTone(value: string | null | undefined): "good" | "warn" | "bad" | "muted" {
  switch ((value ?? "").toLowerCase()) {
    case "active":
    case "approved":
    case "completed":
    case "paid":
      return "good";
    case "pending":
    case "under_assessment":
    case "submitted":
    case "partially_paid":
    case "ready_for_disbursement":
      return "warn";
    case "defaulted":
    case "written_off":
    case "rejected":
    case "declined":
    case "overdue":
    case "failed":
    case "delinquent":
      return "bad";
    default:
      return "muted";
  }
}

/** Days until a date, negative when it has passed. */
export function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - Date.now()) / 86_400_000);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}
