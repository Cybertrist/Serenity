import { describe, expect, it, vi } from "vitest";
import { Api, ApiError } from "./api";

function answer(status: number, body: string, statusText = ""): Api {
  return new Api("", () => Promise.resolve(new Response(body, { status, statusText })));
}

describe("Api", () => {
  it("turns an HTML error page into an ApiError with its status", async () => {
    const api = answer(502, "<html><body>Bad Gateway</body></html>", "Bad Gateway");
    const error = await api.get("/api/vault/items").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(502);
  });

  it("keeps the detail of a JSON error", async () => {
    const api = answer(409, JSON.stringify({ detail: "Conflit." }));
    await expect(api.get("/api/vault/items")).rejects.toMatchObject({
      status: 409,
      detail: "Conflit.",
    });
  });

  it("calls onUnauthorized on a 401 from an ordinary call", async () => {
    const api = answer(401, JSON.stringify({ detail: "Non authentifié." }));
    const hook = vi.fn();
    api.onUnauthorized = hook;
    await expect(api.get("/api/vault/items?since=0")).rejects.toBeInstanceOf(ApiError);
    expect(hook).toHaveBeenCalledWith("/api/vault/items?since=0");
  });

  it("leaves a 401 on the credential calls to the screen that made them", async () => {
    const api = answer(401, JSON.stringify({ detail: "Identifiants incorrects." }));
    const hook = vi.fn();
    api.onUnauthorized = hook;
    for (const path of ["/api/auth/login", "/api/auth/unlock", "/api/auth/recover/start"]) {
      await expect(api.post(path, {})).rejects.toBeInstanceOf(ApiError);
    }
    expect(hook).not.toHaveBeenCalled();
  });
});
