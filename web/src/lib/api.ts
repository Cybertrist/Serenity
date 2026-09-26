/** Minimal JSON client for the Serenity API. Cookies are handled by the browser. */

export class ApiError extends Error {
  override name = "ApiError";

  constructor(
    readonly status: number,
    readonly detail: string,
    /** Parsed JSON body of the error response, when any (e.g. a 409 with the current item). */
    readonly body?: unknown,
  ) {
    super(`HTTP ${String(status)}: ${detail}`);
  }
}

export type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * Calls where a 401 means "wrong credentials" (or is handled by the caller), not "this device
 * lost its session": they never trigger the global `onUnauthorized`.
 */
const OWN_401 = [
  "/api/auth/status",
  "/api/auth/me",
  "/api/auth/prelogin",
  "/api/auth/login",
  "/api/auth/unlock",
  "/api/auth/signup",
  "/api/auth/password",
  "/api/auth/recovery-kit",
  "/api/auth/recover",
];

function ownsUnauthorized(path: string): boolean {
  const bare = path.split("?")[0] ?? path;
  return OWN_401.some((prefix) => bare === prefix || bare.startsWith(prefix + "/"));
}

export class Api {
  /**
   * Called on a 401 from any other call: the device session is gone (expired or revoked).
   * The session wipes the keys and goes back to the login screen.
   */
  onUnauthorized: ((path: string) => void) | null = null;

  constructor(
    private readonly baseUrl = "",
    private readonly fetchImpl: Fetch = (input, init) => fetch(input, init),
  ) {}

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const init: RequestInit = {
      method,
      credentials: "same-origin",
      headers: body === undefined ? {} : { "content-type": "application/json" },
    };
    if (body !== undefined) init.body = JSON.stringify(body);
    const response = await this.fetchImpl(this.baseUrl + path, init);
    const text = await response.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {
      // Not JSON: typically the HTML page of a proxy (502, 504) or of a captive portal.
      throw new ApiError(response.status, response.statusText || "Réponse illisible du serveur.");
    }
    if (response.status === 401 && !ownsUnauthorized(path)) this.onUnauthorized?.(path);
    if (!response.ok) {
      const detail =
        typeof data === "object" && data !== null && "detail" in data
          ? String(data.detail)
          : response.statusText;
      throw new ApiError(response.status, detail, data);
    }
    return data as T;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }
}
