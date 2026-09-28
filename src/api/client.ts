import type {
  AccountSummary,
  Customer,
  CustomerDocument,
  AuthResult,
  Application,
  ApplicationRequest,
  Envelope,
  ErrorEnvelope,
  Installment,
  InvoiceRef,
  Loan,
  LoanProduct,
  LoanSchedule,
  LoginRequest,
  Payment,
  ProfileRequest,
  ReceiptRef,
  RegisterRequest,
  RegistrationResult,
  RepaymentRequest,
  Statement,
  StatementRef,
  VerifyRequest,
} from "./types";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, string[]>,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Field messages keyed by field name, for inline form errors. */
  fieldErrors(): Record<string, string> {
    if (!this.details) return {};
    return Object.entries(this.details).reduce<Record<string, string>>((acc, [field, messages]) => {
      const first = Array.isArray(messages) ? messages[0] : undefined;
      if (first) acc[field] = first;
      return acc;
    }, {});
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isVerificationRequired(): boolean {
    return this.status === 422 && this.code === "VERIFICATION_REQUIRED";
  }
}

export interface ClientOptions {
  /**
   * The API root. A device or simulator cannot use a same-origin BFF, so this is
   * the API's absolute address. On a simulator "localhost" reaches the host
   * machine; on a real device it must be a reachable network address.
   */
  baseUrl: string;
  getToken?: () => string | null | Promise<string | null>;
  onUnauthorized?: () => void | Promise<void>;
  fetchImpl?: typeof fetch;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Return the raw Response (used for PDFs). */
  raw?: boolean;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

const REFRESH_PATH = "/v1/customer/auth/refresh";

/**
 * Self-service client.
 *
 * Keeps the behaviours the OpenAPI document cannot describe: envelope handling,
 * one silent retry after refreshing an expired token, field-level errors, and an
 * idempotency key on the operations that move money.
 */
export class SelfServiceClient {
  private readonly baseUrl: string;
  private readonly getToken: () => string | null | Promise<string | null>;
  private readonly onUnauthorized?: () => void | Promise<void>;
  private readonly fetchImpl: typeof fetch;
  private refreshInFlight: Promise<boolean> | null = null;

  constructor(options: ClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.getToken = options.getToken ?? (() => null);
    this.onUnauthorized = options.onUnauthorized;
    this.fetchImpl = options.fetchImpl ?? ((...args) => fetch(...args));
  }

  /* ---------------------------------------------------------------- auth */

  /** Returns the customer id, which verification and resends are keyed on. */
  async register(payload: RegisterRequest): Promise<RegistrationResult> {
    const result = await this.send<Envelope<RegistrationResult>>("/v1/customer/auth/register", {
      method: "POST",
      body: payload,
    });
    return unwrap(result);
  }

  async verify(payload: VerifyRequest): Promise<AuthResult> {
    const result = await this.send<Envelope<AuthResult>>("/v1/customer/auth/verify", {
      method: "POST",
      body: payload,
    });
    return unwrap(result);
  }

  async resendCode(customerId: string) {
    const result = await this.send<Envelope<{ message?: string }>>("/v1/customer/auth/resend-code", {
      method: "POST",
      body: { customer_id: customerId } satisfies { customer_id: string },
    });
    return unwrap(result);
  }

  async login(payload: LoginRequest): Promise<AuthResult> {
    const result = await this.send<Envelope<AuthResult>>("/v1/customer/auth/login", {
      method: "POST",
      body: payload,
    });
    return unwrap(result);
  }

  async me() {
    const result = await this.send<Envelope<{ customer: import("./types").Customer }>>("/v1/customer/me");
    return unwrap(result).customer;
  }

  async updateProfile(payload: Partial<ProfileRequest>) {
    const result = await this.send<Envelope<{ customer: import("./types").Customer }>>(
      "/v1/customer/me/profile",
      { method: "PATCH", body: payload },
    );
    return unwrap(result).customer;
  }

  async logout() {
    await this.send<Envelope<null>>("/v1/customer/auth/logout", { method: "POST" });
  }

  /* ------------------------------------------------------------- account */

  async account(): Promise<AccountSummary> {
    return unwrap(await this.send<Envelope<AccountSummary>>("/v1/customer/me/account"));
  }

  async statement(params: { from?: string; to?: string } = {}): Promise<Statement> {
    return unwrap(
      await this.send<Envelope<Statement>>("/v1/customer/me/statement", { query: params }),
    );
  }

  /* --------------------------------------------------------------- loans */

  async products(): Promise<LoanProduct[]> {
    return unwrap(await this.send<Envelope<LoanProduct[]>>("/v1/customer/products"));
  }

  async loans(): Promise<Loan[]> {
    return unwrap(await this.send<Envelope<Loan[]>>("/v1/customer/loans"));
  }

  async loan(id: string): Promise<Loan> {
    return unwrap(await this.send<Envelope<Loan>>(`/v1/customer/loans/${id}`));
  }

  async loanSchedule(id: string): Promise<LoanSchedule> {
    return unwrap(await this.send<Envelope<LoanSchedule>>(`/v1/customer/loans/${id}/schedule`));
  }

  async loanStatement(id: string): Promise<Array<Record<string, unknown>>> {
    return unwrap(
      await this.send<Envelope<Array<Record<string, unknown>>>>(`/v1/customer/loans/${id}/statement`),
    );
  }

  /* --------------------------------------------------------- applications */

  async applications(): Promise<Application[]> {
    return unwrap(await this.send<Envelope<Application[]>>("/v1/customer/applications"));
  }

  async apply(payload: ApplicationRequest): Promise<Application> {
    return unwrap(
      await this.send<Envelope<Application>>("/v1/customer/applications", {
        method: "POST",
        body: payload,
        idempotencyKey: idempotencyKey("application"),
      }),
    );
  }

  /* ------------------------------------------------------------ servicing */

  async payments(): Promise<Payment[]> {
    return unwrap(await this.send<Envelope<Payment[]>>("/v1/customer/payments"));
  }

  async repay(loanId: string, payload: RepaymentRequest): Promise<Payment> {
    return unwrap(
      await this.send<Envelope<Payment>>(`/v1/customer/loans/${loanId}/repayments`, {
        method: "POST",
        body: payload,
        idempotencyKey: idempotencyKey("repayment"),
      }),
    );
  }

  /* ------------------------------------------------------------ documents */

  async receiptRef(paymentId: string): Promise<ReceiptRef> {
    return unwrap(
      await this.send<Envelope<ReceiptRef>>(`/v1/customer/documents/receipts/${paymentId}`),
    );
  }

  async statementRef(params: { from?: string; to?: string } = {}): Promise<StatementRef> {
    return unwrap(
      await this.send<Envelope<StatementRef>>("/v1/customer/documents/statement", { query: params }),
    );
  }

  async invoiceRef(loanId: string): Promise<InvoiceRef> {
    return unwrap(
      await this.send<Envelope<InvoiceRef>>(`/v1/customer/documents/invoices/${loanId}`),
    );
  }

  /**
   * Downloads a document. The Response is returned so the caller can turn it into
   * a blob URL, a download, or a share sheet payload.
   */
  async document(path: string, params: Record<string, string | undefined> = {}): Promise<Response> {
    return this.send<Response>(`${path}?${withQuery({ ...params, format: "pdf" })}`, {
      method: "GET",
      raw: true,
    });
  }

  /* -------------------------------------------------------------- profile */

  async documents(): Promise<CustomerDocument[]> {
    return unwrap(await this.send<Envelope<CustomerDocument[]>>("/v1/customer/documents"));
  }

  async changePassword(payload: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }): Promise<void> {
    await this.send<Envelope<null>>("/v1/customer/me/password", { method: "POST", body: payload });
  }


  /** Raw bytes of a document the customer uploaded, for preview or sharing. */
  async documentFile(id: string): Promise<Response> {
    return this.send<Response>(`/v1/customer/documents/${id}`, { method: "GET", raw: true });
  }

  async deleteDocument(id: string): Promise<void> {
    await this.send<Envelope<null>>(`/v1/customer/documents/${id}`, { method: "DELETE" });
  }

  /**
   * Uploads as multipart. React Native's FormData takes a `{ uri, name, type }`
   * descriptor rather than a File, so the caller passes the picked asset through.
   */
  async uploadDocument(
    type: string,
    file: { uri: string; name: string; mimeType?: string },
  ): Promise<CustomerDocument> {
    const form = new FormData();
    form.append("type", type);
    form.append("file", file as unknown as Blob);

    return unwrap(
      await this.send<Envelope<CustomerDocument>>("/v1/customer/documents", { method: "POST", body: form }),
    );
  }

  /* ----------------------------------------------------------- internals */

  private async send<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
    const token = await this.getToken();
    const headers: Record<string, string> = { Accept: "application/json" };

    // FormData sets its own multipart boundary, including on React Native.
    const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

    if (options.body !== undefined && !isFormData) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;
    if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: isFormData
        ? (options.body as FormData)
        : options.body === undefined
          ? undefined
          : JSON.stringify(options.body),
      signal: options.signal,
    });

    if (response.ok) {
      if (options.raw) return response as unknown as T;
      return (await response.json()) as T;
    }

    // Retry once after a refresh, but only when a session actually exists: a
    // wrong password must not start a refresh loop.
    if (response.status === 401 && !isRetry && token && path !== REFRESH_PATH) {
      if (await this.refresh()) return this.send<T>(path, options, true);
      await this.onUnauthorized?.();
    }

    throw await toApiError(response);
  }

  private async refresh(): Promise<boolean> {
    this.refreshInFlight ??= (async () => {
      try {
        await this.send<Envelope<AuthResult>>(REFRESH_PATH, { method: "POST" }, true);
        return true;
      } catch {
        return false;
      } finally {
        this.refreshInFlight = null;
      }
    })();

    return this.refreshInFlight;
  }
}

function unwrap<T>(envelope: Envelope<T>): T {
  return envelope.data;
}

async function toApiError(response: Response): Promise<ApiError> {
  let payload: ErrorEnvelope | undefined;

  try {
    payload = (await response.json()) as ErrorEnvelope;
  } catch {
    // A non-JSON body (a proxy error page, say) still deserves a usable message.
  }

  return new ApiError(
    response.status,
    payload?.error?.code ?? "REQUEST_FAILED",
    payload?.error?.message ?? `Request failed (${response.status}).`,
    payload?.error?.details,
    payload?.error?.request_id,
  );
}

function withQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  return search.toString();
}

/** Stops a double tap on a flaky connection creating two repayments. */
export function idempotencyKey(prefix: string): string {
  const unique =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${prefix}-${unique}`;
}
