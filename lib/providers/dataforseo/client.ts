import "server-only";

type DataForSeoClientOptions = {
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryBaseDelayMs?: number;
};

export type DataForSeoResponse<T> = {
  ok: true;
  status: number;
  data: T;
  raw: unknown;
  meta?: {
    requestId?: string;
    cost?: number;
    timeSeconds?: number;
  };
};

export type DataForSeoError = {
  ok: false;
  status?: number;
  message: string;
  raw?: unknown;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error("Missing env var: " + name);
  return v;
}

function basicAuthHeader(login: string, password: string) {
  const value = login + ":" + password;
  const token =
    typeof btoa === "function"
      ? btoa(value)
      : Buffer.from(value).toString("base64");
  return "Basic " + token;
}

function shouldRetry(status?: number) {
  if (!status) return true;
  if (status === 429) return true;
  return status >= 500 && status <= 599;
}

export class DataForSeoClient {
  private baseUrl: string;
  private timeoutMs: number;
  private maxRetries: number;
  private retryBaseDelayMs: number;
  private authHeader: string;

  constructor(opts: DataForSeoClientOptions = {}) {
    const login = getEnv("DATAFORSEO_LOGIN");
    const password = getEnv("DATAFORSEO_PASSWORD");

    this.baseUrl = opts.baseUrl ?? "https://api.dataforseo.com";
    this.timeoutMs = opts.timeoutMs ?? 30_000;
    this.maxRetries = opts.maxRetries ?? 3;
    this.retryBaseDelayMs = opts.retryBaseDelayMs ?? 400;
    this.authHeader = basicAuthHeader(login, password);
  }

  async post<T>(
    path: string,
    payload: unknown
  ): Promise<DataForSeoResponse<T> | DataForSeoError> {
    return this.request<T>("POST", path, payload);
  }

  async get<T>(path: string): Promise<DataForSeoResponse<T> | DataForSeoError> {
    return this.request<T>("GET", path);
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    payload?: unknown
  ): Promise<DataForSeoResponse<T> | DataForSeoError> {
    const url = this.baseUrl + path;
    const startedAt = Date.now();

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const res = await fetch(url, {
          method,
          headers: {
            Authorization: this.authHeader,
            "Content-Type": "application/json",
          },
          body: method === "POST" ? JSON.stringify(payload ?? {}) : undefined,
          signal: controller.signal,
        });

        const status = res.status;
        const text = await res.text();
        let json: unknown = null;

        try {
          json = text ? JSON.parse(text) : null;
        } catch {
          json = text;
        }

        const requestId = res.headers.get("x-request-id") ?? undefined;

        if (!res.ok) {
          if (attempt < this.maxRetries && shouldRetry(status)) {
            const delay = this.retryBaseDelayMs * Math.pow(2, attempt);
            await sleep(delay);
            continue;
          }

          return {
            ok: false,
            status,
            message: "DataForSEO error " + status + " on " + method + " " + path,
            raw: json,
          };
        }

        const elapsedSeconds = (Date.now() - startedAt) / 1000;
        const maybeCost =
          typeof (json as any)?.cost === "number"
            ? (json as any).cost
            : typeof (json as any)?.tasks?.[0]?.cost === "number"
              ? (json as any).tasks[0].cost
              : undefined;

        return {
          ok: true,
          status,
          data: json as T,
          raw: json,
          meta: { requestId, cost: maybeCost, timeSeconds: elapsedSeconds },
        };
      } catch (err: any) {
        const isAbort = err?.name === "AbortError";

        if (attempt < this.maxRetries) {
          const delay = this.retryBaseDelayMs * Math.pow(2, attempt);
          await sleep(delay);
          continue;
        }

        return {
          ok: false,
          message: isAbort
            ? "DataForSEO request timed out after " +
              this.timeoutMs +
              "ms (" +
              method +
              " " +
              path +
              ")"
            : "DataForSEO request failed (" + method + " " + path + ")",
          raw: String(err),
        };
      } finally {
        clearTimeout(timer);
      }
    }

    return { ok: false, message: "Unexpected retry loop exit" };
  }
}