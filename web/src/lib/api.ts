/** Minimal JSON client for the Serenity API. Cookies are handled by the browser. */

export class ApiError extends Error {
  override name = "ApiError";

  constructor(
    readonly status: number,
    readonly detail: string,
  ) {
    super(`HTTP ${String(status)}: ${detail}`);
  }
}

export type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

export class Api {
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
    const data: unknown = text ? JSON.parse(text) : undefined;
    if (!response.ok) {
      const detail =
        typeof data === "object" && data !== null && "detail" in data
          ? String(data.detail)
          : response.statusText;
      throw new ApiError(response.status, detail);
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
