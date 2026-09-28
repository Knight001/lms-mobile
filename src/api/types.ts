import type { components, operations } from "./schema";

/**
 * API types for the customer app.
 *
 * Paths, methods and request bodies are generated from the self-service OpenAPI
 * document (`npm run api:sync`). The response entities below mirror what the API
 * returns; the backend's feature tests assert these exact keys, so a change on
 * the server fails there rather than rendering blank in the app.
 *
 * Naming follows the API: `*_minor` fields are integer minor units (cents), plain
 * money fields are major units. Do not mix them up — a receipt showing 100x the
 * real amount is worse than no receipt.
 */

export type Schemas = components["schemas"];
export type Paths = import("./schema").paths;
export type OperationId = keyof operations;

export type Envelope<T> = {
  data: T;
  request_id: string;
  meta?: { total: number; page: number; pages: number; limit: number };
};

export type ErrorEnvelope = {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
    request_id: string;
  };
};

/* ------------------------------------------------------------- requests */
/* Generated from the spec, so a payload change is a compile error. */

export type RegisterRequest = components["schemas"]["CustomerRegisterRequest"];
export type LoginRequest = components["schemas"]["CustomerLoginRequest"];
export type VerifyRequest = components["schemas"]["CustomerVerifyRequest"];
export type ResendCodeRequest = components["schemas"]["CustomerResendCodeRequest"];
export type ApplicationRequest = components["schemas"]["StoreCustomerApplicationRequest"];
export type RepaymentRequest = components["schemas"]["StoreCustomerRepaymentRequest"];
export type ProfileRequest = components["schemas"]["UpdateCustomerProfileRequest"];

/* ------------------------------------------------------------ responses */

export interface SessionTokens {
  token: string;
  refresh_token?: string;
}

/** CustomerResource. The API returns the parts, not a single display name. */
export interface Customer {
  id: string;
  type: string;
  status: string;
  customer_number: string | null;
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  business_name: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  currency: string;
  kyc_status: string;
}

/** The name to show a customer, honouring a registered business. */
export function customerName(customer: Customer | null): string {
  if (!customer) return "";
  return customer.business_name?.trim() || customer.full_name || customer.email || "Customer";
}

export interface AccountSummary {
  customer: {
    id: string;
    customer_number: string | null;
    name: string;
    kyc_status: string;
  };
  account: {
    code: string | null;
    /** Pre-formatted by the API, e.g. "$2,400.00". */
    balance: string;
    balance_minor: number;
  };
  currency: string;
  counts: { loans: number; applications: number };
  totals: {
    /** All totals are integer minor units. */
    principal_outstanding: number;
    interest_outstanding: number;
    fees_outstanding: number;
    penalties_outstanding: number;
    paid_to_date: number;
  };
  next_payment: {
    loan_id: string;
    installment_number: number;
    due_date: string | null;
    amount_minor: number;
    amount: string;
    overdue: boolean;
  } | null;
  statement_url: string;
}

export interface StatementLine {
  entry_id: string;
  transaction_id: string;
  transaction_number: string;
  date: string;
  type: string;
  reference_type: string | null;
  reference_id: string | null;
  description: string | null;
  debit: string | null;
  credit: string | null;
  debit_minor: number;
  credit_minor: number;
  balance: string;
  balance_minor: number;
}

export interface Statement {
  customer: {
    id: string;
    customer_number: string | null;
    name: string;
    email: string | null;
    phone: string | null;
  };
  account: { id: string; code: string; name: string };
  currency: string;
  from: string | null;
  to: string | null;
  opening_balance: string;
  closing_balance: string;
  lines: StatementLine[];
  open_loans: Array<{
    id: string;
    loan_number: string;
    status: string;
    outstanding_minor: number;
  }>;
}

export interface LoanProduct {
  id: string;
  name: string;
  code: string;
  slug: string;
  description: string | null;
  currency: string;
  min_amount: number;
  max_amount: number;
  min_term_months: number;
  max_term_months: number;
  interest_method: string;
  interest_rate: number;
  repayment_frequency: string;
  grace_period_days: number;
  status: string;
}

/**
 * LoanResource. Note the API exposes outstanding and total figures in major
 * units only; `principal_minor` is the single minor-unit field on this resource.
 */
export interface Loan {
  id: string;
  loan_number: string;
  status: string;
  currency: string;
  principal: number;
  principal_minor: number;
  approved_amount: number;
  interest_rate: number;
  interest_method: string;
  repayment_frequency: string;
  term_months: number;
  outstanding_principal: number;
  outstanding_interest: number;
  outstanding_fees: number;
  outstanding_penalty: number;
  total_due: number;
  total_paid: number;
  approved_at: string | null;
  disbursed_at: string | null;
  maturity_date: string | null;
  product?: LoanProduct | null;
  schedule?: LoanSchedule | null;
  created_at: string | null;
}

/** LoanInstallmentResource. All amounts are major units. */
export interface Installment {
  id: string;
  installment_number: number;
  due_date: string | null;
  principal: number;
  interest: number;
  fees: number;
  penalty: number;
  total: number;
  paid_principal: number;
  paid_interest: number;
  paid_fees: number;
  paid_penalty: number;
  paid_total: number;
  outstanding: number;
  status: string;
  paid_at: string | null;
}

export interface LoanSchedule {
  id: string;
  version: number;
  status: string;
  generated_at: string | null;
  installments: Installment[];
}

/** Registration returns the customer id, which is what verification is keyed on. */
export interface RegistrationResult {
  customer_id: string;
}

export interface AuthResult {
  token: string;
  customer: Customer;
}

export interface Application {
  id: string;
  application_number: string;
  status: string;
  requested_amount: number;
  requested_amount_minor: number;
  requested_term_months: number;
  currency: string;
  approved_amount: number | null;
  approved_amount_minor: number | null;
  interest_rate: number | null;
  decision_note: string | null;
  submitted_at: string | null;
  decided_at: string | null;
  created_at: string;
  loan_product?: { id: string; name: string } | null;
}

export interface PaymentAllocation {
  principal: number;
  interest: number;
  fees: number;
  penalty: number;
  total: number;
}

export interface Payment {
  id: string;
  amount: number;
  amount_minor: number;
  currency: string;
  payment_method: string;
  status: string;
  provider: string | null;
  external_reference: string | null;
  failure_reason: string | null;
  paid_at: string | null;
  loan_id: string;
  created_at: string | null;
  allocations?: PaymentAllocation[];
}

/** CustomerDocumentResource, as the customer sees it. */
export interface CustomerDocument {
  id: string;
  type: string;
  filename: string;
  mime_type: string | null;
  verification_status: string;
  created_at: string | null;
}

export interface ReceiptRef {
  receipt_number: string | null;
  amount: string;
  pdf_url: string;
}

export interface StatementRef {
  statement_number: string | null;
  closing_balance: string;
  lines: number;
  pdf_url: string;
}

export interface InvoiceRef {
  invoice_number: string | null;
  amount_due: string;
  pdf_url: string;
}
