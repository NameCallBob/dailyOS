/**
 * lib/http.ts — 登入模式（Auth）HTTP client。
 *
 * - base = process.env.NEXT_PUBLIC_API_BASE
 * - Authorization: Bearer <cookie daios_token>
 * - 請求 body：camelCase -> snake_case；回應 body：snake_case -> camelCase
 * - 標準錯誤：{ code, message, field_errors, request_id } -> ApiRequestError
 * - 分頁：{ results, count, next, previous }
 */

import { getToken } from "./mode";
import { ApiRequestError, type ApiError, type ListParams, type Page } from "./types";

function getApiBase(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE ?? "";
  return base.replace(/\/+$/, "");
}

// ---------------------------------------------------------------------------
// case 轉換
// ---------------------------------------------------------------------------

function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function snakeToCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

export function deepCase<T>(input: unknown, convert: (key: string) => string): T {
  if (Array.isArray(input)) {
    return input.map((item) => deepCase(item, convert)) as unknown as T;
  }
  if (isPlainObject(input)) {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      out[convert(key)] = deepCase(value, convert);
    }
    return out as T;
  }
  return input as T;
}

export function toSnakeCase<T>(input: unknown): T {
  return deepCase<T>(input, camelToSnake);
}

export function toCamelCase<T>(input: unknown): T {
  return deepCase<T>(input, snakeToCamel);
}

// ---------------------------------------------------------------------------
// query string
// ---------------------------------------------------------------------------

function buildQueryString(params?: ListParams): string {
  if (!params) return "";
  const search = new URLSearchParams();
  if (params.filters) {
    for (const [key, value] of Object.entries(params.filters)) {
      if (value === undefined || value === null || value === "") continue;
      search.set(camelToSnake(key), String(value));
    }
  }
  if (params.search) search.set("search", params.search);
  if (params.ordering) search.set("ordering", params.ordering);
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("page_size", String(params.pageSize));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

// ---------------------------------------------------------------------------
// core request
// ---------------------------------------------------------------------------

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

async function request<TResponse>(path: string, options: RequestOptions = {}): Promise<TResponse> {
  const token = getToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let bodyInit: BodyInit | undefined;
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    bodyInit = JSON.stringify(toSnakeCase(options.body));
  }

  let response: Response;
  try {
    response = await fetch(`${getApiBase()}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: bodyInit,
      signal: options.signal,
      credentials: "omit",
    });
  } catch (cause) {
    throw new ApiRequestError(0, {
      code: "network_error",
      message: "無法連線到伺服器，請確認網路連線後再試一次。",
    });
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  const text = await response.text();
  const raw: unknown = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    const errBody = isPlainObject(raw) ? (raw as Record<string, unknown>) : {};
    const error: ApiError = {
      code: typeof errBody.code === "string" ? errBody.code : `http_${response.status}`,
      message: typeof errBody.message === "string" ? errBody.message : "發生未預期的錯誤，請稍後再試。",
      fieldErrors: isPlainObject(errBody.field_errors)
        ? (toCamelCase(errBody.field_errors) as Record<string, string[]>)
        : undefined,
      requestId: typeof errBody.request_id === "string" ? errBody.request_id : undefined,
    };
    throw new ApiRequestError(response.status, error);
  }

  return toCamelCase<TResponse>(raw);
}

export const http = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { method: "GET", signal }),
  post: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: "POST", body, signal }),
  patch: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: "PATCH", body, signal }),
  put: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: "PUT", body, signal }),
  delete: <T>(path: string, signal?: AbortSignal) => request<T>(path, { method: "DELETE", signal }),
};

/** 依 REST 慣例對單一資源建立 CRUD 呼叫，供 resource.ts 使用 */
export function httpResource<T>(resourceName: string) {
  const base = `/api/v1/${resourceName}/`;
  return {
    list: (params?: ListParams) => http.get<Page<T>>(`${base}${buildQueryString(params)}`),
    get: (id: string) => http.get<T>(`${base}${id}/`),
    create: (input: Partial<T>) => http.post<T>(base, input),
    update: (id: string, patch: Partial<T>) => http.patch<T>(`${base}${id}/`, patch),
    remove: (id: string) => http.delete<void>(`${base}${id}/`),
    action: <TResult = unknown>(id: string, action: string, body?: unknown) =>
      http.post<TResult>(`${base}${id}/${action}/`, body),
  };
}

export { buildQueryString };
