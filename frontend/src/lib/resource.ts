/**
 * lib/resource.ts — createResource<T>()：唯一的資料存取入口。
 *
 * 依 `daios_mode` 切換 transport：
 * - trial：Dexie 資料表（表名 = name），首次讀取若表為空則 lazy-seed。
 * - auth ：REST `/api/v1/{name}/`（透過 http.ts）。
 *
 * UI／元件永遠只呼叫 repo 或其 hooks，不直接碰 Dexie / fetch。
 */

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import type { ZodType, ZodTypeDef } from "zod";

import { toast } from "@/components/ui/toast";
import { getDb } from "./db";
import { httpResource } from "./http";
import { isAuth, isTrial } from "./mode";
import { getActiveQueryClient } from "./query";
import { ApiRequestError, type BaseRecord, type ListParams, type Page } from "./types";

// ---------------------------------------------------------------------------
// 公開型別
// ---------------------------------------------------------------------------

export interface Repo<T extends BaseRecord> {
  list(params?: ListParams): Promise<Page<T>>;
  get(id: string): Promise<T>;
  create(input: Partial<T>): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T>;
  remove(id: string): Promise<void>;
  // react-query hooks
  useList(params?: ListParams): UseQueryResult<Page<T>>;
  useItem(id: string | undefined): UseQueryResult<T>;
  // 額外便利 hooks（含樂觀更新 + 失敗 toast），非契約強制但供模組共用
  useCreate(): ReturnType<typeof useMutation<T, ApiRequestError, Partial<T>>>;
  useUpdate(): ReturnType<typeof useMutation<T, ApiRequestError, { id: string; patch: Partial<T> }>>;
  useRemove(): ReturnType<typeof useMutation<void, ApiRequestError, string>>;
}

export interface ResourceAction<T extends BaseRecord, TPayload = unknown, TResult = T> {
  /** REST action 路徑後綴：POST /api/v1/{name}/{id}/{httpAction}/（預設用 key 本身） */
  httpAction?: string;
  /** 試用模式處理器：接收目前記錄與 payload，回傳要合併的欄位 */
  trial: (record: T, payload: TPayload) => Partial<T> | Promise<Partial<T>>;
}

export type ActionsMap<T extends BaseRecord> = Record<string, ResourceAction<T, any, any>>;

export interface CreateResourceOptions<T extends BaseRecord, A extends ActionsMap<T> = ActionsMap<T>> {
  /** 資料表名（Dexie）／REST 資源名（同一個字串） */
  name: string;
  /**
   * zod schema，用於試用模式建立/更新前驗證。
   * Input 型別刻意放寬為 `any`：schema 內大量欄位使用 `.default()`，
   * 使 zod 推導出的 _input 型別（欄位可省略）與 _output/T（欄位必填）不同，
   * 這裡只在乎 safeParse 後得到的 Output 對得上 T，不檢查 Input 形狀。
   */
  schema: ZodType<T, ZodTypeDef, any>;
  /** 首次讀取若本地表為空，用來產生種子資料 */
  seed?: () => T[] | Promise<T[]>;
  /** 自訂 action，例如 complete / stop */
  actions?: A;
}

type ActionFns<T extends BaseRecord, A extends ActionsMap<T>> = {
  [K in keyof A]: (id: string, payload?: Parameters<A[K]["trial"]>[1]) => Promise<T>;
};

// ---------------------------------------------------------------------------
// 內部工具
// ---------------------------------------------------------------------------

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // fallback（極舊環境）
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toApiError(err: unknown): ApiRequestError {
  if (err instanceof ApiRequestError) return err;
  const message = err instanceof Error ? err.message : "發生未預期的錯誤";
  return new ApiRequestError(0, { code: "unknown_error", message });
}

// ---------------------------------------------------------------------------
// 本地寫入觀察者（供 sync 引擎使用；解耦：resource.ts 不 import sync feature）。
// 本機(local)模式且已登入時，sync 引擎註冊觀察者，把每次 Dexie 寫入排入待同步佇列。
// ---------------------------------------------------------------------------

export type LocalWriteOp = "create" | "update" | "remove";
export type LocalWriteObserver = (name: string, op: LocalWriteOp, id: string) => void;

const writeObservers = new Set<LocalWriteObserver>();

export function registerLocalWriteObserver(observer: LocalWriteObserver): () => void {
  writeObservers.add(observer);
  return () => {
    writeObservers.delete(observer);
  };
}

function notifyLocalWrite(name: string, op: LocalWriteOp, id: string): void {
  for (const observer of writeObservers) {
    try {
      observer(name, op, id);
    } catch {
      // 觀察者錯誤不得影響主要寫入流程。
    }
  }
}

const seededTables = new Set<string>();

async function ensureSeeded<T extends BaseRecord>(name: string, seed?: () => T[] | Promise<T[]>): Promise<void> {
  // 只有「試用」模式載入 demo seed；「本機」模式是使用者真實資料，起始為空。
  if (!seed || !isTrial() || seededTables.has(name)) return;
  const db = getDb();
  const table = db.table<T, string>(name);
  const count = await table.count();
  if (count === 0) {
    const rows = await seed();
    if (rows.length > 0) {
      await table.bulkPut(rows);
    }
  }
  seededTables.add(name);
}

function matchesFilters<T extends BaseRecord>(record: T, params?: ListParams): boolean {
  if (!params) return !record.deleted;
  const includeDeleted = params.filters?.deleted === true || params.filters?.deleted === "true";
  if (!includeDeleted && record.deleted) return false;

  if (params.filters) {
    for (const [key, value] of Object.entries(params.filters)) {
      if (key === "deleted" || value === undefined || value === "") continue;
      const actual = (record as unknown as Record<string, unknown>)[key];
      if (String(actual) !== String(value)) return false;
    }
  }

  if (params.search) {
    const needle = params.search.toLowerCase();
    const haystack = JSON.stringify(record).toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  return true;
}

function applyOrdering<T extends BaseRecord>(rows: T[], ordering?: string): T[] {
  if (!ordering) return rows;
  const desc = ordering.startsWith("-");
  const key = desc ? ordering.slice(1) : ordering;
  const sorted = [...rows].sort((a, b) => {
    const av = (a as unknown as Record<string, unknown>)[key];
    const bv = (b as unknown as Record<string, unknown>)[key];
    if (av === bv) return 0;
    if (av === undefined || av === null) return 1;
    if (bv === undefined || bv === null) return -1;
    return av > bv ? 1 : -1;
  });
  return desc ? sorted.reverse() : sorted;
}

function paginate<T>(rows: T[], params?: ListParams): Page<T> {
  const pageSize = params?.pageSize ?? 50;
  const page = params?.page ?? 1;
  const start = (page - 1) * pageSize;
  const slice = rows.slice(start, start + pageSize);
  return {
    results: slice,
    count: rows.length,
    next: start + pageSize < rows.length ? String(page + 1) : null,
    previous: page > 1 ? String(page - 1) : null,
  };
}

// ---------------------------------------------------------------------------
// createResource
// ---------------------------------------------------------------------------

export function createResource<T extends BaseRecord, A extends ActionsMap<T> = ActionsMap<T>>(
  options: CreateResourceOptions<T, A>,
): Repo<T> & { actions: ActionFns<T, A> } {
  const { name, schema, seed, actions } = options;

  // -------------------------------------------------------------------------
  // Trial (Dexie) transport
  // -------------------------------------------------------------------------

  const trial = {
    async list(params?: ListParams): Promise<Page<T>> {
      await ensureSeeded(name, seed);
      const db = getDb();
      const table = db.table<T, string>(name);
      const all = await table.toArray();
      const filtered = all.filter((row) => matchesFilters(row, params));
      const ordered = applyOrdering(filtered, params?.ordering);
      return paginate(ordered, params);
    },

    async get(id: string): Promise<T> {
      await ensureSeeded(name, seed);
      const db = getDb();
      const table = db.table<T, string>(name);
      const record = await table.get(id);
      if (!record) {
        throw new ApiRequestError(404, { code: "not_found", message: "找不到此筆資料。" });
      }
      return record;
    },

    async create(input: Partial<T>): Promise<T> {
      await ensureSeeded(name, seed);
      const db = getDb();
      const table = db.table<T, string>(name);
      const timestamp = nowIso();
      const draft = {
        ...input,
        id: input.id ?? newId(),
        createdAt: input.createdAt ?? timestamp,
        updatedAt: timestamp,
        version: 1,
        deleted: false,
      } as T;
      const parsed = schema.safeParse(draft);
      if (!parsed.success) {
        throw new ApiRequestError(422, {
          code: "validation_error",
          message: "資料格式不正確。",
          fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
        });
      }
      await table.put(parsed.data);
      return parsed.data;
    },

    async update(id: string, patch: Partial<T>): Promise<T> {
      const db = getDb();
      const table = db.table<T, string>(name);
      const existing = await table.get(id);
      if (!existing) {
        throw new ApiRequestError(404, { code: "not_found", message: "找不到此筆資料。" });
      }
      const merged = {
        ...existing,
        ...patch,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: nowIso(),
        version: existing.version + 1,
      } as T;
      const parsed = schema.safeParse(merged);
      if (!parsed.success) {
        throw new ApiRequestError(422, {
          code: "validation_error",
          message: "資料格式不正確。",
          fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
        });
      }
      await table.put(parsed.data);
      return parsed.data;
    },

    async remove(id: string): Promise<void> {
      const db = getDb();
      const table = db.table<T, string>(name);
      const existing = await table.get(id);
      if (!existing) return;
      // 軟刪除：保留 tombstone 以利未來同步 / undo。
      await table.put({
        ...existing,
        deleted: true,
        updatedAt: nowIso(),
        version: existing.version + 1,
      } as T);
    },
  };

  // -------------------------------------------------------------------------
  // Auth (HTTP) transport
  // -------------------------------------------------------------------------

  const auth = httpResource<T>(name);

  // -------------------------------------------------------------------------
  // 讓「非 hook」情境下的直接寫入（見下方 impl.create/update/remove）也能使
  // react-query 快取失效。部分模組的表單直接呼叫 repo.create()/update()/
  // remove()（而非 useCreate() 等 mutation hook），這些呼叫本身沒有 useCreate()
  // 內建的 onSuccess invalidate；若不處理，画面會停留在寫入前的舊資料，
  // 直到 staleTime（30 秒）過期或使用者重新整理頁面才會顯示最新結果。
  // -------------------------------------------------------------------------

  function invalidateAfterWrite(): void {
    const client = getActiveQueryClient();
    if (!client) return;
    void client.invalidateQueries({ queryKey: [name] });
  }

  // -------------------------------------------------------------------------
  // Transport dispatch
  // -------------------------------------------------------------------------

  const impl: Pick<Repo<T>, "list" | "get" | "create" | "update" | "remove"> = {
    list: (params) => (isAuth() ? auth.list(params) : trial.list(params)),
    get: (id) => (isAuth() ? auth.get(id) : trial.get(id)),
    create: async (input) => {
      const useHttp = isAuth();
      const result = await (useHttp ? auth.create(input) : trial.create(input));
      if (!useHttp) notifyLocalWrite(name, "create", result.id);
      invalidateAfterWrite();
      return result;
    },
    update: async (id, patch) => {
      const useHttp = isAuth();
      const result = await (useHttp ? auth.update(id, patch) : trial.update(id, patch));
      if (!useHttp) notifyLocalWrite(name, "update", id);
      invalidateAfterWrite();
      return result;
    },
    remove: async (id) => {
      const useHttp = isAuth();
      await (useHttp ? auth.remove(id) : trial.remove(id));
      if (!useHttp) notifyLocalWrite(name, "remove", id);
      invalidateAfterWrite();
    },
  };

  // -------------------------------------------------------------------------
  // queryKey 規則： [name, "list", params] / [name, "item", id]
  // -------------------------------------------------------------------------

  const keys = {
    all: [name] as const,
    list: (params?: ListParams) => [name, "list", params ?? {}] as const,
    item: (id: string | undefined) => [name, "item", id ?? ""] as const,
  };

  function useList(params?: ListParams): UseQueryResult<Page<T>> {
    return useQuery({
      queryKey: keys.list(params),
      queryFn: () => impl.list(params),
    });
  }

  function useItem(id: string | undefined): UseQueryResult<T> {
    return useQuery({
      queryKey: keys.item(id),
      queryFn: () => impl.get(id as string),
      enabled: Boolean(id),
    });
  }

  function useCreate() {
    const queryClient = useQueryClient();
    return useMutation<T, ApiRequestError, Partial<T>>({
      mutationFn: (input) => impl.create(input),
      onSuccess: (record) => {
        queryClient.setQueryData(keys.item(record.id), record);
        queryClient.invalidateQueries({ queryKey: keys.all });
      },
      onError: (error) => {
        toast.error(error.message || "新增失敗，請再試一次。");
      },
    });
  }

  function useUpdate() {
    const queryClient = useQueryClient();
    return useMutation<T, ApiRequestError, { id: string; patch: Partial<T> }, { previous?: T }>({
      mutationFn: ({ id, patch }) => impl.update(id, patch),
      onMutate: async ({ id, patch }) => {
        await queryClient.cancelQueries({ queryKey: keys.item(id) });
        const previous = queryClient.getQueryData<T>(keys.item(id));
        if (previous) {
          queryClient.setQueryData<T>(keys.item(id), { ...previous, ...patch });
        }
        return { previous };
      },
      onError: (error, variables, context) => {
        if (context?.previous) {
          queryClient.setQueryData(keys.item(variables.id), context.previous);
        }
        toast.error(error.message || "更新失敗，請再試一次。");
      },
      onSettled: (_data, _err, variables) => {
        queryClient.invalidateQueries({ queryKey: keys.item(variables.id) });
        queryClient.invalidateQueries({ queryKey: keys.all });
      },
    });
  }

  function useRemove() {
    const queryClient = useQueryClient();
    return useMutation<void, ApiRequestError, string, { previous?: T }>({
      mutationFn: (id) => impl.remove(id),
      onMutate: async (id) => {
        await queryClient.cancelQueries({ queryKey: keys.item(id) });
        const previous = queryClient.getQueryData<T>(keys.item(id));
        queryClient.removeQueries({ queryKey: keys.item(id) });
        return { previous };
      },
      onError: (error, id, context) => {
        if (context?.previous) {
          queryClient.setQueryData(keys.item(id), context.previous);
        }
        toast.error(error.message || "刪除失敗，請再試一次。");
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: keys.all });
      },
    });
  }

  // -------------------------------------------------------------------------
  // 自訂 actions
  // -------------------------------------------------------------------------

  const actionFns = {} as ActionFns<T, A>;
  if (actions) {
    for (const key of Object.keys(actions) as Array<keyof A & string>) {
      const def = actions[key];
      if (!def) continue;
      actionFns[key] = (async (id: string, payload?: unknown) => {
        try {
          if (isAuth()) {
            const result = await auth.action<T>(id, def.httpAction ?? key, payload);
            invalidateAfterWrite();
            return result;
          }
          const db = getDb();
          const table = db.table<T, string>(name);
          const existing = await table.get(id);
          if (!existing) {
            throw new ApiRequestError(404, { code: "not_found", message: "找不到此筆資料。" });
          }
          const patch = await def.trial(existing, payload);
          const result = await trial.update(id, patch);
          invalidateAfterWrite();
          return result;
        } catch (err) {
          throw toApiError(err);
        }
      }) as ActionFns<T, A>[typeof key];
    }
  }

  return {
    ...impl,
    useList,
    useItem,
    useCreate,
    useUpdate,
    useRemove,
    actions: actionFns,
  };
}
