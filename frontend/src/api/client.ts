export type ApiResult<T> = {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
};

const DEFAULT_BASE = "http://localhost:8080";

export const getApiBase = (): string =>
  localStorage.getItem("apiBase") || import.meta.env.VITE_API_BASE || DEFAULT_BASE;

export const setApiBase = (value: string) => {
  localStorage.setItem("apiBase", value);
};

export const getAccessToken = (): string | null =>
  localStorage.getItem("accessToken");

export const setTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
};

export const clearTokens = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
};

export const getRefreshToken = (): string | null =>
  localStorage.getItem("refreshToken");

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResult<T>> {
  const base = getApiBase().replace(/\/$/, "");
  const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;

  const headers = new Headers(options.headers || {});
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (!isFormData) {
    headers.set("Content-Type", headers.get("Content-Type") || "application/json");
  }

  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    const response = await fetch(url, { ...options, headers });
    const contentType = response.headers.get("Content-Type") || "";
    const isJson = contentType.includes("application/json");
    const payload = isJson ? await response.json() : await response.text();
    const normalizedPayload =
      payload &&
      typeof payload === "object" &&
      "data" in payload &&
      "status" in payload
        ? (payload as { data: unknown }).data
        : payload;

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error:
          typeof payload === "string"
            ? payload
            : (payload as any)?.title || (payload as any)?.message || "Request failed",
        data: payload
      };
    }

    return { ok: true, status: response.status, data: normalizedPayload as T };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : "Network error"
    };
  }
}
